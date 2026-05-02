# 记工算工钱 — 深度重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"加班工时记账"深度重构为"记工算工钱"——蓝领多模式记工算薪工具，覆盖 23 个 bug 修复 + 全局命名替换 + 统一计算引擎。

**Architecture:** 三层递进：calculator.js 统一计算引擎 → Store 层重构（holidayStore 新建 + workStore 重命名） → 8 页面逐文件修复。每层可独立验证。

**Tech Stack:** uni-app Vue 3 + Pinia + Vite + uniCloud (aliyun) + PGLite local storage + uCharts

---

## 文件结构总览

```
记工算工钱/
├── utils/
│   ├── calculator.js          ← 新建：统一计算引擎
│   ├── constants.js           ← 修改：OVERTIME_TYPES→DAY_TYPES, 短语替换, 存储key改名
│   ├── holidays.js            ← 删除：逻辑迁入 holidayStore
│   ├── date.js                ← 不变
│   ├── theme.js               ← 不变
│   ├── localStore.js          ← 不变（通用层，不感知集合名）
│   ├── device.js              ← 不变
│   └── md5.js                 ← 不变
├── stores/
│   ├── workStore.js           ← 从 overtimeStore.js 重命名+改造
│   ├── holidayStore.js        ← 新建：从 holidays.js 迁移
│   ├── projectStore.js        ← 修改：引用路径
│   ├── salaryStore.js         ← 修改：引用路径
│   └── userStore.js           ← 修改：引用路径
├── pages/
│   ├── record/record.vue      ← 修改：7项修复 + 引用路径
│   ├── batch-record/          ← 修改：1项修复 + 引用路径
│   ├── index/index.vue        ← 修改：2项修复 + 引用路径
│   ├── stats/stats.vue        ← 修改：5项修复 + 引用路径
│   ├── reconciliation/recon.vue ← 修改：3项修复 + 引用路径
│   ├── salary/salary.vue      ← 修改：1项修复 + 引用路径
│   ├── project-edit/          ← 修改：2项修复 + 引用路径
│   ├── projects/projects.vue  ← 修改：1项修复 + 引用路径
│   ├── clock/clock.vue        ← 修改：引用路径
│   ├── login/login.vue        ← 修改：引用路径
│   ├── splash/splash.vue      ← 修改：引用路径
│   ├── profile/profile.vue    ← 修改：引用路径
│   └── feedback/feedback.vue  ← 修改：引用路径
├── uniCloud-aliyun/
│   ├── cloudfunctions/
│   │   └── work-calc/         ← 从 overtime-calc 重命名
│   └── database/
│       └── work-record.schema.json ← 从 overtime-record 重命名
├── manifest.json              ← 修改：app名称
└── pages.json                 ← 修改：文案
```

---

### Task 1: Phase 0 — 项目目录重命名 + manifest.json

**Files:**
- Rename: `加班工时记账/` → `记工算工钱/`
- Modify: `记工算工钱/manifest.json`

- [ ] **Step 1: 重命名项目根目录**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
mv "加班工时记账" "记工算工钱"
```

- [ ] **Step 2: 修改 manifest.json 中的 app 名称**

编辑 `记工算工钱/manifest.json`，将第2行：
```json
"name" : "加班工时记账",
```
改为：
```json
"name" : "记工算工钱",
```

并将第4行 description 改为：
```json
"description" : "记加班·记工时·记计件·日薪工资计算器。建筑工工厂工小时工通用的记工本，支持按时、按天、按件三种方式记工，自动算工钱，明白赚钱不吃亏",
```

- [ ] **Step 3: 更新 pages.json 中的文案**

编辑 `记工算工钱/pages.json`，确认 tabBar 文字已是"记账/统计/我的"（无需改动）。如有页面 title 含"加班"则替换为"记工"。

- [ ] **Step 4: 验证目录结构**

```bash
ls "C:\Users\86136\Desktop\Overtime_Hours_Accounting\记工算工钱"
```

确认所有子目录完整。

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add -A
git commit -m "refactor: 项目重命名 加班工时记账 → 记工算工钱

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Phase 1 — 创建 utils/calculator.js

**Files:**
- Create: `记工算工钱/utils/calculator.js`

- [ ] **Step 1: 创建 calculator.js**

写入以下内容到 `记工算工钱/utils/calculator.js`：

```js
/**
 * 记工算工钱 — 统一计算引擎
 * 所有金额计算收敛到此文件，作为唯一入口。
 * 页面和 Store 不自行计算金额。
 */

/**
 * 计算时长（小时）
 * @param {string} startTime HH:MM
 * @param {string} endTime HH:MM
 * @param {string} precision '15min'|'30min'|'60min'|'exact'
 * @returns {number} 小时数
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
 * @param {string} dayType 'weekday'|'weekend'|'holiday'
 * @param {object} project 项目配置
 * @param {object} salaryConfig 全局薪资配置
 * @returns {number} 时薪费率
 */
export function getRateByType(dayType, project, salaryConfig) {
  const key = dayType + '_rate'
  if (project?.[key] > 0) return project[key]
  if (salaryConfig?.[key] > 0) return salaryConfig[key]
  return 0
}

/**
 * 补贴金额求和（兼容嵌套对象和扁平数字）
 * @param {object|number} subsidies {night_shift, meal, transport} 或数字
 * @returns {number}
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
 * @param {object|number} deduction {amount, note} 或数字
 * @returns {number}
 */
export function calcDeduction(deduction) {
  if (!deduction) return 0
  if (typeof deduction === 'object') return Number(deduction.amount) || 0
  return Number(deduction) || 0
}

/**
 * 计算单条记录的应付金额 pay
 * @param {object} record 记工记录
 * @param {object} project 项目配置
 * @param {object} salaryConfig 全局薪资配置
 * @returns {number}
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
 * @param {object} record 记工记录（需含 pay 字段或可计算）
 * @param {object} project 项目配置
 * @param {object} salaryConfig 全局薪资配置
 * @returns {number}
 */
export function calcNetPay(record, project, salaryConfig) {
  const pay = record.pay ?? calcPay(record, project, salaryConfig)
  return round2(pay + calcSubsidies(record.subsidies) - calcDeduction(record.deduction))
}

/**
 * 保留两位小数
 * @param {number} n
 * @returns {number}
 */
