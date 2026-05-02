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

			<!-- 月汇总 — 3列：总工时/加班费/记录数 -->
				<view class="summary-card">
					<view class="summary-card__item">
						<text class="summary-card__value">{{ totalHours }}h</text>
						<text class="summary-card__label">总工时</text>
					</view>
					<view class="summary-card__item">
						<text class="summary-card__value">¥{{ totalPay.toFixed(0) }}</text>
						<text class="summary-card__label">加班费</text>
					</view>
					<view class="summary-card__item">
						<text class="summary-card__value">{{ recordCount }}</text>
						<text class="summary-card__label">记录数</text>
					</view>
				</view>

				<!-- 类型分布 - uCharts 环形图 -->
			<view class="card" v-if="recordCount > 0">
				<text class="card__title">加班类型分布</text>
				<view class="chart-wrap chart-wrap--ring" v-if="totalHours > 0">
					<canvas
						canvas-id="ringChart"
						id="ringChart"
						class="chart-canvas chart-canvas--ring"
					></canvas>
				</view>
				<view class="breakdown-rows">
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--weekday"></view>
						<text class="breakdown__name">平日</text>
						<text class="breakdown__val">{{ weekdayHours > 0 ? weekdayHours + 'h · ' : '' }}¥{{ weekdayPay.toFixed(0) }}</text>
					</view>
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--weekend"></view>
						<text class="breakdown__name">周末</text>
						<text class="breakdown__val">{{ weekendHours > 0 ? weekendHours + 'h · ' : '' }}¥{{ weekendPay.toFixed(0) }}</text>
					</view>
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--holiday"></view>
						<text class="breakdown__name">节假日</text>
						<text class="breakdown__val">{{ holidayHours > 0 ? holidayHours + 'h · ' : '' }}¥{{ holidayPay.toFixed(0) }}</text>
					</view>
				</view>
			</view>

			<!-- 每周趋势 - uCharts 柱状图 -->
			<view class="card" v-if="weekBars.length > 0">
				<text class="card__title">每周趋势</text>
				<view class="chart-wrap chart-wrap--bar">
					<canvas
						canvas-id="barChart"
						id="barChart"
						class="chart-canvas chart-canvas--bar"
					></canvas>
				</view>
			</view>

			<!-- 近6月收入趋势 -->
			<view class="card" v-if="trendMonths.length > 1">
				<text class="card__title">近6月收入趋势</text>
				<view class="chart-wrap chart-wrap--line">
					<canvas
						canvas-id="lineChart"
						id="lineChart"
						class="chart-canvas chart-canvas--line"
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
							<text class="year-summary__lbl">总加班费</text>
						</view>
						<view class="year-summary__item">
							<text class="year-summary__num">{{ yearMonths }}</text>
							<text class="year-summary__lbl">有加班月份</text>
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
							<text class="project-stat__hours">{{ ps.hours }}h</text>
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
				<text class="empty-wrap__text">本月没有加班记录</text>
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
import { useOvertimeStore } from '../../stores/overtimeStore'
import { useProjectStore } from '../../stores/projectStore'
import uCharts from '@qiun/ucharts'

function pad(n) { return String(n).padStart(2, '0') }

let ringInstance = null
let barInstance = null
let lineInstance = null

