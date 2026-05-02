# 记工算工钱 — 深度重构设计文档

> 日期：2026-05-03
> 状态：待实施
> 基于：PLAN.md v2.0 + spec-multi-pay-mode.md + 全项目代码审计 + 6轮命名讨论

---

## 一、项目定位变更

### 1.1 名称

| 项 | 当前 | 目标 |
|----|------|------|
| App 名称 | 加班工时记账 | **记工算工钱** |
| 小程序简介 | - | 记加班·记工时·记计件·日薪工资计算器。建筑工工厂工小时工通用的记工本，支持按时、按天、按件三种方式记工，自动算工钱，明白赚钱不吃亏 |
| 项目根目录 | 加班工时记账/ | 记工算工钱/ |

### 1.2 定位

从"白领加班时长记录工具"重构为"蓝领多模式记工算薪工具"，覆盖工厂工人、建筑工、小时工、包工队等用户群体。

---

## 二、审计结论

对全部 13 个源文件 + 5 个云函数/数据库 schema + 4 个 Store + 4 个 utils 文件进行逐行审计，共发现 **23 个问题**，分布在 **7 个层面**：

| 层面 | 文件数 | 问题数 | 根因 |
|------|--------|--------|------|
| 核心计算层 | 0→新建1 | 0 | 计算逻辑散落在 4 处，无统一入口 |
| 节假日逻辑 | 1→迁移 | 0 | 工具函数未 Pinia 化 |
| Store 层 | 2 | 2 | 内联计算未引用统一引擎 |
| 记录页 | 1 | 7 | UI 缺失（补贴/扣款/结算/短语）+ 编辑模式 bug |
| 首页/统计 | 2 | 7 | 统计口径仅时薪维度，多模式数据不可见 |
| 对账/薪资 | 2 | 4 | 字段未初始化 + 重算依赖云函数 |
| 项目/批量 | 3 | 3 | 删除无入口 + 批量保存缺字段 |

**结论**：项目的 PLAN 和数据模型是正确的，核心 Store 层具备多模式能力，但页面层存在 3 类问题——UI 缺失、统计口径单一、边界 case 未处理。

---

## 三、重构策略：三层递进

```
Layer 1: 创建 utils/calculator.js（统一计算引擎）
   ↓
Layer 2: 重构 Store 层 + 迁移 holidays.js → holidayStore.js
   ↓
Layer 3: 逐页面修复 UI + 统计口径 + 边界 case
```

每层完成后可独立验证，不破坏已有功能。

---

## 四、Layer 1：统一计算引擎

### 4.1 新建 `utils/calculator.js`

所有金额计算收敛到此文件，作为唯一入口。页面和 Store 不自行计算。

```js
// utils/calculator.js

/**
 * 计算时长
 */
export function calcDuration(startTime, endTime, precision = 'exact') {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes <= 0) return 0

  switch (precision) {
    case '15min': return Math.floor(minutes / 15) * 15 / 60
    case '30min': return Math.floor(minutes / 30) * 30 / 60
    case '60min': return Math.floor(minutes / 60)
    case 'exact':
    default:     return Math.round(minutes / 60 * 100) / 100
  }
}

/**
 * 根据 day_type 获取对应时薪费率
 */
export function getRateByType(dayType, project, salaryConfig) {
  const key = dayType + '_rate'  // weekday_rate | weekend_rate | holiday_rate
  if (project?.[key] > 0) return project[key]
  if (salaryConfig?.[key] > 0) return salaryConfig[key]
  return 0
}

/**
 * 补贴金额求和（兼容嵌套对象和扁平数字）
 */
export function calcSubsidies(subsidies) {
  if (!subsidies) return 0
  if (typeof subsidies === 'object') {
    return (subsidies.night_shift || 0) + (subsidies.meal || 0) + (subsidies.transport || 0)
  }
  return Number(subsidies) || 0
}

/**
 * 扣款金额取值（兼容嵌套对象和扁平数字）
 */
export function calcDeduction(deduction) {
  if (!deduction) return 0
  if (typeof deduction === 'object') return Number(deduction.amount) || 0
  return Number(deduction) || 0
}

/**
 * 计算单条记录的应付金额 pay
 */
export function calcPay(record, project, salaryConfig) {
  switch (record.pay_mode) {
    case 'daily': {
      const rate = record.daily_rate || project?.daily_rate || salaryConfig?.daily_rate || 0
      return round2((record.days || 0) * rate)
    }
    case 'piece': {
      const rate = record.piece_rate || project?.piece_rate || salaryConfig?.piece_rate || 0
      return round2((record.quantity || 0) * rate)
    }
    case 'hourly':
    default: {
      const rate = record.rate || getRateByType(record.day_type || 'weekday', project, salaryConfig)
      return round2((record.duration || 0) * rate)
    }
  }
}

/**
 * 计算净额 net_pay = pay + 补贴 - 扣款
 */
export function calcNetPay(record, project, salaryConfig) {
  const pay = record.pay ?? calcPay(record, project, salaryConfig)
  return round2(pay + calcSubsidies(record.subsidies) - calcDeduction(record.deduction))
}

/**
 * 保留两位小数
 */
export function round2(n) {
  return Math.round(n * 100) / 100
}
```