export function round2(n) {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 2: 验证文件语法（通过编译器检查）**

在 HBuilder X 中打开项目，确认 `utils/calculator.js` 无红色波浪线。

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/utils/calculator.js"
git commit -m "feat: 新建 calculator.js 统一计算引擎

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Phase 1 — 创建 stores/holidayStore.js 并删除 utils/holidays.js

**Files:**
- Create: `记工算工钱/stores/holidayStore.js`
- Delete: `记工算工钱/utils/holidays.js`

- [ ] **Step 1: 创建 holidayStore.js**

写入以下内容到 `记工算工钱/stores/holidayStore.js`：

```js
import { defineStore } from 'pinia'

const STATIC_HOLIDAYS = {
  '2026-01-01': '元旦', '2026-01-02': '元旦', '2026-01-03': '元旦',
  '2026-02-15': '春节', '2026-02-16': '春节', '2026-02-17': '春节',
  '2026-02-18': '春节', '2026-02-19': '春节', '2026-02-20': '春节',
  '2026-02-21': '春节', '2026-02-22': '春节', '2026-02-23': '春节',
  '2026-04-04': '清明节', '2026-04-05': '清明节', '2026-04-06': '清明节',
  '2026-05-01': '劳动节', '2026-05-02': '劳动节', '2026-05-03': '劳动节',
  '2026-05-04': '劳动节', '2026-05-05': '劳动节',
  '2026-06-19': '端午节', '2026-06-20': '端午节', '2026-06-21': '端午节',
  '2026-09-25': '中秋节', '2026-09-26': '中秋节', '2026-09-27': '中秋节',
  '2026-10-01': '国庆节', '2026-10-02': '国庆节', '2026-10-03': '国庆节',
  '2026-10-04': '国庆节', '2026-10-05': '国庆节', '2026-10-06': '国庆节',
  '2026-10-07': '国庆节',
}

const STATIC_MAKEUP_DAYS = {
  '2026-01-04': true,
  '2026-02-14': true, '2026-02-28': true,
  '2026-05-09': true,
  '2026-09-20': true, '2026-10-10': true,
}

const CACHE_KEY = 'holiday_data'
const CACHE_YEAR_KEY = 'holiday_data_year'

export const useHolidayStore = defineStore('holiday', {
  state: () => ({
    holidays: { ...STATIC_HOLIDAYS },
    makeupDays: { ...STATIC_MAKEUP_DAYS },
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
    },

    calcRatesFromSalary: () => (monthlySalary) => {
      if (!monthlySalary || monthlySalary <= 0) return { weekday_rate: 0, weekend_rate: 0, holiday_rate: 0 }
      const hourly = monthlySalary / 21.75 / 8
      return {
        weekday_rate: Math.round(hourly * 1.5 * 100) / 100,
        weekend_rate: Math.round(hourly * 2.0 * 100) / 100,
        holiday_rate: Math.round(hourly * 3.0 * 100) / 100,
      }
    }
  },

  actions: {
    mergeCloudData(holidaysList, makeupDaysList) {
      if (holidaysList) holidaysList.forEach(d => { if (!this.holidays[d]) this.holidays[d] = '法定节假日' })
      if (makeupDaysList) makeupDaysList.forEach(d => { this.makeupDays[d] = true })
    },

    loadFromLocal() {
      try {
        const cachedYear = uni.getStorageSync(CACHE_YEAR_KEY)
        if (cachedYear === this.year) {
          const raw = uni.getStorageSync(CACHE_KEY)
          if (raw) {
            const data = JSON.parse(raw)
            this.mergeCloudData(data.holidays, data.makeupDays)
          }
        }
      } catch { /* ignore */ }
    },

    async fetchFromCloud() {
      this.loadFromLocal()

      try {
        const result = await uniCloud.callFunction({
          name: 'holiday-data',
          data: { action: 'query', year: this.year }
        })
        if (result.result && result.result.code === 0) {
          const data = result.result.data
          this.mergeCloudData(data.holidays, data.makeupDays)
          uni.setStorageSync(CACHE_KEY, JSON.stringify({
            holidays: data.holidays || [],
            makeupDays: data.makeupDays || []
          }))
          uni.setStorageSync(CACHE_YEAR_KEY, this.year)
        }
      } catch (e) {
        console.log('[holidayStore] 云端拉取失败，使用本地数据:', e.message)
      }
    }
  }
})
```

- [ ] **Step 2: 删除 utils/holidays.js**

```bash
rm "记工算工钱/utils/holidays.js"
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/stores/holidayStore.js"
git rm "记工算工钱/utils/holidays.js"
git commit -m "refactor: holidays.js 迁移为 Pinia holidayStore

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Phase 1 — 更新 constants.js

**Files:**
- Modify: `记工算工钱/utils/constants.js`

- [ ] **Step 1: 替换 OVERTIME_TYPES → DAY_TYPES，更新存储 key，替换常用短语**

对 `记工算工钱/utils/constants.js` 做以下修改：

**修改1** — 文件头注释（第2行）：
```js
// 当前
 * 加班工时记账 — 全局常量
// 改为
 * 记工算工钱 — 全局常量
```

**修改2** — 枚举名（第16行）：
```js
// 当前
export const OVERTIME_TYPES = [
	{ value: 'weekday', label: '工作日加班' },
	{ value: 'weekend', label: '周末加班' },
	{ value: 'holiday', label: '法定节假日' }
]
// 改为
export const DAY_TYPES = [
	{ value: 'weekday', label: '平日' },
	{ value: 'weekend', label: '周末' },
	{ value: 'holiday', label: '节假日' }
]
```

**修改3** — 存储 key（第55行）：
```js
// 当前
LOCAL_RECORDS: 'local:overtime_records',
// 改为
LOCAL_RECORDS: 'local:work_records',
```

**修改4** — COMMON_PHRASES（第77-90行），整个数组替换为：
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

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/utils/constants.js"
git commit -m "refactor: constants.js OVERTIME_TYPES→DAY_TYPES, 存储key改名, 蓝领短语

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Phase 2 — 重命名 overtimeStore.js → workStore.js

**Files:**
- Rename: `记工算工钱/stores/overtimeStore.js` → `记工算工钱/stores/workStore.js`
- Modify: `记工算工钱/stores/workStore.js`

- [ ] **Step 1: 重命名文件**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
mv "记工算工钱/stores/overtimeStore.js" "记工算工钱/stores/workStore.js"
```

- [ ] **Step 2: 修改 workStore.js 内部代码**

对 `记工算工钱/stores/workStore.js` 做以下修改：

**修改1** — 集合名（第5行）：
```js
// 当前
const col = collection('overtime_records')
// 改为
const col = collection('work_records')
```

**修改2** — 函数名 callOvertime → callWork（第15行）：
```js
// 当前
async function callOvertime(action, data = {}) {
// 改为
async function callWork(action, data = {}) {
```

**修改3** — 云函数名（第18行）：
```js
// 当前
name: 'overtime-calc',
// 改为
name: 'work-calc',
```

**修改4** — defineStore ID（第26行）：
```js
// 当前
export const useOvertimeStore = defineStore('overtime', {
// 改为
export const useWorkStore = defineStore('work', {
```

**修改5** — 删除 calculatePay() 方法（第83-100行），替换为从 calculator 导入。在文件顶部 import 区添加：
```js
import { calcPay, calcNetPay } from '@/utils/calculator'
```

然后删除 `calculatePay(record, project, salaryConfig) { ... }` 整个方法（第83-100行）。

**修改6** — 修复 addRecord() 中重复的 pay_mode（第132-140行）。当前代码：
```js
async addRecord(record) {
    const owner = getOwner()
    const payMode = record.pay_mode || 'hourly'
    const doc = {
        pay_mode: payMode,
        days: payMode === 'daily' ? (record.days || 1) : 1,
        quantity: payMode === 'piece' ? (record.quantity || 0) : 0,
        piece_rate: record.piece_rate || 0,
        daily_rate: record.daily_rate || 0,
        ...record,
        pay_mode: payMode,  // ← 删除这行重复的
```
改为（删除第140行的 `pay_mode: payMode,`，因为 `...record` 展开后第133行已设置）：
```js
async addRecord(record) {
    const owner = getOwner()
    const payMode = record.pay_mode || 'hourly'
    const doc = {
        pay_mode: payMode,
        days: payMode === 'daily' ? (record.days || 1) : 1,
        quantity: payMode === 'piece' ? (record.quantity || 0) : 0,
        piece_rate: record.piece_rate || 0,
        daily_rate: record.daily_rate || 0,
        ...record,
        user_id: owner.type === 'user' ? owner.id : null,
        device_id: owner.type === 'device' ? owner.id : null,
        created_at: record.created_at || Date.now(),
        settled: record.settled || false,
        project_id: record.project_id || null,
        subsidies: record.subsidies || { night_shift: 0, meal: 0, transport: 0 },
        deduction: record.deduction || { amount: 0, note: '' }
    }
```

**修改7** — 将所有内部 `callOvertime(` 调用改为 `callWork(`（第207行 sync 调用，第244行 list 调用）。

**修改8** — 新增 getter：monthTotalDays、monthTotalQuantity、monthTotalPay、monthBreakdown。在 getters 区域（`recordDates` 之后）添加：
```js
monthTotalDays: (state) => {
    return state.records
        .filter(r => r.date?.startsWith(state.currentMonth))
        .reduce((sum, r) => sum + (r.days || 0), 0)
},

monthTotalQuantity: (state) => {
    return state.records
        .filter(r => r.date?.startsWith(state.currentMonth))
        .reduce((sum, r) => sum + (r.quantity || 0), 0)
},

monthTotalPay: (state) => {
    return state.records
        .filter(r => r.date?.startsWith(state.currentMonth))
        .reduce((sum, r) => sum + (r.pay || 0), 0)
},

monthBreakdown: (state) => {
    const def = () => ({ pay: 0, hours: 0, days: 0, qty: 0 })
    const bd = { weekday: def(), weekend: def(), holiday: def() }
    state.records
        .filter(r => r.date?.startsWith(state.currentMonth))
        .forEach(r => {
            const type = r.day_type || r.overtime_type || 'weekday'
            if (!bd[type]) bd[type] = def()
            bd[type].pay += r.pay || 0
            bd[type].hours += r.duration || 0
            bd[type].days += r.days || 0
            bd[type].qty += r.quantity || 0
        })
    return bd
},
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/stores/workStore.js"
git rm "记工算工钱/stores/overtimeStore.js"
git commit -m "refactor: overtimeStore→workStore, 删除calculatePay, 新增多模式getter

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Phase 2 — 更新所有 Store 和页面的 import 路径

**Files:**
- Modify: 4 个 Store + 13 个页面文件（所有引用 `overtimeStore` 的文件）

- [ ] **Step 1: 全局搜索替换 import 路径**

在所有 `.js` 和 `.vue` 文件中，将：
```js
import { useOvertimeStore } from '../../stores/overtimeStore'
```
或
```js
import { useOvertimeStore } from '@/stores/overtimeStore'
```
替换为：
```js
import { useWorkStore } from '@/stores/workStore'
```

所有文件中的 `useOvertimeStore()` 调用替换为 `useWorkStore()`。

将 `getOvertimeType` 的 import：
```js
import { getOvertimeType } from '../../utils/holidays.js'
```
替换为：
```js
import { useHolidayStore } from '@/stores/holidayStore'
```

**影响文件清单**：
- `stores/projectStore.js`
- `stores/salaryStore.js`
- `stores/userStore.js`
- `pages/index/index.vue`
- `pages/record/record.vue`
- `pages/batch-record/batch-record.vue`
- `pages/stats/stats.vue`
- `pages/reconciliation/recon.vue`
- `pages/salary/salary.vue`
- `pages/projects/projects.vue`
- `pages/project-edit/project-edit.vue`
- `pages/clock/clock.vue`
- `pages/login/login.vue`
- `pages/splash/splash.vue`
- `pages/profile/profile.vue`
- `pages/feedback/feedback.vue`

使用全局查找替换（VSCode: Ctrl+Shift+H，搜索 `useOvertimeStore`，替换为 `useWorkStore`；搜索 `@/stores/overtimeStore`，替换为 `@/stores/workStore`；搜索 `../../stores/overtimeStore`，替换为 `@/stores/workStore`；搜索 `../../utils/holidays.js`，替换为 `@/stores/holidayStore`）。

- [ ] **Step 2: 更新 record.vue 中 getOvertimeType 调用方式**

在 `record.vue` 中，将：
```js
this.overtimeType = getOvertimeType(date)
```
改为：
```js
const holidayStore = useHolidayStore()
this.dayType = holidayStore.getDayType(date)
```

同时将 data 中的 `overtimeType: 'weekday'` 改为 `dayType: 'weekday'`，`overtimeTypes` 数组改为从 `DAY_TYPES` 导入使用。

类似地更新 `batch-record.vue` 中的调用。

- [ ] **Step 3: 验证编译**

在 HBuilder X 中运行项目，确认无 import 错误。

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add -A
git commit -m "refactor: 全局替换 import useOvertimeStore→useWorkStore, holidays→holidayStore

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Phase 3 P0 — 修复 record.vue（7 项）

**Files:**
- Modify: `记工算工钱/pages/record/record.vue`

- [ ] **Step 1: R1 — 编辑模式加载项目列表**

在 `onLoad(options)` 方法中，确保无论编辑还是新建都调用 `loadProjectPicker()`。当前代码第356-359行只在 else 分支（新建）调用了 `loadProjectPicker()`，需在编辑分支也调用：

```js
onLoad(options) {
    if (options.date) this.pickerDate = options.date
    this.loadProjectPicker()  // 移到 if 之前，确保始终调用
    if (options.id) {
        this.editId = options.id
        const store = useWorkStore()
        const rec = store.records.find(r => r.id === options.id)
        if (rec) {
            this.pickerDate = rec.date
            this.startTime = rec.start_time
            this.endTime = rec.end_time
            this.pickerStartTime = rec.start_time
            this.pickerEndTime = rec.end_time
            this.overtimeType = rec.overtime_type  // 改为 this.dayType = rec.day_type || rec.overtime_type
            this.remark = rec.remark || ''
            this.projectName = rec.project_name || ''
            this.selectedProjectId = rec.project_id || null
            this.subsidies = rec.subsidies || { night_shift: 0, meal: 0, transport: 0 }
            this.deduction = rec.deduction || { amount: 0, note: '' }
            this.settled = rec.settled || false
            if (rec.pay_mode === 'daily') this.dailyDays = rec.days || 1
            if (rec.pay_mode === 'piece') this.pieceQuantity = rec.quantity || 0
            // 回填项目选择器状态
            if (rec.project_id) this.selectedProjectId = rec.project_id
        }
    } else {
        this.autoDetectType(this.pickerDate)
    }
},
```

- [ ] **Step 2: R2 — 补贴/扣款 UI**

在三种模式 template 的备注区域下方各加一个折叠区：

在时薪模式 `</template>` 之前（备注 textarea 之后）、日薪模式 `</template>` 之前、计件模式 `</template>` 之前，各添加：

```html
<!-- 补贴 & 扣款 -->
<view class="subsidy-section">
    <view class="subsidy-section__header" @tap="showSubsidy = !showSubsidy">
        <text class="subsidy-section__title">补贴 & 扣款</text>
        <text class="subsidy-section__toggle">{{ showSubsidy ? '收起' : '展开' }}</text>
    </view>
    <view class="subsidy-section__body" v-if="showSubsidy">
        <view class="subsidy-row">
            <text class="subsidy-row__label">夜班补贴</text>
            <view class="subsidy-row__input-wrap">
                <text class="subsidy-row__prefix">¥</text>
                <input class="subsidy-row__input" type="digit" v-model.number="subsidies.night_shift" placeholder="0" />
            </view>
        </view>
        <view class="subsidy-row">
            <text class="subsidy-row__label">餐补</text>
            <view class="subsidy-row__input-wrap">
                <text class="subsidy-row__prefix">¥</text>
                <input class="subsidy-row__input" type="digit" v-model.number="subsidies.meal" placeholder="0" />
            </view>
        </view>
        <view class="subsidy-row">
            <text class="subsidy-row__label">交通补贴</text>
            <view class="subsidy-row__input-wrap">
                <text class="subsidy-row__prefix">¥</text>
                <input class="subsidy-row__input" type="digit" v-model.number="subsidies.transport" placeholder="0" />
            </view>
        </view>
        <view class="subsidy-divider"></view>
        <view class="subsidy-row">
            <text class="subsidy-row__label">扣款金额</text>
            <view class="subsidy-row__input-wrap">
                <text class="subsidy-row__prefix">¥</text>
                <input class="subsidy-row__input" type="digit" v-model.number="deduction.amount" placeholder="0" />
            </view>
        </view>
        <view class="subsidy-row">
            <text class="subsidy-row__label">扣款原因</text>
            <input class="subsidy-row__note" type="text" v-model="deduction.note" placeholder="选填" />
        </view>
    </view>
</view>
```

在 data() 中添加：`showSubsidy: false`

- [ ] **Step 3: R3 — 结算 toggle**

在补贴区下方（或备注下方、保存按钮上方）添加：

```html
<view class="settle-row">
    <text class="settle-row__label">已结算</text>
    <switch :checked="settled" @change="settled = $event.detail.value" color="#1B8A5A" />
</view>
```

data 中已有 `settled: false`，无需改动。

- [ ] **Step 4: R4 — 常用短语 UI**

在备注 textarea 下方添加：

```html
<view class="phrase-row">
    <text
        v-for="(p, idx) in commonPhrases"
        :key="idx"
        class="phrase-tag"
        @tap="remark = p"
    >{{ p }}</text>
</view>
```

data 中已有 `commonPhrases: COMMON_PHRASES`，无需改动。

- [ ] **Step 5: R5 — 修复 addRecord pay_mode 重复（已在 Task 5 修复）**

确认 Task 5 中已删除第二次 `pay_mode: payMode` 赋值。

- [ ] **Step 6: R6 — "今日已记"标签修正**

日薪模式 template 中第100行：
```html
今日已记 {{ monthDailyCount }} 天 · 本月 ¥{{ monthDailyPay.toFixed(0) }}
```
改为：
```html
{{ displayDate }} 已记 {{ monthDailyCount }} 天 · 本月 ¥{{ monthDailyPay.toFixed(0) }}
```

- [ ] **Step 7: R7 — 日薪/计件零费率校验**

在 `handleSave()` 方法中，日薪模式验证后添加：
```js
if (payMode === 'daily' && this.projectDailyRate <= 0) {
    uni.showToast({ title: '该项目未设置日薪金额，请前往薪资设置', icon: 'none' }); return
}
```
计件模式验证后添加：
```js
if (payMode === 'piece' && this.projectPieceRate <= 0) {
    uni.showToast({ title: '该项目未设置计件单价，请前往薪资设置', icon: 'none' }); return
}
```

- [ ] **Step 8: 样式补充**

在 `<style>` 中添加 subsidy-section、settle-row、phrase-row 的样式：

```scss
.subsidy-section {
    margin-top: 12px;
    background: var(--surface-card);
    border-radius: 12px;
    border: 1px solid var(--border);
    overflow: hidden;

    &__header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px;
    }
    &__title { font-size: 14px; color: var(--text-primary); font-weight: 500; }
    &__toggle { font-size: 12px; color: var(--text-muted); }
    &__body { padding: 0 16px 12px; }
}

