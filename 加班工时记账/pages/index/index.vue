<template>
	<view class="page-index">
		<NavBar title="加班记账" />

		<view class="page-index__content">
			<!-- 月度摘要 -->
			<view class="summary-card">
				<view class="summary-card__top">
					<view class="summary-card__left">
						<text class="summary-card__label">本月加班</text>
						<text class="summary-card__hours">
							{{ totalHours }}<text class="summary-card__unit"> 小时</text>
						</text>
					</view>
					<view class="summary-card__right">
						<text class="summary-card__pay-label">预计实付</text>
						<text class="summary-card__pay">¥ {{ totalPay.toFixed(0) }}</text>
					</view>
				</view>
				<view class="summary-card__divider"></view>
				<view class="summary-card__breakdown">
					<view class="summary-card__breakdown-item">
						<text class="summary-card__breakdown-label">平日</text>
						<text class="summary-card__breakdown-value">{{ weekdayHours }}h</text>
					</view>
					<view class="summary-card__breakdown-item">
						<text class="summary-card__breakdown-label">周末</text>
						<text class="summary-card__breakdown-value">{{ weekendHours }}h</text>
					</view>
					<view class="summary-card__breakdown-item">
						<text class="summary-card__breakdown-label">节假日</text>
						<text class="summary-card__breakdown-value">{{ holidayHours }}h</text>
					</view>
				</view>
			</view>

			<!-- 对账入口 -->
			<view class="recon-entry" @tap="goRecon">
				<view class="recon-entry__left">
					<text class="recon-entry__icon">&#x2705;</text>
					<text class="recon-entry__text">去对账，看看加班费少没少发</text>
				</view>
				<text class="recon-entry__arrow">&#x203A;</text>
			</view>

			<!-- 日历 -->
			<view class="calendar">
				<view class="calendar__header">
					<view class="calendar__nav" @tap="prevMonth">
						<text class="calendar__nav-icon">&#x2039;</text>
					</view>
					<text class="calendar__title">{{ calendarTitle }}</text>
					<view class="calendar__nav" @tap="nextMonth">
						<text class="calendar__nav-icon">&#x203A;</text>
					</view>
				</view>
				<view class="calendar__weekdays">
					<text
						v-for="(wd, idx) in weekdays"
						:key="idx"
						class="calendar__weekday"
						:class="{ 'calendar__weekday--weekend': idx === 0 || idx === 6 }"
					>{{ wd }}</text>
				</view>
				<view class="calendar__grid">
					<view
						v-for="(cell, idx) in calendarCells"
						:key="idx"
						class="calendar__cell"
						:class="{
							'calendar__cell--empty': !cell.day,
							'calendar__cell--today': cell.isToday,
							'calendar__cell--weekend': cell.isWeekend,
							'calendar__cell--has-record': cell.hasRecord
						}"
						@tap="cell.day ? onCellTap(cell) : null"
					>
						<text class="calendar__day">{{ cell.day || '' }}</text>
						<view v-if="cell.hasRecord && cell.day" class="calendar__dot"></view>
					</view>
				</view>
			</view>

			<!-- 最近记录 -->
			<view class="records-section" v-if="recentRecords.length > 0">
				<view class="records-section__header">
					<text class="records-section__title">最近记录</text>
					<view class="settle-filter">
						<text class="settle-filter__item" :class="{ 'settle-filter__item--active': settleFilter === 'all' }" @tap="settleFilter = 'all'">全部</text>
						<text class="settle-filter__item" :class="{ 'settle-filter__item--active': settleFilter === 'unsettled' }" @tap="settleFilter = 'unsettled'">未结算</text>
						<text class="settle-filter__item" :class="{ 'settle-filter__item--active': settleFilter === 'settled' }" @tap="settleFilter = 'settled'">已结算</text>
					</view>
				</view>
				<view class="records-section__list">
					<view
						v-for="(rec, idx) in recentRecords"
						:key="rec.id"
						class="record-item"
						:class="{ 'record-item--last': idx === recentRecords.length - 1 }"
						@tap="goEdit(rec.id)"
					>
						<view
							class="record-item__icon"
							:class="iconClass(rec.overtime_type)"
						>
							<text class="record-item__icon-text">{{ typeLabel(rec.overtime_type) }}</text>
						</view>
						<view class="record-item__info">
							<text class="record-item__type">{{ typeFull(rec.overtime_type) }}</text>
							<text class="record-item__date">{{ rec.date }} {{ rec.start_time }}-{{ rec.end_time }}</text>
								<text class="record-item__project" v-if="rec.project_name">{{ rec.project_name }}</text>
						</view>
						<view class="record-item__right">
							<text class="record-item__settle-badge" :class="rec.settled ? 'record-item__settle-badge--done' : 'record-item__settle-badge--pending'">{{ rec.settled ? '已结' : '未结' }}</text>
							<text class="record-item__hours">{{ rec.duration }}h</text>
							<text class="record-item__pay" v-if="rec.pay">¥{{ rec.pay.toFixed(0) }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-else>
				<view class="empty-wrap__icon">
					<text class="empty-wrap__icon-text">&#x1F4C5;</text>
				</view>
				<text class="empty-wrap__title">还没有加班记录</text>
				<text class="empty-wrap__desc">点击下方 + 开始记录第一笔加班</text>
			</view>
		</view>

		<!-- 浮动按钮 -->
		<view class="fab" @tap="goRecord">
			<text class="fab__icon">+</text>
	</view>

		<!-- 当日汇总弹窗 -->
		<view class="day-sheet" v-if="showDaySheet" @tap="showDaySheet = false">
			<view class="day-sheet__panel" @tap.stop>
				<view class="day-sheet__header">
					<text class="day-sheet__title">{{ daySheetDate }}</text>
					<text class="day-sheet__total">{{ daySheetTotal }}</text>
				</view>
				<view class="day-sheet__list">
					<view
						v-for="(rec, idx) in daySheetRecords"
						:key="rec.id"
						class="day-sheet__item"
						:class="{ 'day-sheet__item--last': idx === daySheetRecords.length - 1 }"
						@tap="goEdit(rec.id)"
					>
						<view class="day-sheet__item-left">
							<text class="day-sheet__item-type">{{ typeFull(rec.overtime_type) }}</text>
							<text class="day-sheet__item-time">{{ rec.start_time }}-{{ rec.end_time }}</text>
							<text class="record-item__project" v-if="rec.project_name">{{ rec.project_name }}</text>
						</view>
						<view class="day-sheet__item-right">
							<text class="day-sheet__item-hours">{{ rec.duration }}h</text>
							<text class="day-sheet__item-pay" v-if="rec.pay">¥{{ rec.pay.toFixed(0) }}</text>
							<text class="record-item__settle-badge" :class="rec.settled ? 'record-item__settle-badge--done' : 'record-item__settle-badge--pending'">{{ rec.settled ? '已结' : '未结' }}</text>
						</view>
					</view>
				</view>
				<view class="day-sheet__action" @tap="goRecordDate">
					<text class="day-sheet__action-text">再记一笔</text>
				</view>
			</view>
		</view>
	</view>
</template>
<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'
import { useSalaryStore } from '../../stores/salaryStore'

function pad(n) { return String(n).padStart(2, '0') }

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		return {
			weekdays: ['日', '一', '二', '三', '四', '五', '六'],
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			todayStr: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
			showDaySheet: false,
			daySheetDate: '',
			settleFilter: 'all'
		}
	},
	computed: {
		calendarTitle() {
			return `${this.viewYear}年${this.viewMonth}月`
		},
		monthPrefix() {
			return `${this.viewYear}-${pad(this.viewMonth)}`
		},
		monthRecords() {
			const store = useOvertimeStore()
			return store.records.filter(r => r.date && r.date.startsWith(this.monthPrefix))
		},
		totalHours() {
			return this.monthRecords.reduce((s, r) => s + (r.duration || 0), 0)
		},
		totalPay() {
			return this.monthRecords.reduce((s, r) => s + (r.pay || 0), 0)
		},
		weekdayHours() {
			return this.monthRecords.filter(r => r.overtime_type === 'weekday').reduce((s, r) => s + (r.duration || 0), 0)
		},
		weekendHours() {
			return this.monthRecords.filter(r => r.overtime_type === 'weekend').reduce((s, r) => s + (r.duration || 0), 0)
		},
		holidayHours() {
			return this.monthRecords.filter(r => r.overtime_type === 'holiday').reduce((s, r) => s + (r.duration || 0), 0)
		},
		recordDates() {
			return new Set(this.monthRecords.map(r => r.date))
		},
		daySheetRecords() {
			if (!this.daySheetDate) return []
			const store = useOvertimeStore()
			return store.records.filter(r => r.date === this.daySheetDate)
		},
		daySheetTotal() {
			const recs = this.daySheetRecords
			const h = recs.reduce((s, r) => s + (r.duration || 0), 0)
			const p = recs.reduce((s, r) => s + (r.pay || 0), 0)
			const s = recs.reduce((sum, r) => sum + ((r.subsidies ? (r.subsidies.night_shift||0)+(r.subsidies.meal||0)+(r.subsidies.transport||0) : 0) - (r.deduction ? r.deduction.amount||0 : 0)), 0); return h + 'h · ¥' + (p + s).toFixed(0)
		},
		recentRecords() {
			const store = useOvertimeStore()
			let list = store.records
			if (this.settleFilter === 'unsettled') {
				list = list.filter(r => !r.settled)
			} else if (this.settleFilter === 'settled') {
				list = list.filter(r => r.settled)
			}
			return list.slice(0, 10)
		},
		calendarCells() {
			const cells = []
			const firstDayIndex = new Date(this.viewYear, this.viewMonth - 1, 1).getDay()
			const daysInMonth = new Date(this.viewYear, this.viewMonth, 0).getDate()

			for (let i = 0; i < firstDayIndex; i++) {
				cells.push({ day: 0, hasRecord: false, isToday: false, isWeekend: false })
			}

			for (let d = 1; d <= daysInMonth; d++) {
				const dateStr = `${this.viewYear}-${pad(this.viewMonth)}-${pad(d)}`
				const dayOfWeek = new Date(this.viewYear, this.viewMonth - 1, d).getDay()
				cells.push({
					day: d,
					dateStr,
					hasRecord: this.recordDates.has(dateStr),
					isToday: dateStr === this.todayStr,
					isWeekend: dayOfWeek === 0 || dayOfWeek === 6
				})
			}

			const rem = cells.length % 7
			if (rem > 0) {
				for (let i = 0; i < 7 - rem; i++) {
					cells.push({ day: 0, hasRecord: false, isToday: false, isWeekend: false })
				}
			}

			return cells
		}
	},
	onShow() {
		const store = useOvertimeStore()
		store.loadRecords()
		const now = new Date()
		this.todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
	},
		methods: {
			prevMonth() {
				if (this.viewMonth === 1) {
					this.viewYear--
					this.viewMonth = 12
				} else {
					this.viewMonth--
				}
			},
			nextMonth() {
				if (this.viewMonth === 12) {
					this.viewYear++
					this.viewMonth = 1
				} else {
					this.viewMonth++
				}
			},
			onCellTap(cell) {
				if (cell.hasRecord) {
					this.daySheetDate = cell.dateStr
					this.showDaySheet = true
				} else {
					uni.navigateTo({ url: '/pages/record/record?date=' + cell.dateStr })
				}
			},
			typeLabel(type) {
				const m = { weekday: '平', weekend: '休', holiday: '节' }
				return m[type] || '平'
			},
			typeFull(type) {
				const m = { weekday: '平日加班', weekend: '周末加班', holiday: '节假日加班' }
				return m[type] || '平日加班'
			},
			iconClass(type) {
				return type === 'weekend' ? 'record-item__icon--weekend' : type === 'holiday' ? 'record-item__icon--holiday' : 'record-item__icon--weekday'
			},
			goRecord() {
				uni.navigateTo({ url: '/pages/record/record' })
			},
			goEdit(id) {
				uni.navigateTo({ url: '/pages/record/record?id=' + id })
			},
			goRecon() {
				uni.navigateTo({ url: '/pages/reconciliation/recon' })
			},
			goRecordDate() {
				this.showDaySheet = false
				uni.navigateTo({ url: '/pages/record/record?date=' + this.daySheetDate })
			}
		}
	}