### 4.2 影响范围

以下文件中的内联计算逻辑需删除，改为 `import { calcPay, calcNetPay } from '@/utils/calculator'`：

- `stores/workStore.js` — 删除 `calculatePay()` 方法
- `pages/record/record.vue` — `estimatedPay`/`dailyPay`/`piecePay`/`netPay` 改用 calculator
- `pages/index/index.vue` — `totalPay` 等改用 calculator（或直接用 store getter）
- `pages/reconciliation/recon.vue` — 汇总计算改用 calculator

---

## 五、Layer 2：Store 层重构

### 5.1 新建 `stores/holidayStore.js`

将 `utils/holidays.js` 的全部逻辑迁移为 Pinia Store，提供响应式能力：

```js
// stores/holidayStore.js
import { defineStore } from 'pinia'

export const useHolidayStore = defineStore('holiday', {
  state: () => ({
    holidays: {},    // { '2026-01-01': '元旦', ... }
    makeupDays: {},  // { '2026-01-04': true, ... }
    year: new Date().getFullYear()
  }),

  getters: {
    getDayType: (state) => (dateStr) => {
      if (state.holidays[dateStr]) return 'holiday'
      if (state.makeupDays[dateStr]) return 'weekday'
      const day = new Date(dateStr).getDay()
      return (day === 0 || day === 6) ? 'weekend' : 'weekday'
    },

    checkHoliday: (state) => (dateStr) => {
      const name = state.holidays[dateStr]
      return { isHoliday: !!name, name: name || '' }
    }
  },

  actions: {
    loadFromLocal() { /* 从 localStorage 'holiday_data' 加载 */ },
    async fetchFromCloud() { /* 从云函数 holiday-data 拉取 */ }
  }
})
```

### 5.2 删除 `utils/holidays.js`

逻辑全部迁入 `holidayStore`，原文件删除。所有引用改为：
```js
import { useHolidayStore } from '@/stores/holidayStore'
const holidayStore = useHolidayStore()
holidayStore.getDayType(dateStr)
```

### 5.3 重命名 `stores/overtimeStore.js` → `stores/workStore.js`

| 改动 | 说明 |
|------|------|
| 文件名 | `overtimeStore.js` → `workStore.js` |
| Store ID | `defineStore('overtime', ...)` → `defineStore('work', ...)` |
| 导出名 | `useOvertimeStore` → `useWorkStore` |
| 内部集合名 | `collection('overtime_records')` → `collection('work_records')` |
| 内部函数 | `callOvertime()` → `callWork()` |
| 删除 `calculatePay()` 方法 | 移入 calculator.js |
| 新增 getter `monthTotalDays` | `sum(days)` for daily records |
| 新增 getter `monthTotalQuantity` | `sum(quantity)` for piece records |
| 新增 getter `monthTotalPay` | `sum(pay)` for all records |
| 新增 getter `monthBreakdown` | `{ weekday: {pay, hours, days, qty}, weekend: {...}, holiday: {...} }` |
| 修复 `addRecord()` 重复 `pay_mode` 赋值 | 删除第二次 `pay_mode: payMode`（当前 L133 和 L140 重复） |
| `addRecord()` 用 `calcPay`/`calcNetPay` | 替代手动计算 |

---

## 六、Layer 3：页面层逐文件修复

### 6.1 record.vue（7 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| R1 | 编辑模式不加载项目列表 | `onLoad` 中无论编辑还是新建都调 `loadProjectPicker()`；编辑时回填 `selectedProjectId` |
| R2 | 补贴/扣款 UI 缺失 | 在三种模式 template 各加一个"补贴 & 扣款"折叠区：夜班补贴/餐补/交通补贴 三个 input + 扣款金额/原因 |
| R3 | 结算 toggle 缺失 | 表单底部加 Switch 行："已结算"，v-model 绑定 `settled` |
| R4 | 常用短语 UI 缺失 | 备注输入框下方加横向滚动的短语标签行，点击填入备注 |
| R5 | addRecord `pay_mode` 重复 | 删除 `addRecord` 中的第二次 `pay_mode: payMode` 赋值（workStore.js 对应行） |
| R6 | "今日已记"标签误导 | 改为"{{ displayDate }} 已记"，明确按选中日期统计 |
| R7 | 日薪/计件零费率校验 | `handleSave` 中日薪模式加 `daily_rate <= 0` 检查，计件加 `piece_rate <= 0` 检查，弹 Toast |