.subsidy-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0;

    &__label { font-size: 14px; color: var(--text-secondary); }
    &__input-wrap { display: flex; align-items: center; }
    &__prefix { font-size: 14px; color: var(--text-muted); margin-right: 4px; }
    &__input { width: 80px; text-align: right; font-size: 16px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border); padding: 4px 0; }
    &__note { flex: 1; text-align: right; font-size: 14px; color: var(--text-primary); max-width: 160px; }
}

.subsidy-divider {
    height: 1px; background: var(--border); margin: 4px 0;
}

.settle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: var(--surface-card);
    border-radius: 12px; border: 1px solid var(--border); margin-top: 12px;

    &__label { font-size: 14px; color: var(--text-primary); }
}

.phrase-row {
    display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
}

.phrase-tag {
    padding: 4px 10px; border-radius: 12px;
    background: var(--primary-light); color: var(--primary);
    font-size: 11px;
}
```

- [ ] **Step 9: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/record/record.vue"
git commit -m "fix: record.vue 7项修复 — 编辑加载项目/补贴扣款UI/结算toggle/短语/零费率校验

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Phase 3 P0 — 修复 batch-record.vue（1 项）

**Files:**
- Modify: `记工算工钱/pages/batch-record/batch-record.vue`

- [ ] **Step 1: B1 — handleBatchSave 预计算 pay/net_pay**

在 `handleBatchSave()` 方法中，为每条 record 补充计算的 `rate`、`pay`、`net_pay` 字段。当前代码（第204-218行）的 record 对象缺少这些字段，需改为：

```js
async handleBatchSave() {
    if (this.saving || this.previewDates.length === 0) return

    const h = parseFloat(this.duration) || 0
    if (h <= 0) {
        uni.showToast({ title: '请设置有效时间', icon: 'none' })
        return
    }

    this.saving = true
    const store = useWorkStore()
    const pStore = useProjectStore()
    const salaryStore = useSalaryStore()
    const proj = this.selectedProjectId ? pStore.getProjectById(this.selectedProjectId) : null
    const salaryConfig = salaryStore.config
    let success = 0
    let fail = 0

    for (const item of this.previewDates) {
        try {
            const durationVal = parseFloat(this.duration) || 0
            const rate = proj
                ? (proj[item.type + '_rate'] || salaryStore.rateByType(item.type))
                : salaryStore.rateByType(item.type)
            const pay = Math.round(durationVal * rate * 100) / 100
            const subs = { night_shift: 0, meal: 0, transport: 0 }
            const deduct = { amount: 0, note: '' }
            const netPay = pay // 无补贴扣款时 netPay === pay

            const record = {
                date: item.date,
                pay_mode: 'hourly',
                remark: this.remark,
                project_id: this.selectedProjectId,
                project_name: proj ? proj.name : '',
                photos: [],
                settled: false,
                subsidies: subs,
                deduction: deduct,
                start_time: this.startTime,
                end_time: this.endTime,
                duration: durationVal,
                day_type: item.type,
                rate: rate,
                pay: pay,
                net_pay: netPay
            }

            const res = await store.addRecord(record)
            if (res && !res.duplicated) success++
            else fail++
        } catch (e) {
            fail++
        }
    }

    this.saving = false
    uni.showToast({ title: `创建 ${success} 条${fail > 0 ? '，' + fail + ' 条重复' : ''}`, icon: 'success' })
    setTimeout(() => { uni.navigateBack() }, 1000)
}
```

同时更新 import：
```js
import { useWorkStore } from '@/stores/workStore'
import { useSalaryStore } from '@/stores/salaryStore'
import { useHolidayStore } from '@/stores/holidayStore'
```

并将 `getOvertimeType(dateStr)` 调用改为 `useHolidayStore().getDayType(dateStr)`。

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/batch-record/batch-record.vue"
git commit -m "fix: batch-record 保存预计算 rate/pay/net_pay, overtime_type→day_type

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Phase 3 P1 — 修复 index.vue（2 项）

**Files:**
- Modify: `记工算工钱/pages/index/index.vue`

- [ ] **Step 1: I1 — breakdown 同时显示 pay**

当前 breakdown 只显示 `weekdayHours`、`weekendHours`、`holidayHours`（纯小时数）。已确认 template 中第34-44行已使用 `totalHours`/`totalDays`/`totalQuantity` 做摘要行展示。breakdown 区域需要增加 pay 显示。

修改 breakdown 区域的显示（第32-45行），每项从只显示 hours 改为同时显示 pay：

```html
<view class="summary-card__breakdown">
    <view class="summary-card__breakdown-item">
        <text class="summary-card__breakdown-label">平日</text>
        <text class="summary-card__breakdown-value">{{ weekdayHours }}h</text>
        <text class="summary-card__breakdown-pay" v-if="weekdayPay > 0">¥{{ weekdayPay.toFixed(0) }}</text>
    </view>
    <view class="summary-card__breakdown-item">
        <text class="summary-card__breakdown-label">周末</text>
        <text class="summary-card__breakdown-value">{{ weekendHours }}h</text>
        <text class="summary-card__breakdown-pay" v-if="weekendPay > 0">¥{{ weekendPay.toFixed(0) }}</text>
    </view>
    <view class="summary-card__breakdown-item">
        <text class="summary-card__breakdown-label">节假日</text>
        <text class="summary-card__breakdown-value">{{ holidayHours }}h</text>
        <text class="summary-card__breakdown-pay" v-if="holidayPay > 0">¥{{ holidayPay.toFixed(0) }}</text>
    </view>
