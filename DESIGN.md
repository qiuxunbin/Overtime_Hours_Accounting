# Design System — 加班工时记账

## Product Context
- **What this is:** 一款多端（iOS/Android/微信小程序）加班工时记录与薪资计算工具，帮助打工人记录每一笔加班、自动计算应得薪资
- **Who it's for:** 经常加班的上班族、小时工、兼职人员，需要清晰追踪工时和收入的打工人
- **Space/industry:** 个人工时管理 / 薪资记账工具
- **Project type:** 移动端工具 App（uni-app Vue 3，三端同构）
- **Memorable thing:** "专业可靠，打工人自己的工具" — 每个设计决策回答：这个设计帮打工人更快算清钱了吗？

## Aesthetic Direction
- **Direction:** 工装实用主义 — 灵感来自工人工具包的实用美学。不是消费级精致，是工具级可靠
- **Decoration level:** 克制 — 装饰只出现在有意义的地方：金额数字加粗、状态标签着色、分隔线极细。不做装饰性插图、渐变卡片、圆形图标矩阵
- **Mood:** 诚实、可靠、有温度。像一本用了半年的工资本，每一页都记得清清楚楚
- **Reference:** 竞品调研参考了天天记工时（微信小程序）、小时工记账簿 App 等行业产品

## Typography
- **Display/Hero:** Source Han Serif SC（思源宋体）— 仅用于首页大标题和关键数据标题，增加专业质感
- **Body:** Noto Sans SC — 中文字体渲染更协调，可读性好
- **UI/Labels:** Noto Sans SC — 与正文保持一致
- **Numbers/Amounts:** DM Sans — tabular-nums 特性保证数字等宽对齐，薪资计算场景刚需
- **Code:** 暂不涉及
- **Loading:** Google Fonts CDN（开发期），生产环境建议自托管
- **Scale:**
  - Caption: 12px/16px
  - Label: 13px/18px (weight 500, letter-spacing 0.02em)
  - Body: 15px/22px (weight 400)
  - Body Large: 17px/24px (weight 400)
  - Headline Medium: 20px/28px (weight 600)
  - Headline Large: 24px/32px (weight 600)

## Color
- **Approach:** restrained（克制）— 主色用于关键交互元素，色彩有明确语义

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#1B8A5A` | 主色/沉绿 — 按钮、活动状态、关键数据高亮 |
| Primary Hover | `#15734B` | 按钮按压态 |
| Primary Light | `#E8F5EE` | 标签背景、成功提示背景 |
| Accent | `#C4A46C` | 强调色/黄铜 — 次要标签、温馨提醒 |
| Accent Light | `#F5EDE0` | 强调色背景 |
| Surface | `#F8F6F2` | 页面底色/微暖米白 |
| Surface Card | `#FFFFFF` | 卡片底色 |
| Surface Hover | `#F0EDE6` | 点击/悬停反馈 |
| Text Primary | `#1E1E1E` | 主文字 |
| Text Secondary | `#5C5C5C` | 次要文字 |
| Text Muted | `#9C9C9C` | 辅助信息、占位符 |
| Border | `#E8E4DC` | 分隔线、边框 |
| Error | `#B85C4A` | 错误/删除/扣款 |
| Error Light | `#FDF0ED` | 错误背景 |
| Info | `#4A6B8A` | 信息提示 |
| Info Light | `#EDF1F5` | 信息提示背景 |

### Dark Mode
- Strategy: 反转表面层次，主色降低饱和度 15%
- Surface: `#1A1C1E`
- Surface Card: `#242628`
- Text Primary: `#E8E8E8`

### Semantic Usage
- Success: Primary Green
- Warning: Accent/Gold
- Error: Brick Red `#B85C4A`
- Info: Steel Blue `#4A6B8A`

## Spacing
- **Base unit:** 4px
- **Density:** comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Container padding:** 16px
- **Section margin:** 24px
- **Stack gap:** 8px
- **Gutter:** 12px

## Layout
- **Approach:** grid-disciplined — 严格对齐，可预测的卡片式布局
- **Grid:** 单栏布局（移动端优先）
- **Max content width:** 100%（全屏移动端）
- **Border radius hierarchy:**
  - Tags/labels: 4px (`$radius-sm`)
  - Small components: 6px (`$radius-md`)
  - Cards/containers: 12px (`$radius-lg`)
  - Buttons/pills: 20px (`$radius-full`)

## Shadow
| Level | Value |
|-------|-------|
| sm | `0 1px 2px rgba(0,0,0,0.04)` |
| md | `0 2px 8px rgba(0,0,0,0.06)` |
| lg | `0 4px 16px rgba(0,0,0,0.08)` |

