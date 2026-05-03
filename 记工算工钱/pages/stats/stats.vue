<template>
	<view class="page-stats">
		<NavBar title="统计">
			<view slot="right" class="nav-export" @tap="handleExportCSV">
				<text class="nav-export__text">导出</text>
			</view>
		</NavBar>

		<view class="page-stats__content">
			<!-- 月份切换 -->
			<view class="month-nav">
				<view class="month-nav__btn" @tap="prevMonth">
					<text class="month-nav__icon">&#x2039;</text>
				</view>
				<text class="month-nav__title">{{ monthLabel }}</text>
				<view class="month-nav__btn" @tap="nextMonth">
					<text class="month-nav__icon">&#x203A;</text>
				</view>
			</view>

			<!-- 月汇总 — 动态列 -->
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

				<!-- 类型分布 - uCharts 环形图 -->
			<view class="card" v-if="recordCount > 0">
				<text class="card__title">日期类型分布</text>
				<view class="chart-wrap chart-wrap--ring" v-if="totalPay > 0">
					<canvas
						type="2d"
						id="ringChart"
						class="chart-canvas"
							:style="{ width: chartWidth + 'px', height: ringChartH + 'px' }"
					></canvas>
				</view>
				<view class="breakdown-rows">
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--weekday"></view>
						<text class="breakdown__name">平日</text>
						<text class="breakdown__val">
							<text v-if="weekdayHours > 0">时薪{{ weekdayHours }}h </text>
							<text v-if="weekdayDays > 0">日薪{{ weekdayDays }}天 </text>
							<text v-if="weekdayQty > 0">计件{{ weekdayQty }}件 </text>
							¥{{ weekdayPay.toFixed(0) }}
						</text>
					</view>
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--weekend"></view>
						<text class="breakdown__name">周末</text>
						<text class="breakdown__val">
							<text v-if="weekendHours > 0">时薪{{ weekendHours }}h </text>
							<text v-if="weekendDays > 0">日薪{{ weekendDays }}天 </text>
							<text v-if="weekendQty > 0">计件{{ weekendQty }}件 </text>
							¥{{ weekendPay.toFixed(0) }}
						</text>
					</view>
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--holiday"></view>
						<text class="breakdown__name">节假日</text>
						<text class="breakdown__val">
							<text v-if="holidayHours > 0">时薪{{ holidayHours }}h </text>
							<text v-if="holidayDays > 0">日薪{{ holidayDays }}天 </text>
							<text v-if="holidayQty > 0">计件{{ holidayQty }}件 </text>
							¥{{ holidayPay.toFixed(0) }}
						</text>
					</view>
				</view>
			</view>

			<!-- 每周趋势 - uCharts 柱状图 -->
			<view class="card" v-if="weekBars.length > 0">
				<text class="card__title">每周趋势</text>
				<view class="chart-wrap chart-wrap--bar">
					<canvas
						type="2d"
						id="barChart"
						class="chart-canvas"
							:style="{ width: chartWidth + 'px', height: barChartH + 'px' }"
					></canvas>
				</view>
			</view>

			<!-- 近6月收入趋势 -->
			<view class="card" v-if="trendMonths.length > 1">
				<text class="card__title">近6月收入趋势</text>
				<view class="chart-wrap chart-wrap--line">
					<canvas
						type="2d"
						id="lineChart"
						class="chart-canvas"
							:style="{ width: chartWidth + 'px', height: lineChartH + 'px' }"
					></canvas>
				</view>
			</view>

				<!-- 年度累计 -->
				<view class="card">
					<text class="card__title">年度累计</text>
					<view class="year-summary">
						<view class="year-summary__item">
							<text class="year-summary__num">{{ yearHours }}h</text>
							<text class="year-summary__lbl">总工时</text>
						</view>
						<view class="year-summary__item">
							<text class="year-summary__num">¥{{ yearPay.toFixed(0) }}</text>
							<text class="year-summary__lbl">总工钱</text>
						</view>
						<view class="year-summary__item">
							<text class="year-summary__num">{{ yearMonths }}</text>
							<text class="year-summary__lbl">有记工月份</text>
						</view>
						<view class="year-summary__item" v-if="yearDays > 0">
							<text class="year-summary__num">{{ yearDays }}天</text>
							<text class="year-summary__lbl">总天数</text>
						</view>
						<view class="year-summary__item" v-if="yearQuantity > 0">
							<text class="year-summary__num">{{ yearQuantity }}</text>
							<text class="year-summary__lbl">总件数</text>
						</view>
					</view>
				</view>
			<!-- 项目收入对比 -->
			<view class="card" v-if="projectStats.length > 0">
				<text class="card__title">项目收入对比</text>
				<view class="project-stats">
					<view class="project-stat" v-for="(ps, idx) in projectStats" :key="idx">
						<view class="project-stat__header">
							<view class="project-stat__color" :style="{ background: ps.color }"></view>
							<text class="project-stat__name">{{ ps.name }}</text>
							<text class="project-stat__hours">{{ ps.unitValue }}{{ ps.unitLabel }}</text>
							<text class="project-stat__pay">¥{{ ps.pay.toFixed(0) }}</text>
						</view>
						<view class="project-stat__bar">
							<view class="project-stat__fill" :style="{ width: ps.pct + '%', background: ps.color }"></view>
						</view>
					</view>
				</view>
			</view>

				<!-- 空状态 -->
			<view class="empty-wrap" v-if="recordCount === 0">
				<text class="empty-wrap__icon">&#x1F4CA;</text>
				<text class="empty-wrap__text">本月没有记工记录</text>
				<text class="empty-wrap__hint">开始记录后这里会显示统计图表</text>
			</view>

			<view class="page-stats__spacer"></view>
		</view>
		<ThemeToggle />

	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '../../stores/projectStore'