</view>
```

在 computed 中新增 weekdayPay/weekendPay/holidayPay：
```js
weekdayPay() {
    return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekday').reduce((s, r) => s + (r.pay || 0), 0)
},
weekendPay() {
    return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekend').reduce((s, r) => s + (r.pay || 0), 0)
},
holidayPay() {
    return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'holiday').reduce((s, r) => s + (r.pay || 0), 0)
},
```

- [ ] **Step 2: I2 — FAB 跳转逻辑**

修改 `goRecord()` 方法，先检查是否有项目，没有再跳 project-edit：

```js
goRecord() {
    const pStore = useProjectStore()
    if (pStore.activeProjects.length === 0) {
        uni.navigateTo({ url: '/pages/project-edit/project-edit' })
    } else {
        const firstProj = pStore.activeProjects[0]
        uni.navigateTo({ url: '/pages/record/record?projectId=' + firstProj._id })
    }
},
```

- [ ] **Step 3: 翻新字段名**

在 computed 中，将 `r.overtime_type` 改为 `r.day_type || r.overtime_type`（兼容旧数据）。同样更新 `weekdayHours`、`weekendHours`、`holidayHours` computed。

在 template 中，将 `rec.overtime_type` 引用改为 `rec.day_type || rec.overtime_type`。

在 `typeFull()` 中，"平日加班"→"平日"，"周末加班"→"周末"，"节假日加班"→"节假日"。

- [ ] **Step 4: 更新 NavBar title**

第3行：
```html
<NavBar title="加班记账" green />
```
改为：
```html
<NavBar title="记工算工钱" green />
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/index/index.vue"
git commit -m "fix: index.vue breakdown加pay显示, FAB跳转查项目, overtime_type→day_type

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Phase 3 P1 — 修复 stats.vue（5 项）