## Motion
- **Approach:** minimal-functional — 只在有意义的地方使用动效
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)
- **Use cases:** 月份切换、弹窗打开/关闭、页面转场
- **No-go:** 不做装饰性动画、微交互动画、骨架屏动画

## Key UX Changes from Proposal
1. **首页增加"当前加班状态"指示器** — 显示正在计时/未开始/已结束，这是竞品普遍缺失的功能
2. **品牌色从 #07C160 迁移至 #1B8A5A** — 更沉稳的绿色，区别于微信绿
3. **底色从 #F9F9F9 迁移至 #F8F6F2** — 微暖米白提升"工具感"
4. **数字字体引入 DM Sans** — tabular-nums 确保金额数字对齐

## Components

### NavBar
- Height: 44px (标准导航栏)
- Background: Primary `#1B8A5A`（主页/需要强调品牌色的页面）
- Alternative: Surface `#F8F6F2`（次级页面如意见反馈、考勤提醒）
- Title: White, 17px, weight 600（深色背景时）；Text Primary, 17px, weight 600（浅色背景时）
- Back button: left side, opacity 0.9
- Right action: 13px, white/primary

### Bottom TabBar
- Height: 64px (safe area included)
- Background: Surface Card `#FFFFFF`
- Active item: Primary `#1B8A5A`, weight 600
- Inactive item: Text Muted `#9C9C9C`
- Icon size: 20px, text size: 10px

### Button: Primary
- Background: Primary `#1B8A5A`
- Text: White, 15px, weight 600
- Border-radius: 20px (full)
- Padding: 12px 24px
- Pressed state: `#15734B`

### Button: Secondary
- Background: transparent
- Border: 1.5px solid Primary
- Text: Primary, 15px, weight 600
- Border-radius: 20px

### Button: Ghost
- Background: transparent
- Text: Text Secondary `#5C5C5C`, 15px
- Pressed: Surface Hover `#F0EDE6`

### Card (SummaryCard / 信息卡片)
- Background: Surface Card `#FFFFFF`
- Border-radius: 12px
- Shadow: `0 1px 2px rgba(0,0,0,0.04)`
- Padding: 16px
- Internal divider: 1px solid Border `#E8E4DC`

### CellItem (列表条目)
- Height: 48px
- Left icon: 20px, Text Secondary
- Label: 15px, Text Primary
- Right arrow: `›`, Text Muted, 18px
- Description (optional): 12px, Text Muted
- Bottom border: 1px solid Border `#E8E4DC`

### Tag / Label
- Border-radius: 4px
- Padding: 3px 10px
- Font: 12px, weight 500
- Variants: Primary (green bg), Accent (gold bg), Error (red bg), Default (border only)

### Input
- Background: Surface `#F8F6F2`
- Border: 1.5px solid Border `#E8E4DC`
- Border-radius: 6px
- Padding: 10px 14px
- Font: 15px, Text Primary
- Focus border: Primary
- Prefix/suffix: Text Muted, 15px

### Switch / Toggle
- Width: 44px, Height: 24px
- Active: Primary `#1B8A5A`
- Inactive: Border `#E8E4DC`
- Thumb: white, 20px

### Alert / Toast
- Border-radius: 6px
- Padding: 10px 14px
- Font: 13px
- Success: Primary Light bg + Primary text
- Warning: Accent Light bg + `#8A6F3E` text
- Error: `#FDF0ED` bg + Error text
- Info: `#EDF1F5` bg + Info text

### Month Navigation
- Layout: flex, center-aligned
- Title: 16px, weight 600, Text Primary
- Prev/Next arrows: 20px, Text Muted, tap area 40x40px

### EmptyState
- Icon: 48px, Text Muted
- Text: 14px, Text Muted
- Padding: 40px 0

## Page-by-Page Design Guidance

### 启动页 (splash/splash.vue)
- **Purpose:** 品牌展示，3秒自动跳转
- **Layout:** 全屏品牌区（logo + 产品名 + slogan）+ 三个价值点列表 + 底部跳过按钮
- **Background:** Primary `#1B8A5A` 满屏
- **Brand area:** 居中，logo 60px, title 24px white, tagline 14px white/0.8
- **Feature items:** 三行图标+文字，左图标右文字，白色文字 80% 不透明度
- **Skip button:** 右上角，13px white/0.7，tap area 44px
- **Loading indicator:** 底部白色圆点或进度条（如需要）
- **Transitions:** 3秒后 fade-out 过渡到首页
- **Dark mode:** 全屏绿色不变