export default {
	components: { NavBar, ThemeToggle },
	data() {
		const now = new Date()
		return {
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			pixelRatio: 2,
			ringRendered: false,
			barRendered: false
		}
	},
	computed: {
		monthLabel() {
			return `${this.viewYear}年${this.viewMonth}月`
		},
		monthPrefix() {
			return `${this.viewYear}-${pad(this.viewMonth)}`
		},
		allRecords() {
			const store = useOvertimeStore()
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
			return this.monthRecords.filter(r => r.overtime_type === 'weekday')
		},
		weekendRecords() {
			return this.monthRecords.filter(r => r.overtime_type === 'weekend')
		},
		holidayRecords() {
			return this.monthRecords.filter(r => r.overtime_type === 'holiday')
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
		weekBars() {
			if (this.monthRecords.length === 0) return []
			const weeks = {}
			this.monthRecords.forEach(r => {
				const d = new Date(r.date)
				const dom = d.getDate()
				if (isNaN(dom)) return  // 跳过无效日期
				const wn = Math.ceil(dom / 7)
				const key = 'W' + wn
				if (!weeks[key]) weeks[key] = 0
				weeks[key] += r.duration || 0
			})
			const maxH = Math.max(...Object.values(weeks), 1)
			return Object.entries(weeks).sort().map(([k, h]) => ({
				label: k,
				hours: Math.round(h * 10) / 10,
				pct: Math.round((h / maxH) * 100)
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
					if (!groups[key]) groups[key] = { hours: 0, pay: 0 }
					groups[key].hours += r.duration || 0
					groups[key].pay += r.pay || 0
				})
				let items = Object.entries(groups).map(([id, stats]) => {
					const proj = id !== '__none__' ? projMap.get(id) : null
					return {
						name: proj ? proj.name : '无项目',
						color: proj ? proj.color : '#9C9C9C',
						hours: Math.round(stats.hours * 10) / 10,
						pay: stats.pay,
						pct: 0
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
		// 月份切换后重新渲染图表
		viewMonth() {
			this.$nextTick(() => {
				setTimeout(() => {
					this.renderCharts()
				}, 200)
			})
		}
	},
	onShow() {
		const store = useOvertimeStore()
		store.loadRecords()
	},
	onReady() {
		try {
			const sysInfo = uni.getSystemInfoSync()
			this.pixelRatio = sysInfo.pixelRatio || 2
		} catch (e) {
			this.pixelRatio = 2
		}
		// 延迟渲染确保 canvas 就绪
		setTimeout(() => {
			this.renderCharts()
		}, 400)
	},
	beforeDestroy() {
		ringInstance = null
		barInstance = null
		lineInstance = null
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
		renderCharts() {
			this.renderRingChart()
			this.renderBarChart()
			this.renderLineChart()
		},
		renderLineChart() {
				if (this.trendMonths.length < 2) return
				const allZero = this.trendMonths.every(m => (m.pay || 0) === 0)
				if (allZero) return
				const pr = this.pixelRatio
				const w = 345 * pr
				const h = 200 * pr
				const categories = this.trendMonths.map(m => m.label)
				const data = this.trendMonths.map(m => Math.round(m.pay * 100) / 100)
				try {
					const ctx = uni.createCanvasContext("lineChart", this)
					lineInstance = new uCharts({
						$this: this,
						canvasId: "lineChart",
						type: "line",
						context: ctx,
						width: w,
						height: h,
						pixelRatio: pr,
						background: "#FFFFFF",
						fontSize: 10,
						categories: categories,
						series: [{ name: "加班费", data: data }],
						yAxis: { min: 0, gridColor: "#F0EDE6", fontSize: 9, splitNumber: 3 },
						xAxis: { fontSize: 9, axisLineColor: "#E8E4DC", disableGrid: true },
						legend: { show: false },
						extra: { line: { type: "curve", width: 2 * pr } },
						dataLabel: true,
						color: ["#1B8A5A"]
					})
				} catch (e) {
					console.log("lineChart error:", e)
				}
			},
			renderRingChart() {
			if (this.totalHours <= 0) {
				this.ringRendered = false
				return
			}
			const pr = this.pixelRatio
			const w = 345 * pr
			const h = 220 * pr

			const pieData = []
			if (this.weekdayHours > 0) pieData.push({ name: '平日', value: this.weekdayHours })
			if (this.weekendHours > 0) pieData.push({ name: '周末', value: this.weekendHours })
			if (this.holidayHours > 0) pieData.push({ name: '节假日', value: this.holidayHours })
			if (pieData.length === 0) pieData.push({ name: '无数据', value: 1 })

			try {
				const ctx = uni.createCanvasContext('ringChart', this)
				ringInstance = new uCharts({
					$this: this,
					canvasId: 'ringChart',
					type: 'pie',
					context: ctx,
					width: w,
					height: h,
					pixelRatio: pr,
					background: '#FFFFFF',
					fontSize: 11,
					series: [{
						name: '加班类型',
						data: pieData
					}],
					legend: { show: false },
					dataLabel: true,
					extra: {
						pie: {
							type: 'ring',
							ringWidth: 24 * pr,
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
				this.ringRendered = true
			} catch (e) {
				this.ringRendered = false
			}
		},
		renderBarChart() {
			if (this.weekBars.length === 0) {
				this.barRendered = false
				return
			}
			if (this.weekBars.every(b => (b.hours || 0) === 0)) {
				this.barRendered = false
				return
			}
			const pr = this.pixelRatio
			const w = 345 * pr
			const h = 260 * pr

			const categories = this.weekBars.map(b => b.label)
			const data = this.weekBars.map(b => b.hours)

			try {
				const ctx = uni.createCanvasContext('barChart', this)
				barInstance = new uCharts({
					$this: this,
					canvasId: 'barChart',
					type: 'column',
					context: ctx,
					width: w,
					height: h,
					pixelRatio: pr,
					background: '#FFFFFF',
					fontSize: 10,
					categories: categories,
					series: [{
						name: '加班时长',
						data: data
					}],
					yAxis: {
						min: 0,
						disabled: false,
						showTitle: true,
						title: 'h',
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
							width: Math.min(28 * pr, (w - 80) / categories.length / 2),
							activeBgColor: '#000000',
							activeBgOpacity: 0.08,
							linearType: 'none',
							seriesGap: 2
						}
					},
					color: ['#1B8A5A']
					})
					this.barRendered = true
				} catch (e) {
					this.barRendered = false
				}
			},

		typeLabel(type) {
			const m = { weekday: "平日", weekend: "周末", holiday: "节假日" }
			return m[type] || "平日"
		},

		handleExportCSV() {
			const records = this.allRecords
			if (records.length === 0) {
				uni.showToast({ title: "无数据", icon: "none" })
				return
			}
			let csv = "﻿日期,类型,计薪方式,时长/天数/件数,加班费,项目,备注,补贴,扣款\n"
			records.forEach(r => {
				const subsidies = r.subsidies ? ((r.subsidies.night_shift||0)+(r.subsidies.meal||0)+(r.subsidies.transport||0)) : 0
				const deduction = r.deduction ? (r.deduction.amount||0) : 0
				const payMode = r.pay_mode || "hourly"
					const qty = payMode === "daily" ? (r.days || 0) + "天" : payMode === "piece" ? (r.quantity || 0) : (r.duration || 0) + "h"
					const row = [r.date, this.typeLabel(r.overtime_type), payMode, qty, r.pay || 0, r.project_name || "", (r.remark || "").replace(/,/g, ";"), subsidies, deduction].join(",")
				csv += row + "\n"
			})
			const now = new Date()
			const fileName = "加班统计_" + now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) + ".csv"
			// #ifdef MP-WEIXIN
			try {
				const fd = uni.getFileSystemManager()
				const tmpPath = wx.env.USER_DATA_PATH + "/" + fileName
				fd.writeFileSync(tmpPath, csv, "utf8")
				uni.shareFileMessage({ filePath: tmpPath })
			} catch (e) {
				uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: "CSV已复制", icon: "success" }) })
			}
			// #endif
			// #ifndef MP-WEIXIN
			uni.setClipboardData({ data: csv, success: () => uni.showToast({ title: "CSV已复制", icon: "success" }) })
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
	padding: 20px;
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
	padding: 20px;
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

	&--ring {
		height: 220px;
	}

	&--bar {
		height: 260px;
	}

	&--line {
		height: 200px;
	}
}

.chart-canvas {
	&--ring {
		width: 345px;
		height: 220px;
	}

	&--bar {
		width: 345px;
		height: 260px;
	}

	&--line {
		width: 345px;
		height: 200px;
	}
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