**Files:**
- Modify: `记工算工钱/pages/stats/stats.vue`

- [ ] **Step 1: S1 — 月汇总动态列**

修改月汇总卡片的 template，从单一"总工时"列改为动态多列：

```html
<view class="summary-card">
    <view class="summary-card__item" v-if="totalHours > 0">
        <text class="summary-card__value">{{ totalHours.toFixed(1) }}h</text>
        <text class="summary-card__label">工时</text>
    </view>
    <view class="summary-card__item" v-if="totalDays > 0">
        <text class="summary-card__value">{{ totalDays }}天</text>
        <text class="summary-card__label">天数</text>
    </view>
    <view class="summary-card__item" v-if="totalQuantity > 0">
        <text class="summary-card__value">{{ totalQuantity }}件</text>
        <text class="summary-card__label">件数</text>
    </view>
    <view class="summary-card__item">
        <text class="summary-card__value">¥{{ totalPay.toFixed(0) }}</text>
        <text class="summary-card__label">工钱</text>
    </view>
    <view class="summary-card__item">
        <text class="summary-card__value">{{ recordCount }}</text>
        <text class="summary-card__label">记录数</text>
    </view>
</view>
```

在 computed 中新增：
```js
totalDays() {
    return this.monthRecords.reduce((s, r) => s + (r.days || 0), 0)
},
totalQuantity() {
    return this.monthRecords.reduce((s, r) => s + (r.quantity || 0), 0)
},
```