### 记账主页 (pages/index/index.vue) — Tab 1
- **Purpose:** 月度概览 + 日历 + 记录列表 + 对账入口
- **Layout:** NavBar → 月度摘要卡片 → 对账快捷入口 → 日历 → 记录列表
- **Status indicator:** 在摘要卡片上方添加"当前加班状态"条（绿色圆点 + "加班中 XXh XXmin" / 灰色"未在加班"）
- **Summary card:** 卡片形式，左（本月加班小时）/ 右（预计实付），底部三分段 breakdown（平日/周末/节假日）
- **Recon entry:** 对账入口行，背景白色，左侧 ✅ 图标 + 文案，右侧 › 箭头
- **Calendar:** 内联日历，橙色圆点标记有记录的日期，点击日期弹出日汇总弹窗
- **Record list:** 按日期分组的记录列表，每条显示起止时间、时长、类型标签、金额
- **Empty state:** 无记录时显示 EmptyState 组件
- **TabBar:** 首页 TabBar 激活态

### 记录工时 (pages/record/record.vue)
- **Purpose:** 新增/编辑加班记录
- **Layout:** NavBar（有返回按钮）→ 日期选择器 → 起止时间选择 → 快捷时长选择 → 时长显示 → 加班类型标签（自动识别）→ 项目选择 → 备注输入 → 保存按钮
- **Date picker:** 原生 picker，显示格式 "YYYY-MM-DD 周X"
- **Time picker:** 两个原生 time picker 并排，中间短横线分隔
- **Quick hours:** 横向滚动的标签组（0.5h, 1h, 1.5h, 2h, 2.5h, 3h, 3.5h, 4h），选中态高亮
- **Duration display:** 大号 DM Sans 数字 + "小时" 单位
- **Type display:** 只读类型标签（平日/周末/节假日，根据日期自动识别，非用户可选）
- **Project selector:** 点击进入项目选择弹窗，选中后显示项目标签（带颜色圆点）
- **Save button:** 全宽 Primary 按钮，保存时显示 loading 并禁用
- **Edit mode:** 通过 ?id= 参数进入，加载已有数据，显示删除按钮
- **Delete:** 红色文字按钮，弹出确认弹窗

### 统计分析 (pages/stats/stats.vue) — Tab 2
- **Purpose:** 数据可视化和薪资分析
- **Layout:** NavBar（右侧"导出"按钮）→ 月份切换 → 月汇总卡片（总工时/加班费/记录数）→ uCharts 环形图（类型分布）→ uCharts 柱状图（每周趋势）→ 近6月收入趋势
- **Summary:** 三列统计数字，白色卡片，大号 DM Sans 数字
- **Ring chart:** uCharts 环形图，平日=绿、周末=黄铜、节假日=砖红
- **Bar chart:** uCharts 柱状图，X轴=周数，Y轴=工时
- **Trend line:** 6个月收入折线图，绿色实线
- **Breakdown rows:** 环形图下方的类型明细行（圆点 + 名称 + 数值）
- **Empty state:** 无数据时显示 EmptyState

### 对账明细 (pages/reconciliation/recon.vue)
- **Purpose:** 月度对账，对比预估值和实发值
- **Layout:** NavBar（返回）→ 月份切换 → 对账卡片 → 本月记录明细 → 底部操作栏
- **Month nav:** 标准月份切换组件
- **Compare card:** 
  - 预估加班费行（只读，绿色数值）
  - 实发加班费行（可输入，带 ¥ 前缀）
  - 分隔线
  - 差额行（正数绿（#1B8A5A）/ 负数红（#B85C4A））
- **Detail list:** 每条记录一行：左侧（日期+类型标签）→ 中间（起止时间+计算公式）→ 右侧（金额）
- **Bottom bar:** 固定底部，"复制数据"+"生成长图"按钮
- **Empty state:** 无记录时显示 EmptyState

### 薪资设置 (pages/salary/salary.vue)
- **Purpose:** 配置平日/周末/节假日时薪
- **Layout:** NavBar（返回）→ 说明文字 → 三个时薪输入 → 月薪换算辅助工具
- **Rate inputs:** 三行列表，左（类型+提示）右（¥ 输入框 + /小时）
- **Helper card:** 可折叠卡片，"不确定时薪？用月薪帮你算"→ 展开后输入月薪 + 工作天数，自动推算时薪
- **Input validation:** 输入即时校验，保留两位小数
- **Save:** 切换页面自动保存（uni.storage）

### 考勤提醒 (pages/clock/clock.vue)
- **Purpose:** 设置上下班提醒
- **Layout:** NavBar（返回）→ 上班提醒卡片 + 下班提醒卡片 → 重复设置 → 提醒方式 → 底部提示文字
- **Alarm cards:** 每行左（图标 + "上班提醒"+时间选择器）右（Switch开关）
- **Settings items:** 标准 CellItem 列表（重复、提醒方式）
- **Footer hint:** 12px Text Muted，居中
- **Data:** 所有配置存 uni.storage