import uCharts from '@qiun/ucharts'

function pad(n) { return String(n).padStart(2, '0') }

export default {
	components: { NavBar, ThemeToggle },
	data() {
		const now = new Date()
		let windowWidth = 375
		try {
			const sysInfo = uni.getSystemInfoSync()
			windowWidth = sysInfo.windowWidth || 375
		} catch (e) {}
		return {
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			pixelRatio: 2,
			windowWidth
		}
	},
	computed: {
		monthLabel() {
			return `${this.viewYear}年${this.viewMonth}月`
		},
		monthPrefix() {
			return `${this.viewYear}-${pad(this.viewMonth)}`
		},
		chartWidth() {
			return Math.floor(this.windowWidth - 64)
		},
		ringChartH() {
			return Math.round(this.chartWidth * 0.65)
		},
		barChartH() {
			return Math.round(this.chartWidth * 0.78)
		},
		lineChartH() {
			return Math.round(this.chartWidth * 0.58)
		},
		allRecords() {
			const store = useWorkStore()
			return store.records || []
		},
		monthRecords() {
			return this.allRecords.filter(r => r.date && r.date.startsWith(this.monthPrefix))
		},
		recordCount() {
			return this.monthRecords.length
		},
		totalHours() {
			return this.monthRecords.reduce((s, r) => s + (r.duration || 0), 0)
		},
		totalPay() {
			return this.monthRecords.reduce((s, r) => s + (r.pay || 0), 0)
		},
		totalDays() {
			return this.monthRecords.reduce((s, r) => s + (r.days || 0), 0)
		},
		totalQuantity() {
			return this.monthRecords.reduce((s, r) => s + (r.quantity || 0), 0)
		},
		weekdayRecords() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekday')
		},
		weekendRecords() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekend')
		},
		holidayRecords() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'holiday')
		},
		weekdayHours() {
			return this.weekdayRecords.reduce((s, r) => s + (r.duration || 0), 0)
		},
		weekendHours() {
			return this.weekendRecords.reduce((s, r) => s + (r.duration || 0), 0)
		},
		holidayHours() {
			return this.holidayRecords.reduce((s, r) => s + (r.duration || 0), 0)
		},
		weekdayPay() {
			return this.weekdayRecords.reduce((s, r) => s + (r.pay || 0), 0)
		},
		weekendPay() {
			return this.weekendRecords.reduce((s, r) => s + (r.pay || 0), 0)
		},
		holidayPay() {
			return this.holidayRecords.reduce((s, r) => s + (r.pay || 0), 0)
		},
		weekdayDays() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekday').reduce((s, r) => s + (r.days || 0), 0)
		},
		weekendDays() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekend').reduce((s, r) => s + (r.days || 0), 0)
		},
		holidayDays() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'holiday').reduce((s, r) => s + (r.days || 0), 0)
		},
		weekdayQty() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekday').reduce((s, r) => s + (r.quantity || 0), 0)
		},
		weekendQty() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'weekend').reduce((s, r) => s + (r.quantity || 0), 0)
		},
		holidayQty() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === 'holiday').reduce((s, r) => s + (r.quantity || 0), 0)
		},
		weekBars() {
			if (this.monthRecords.length === 0) return []
			const weeks = {}
			this.monthRecords.forEach(r => {
				const d = new Date(r.date)
				const dom = d.getDate()
				if (isNaN(dom)) return
				const wn = Math.ceil(dom / 7)
				const key = 'W' + wn
				if (!weeks[key]) weeks[key] = 0
				weeks[key] += r.pay || 0
			})
			const maxV = Math.max(...Object.values(weeks), 1)
			return Object.entries(weeks).sort().map(([k, v]) => ({
				label: k,
				value: Math.round(v * 10) / 10,
				pct: Math.round((v / maxV) * 100)
			}))
		},
		yearHours() {
			const year = String(this.viewYear)
			return this.allRecords
				.filter(r => r.date && r.date.startsWith(year))
				.reduce((s, r) => s + (r.duration || 0), 0)
		},
		yearPay() {
			const year = String(this.viewYear)
			return this.allRecords
				.filter(r => r.date && r.date.startsWith(year))
				.reduce((s, r) => s + (r.pay || 0), 0)
		},
		projectStats() {
			if (this.monthRecords.length === 0) return []
			const pStore = useProjectStore()
			const projMap = new Map(pStore.projects.map(p => [p._id, p]))
			const groups = {}
			this.monthRecords.forEach(r => {
				const key = r.project_id || '__none__'
				if (!groups[key]) groups[key] = { hours: 0, days: 0, quantity: 0, pay: 0 }
				groups[key].hours += r.duration || 0
				groups[key].days += r.days || 0
				groups[key].quantity += r.quantity || 0
				groups[key].pay += r.pay || 0
			})
			let items = Object.entries(groups).map(([id, stats]) => {
				const proj = id !== '__none__' ? projMap.get(id) : null
				const payMode = proj ? proj.pay_mode : (stats.days > 0 ? 'daily' : stats.quantity > 0 ? 'piece' : 'hourly')
				const pieceUnit = proj ? proj.piece_unit : '件'
				let unitValue, unitLabel
				if (payMode === 'daily') {
					unitValue = stats.days
					unitLabel = '天'
				} else if (payMode === 'piece') {
					unitValue = stats.quantity
					unitLabel = pieceUnit || '件'
				} else {
					unitValue = Math.round(stats.hours * 10) / 10
					unitLabel = 'h'
				}
				return {
					name: proj ? proj.name : '无项目',
					color: proj ? proj.color : '#9C9C9C',
					hours: Math.round(stats.hours * 10) / 10,
					pay: stats.pay,
					pct: 0,
					unitValue,
					unitLabel
				}
			})
			const maxPay = Math.max(...items.map(i => i.pay), 1)
			items = items.map(i => ({ ...i, pct: Math.round((i.pay / maxPay) * 100) }))
			return items.sort((a, b) => b.pay - a.pay)
		},
		trendMonths() {
			const months = []
			const now = new Date()
			for (let i = 5; i >= 0; i--) {
				const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
				const key = d.getFullYear() + '-' + pad(d.getMonth() + 1)
				const label = pad(d.getMonth() + 1) + '月'
				const pay = this.allRecords
					.filter(r => r.date && r.date.startsWith(key))
					.reduce((s, r) => s + (r.pay || 0), 0)
				months.push({ key, label, pay })
			}
			return months
		},
		yearMonths() {
			const year = String(this.viewYear)
			const months = new Set()
			this.allRecords.forEach(r => {
				if (r.date && r.date.startsWith(year)) {
					months.add(r.date.slice(0, 7))
				}
			})
			return months.size
		},
		yearDays() {
			const year = String(this.viewYear)
			return this.allRecords
				.filter(r => r.date && r.date.startsWith(year))
				.reduce((s, r) => s + (r.days || 0), 0)
		},
		yearQuantity() {
			const year = String(this.viewYear)
			return this.allRecords
				.filter(r => r.date && r.date.startsWith(year))
				.reduce((s, r) => s + (r.quantity || 0), 0)
		}
	},
	watch: {
		viewMonth() {
			this._scheduleRender(250)
		}
	},
	async onShow() {
		const store = useWorkStore()
		await store.loadRecords()
		console.log('[stats] onShow, records loaded:', store.records.length)
		this._scheduleRender(350)
	},
	onReady() {
		try {
			const sysInfo = uni.getSystemInfoSync()
			this.pixelRatio = sysInfo.pixelRatio || 2
			this.windowWidth = sysInfo.windowWidth || 375
		} catch (e) {
			this.pixelRatio = 2
		}
		console.log('[stats] onReady, pixelRatio:', this.pixelRatio, 'windowWidth:', this.windowWidth, 'chartWidth:', this.chartWidth)
		this._scheduleRender(600)
	},
	beforeDestroy() {
		if (this._renderTimer) clearTimeout(this._renderTimer)
	},
	methods: {
		monthPayTotal(monthPrefix) {
			return this.allRecords
				.filter(r => r.date && r.date.startsWith(monthPrefix))
				.reduce((s, r) => s + (r.pay || 0), 0)
		},
		prevMonth() {
			if (this.viewMonth === 1) { this.viewYear--; this.viewMonth = 12 }
			else { this.viewMonth-- }
		},
		nextMonth() {
			if (this.viewMonth === 12) { this.viewYear++; this.viewMonth = 1 }
			else { this.viewMonth++ }
		},

		/* ---- Canvas 2D ---- */

		async _getCanvas2dCtx(canvasId, logicalW, logicalH) {
			return new Promise((resolve, reject) => {
				const query = uni.createSelectorQuery().in(this)
				query.select('#' + canvasId)
					.fields({ node: true, size: true })
					.exec((res) => {
						if (!res || !res[0] || !res[0].node) {
							reject(new Error('Canvas node not found: ' + canvasId))
							return
						}
						const canvas = res[0].node
						const pr = this.pixelRatio || 2
						canvas.width = logicalW * pr
						canvas.height = logicalH * pr
						const ctx = canvas.getContext('2d')
						ctx.scale(pr, pr)
						this._safeContext(ctx)
						resolve(ctx)
					})
			})
		},

		_scheduleRender(delay) {
			if (this._renderTimer) clearTimeout(this._renderTimer)
			this._renderTimer = setTimeout(() => {
				this._renderTimer = null
				this.renderCharts()
			}, delay)
		},

		_chartDataSafe(arr) {
			if (!arr || arr.length === 0) return false
			return arr.every(v => typeof v === 'number' && isFinite(v))
		},

		_safeContext(ctx) {
			if (!ctx._fillTextWrapped) {
				const orig = ctx.fillText.bind(ctx)
				ctx.fillText = function(text, x, y, maxWidth) {
					return orig(String(text != null ? text : ''), x, y, maxWidth)
				}
				ctx._fillTextWrapped = true
			}
			return ctx
		},

		/* ---- 图表渲染 ---- */

		async renderCharts() {
			console.log('[renderCharts] recordCount:', this.recordCount, 'totalPay:', this.totalPay, 'weekBars:', this.weekBars.length, 'trendMonths:', this.trendMonths.length)
			try {
				await Promise.all([
					this.renderRingChart(),
					this.renderBarChart(),
					this.renderLineChart()
				])
				console.log('[renderCharts] done')
			} catch (e) {
				console.log('[renderCharts] error:', e)
			}
		},

		async renderLineChart() {
			if (this.trendMonths.length < 2) return
			const logicalW = this.chartWidth
			const logicalH = this.lineChartH
			const pr = this.pixelRatio || 2
			const categories = this.trendMonths.map(m => String(m.label || ''))
			const data = this.trendMonths.map(m => {
				const v = Math.round((m.pay || 0) * 100) / 100
				return isFinite(v) ? v : 0
			})
			if (!this._chartDataSafe(data)) return
			const dataMax = Math.max(...data)
			if (dataMax <= 0) return
			const maxVal = Math.ceil(dataMax * 1.2) || 10
			try {
				const ctx = await this._getCanvas2dCtx('lineChart', logicalW, logicalH)
				new uCharts({
					$this: this,
					canvasId: 'lineChart',
					type: 'line',
					context: ctx,
					width: logicalW,
					height: logicalH,
					pixelRatio: 1,
					animation: false,
					background: '#FFFFFF',
					fontSize: 10,
					categories: categories,
					series: [{ name: '工钱', data: data }],
					yAxis: { min: 0, max: maxVal, gridColor: '#F0EDE6', fontSize: 9, splitNumber: 3 },
					xAxis: { fontSize: 9, axisLineColor: '#E8E4DC', disableGrid: true },
					legend: { show: false },
					extra: { line: { type: 'curve', width: 2 } },
					dataLabel: true,
					color: ['#1B8A5A']
				})
			} catch (e) {
				console.log('[lineChart] error:', e)
			}
		},

		async renderRingChart() {
			if (this.totalPay <= 0) return
			const logicalW = this.chartWidth
			const logicalH = this.ringChartH
			const pr = this.pixelRatio || 2
			const pieData = []
			if (this.weekdayPay > 0) pieData.push({ name: '平日', value: this.weekdayPay })
			if (this.weekendPay > 0) pieData.push({ name: '周末', value: this.weekendPay })
			if (this.holidayPay > 0) pieData.push({ name: '节假日', value: this.holidayPay })
			if (pieData.length === 0) pieData.push({ name: '无数据', value: 1 })
			try {
				const ctx = await this._getCanvas2dCtx('ringChart', logicalW, logicalH)
				new uCharts({
					$this: this,
					canvasId: 'ringChart',
					type: 'pie',
					animation: false,
					context: ctx,
					width: logicalW,
					height: logicalH,
					pixelRatio: 1,
					background: '#FFFFFF',
					fontSize: 11,
					series: [{ name: '日期类型', data: pieData }],
					legend: { show: false },
					dataLabel: true,
					extra: {
						pie: {
							type: 'ring',
							ringWidth: 24,
							activeOpacity: 0.5,
							activeRadius: 8,
							offsetAngle: 0,
							labelWidth: 18,
							border: true,
							borderWidth: 2,
							borderColor: '#FFFFFF'
						}
					},
					color: ['#1B8A5A', '#C4A46C', '#B85C4A']
				})
			} catch (e) {
				console.log('[ringChart] error:', e)
			}
		},

		async renderBarChart() {
			if (this.weekBars.length === 0) return
			const logicalW = this.chartWidth
			const logicalH = this.barChartH
			const pr = this.pixelRatio || 2
			const categories = this.weekBars.map(b => String(b.label || ''))
			const data = this.weekBars.map(b => {
				const v = Number(b.value)
				return isFinite(v) ? Math.round(v * 100) / 100 : 0
			})
			if (!this._chartDataSafe(data)) return
			const dataMax = Math.max(...data)
			if (dataMax <= 0) return
			const maxVal = Math.ceil(dataMax * 1.2) || 10
			try {
				const ctx = await this._getCanvas2dCtx('barChart', logicalW, logicalH)
				const colWidth = Math.min(28, Math.floor((logicalW - 32) / categories.length / 2))
				new uCharts({
					$this: this,
					canvasId: 'barChart',
					type: 'column',
					animation: false,
					context: ctx,
					width: logicalW,
					height: logicalH,
					pixelRatio: 1,
					background: '#FFFFFF',
					fontSize: 10,
					categories: categories,
					series: [{ name: '工钱', data: data }],
					yAxis: {
						min: 0,
						max: maxVal,
						disabled: false,
						showTitle: true,
						title: '¥',
						titleFontSize: 10,
						titleOffsetY: -8,
						titleOffsetX: 4,
						splitNumber: 4,
						gridColor: '#F0EDE6',
						fontSize: 9
					},
					xAxis: {
						disableGrid: true,
						fontSize: 10,
						axisLineColor: '#E8E4DC',
						boundaryGap: 'center'
					},
					legend: { show: false },
					dataLabel: false,
					extra: {
						column: {
							type: 'group',
							width: colWidth,
							activeBgColor: '#000000',
							activeBgOpacity: 0.08,
							linearType: 'none',
							seriesGap: 2
						}
					},
					color: ['#1B8A5A']
				})
			} catch (e) {
				console.log('[barChart] error:', e)
			}
		},

		typeLabel(type) {
			const m = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return m[type] || '平日'
		},

		handleExportCSV() {
			const records = this.allRecords
			if (records.length === 0) {
				uni.showToast({ title: '无数据', icon: 'none' })
				return
			}
			let csv = '﻿日期,类型,计薪方式,时长/天数/件数,工钱,项目,备注,补贴,扣款
'
			records.forEach(r => {
				const subsidies = r.subsidies ? ((r.subsidies.night_shift||0)+(r.subsidies.meal||0)+(r.subsidies.transport||0)) : 0
				const deduction = r.deduction ? (r.deduction.amount||0) : 0
				const payMode = r.pay_mode || 'hourly'
				const qty = payMode === 'daily' ? (r.days || 0) + '天' : payMode === 'piece' ? (r.quantity || 0) : (r.duration || 0) + 'h'
				const row = [r.date, this.typeLabel((r.day_type || r.overtime_type)), payMode, qty, r.pay || 0, r.project_name || '', (r.remark || '').replace(/,/g, ';'), subsidies, deduction].join(',')
				csv += row + '
'
			})
			const now = new Date()
			const fileName = '记工统计_' + now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) + '.csv'
			// #ifdef MP-WEIXIN
			try {
				const fd = uni.getFileSystemManager()
				const tmpPath = wx.env.USER_DATA_PATH + '/' + fileName
				fd.writeFileSync(tmpPath, csv, 'utf8')
				uni.shareFileMessage({ filePath: tmpPath })
			} catch (e) {
				uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: 'CSV已复制', icon: 'success' }) })
			}
			// #endif
			// #ifndef MP-WEIXIN
			uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: 'CSV已复制', icon: 'success' }) })
			// #endif
		}
	}
}
</script>