- [ ] **Step 2: S2 — 环形图改用 pay 合计**

修改环形图数据构建逻辑。找到 pieData 相关的 computed/methods，将数据源从 `duration` 改为 `pay`：

```js
pieData() {
    const types = ['weekday', 'weekend', 'holiday']
    const labels = ['平日', '周末', '节假日']
    const colors = ['#1B8A5A', '#006495', '#A23D33']
    const series = types.map(t => {
        return this.monthRecords
            .filter(r => (r.day_type || r.overtime_type) === t)
            .reduce((s, r) => s + (r.pay || 0), 0)
    })
    if (series.every(v => v === 0)) return null
    return { series, labels, colors }
}
```

- [ ] **Step 3: S3 — 图例加模式明细**

在 breakdown-row 下方添加模式明细行。找到 breakdown 区域 template，在每个类型行后追加明细：

```html
<view class="breakdown__row">
    <view class="breakdown__dot breakdown__dot--weekday"></view>
    <text class="breakdown__name">平日</text>
    <text class="breakdown__detail">时薪{{ weekdayHours }}h 日薪{{ weekdayDays }}天 计件{{ weekdayQty }}件</text>
    <text class="breakdown__pay">¥{{ weekdayPay.toFixed(0) }}</text>
</view>
```

（同样处理周末和节假日行）

- [ ] **Step 4: S4 — 柱状图 axis 改为 pay**

找到周趋势柱状图的数据构建逻辑，将 series 数据从 duration 小时改为 pay 金额。

- [ ] **Step 5: S5 — 项目统计动态单位**

找到项目统计列表的 template，修改显示单位：

```html
<text class="project-stat__qty" v-if="proj.pay_mode === 'hourly'">{{ proj.totalHours }}h</text>
<text class="project-stat__qty" v-if="proj.pay_mode === 'daily'">{{ proj.totalDays }}天</text>
<text class="project-stat__qty" v-if="proj.pay_mode === 'piece'">{{ proj.totalQty }}{{ proj.piece_unit || '件' }}</text>
```

- [ ] **Step 6: 更新字段引用和 import**

将所有 `r.overtime_type` 改为 `r.day_type || r.overtime_type`。
将 import 改为使用 `useWorkStore` 和 `useHolidayStore`。

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/stats/stats.vue"
git commit -m "fix: stats.vue 5项修复 — 多模式汇总/图表用pay/图例明细/项目动态单位

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 11: Phase 3 P1 — 修复 recon.vue（3 项）

**Files:**
- Modify: `记工算工钱/pages/reconciliation/recon.vue`

- [ ] **Step 1: C1 — settledCount 初始化**

在 groups 对象的初始化代码中，找到 `groups[key] = { ... }` 的位置，补上：
```js
groups[key] = {
    // ... 已有字段
    settledCount: 0,
    unsettledCount: 0
}
```

并在统计循环中更新：
```js
if (r.settled) {
    groups[key].settledCount++
} else {
    groups[key].unsettledCount++
}
```

- [ ] **Step 2: C2 — 长图底部动态文案**