### 我的 (pages/profile/profile.vue) — Tab 3
- **Purpose:** 用户信息和功能入口
- **Layout:** NavBar → 个人资料头 → 功能菜单列表 → 底部版本号
- **Profile header:** 头像（emoji或默认图标）+ 用户名 + 签名
- **Menu items:** CellItem 列表（项目管理 / 批量记工时 / 薪资设置 / 考勤提醒 / 导出数据 / 导入数据 / 意见反馈 / 关于）
- **Login entry:** App端特有，未登录时显示登录入口
- **TabBar:** 激活"我的"Tab

### 意见反馈 (pages/feedback/feedback.vue)
- **Purpose:** 提交反馈和查看历史
- **Layout:** NavBar（返回）→ 表单卡片（标题输入 + 内容 textarea）→ 提交按钮 → 历史反馈列表
- **Form card:** 白色卡片，内部标题 + textarea 垂直排列
- **Submit button:** Primary 按钮，提交后显示 Toast 反馈
- **History list:** 日期分组的反馈历史，每条显示标题、时间、内容摘要
- **Empty state:** 无历史时隐藏历史区块

### 登录页 (pages/login/login.vue)
- **Purpose:** 用户登录/注册（App端一键登录 / 微信小程序静默登录）
- **Layout:** 顶部品牌区（logo+产品名+描述）→ 登录方式切换Tab → 表单（手机号+验证码/密码）→ 一键登录按钮（App端）
- **Brand area:** 居中 logo 60px + "加班工时记账" 24px + 描述 14px，Primary 绿色背景
- **Login tabs:** 两个标签切换（验证码登录 / 密码登录），激活态下划线 Primary
- **Form inputs:** 标准 Input 样式，手机号带 +86 前缀
- **Univerify button:** App端独有一键登录，圆角大按钮
- **Divider:** "其他方式登录" 带左右横线
- **Agreement:** 底部"登录即代表同意《用户协议》《隐私政策》"，12px Text Muted

### 项目管理 (pages/projects/projects.vue)
- **Purpose:** 管理多项目，设置各项目的独立时薪
- **Layout:** NavBar（返回）→ 项目列表 → 已归档分区 → 底部"新建项目"按钮
- **Project card:** 左侧色条 + 项目名+时薪摘要 + 右侧删除按钮
- **Color bar:** 4px 宽竖条，使用项目的自定义颜色
- **Archived section:** 折叠分区，标题"已归档"，卡片降低不透明度
- **Empty state:** 无项目时显示 EmptyState
- **FAB button:** 固定底部的 Primary 按钮

### 编辑项目 (pages/project-edit/project-edit.vue)
- **Purpose:** 新建/编辑项目信息
- **Layout:** NavBar（返回，"新建项目"/"编辑项目"）→ 项目名称输入 → 颜色选择 → 排序 → 独立时薪设置 → 保存按钮
- **Name input:** 标准 Input，maxlength 50
- **Color picker:** 10-12 个颜色圆点（直径32px），选中态显示外圈边框
- **Sort input:** 数字输入，正整数
- **Rate section:** 折叠区域，三个时薪输入（平日/周末/节假日），与薪资设置页一致
- **Delete (edit mode):** 红色文字删除按钮

### 批量记工时 (pages/batch-record/batch-record.vue)
- **Purpose:** 一次为多天创建相同时段的加班记录
- **Layout:** NavBar（返回）→ 日期范围选择（起止日期）→ 统一起止时间 → 项目选择 → 加班类型 → 备注 → 预览 → 保存按钮
- **Date range:** 两个日期选择器并排，"从"和"到"
- **Time:** 统一的时间选择器，下方提示"每天 X 小时"
- **Duration indicator:** "共 X 天，每天 X 小时，合计 XX 小时"
- **Preview list:** 保存前预览将创建的记录列表（日期+时长简略显示）
- **Save button:** Primary 按钮，"批量保存 X 条"

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-01 | Initial design system created | Created by /design-consultation based on competitor research (天天记工时, 小时工记账簿, 小时工记账账本) and product context |
| 2026-05-01 | Aesthetic: 工装实用主义 | 与"专业可靠，打工人自己的工具"记忆点一致，区别于竞品的消费级精致风格 |
| 2026-05-01 | Color: 沉绿 #1B8A5A | 保留原绿色品牌资产，但右移色相至更沉稳的值，区别于微信绿 |
| 2026-05-01 | Typography: Noto Sans SC + DM Sans | Noto Sans SC 中文渲染优于 Inter；DM Sans tabular-nums 适合薪资数字场景 |
| 2026-05-01 | 补充页面级设计指引 | 覆盖全部 13 个页面（含启动页、登录页、项目管理、批量记工时等），明确每个页面的布局、组件和交互规范 |