</script>

<style lang="scss" scoped>
.page-index {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

	&__content {
		padding: 16px 16px 100px;
		max-width: 640px;
		margin: 0 auto;
	}
}

/* 摘要卡片 */
.summary-card {
	background: #FFFFFF;
	border: 1px solid #E5E5E5;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 16px;

	&__top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	&__left {
		flex: 1;
	}

	&__label {
		font-size: 14px;
		color: #999999;
	}

	&__hours {
		font-size: 28px;
		font-weight: 700;
		color: #07C160;
		margin-top: 4px;
		display: block;
	}

	&__unit {
		font-size: 15px;
		font-weight: 400;
		color: #999999;
	}

	&__right {
		text-align: right;
	}

	&__pay-label {
		font-size: 12px;
		color: #999999;
		display: block;
	}

	&__pay {
		font-size: 20px;
		font-weight: 700;
		color: #1A1C1C;
		margin-top: 4px;
		display: block;
	}

	&__divider {
		height: 1px;
		background: #E5E5E5;
		margin: 16px 0;
	}

	&__breakdown {
		display: flex;
		justify-content: space-around;
	}

	&__breakdown-item {
		text-align: center;
	}

	&__breakdown-label {
		font-size: 12px;
		color: #999999;
		display: block;
	}

	&__breakdown-value {
		font-size: 16px;
		font-weight: 600;
		color: #1A1C1C;
		margin-top: 2px;
		display: block;
	}
}