找到长图生成函数中的底部文案，将硬编码的小时数改为动态拼装：
```js
const parts = []
if (totalHours > 0) parts.push(`${totalHours.toFixed(1)}小时`)
if (totalDays > 0) parts.push(`${totalDays}天`)
if (totalQty > 0) parts.push(`${totalQty}件`)
const summaryText = parts.join(' ')
```

- [ ] **Step 3: C3 — 未结算合计**

新增 computed：
```js
unsettledSum() {
    return this.records
        .filter(r => !r.settled)
        .reduce((s, r) => s + (r.pay || 0), 0)
}
```

在 template 底部追加汇总行：
```html
<view class="unsettled-bar" v-if="unsettledSum > 0">
    <text class="unsettled-bar__label">未结算合计</text>
    <text class="unsettled-bar__amount">¥{{ unsettledSum.toFixed(0) }}</text>
</view>
```

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/reconciliation/recon.vue"
git commit -m "fix: recon.vue 3项修复 — settledCount初始化/长图动态文案/未结算合计

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 12: Phase 3 P2 — 修复 salary.vue（1 项）

**Files:**
- Modify: `记工算工钱/pages/salary/salary.vue`

- [ ] **Step 1: A1 — 本地重算替代云函数**

修改 `handleSave()` 方法中"应用到已有记录"的逻辑，将云函数调用改为本地重算：

当前（第255-286行）使用 `uniCloud.callFunction({ name: 'overtime-calc', ... })` 调用云函数。改为：

```js
async handleSave() {
    const store = useSalaryStore()
    const precValues = ['15min', '30min', '60min', 'exact']
    await store.updateConfig({
        pay_mode: this.payMode,
        weekday_rate: parseInt(this.weekdayRate) || 0,
        weekend_rate: parseInt(this.weekendRate) || 0,
        holiday_rate: parseInt(this.holidayRate) || 0,
        daily_rate: parseInt(this.dailyRate) || 0,
        piece_rate: parseInt(this.pieceRate) || 0,
        piece_unit: this.pieceUnit,
        precision: precValues[this.precisionIndex]
    })

    uni.showToast({ title: '已保存', icon: 'success' })

    const now = new Date()
    uni.showModal({
        title: '应用到已有记录',
        content: '是否用新费率重算 ' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月 的工钱？',
        confirmText: '重算',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '重算中...' })
                try {
                    const workStore = useWorkStore()
                    const salaryStore = useSalaryStore()
                    const cfg = salaryStore.config
                    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                    let updated = 0
                    for (const rec of workStore.records) {
                        if (!rec.date?.startsWith(monthPrefix)) continue
                        const project = rec.project_id ? useProjectStore().getProjectById(rec.project_id) : null
                        const pay = calcPay(rec, project, cfg)
                        const netPay = calcNetPay({ ...rec, pay }, project, cfg)
                        if (pay !== rec.pay || netPay !== rec.net_pay) {
                            await workStore.updateRecord(rec.id || rec._id, { pay, net_pay: netPay, rate: rec.rate })
                            updated++
                        }
                    }
                    uni.hideLoading()
                    uni.showToast({ title: '已更新 ' + updated + ' 条记录', icon: 'success' })
                    await workStore.loadRecords()
                } catch (e) {
                    uni.hideLoading()
                    uni.showToast({ title: '重算失败: ' + e.message, icon: 'none' })
                }
            }
            setTimeout(() => { uni.navigateBack() }, 300)
        }
    })
}
```

需要在文件顶部添加 import：
```js
import { calcPay, calcNetPay } from '@/utils/calculator'
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '@/stores/projectStore'
```

- [ ] **Step 2: 更新文案**

将模板中的"加班费设置"改为"工钱设置"，"加班费"→"工钱"。

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/salary/salary.vue"
git commit -m "fix: salary.vue 本地重算替代云函数, 更新文案

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 13: Phase 3 P2 — 修复 project-edit.vue（2 项）

**Files:**
- Modify: `记工算工钱/pages/project-edit/project-edit.vue`

- [ ] **Step 1: P1 — 添加删除按钮**

在编辑模式（有 project id 时）的底部保存按钮下方添加：

```html
<view class="delete-btn" v-if="isEditing" @tap="handleDelete">
    <text class="delete-btn__text">删除项目</text>
</view>
```

computed 新增 `isEditing`：
```js
isEditing() {
    return !!this.projectId
}
```

methods 新增 `handleDelete`：
```js
handleDelete() {
    uni.showModal({
        title: '确认删除',
        content: `删除项目「${this.projectName}」不会删除记工记录，但记录将不再关联该项目。`,
        confirmText: '删除',
        confirmColor: '#B85C4A',
        success: (res) => {
            if (res.confirm) {
                const pStore = useProjectStore()
                pStore.deleteProject(this.projectId)
                uni.showToast({ title: '已删除', icon: 'success' })
                setTimeout(() => { uni.navigateBack() }, 500)
            }
        }
    })
}
```

- [ ] **Step 2: P2 — 移除重复 parseFloat**

在 `handleSave()` 方法中，将所有 `parseFloat(this.field)` 和 `parseInt(this.field)` 去掉，因为 v-model.number 已自动转换为数字。

例如：
```js
// 当前
weekday_rate: parseFloat(this.weekdayRate) || 0,
// 改为
weekday_rate: this.weekdayRate || 0,
```

对所有费率字段（weekday_rate, weekend_rate, holiday_rate, daily_rate, piece_rate）做同样处理。

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/project-edit/project-edit.vue"
git commit -m "fix: project-edit 添加删除按钮, 移除重复parseFloat

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 14: Phase 3 P2 — 修复 projects.vue（1 项）

**Files:**
- Modify: `记工算工钱/pages/projects/projects.vue`

- [ ] **Step 1: P3 — 绑定删除 UI**

每张项目卡片右侧已有箭头 `›`，在其旁边增加删除图标，绑定已有的 `confirmDelete` 方法。

找到 template 中的 project-card 区域（第8-21行），在箭头前添加删除图标：

```html
<view
    v-for="project in store.activeProjects"
    :key="project._id"
    class="project-card"
    @tap="editProject(project)"
>
    <view class="project-card__bar" :style="{ background: project.color || '#1B8A5A' }"></view>
    <view class="project-card__info">
        <text class="project-card__name">{{ project.name }}</text>
        <text class="project-card__rate">{{ rateSummary(project) }}</text>
        <text class="project-card__stats" v-if="projectStats(project)">{{ projectStats(project) }}</text>
    </view>
    <view class="project-card__delete" @tap.stop="confirmDelete(project)">
        <text class="project-card__delete-icon">🗑</text>
    </view>
    <text class="project-card__arrow">›</text>
</view>
```