### 6.2 index.vue（2 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| I1 | breakdown 只显示小时 | 平日/周末/节假日三档同时显示 pay 合计（`weekdayPay`/`weekendPay`/`holidayPay`） |
| I2 | FAB 跳转逻辑 | `goRecord()` 先查 `projectStore.activeProjects`，为空跳 project-edit，否则带第一个项目跳 record |

### 6.3 stats.vue（5 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| S1 | 月汇总只显示"总工时" | 动态列：`totalDays>0` 显示"X天"，`totalQty>0` 显示"X件"，`totalHours>0` 显示"Xh" |
| S2 | 环形图仅用 duration | pieData 改用三类型各自的 `pay` 合计，统一用金额度量 |
| S3 | 图例无模式明细 | breakdown-row 加 "时薪Xh 日薪X天 计件X件" 明细 |
| S4 | 柱状图仅用 duration | 周趋势 axis 改为 pay（元），统一用金额 |
| S5 | 项目统计固定"h" | 按项目 `pay_mode` 显示 "X天"/"X件"/"Xh" |

### 6.4 recon.vue（3 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| C1 | settledCount 未初始化 | 在 `groups[key]` 初始化时补 `settledCount: 0, unsettledCount: 0` |
| C2 | 长图底部硬编码小时 | 动态文案：`[totalHours>0 ? hours+'小时' : ''] [totalDays>0 ? days+'天' : ''] [totalQty>0 ? qty+'件' : '']` |
| C3 | 底部缺少"未结算合计" | 补 `unsettledSum` computed + 底部汇总行 |

### 6.5 salary.vue（1 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| A1 | 重算依赖云函数 | 改为本地重算：遍历当月 records，用 `calculator.calcPay` + `calculator.calcNetPay` 重算，直接更新 workStore |

### 6.6 project-edit.vue（2 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| P1 | 缺少删除按钮 | 编辑模式下底部加红色"删除项目"按钮，带确认弹窗，调用 `projectStore.deleteProject` |
| P2 | v-model.number + parseFloat 重复 | 移除 `handleSave` 中的 `parseFloat`/`parseInt`，v-model.number 已处理 |

### 6.7 projects.vue（1 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| P3 | 删除功能无 UI | 每张项目卡片右侧加删除小图标，点击弹出确认弹窗，确认后调 `confirmDelete`（方法已存在但未绑定 UI） |

### 6.8 batch-record.vue（1 项修复）

| # | 问题 | 修复方案 |
|---|------|---------|
| B1 | 保存不传 rate/pay/net_pay | `handleBatchSave` 中为每条 record 预计算：用 `calculator.calcDuration`、`calculator.calcPay`、`calculator.calcNetPay` 填充字段 |

---

## 七、云函数层重构

### 7.1 目录 & 集合名

```
uniCloud-aliyun/cloudfunctions/overtime-calc/  →  work-calc/
```

云函数内所有 `db.collection('overtime-record')` → `db.collection('work-record')`（共 12 处）。

### 7.2 字段名替换

| 位置 | 当前 | 改为 |
|------|------|------|
| `getMonthlySummary()` | `breakdown[r.overtime_type]` | `breakdown[r.day_type]` |
| `recalcMonth()` | `rateMap[rec.overtime_type]` | `rateMap[rec.day_type]` |
| `validateRecord()` | `record.overtime_type` | `record.day_type` |
| schema `required` | `"overtime_type"` | `"day_type"` |

### 7.3 JWT Secret

```js
// 当前
const SECRET = 'overtime-app-jwt-secret-change-in-production'
// 改为
const SECRET = 'work-app-jwt-secret-change-in-production'
```

注意：改 secret 会使所有已登录用户 token 失效，放最后执行。

### 7.4 汇总函数补字段

`getMonthlySummary()` 和 `getYearStats()` 当前只返回 `totalHours`、`totalPay`，需增加：
- `totalDays`：`records.reduce((s, r) => s + (r.days || 0), 0)`
- `totalQuantity`：`records.reduce((s, r) => s + (r.quantity || 0), 0)`