/* 日历 */
.calendar {
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	overflow: hidden;
	margin-bottom: 16px;

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
	}

	&__title {
		font-size: 17px;
		font-weight: 600;
		color: #1A1C1C;
	}

	&__nav {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	&__nav-icon {
		font-size: 22px;
		color: #999999;
	}

	&__weekdays {
		display: flex;
		background: #F7F7F7;
	}

	&__weekday {
		flex: 1;
		text-align: center;
		padding: 8px 0;
		font-size: 12px;
		font-weight: 500;
		color: #999999;

		&--weekend {
			color: #E53935;
		}
	}

	&__grid {
		display: flex;
		flex-wrap: wrap;
	}

	&__cell {
		width: calc(100% / 7);
		min-height: 44px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4px 0;
		border-right: 1px solid #F3F3F3;
		border-bottom: 1px solid #F3F3F3;
		box-sizing: border-box;

		&:nth-child(7n) {
			border-right: none;
		}

		&--empty {
			background: #FAFAFA;
		}

		&--today {
			background: rgba(7, 193, 96, 0.06);
		}
	}

	&__day {
		font-size: 14px;
		color: #1A1C1C;

		.calendar__cell--weekend & {
			color: #E53935;
		}

		.calendar__cell--today & {
			color: #07C160;
			font-weight: 700;
		}
	}

	&__dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #07C160;
		margin-top: 3px;
	}
}