注意 `@tap.stop` 阻止事件冒泡到父级 `@tap="editProject(project)"`。

同样在已归档项目卡片中重复此修改（第34-45行区域）。

添加样式：
```scss
.project-card__delete {
    padding: 4px;
    margin-right: 4px;
}
.project-card__delete-icon {
    font-size: 14px;
    opacity: 0.5;
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/pages/projects/projects.vue"
git commit -m "fix: projects.vue 绑定删除图标到confirmDelete方法

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 15: Phase 4 — 云函数重命名 + Schema 更新

**Files:**
- Rename: `uniCloud-aliyun/cloudfunctions/overtime-calc/` → `work-calc/`
- Rename: `uniCloud-aliyun/database/overtime-record.schema.json` → `work-record.schema.json`
- Modify: `记工算工钱/uniCloud-aliyun/cloudfunctions/work-calc/index.js`
- Modify: `记工算工钱/uniCloud-aliyun/database/work-record.schema.json`

- [ ] **Step 1: 重命名云函数目录**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
mv "记工算工钱/uniCloud-aliyun/cloudfunctions/overtime-calc" "记工算工钱/uniCloud-aliyun/cloudfunctions/work-calc"
```

- [ ] **Step 2: 修改云函数 index.js**

对 `记工算工钱/uniCloud-aliyun/cloudfunctions/work-calc/index.js` 做以下修改：

**修改1** — JWT Secret（第6行）：
```js
// 当前
const SECRET = 'overtime-app-jwt-secret-change-in-production'
// 改为
const SECRET = 'work-app-jwt-secret-change-in-production'
```

**修改2** — 全局替换集合名。将所有 `db.collection('overtime-record')` 替换为 `db.collection('work-record')`（共约12处）。

**修改3** — 全局替换字段名。将所有 `overtime_type` 替换为 `day_type`（共约5处：getMonthlySummary、recalcMonth、validateRecord）。

**修改4** — getMonthlySummary 补字段。在 `totalHours` 和 `totalPay` 变量后添加：
```js
const totalDays = records.reduce((s, r) => s + (r.days || 0), 0)
const totalQuantity = records.reduce((s, r) => s + (r.quantity || 0), 0)
```

并在返回对象中增加这两个字段。

**修改5** — getYearStats 补字段，同修改4。

**修改6** — validateRecord 错误消息中的"加班"→"记工"：
```js
// 第170行
if (!record.duration || record.duration <= 0) errors.push('时薪模式必须填写记工时长')
// 第171-172行
if (!record.start_time) errors.push('时薪模式必须填写开始时间')
if (!record.end_time) errors.push('时薪模式必须填写结束时间')
// 第173行
if (!['weekday', 'weekend', 'holiday'].includes(record.day_type)) errors.push('日期类型无效')
```

- [ ] **Step 3: 重命名 Schema 文件**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
mv "记工算工钱/uniCloud-aliyun/database/overtime-record.schema.json" "记工算工钱/uniCloud-aliyun/database/work-record.schema.json"
```

- [ ] **Step 4: 修改 Schema 文件**

对 `work-record.schema.json` 做以下修改：

**修改1** — `required` 数组（第3行）：`"overtime_type"` → `"day_type"`

**修改2** — `overtime_type` 字段定义（第43-47行）：
```json
"day_type": {
    "bsonType": "string",
    "description": "日期类型",
    "enum": ["weekday", "weekend", "holiday"]
},
```

**修改3** — 全局替换所有字段 description 中的"加班"为"记工"。

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add "记工算工钱/uniCloud-aliyun/cloudfunctions/work-calc/"
git rm "记工算工钱/uniCloud-aliyun/cloudfunctions/overtime-calc/"
git add "记工算工钱/uniCloud-aliyun/database/work-record.schema.json"
git rm "记工算工钱/uniCloud-aliyun/database/overtime-record.schema.json"
git commit -m "refactor: 云函数overtime-calc→work-calc, Schema改名, 字段overtime_type→day_type

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 16: Phase 5 — 全量回归验证

**Files:** 无代码修改，纯验证。

- [ ] **Step 1: 时薪模式全流程**

1. 新建时薪项目（日薪30/h，周末45/h，节假日60/h）
2. 记一条平日记录：18:00-21:00 = 3h × 30 = ¥90
3. 记一条周末记录：10:00-16:00 = 6h × 45 = ¥270
4. 首页确认显示 9h，¥360
5. 统计页确认环形图/柱状图数据正确
6. 对账页确认记录可以分组显示

- [ ] **Step 2: 日薪模式全流程**

1. 新建日薪项目（日薪 ¥200/天）
2. 记一条记录：2天
3. 首页确认显示 2天，¥400

- [ ] **Step 3: 计件模式全流程**

1. 新建计件项目（¥5/件）
2. 记一条记录：10件
3. 首页确认显示 10件，¥50

- [ ] **Step 4: 补贴扣款验证**

1. 任选一条记录编辑，添加夜班补贴 ¥20，扣款 ¥10
2. 确认 netPay = pay + 20 - 10

- [ ] **Step 5: 薪资设置重算验证**

1. 修改时薪为 35/h
2. 重算当月
3. 确认已有记录更新

- [ ] **Step 6: 边界 case**

1. 无项目时点 FAB → 应跳到 project-edit
2. 编辑已有记录 → 应正确回填所有字段
3. 删除项目 → 应弹出确认框

---

### Task 17: 收尾 — 全局文案扫尾

**Files:** 所有 .vue 文件

- [ ] **Step 1: 全局搜索残留"加班"文案**

```bash
grep -r "加班" "记工算工钱/pages" --include="*.vue" --include="*.js"
grep -r "overtime" "记工算工钱/stores" --include="*.js"
grep -r "overtime" "记工算工钱/pages" --include="*.vue" --include="*.js"
```

将残留引用逐一修正为"记工"/"work"。

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\86136\Desktop\Overtime_Hours_Accounting"
git add -A
git commit -m "chore: 全局扫尾残留'加班'/'overtime'文案

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
