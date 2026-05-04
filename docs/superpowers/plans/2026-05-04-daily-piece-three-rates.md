# 日薪/计件增加平日/周末/节假日三费率

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日薪和计件模式像时薪一样区分平日/周末/节假日三种费率

**Architecture:** 数据层加字段 → 计算引擎改费率逻辑 → UI 层编辑页/记工页/批量/预览适配 → 云函数同步

**Tech Stack:** uni-app + Pinia + uniCloud

---

### Task 1: 数据层 — constants.js + schema 加字段

**Files:** `utils/constants.js`, `uniCloud-aliyun/database/project-config.schema.json`

- [ ] 修改 DEFAULT_PROJECT_CONFIG，日薪拆为 3 字段，计件拆为 3 字段
- [ ] 保留旧 daily_rate/piece_rate 作兜底
- [ ] schema 加新字段

### Task 2: 计算引擎 — calculator.js 费率逻辑

**Files:** `utils/calculator.js`

- [ ] `calcPay` 日薪模式按 `day_type` 取 `daily_{type}_rate`，回退 `daily_rate`
- [ ] `calcPay` 计件模式按 `day_type` 取 `piece_{type}_rate`，回退 `piece_rate`
- [ ] `getPayFormula` 同步更新

### Task 3: 工作编辑页 — project-edit.vue

**Files:** `pages/project-edit/project-edit.vue`

- [ ] 日薪模式显示三行费率输入（和时薪同款）
- [ ] 计件模式显示三行单价输入
- [ ] `handleSave` 存对应字段
- [ ] `autoFillRates` 适配新字段
- [ ] 校验三费率必填

### Task 4: 记工页 — record.vue

**Files:** `pages/record/record.vue`

- [ ] `currentRate` 日薪/计件按 day_type 取费率
- [ ] `payModeLabel` 费率显示适配

### Task 5: 批量记工 — batch-record.vue

**Files:** `pages/batch-record/batch-record.vue`

- [ ] `previewDates` 日薪/计件按每天 type 取对应费率
- [ ] `dailyPay`/`piecePay` 使用首日费率（预览卡片显示）

### Task 6: 首页/统计/对账/工作列表 适配

**Files:** `pages/index/index.vue`, `pages/stats/stats.vue`, `pages/reconciliation/recon.vue`, `pages/projects/projects.vue`

- [ ] projects.vue `payModeSummary` 日薪/计件显示三费率
- [ ] 其他页面如有直接访问 daily_rate/piece_rate 的改为取对应 type 费率或显示三费率

### Task 7: 云函数 — work-calc/index.js

**Files:** `uniCloud-aliyun/cloudfunctions/work-calc/index.js`

- [ ] `recalcMonth` 日薪/计件费率取对应 day_type 字段
- [ ] 回退兼容旧 daily_rate/piece_rate

### Task 8: 数据库 schema 更新

**Files:** `uniCloud-aliyun/database/project-config.schema.json`

- [ ] 加 6 个新字段定义