<style lang="scss" scoped>
.page-stats {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 0 16px;
		max-width: 640px;
		margin: 0 auto;
	}

	&__spacer {
		height: 60px;
	}
}

.month-nav {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;

	&__title {
		font-size: 17px;
		font-weight: 600;
		color: var(--text-primary);
	}

	&__btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	&__icon {
		font-size: 22px;
		color: var(--text-muted);
	}
}



.summary-card {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
	background: var(--surface-card);
	border: 1px solid var(--border);
	border-radius: 12px;
	box-shadow: 0 1px 2px rgba(0,0,0,0.04);
	padding: 16px;
	margin-bottom: 16px;

	&__item {
		text-align: center;
	}

	&__value {
		font-size: 22px;
		font-weight: 700;
		color: var(--primary);
		display: block;
		font-family: var(--font-number);
	}

	&__label {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 4px;
		display: block;
	}
}

.card {
	background: var(--surface-card);
	border: 1px solid var(--border);
	border-radius: 12px;
	box-shadow: 0 1px 2px rgba(0,0,0,0.04);
	padding: 16px;
	margin-bottom: 16px;

	&__title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
		margin-bottom: 16px;
	}
}

/* 导出按钮 */
.nav-export {
		display: flex;
		align-items: center;
		height: 100%;
		padding: 0 8px;
	}
	.nav-export__text {
		font-size: 14px;
		color: var(--primary);
	}

	/* uCharts Canvas */