/* 空状态 */
.empty-wrap {
	text-align: center;
	padding: 60px 0;

	&__icon {
		margin-bottom: 16px;
	}

	&__icon-text {
		font-size: 48px;
	}

	&__title {
		font-size: 17px;
		font-weight: 600;
		color: #1A1C1C;
		display: block;
	}

	&__desc {
		font-size: 14px;
		color: #999999;
		display: block;
		margin-top: 6px;
	}
}

/* 记录列表 */
.records-section {
	margin-bottom: 16px;

	&__header {
		padding: 12px 0;
	}

	&__title {
		font-size: 17px;
		font-weight: 600;
		color: #1A1C1C;
	}

	&__list {
		background: #FFFFFF;
		border-radius: 12px;
		border: 1px solid #E5E5E5;
		overflow: hidden;
	}
}

.record-item {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	border-bottom: 1px solid #F3F3F3;

	&--last {
		border-bottom: none;
	}

	&__icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-right: 12px;

		&--weekday {
			background: rgba(7, 193, 96, 0.12);
		}

		&--weekend {
			background: rgba(0, 100, 149, 0.12);
		}

		&--holiday {
			background: rgba(162, 61, 51, 0.12);
		}
	}

	&__icon-text {
		font-size: 13px;
		font-weight: 600;
		color: #07C160;

		.record-item__icon--weekend & {
			color: #006495;
		}

		.record-item__icon--holiday & {
			color: #A23D33;
		}
	}

	&__info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	&__type {
		font-size: 15px;
		font-weight: 500;
		color: #1A1C1C;
	}

	&__date {
		font-size: 12px;
		color: #999999;
		margin-top: 2px;
	}