### 7.5 Schema 更新

`overtime-record.schema.json` → `work-record.schema.json`：
- `overtime_type` → `day_type`（字段名 + required 数组 + enum）
- 所有 description 中的"加班" → "记工"

---

## 八、完整命名映射表

### 8.1 目录 & 文件

| 当前 | 改为 |
|------|------|
| `加班工时记账/` | `记工算工钱/` |
| `stores/overtimeStore.js` | `stores/workStore.js` |
| `utils/holidays.js` | 删除，逻辑迁入 `stores/holidayStore.js` |
| `utils/calculator.js` | 新建 |
| `cloudfunctions/overtime-calc/` | `cloudfunctions/work-calc/` |
| `database/overtime-record.schema.json` | `database/work-record.schema.json` |

### 8.2 数据库

| 当前 | 改为 |
|------|------|
| 集合 `overtime-record`（云端） | `work-record` |
| 集合 `overtime_records`（本地存储） | `work_records` |
| 字段 `overtime_type` | `day_type` |

### 8.3 Store

| 当前 | 改为 |
|------|------|
| `defineStore('overtime', ...)` | `defineStore('work', ...)` |
| `useOvertimeStore()` | `useWorkStore()` |
| `callOvertime()` | `callWork()` |
| `calculatePay()` | 删除（移入 calculator.js） |
| 云函数名 `'overtime-calc'` | `'work-calc'` |

### 8.4 constants.js

| 当前 | 改为 |
|------|------|
| `OVERTIME_TYPES` 枚举 | `DAY_TYPES` |
| `STORAGE_KEYS.LOCAL_RECORDS: 'local:overtime_records'` | `'local:work_records'` |
| 文件头注释 `加班工时记账 — 全局常量` | `记工算工钱 — 全局常量` |
| `COMMON_PHRASES`（白领短语） | 替换为蓝领场景短语（见下方） |

新 `COMMON_PHRASES`：
```js
export const COMMON_PHRASES = [
  '赶工期',
  '晚上加班',
  '周末补工',
  '节假日值班',
  '临时加单',
  '帮忙顶班',
  '材料搬运',
  '设备检修',
  '清理场地',
  '培训学习'
]
```

### 8.5 页面 import 路径

所有页面的 `import { useOvertimeStore } from '@/stores/overtimeStore'` 改为：
```js
import { useWorkStore } from '@/stores/workStore'
```

影响的页面（13 个）：index, record, batch-record, stats, recon, salary, projects, project-edit, clock, login, splash, profile, feedback

### 8.6 页面文案

模板中的"加班时长"→"记工时长"，"加班类型"→"日期类型"，"加班费"→"工钱"等，逐文件处理。

---

## 九、不涉及的范围

- 新增页面、新增功能（本次纯修正，不加功能）
- 云同步机制（已有，不变）
- 深色模式（已有，不变）
- 设计系统色值/字体（已有，不变）
- 包工/合同制模式（后续版本）
- 班组/团队功能（后续版本）
- 请假/迟到/早退字段（后续版本）

---

## 十、实施顺序

按三层递进，每层完成后可独立验证：

```
Phase 0: 项目重命名（一次性）
  ├─ 目录名: 加班工时记账 → 记工算工钱
  ├─ manifest.json app name
  └─ 全局搜索替换文案 "加班" → "记工"

Phase 1: calculator.js + holidayStore.js 创建
  └─ 验证：各文件 import 正常，无编译错误

Phase 2: Store 层重构
  ├─ overtimeStore.js → workStore.js
  ├─ 删除 calculatePay()
  ├─ 新增 getter: monthTotalDays / monthTotalQuantity / monthTotalPay / monthBreakdown
  └─ 验证：addRecord / loadRecords 正常，getter 数据正确

Phase 3: 页面修复（按 P0→P1→P2）
  ├─ P0: record.vue（7 项）— 核心记工流程
  ├─ P0: batch-record.vue（1 项）— 严重 bug
  ├─ P1: index.vue + stats.vue + recon.vue（10 项）— 展示层
  ├─ P2: salary.vue + project-edit.vue + projects.vue（4 项）— 辅助功能
  └─ 验证：3 种计薪模式各走通全流程

Phase 4: 云函数 + Schema
  ├─ overtime-calc → work-calc（重命名 + 字段替换）
  ├─ overtime-record.schema.json → work-record.schema.json
  └─ 验证：云端同步正常

Phase 5: 全量回归验证
  └─ 新建项目 → 记工 → 首页查看 → 统计 → 对账 → 薪资设置
     3 种计薪模式全部覆盖
```
