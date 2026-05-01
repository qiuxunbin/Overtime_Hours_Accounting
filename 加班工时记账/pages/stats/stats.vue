<template>
	<view class="page-stats">
		<NavBar title="统计" />

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

			<!-- 月汇总 -->
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
			<view class="card" v-if="totalHours > 0">
				<text class="card__title">加班类型分布</text>
				<view class="chart-wrap chart-wrap--ring">
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
						<text class="breakdown__val">{{ weekdayHours }}h · ¥{{ weekdayPay.toFixed(0) }}</text>
					</view>
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--weekend"></view>
						<text class="breakdown__name">周末</text>
						<text class="breakdown__val">{{ weekendHours }}h · ¥{{ weekendPay.toFixed(0) }}</text>
					</view>
					<view class="breakdown__row">
						<view class="breakdown__dot breakdown__dot--holiday"></view>
						<text class="breakdown__name">节假日</text>
						<text class="breakdown__val">{{ holidayHours }}h · ¥{{ holidayPay.toFixed(0) }}</text>
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
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-if="totalHours === 0">
				<text class="empty-wrap__icon">&#x1F4CA;</text>
				<text class="empty-wrap__text">本月没有加班记录</text>
				<text class="empty-wrap__hint">开始记录后这里会显示统计图表</text>
			</view>

			<view class="page-stats__spacer"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'
import uCharts from '@qiun/ucharts'

function pad(n) { return String(n).padStart(2, '0') }

let ringInstance = null
let barInstance = null

export default {
	components: { NavBar },
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
		yearMonths() {
			const year = String(this.viewYear)
			const months = new Set()
			this.allRecords.forEach(r => {
				if (r.date && r.date.startsWith(year)) {
					months.add(r.date.slice(0, 7))
				}
			})
			return months.size
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
	},
	methods: {
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
					color: ['#07C160', '#006495', '#A23D33']
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
						gridColor: '#F0F0F0',
						fontSize: 9
					},
					xAxis: {
						disableGrid: true,
						fontSize: 10,
						axisLineColor: '#E5E5E5',
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
					color: ['#07C160']
				})
				this.barRendered = true
			} catch (e) {
				this.barRendered = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.page-stats {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

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
		color: #1A1C1C;
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
		color: #999999;
	}
}

.summary-card {
	background: #FFFFFF;
	border: 1px solid #E5E5E5;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 16px;
	display: flex;
	justify-content: space-around;

	&__item {
		text-align: center;
	}

	&__value {
		font-size: 22px;
		font-weight: 700;
		color: #07C160;
		display: block;
	}

	&__label {
		font-size: 12px;
		color: #999999;
		margin-top: 4px;
		display: block;
	}
}

.card {
	background: #FFFFFF;
	border: 1px solid #E5E5E5;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 16px;

	&__title {
		font-size: 16px;
		font-weight: 600;
		color: #1A1C1C;
		display: block;
		margin-bottom: 16px;
	}
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

	&--weekday { background: #07C160; }
	&--weekend { background: #006495; }
	&--holiday { background: #A23D33; }
}

.breakdown__name {
	font-size: 14px;
	color: #666666;
	width: 48px;
}

.breakdown__val {
	flex: 1;
	text-align: right;
	font-size: 14px;
	font-weight: 500;
	color: #1A1C1C;
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
		color: #1A1C1C;
		display: block;
	}

	&__lbl {
		font-size: 12px;
		color: #999999;
		margin-top: 4px;
		display: block;
	}
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
		color: #999999;
		display: block;
		margin-top: 10px;
	}

	&__hint {
		font-size: 12px;
		color: #CCCCCC;
		display: block;
		margin-top: 6px;
	}
}
</style>