&__project {
font-size: 11px;
color: #07C160;
margin-top: 1px;
}

	&__right {
		text-align: right;
	}

	&__hours {
		font-size: 16px;
		font-weight: 600;
		color: #07C160;
		display: block;
	}

	&__pay {
		font-size: 12px;
		color: #999999;
		display: block;
		margin-top: 1px;
	}
}

/* 当日汇总弹窗 */
.day-sheet {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 200;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}
.day-sheet__panel {
	width: 100%;
	max-width: 640px;
	background: #FFFFFF;
	border-radius: 20px 20px 0 0;
	padding: 24px 20px 32px;
}
.day-sheet__header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 16px;
}
.day-sheet__title {
	font-size: 18px;
	font-weight: 700;
	color: #1A1C1C;
}
.day-sheet__total {
	font-size: 15px;
	font-weight: 600;
	color: #07C160;
}
.day-sheet__list {
	background: #F7F7F7;
	border-radius: 10px;
	overflow: hidden;
}
.day-sheet__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	border-bottom: 1px solid #E5E5E5;
}
.day-sheet__item--last {
	border-bottom: none;
}
.day-sheet__item-left {
	display: flex;
	flex-direction: column;
}
.day-sheet__item-type {
	font-size: 14px;
	font-weight: 500;
	color: #1A1C1C;
}
.day-sheet__item-time {
	font-size: 12px;
	color: #999999;
	margin-top: 2px;
}
.day-sheet__item-right {
	text-align: right;
}
.day-sheet__item-hours {
	font-size: 16px;
	font-weight: 600;
	color: #07C160;
	display: block;
}
.day-sheet__item-pay {
	font-size: 12px;
	color: #999999;
	display: block;
	margin-top: 1px;
}
.day-sheet__action {
	margin-top: 16px;
	height: 44px;
	border-radius: 10px;
	background: #07C160;
	display: flex;
	align-items: center;
	justify-content: center;
}
.day-sheet__action-text {
	font-size: 16px;
	font-weight: 600;
	color: #FFFFFF;
}

/* FAB */
.fab {
	position: fixed;
	bottom: 96px;
	right: 24px;
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: #07C160;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 16px rgba(7, 193, 96, 0.35);
	z-index: 50;

	&__icon {
		font-size: 28px;
		color: #FFFFFF;
		font-weight: 300;
	}


/* 结算筛选 */
.settle-filter {
	display: flex;
	gap: 6px;
}
.settle-filter__item {
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 11px;
	color: #999999;
	background: #F0F0F0;
}
.settle-filter__item--active {
	color: #07C160;
	background: rgba(7, 193, 96, 0.1);
}

/* 结算标签 */
.record-item__settle-badge {
	display: inline-block;
	font-size: 10px;
	padding: 1px 5px;
	border-radius: 4px;
	margin-bottom: 2px;
}
.record-item__settle-badge--pending {
	color: #E5A100;
	background: #FFF8E6;
}
.record-item__settle-badge--done {
	color: #07C160;
	background: #E6FFF0;
}
}
</style>