.chart-wrap {
	display: flex;
	justify-content: center;
	overflow: hidden;
}

.chart-canvas {
	display: block;
}

/* 类型分布图例 */
.breakdown-rows {
	display: flex;
	flex-direction: column;
	margin-top: 4px;
}

.breakdown__row {
	display: flex;
	align-items: center;
	padding: 5px 0;
}

.breakdown__dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	margin-right: 8px;

	&--weekday { background: var(--primary); }
	&--weekend { background: #C4A46C; }
	&--holiday { background: #B85C4A; }
}

.breakdown__name {
	font-size: 14px;
	color: var(--text-secondary);
	width: 48px;
}

.breakdown__val {
	flex: 1;
	text-align: right;
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
}

/* 年度累计 */
.year-summary {
	display: flex;
	justify-content: space-around;

	&__item {
		text-align: center;
	}

	&__num {
		font-size: 20px;
		font-weight: 700;
		color: var(--text-primary);
		display: block;
	}

	&__lbl {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 4px;
		display: block;
	}
}

/* 项目统计 */
.project-stats {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.project-stat__header {
		display: flex;
		align-items: center;
		margin-bottom: 6px;
	}
	.project-stat__color {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		margin-right: 8px;
	}
	.project-stat__name {
		font-size: 14px;
		color: var(--text-secondary);
		flex: 1;
	}
	.project-stat__hours {
		font-size: 13px;
		color: var(--text-muted);
		margin-right: 12px;
	}
	.project-stat__pay {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		min-width: 60px;
		text-align: right;
	}
	.project-stat__bar {
		height: 6px;
		background: var(--surface-hover);
		border-radius: 3px;
		overflow: hidden;
	}
	.project-stat__fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s;
	}

	/* 空状态 */
.empty-wrap {
	text-align: center;
	padding: 60px 0;

	&__icon {
		font-size: 40px;
	}

	&__text {
		font-size: 15px;
		color: var(--text-muted);
		display: block;
		margin-top: 10px;
	}

	&__hint {
		font-size: 12px;
		color: var(--text-muted);
		display: block;
		margin-top: 6px;
	}
}
</style>
