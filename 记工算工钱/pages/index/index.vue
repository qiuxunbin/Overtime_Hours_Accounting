<template>
	<view class="page-index">
		<NavBar title="记工算工钱" green />

		<view class="page-index__content">
			<!-- 记工状态 -->
			<view class="clock-status" @tap="toggleClock">
				<view class="clock-status__dot" :class="{ 'clock-status__dot--active': isClockedIn }"></view>
				<text class="clock-status__text" v-if="isClockedIn">当前记工 · 已计时 {{ clockElapsed }}</text>
				<text class="clock-status__text clock-status__text--idle" v-else-if="monthRecords.length === 0">未在记工，点击计时</text>
				<text class="clock-status__text clock-status__text--idle" v-else>本月已记 {{ monthRecords.length }} 条，点击计时</text>
			</view>

			<!-- 同步状态 -->
			<view class="sync-status" v-if="syncStatusText" @tap="onSyncTap">
				<view class="sync-status__dot" :class="'sync-status__dot--' + syncStatus"></view>
				<text class="sync-status__text">{{ syncStatusText }}</text>
			</view>

			<!-- 月度摘要 -->
			<view class="summary-card">
				<view class="summary-card__top">
					<view class="summary-card__left">
						<text class="summary-card__label">本月记工</text>
						<text class="summary-card__hours">
							{{ totalHours }}<text class="summary-card__unit">h</text>
						</text>
						<view class="summary-card__sub-row" v-if="totalDays > 0 || totalQuantity > 0">
							<text class="summary-card__sub-text" v-if="totalDays > 0">{{ totalDays }}天</text>
							<text class="summary-card__sub-text" v-if="totalQuantity > 0">{{ totalQuantity }}件</text>
						</view>
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
						<text class="summary-card__breakdown-value summary-card__breakdown-value--dim" v-if="weekdayDays > 0">{{ weekdayDays }}天</text>
						<text class="summary-card__breakdown-value summary-card__breakdown-value--dim" v-if="weekdayQty > 0">{{ weekdayQty }}件</text>
						<text class="summary-card__breakdown-pay" v-if="weekdayPay > 0">¥{{ weekdayPay.toFixed(0) }}</text>
					</view>
					<view class="summary-card__breakdown-item">
						<text class="summary-card__breakdown-label">周末</text>
						<text class="summary-card__breakdown-value">{{ weekendHours }}h</text>
						<text class="summary-card__breakdown-value summary-card__breakdown-value--dim" v-if="weekendDays > 0">{{ weekendDays }}天</text>
						<text class="summary-card__breakdown-value summary-card__breakdown-value--dim" v-if="weekendQty > 0">{{ weekendQty }}件</text>
						<text class="summary-card__breakdown-pay" v-if="weekendPay > 0">¥{{ weekendPay.toFixed(0) }}</text>
					</view>
					<view class="summary-card__breakdown-item">
						<text class="summary-card__breakdown-label">节假日</text>
						<text class="summary-card__breakdown-value">{{ holidayHours }}h</text>
						<text class="summary-card__breakdown-value summary-card__breakdown-value--dim" v-if="holidayDays > 0">{{ holidayDays }}天</text>
						<text class="summary-card__breakdown-value summary-card__breakdown-value--dim" v-if="holidayQty > 0">{{ holidayQty }}件</text>
						<text class="summary-card__breakdown-pay" v-if="holidayPay > 0">¥{{ holidayPay.toFixed(0) }}</text>
					</view>
				</view>
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
						<view v-if="cell.hasRecord && cell.day" class="calendar__badge"><text class="calendar__badge-text">{{ cell.recordCount }}</text></view>
					</view>
				</view>
			</view>

			<!-- 最近记录 -->
			<view class="records-section">
				<view class="records-section__header">
					<text class="records-section__title">最近记录</text>
					<view class="records-section__filters">
						<view class="filter-chip" @tap="showProjectFilter">
							<text class="filter-chip__text" :style="{ color: selectedProjectFilter ? '#1B8A5A' : '#9C9C9C' }">{{ selectedProjectFilter ? getProjectName(selectedProjectFilter) : '所有工作' }}</text>
							<text class="filter-chip__arrow">›</text>
						</view>
						<text class="filter-chip__sep">|</text>
							<text class="filter-chip" :class="{ 'filter-chip--active': settleFilter === 'all' }" @tap="settleFilter = 'all'">全部</text>
						<text class="filter-chip" :class="{ 'filter-chip--active': settleFilter === 'unsettled' }" @tap="settleFilter = 'unsettled'">未结算</text>
						<text class="filter-chip" :class="{ 'filter-chip--active': settleFilter === 'settled' }" @tap="settleFilter = 'settled'">已结算</text>
					</view>
				</view>
				<view class="records-section__list" v-if="recentRecords.length > 0">
					<view
						v-for="(rec, idx) in recentRecords"
						:key="rec.id"
						class="record-item"
						:class="{ 'record-item--last': idx === recentRecords.length - 1 }"
						@tap="goEdit(rec.id)"
					>
						<view
							class="record-item__icon"
							:class="iconClass(rec.day_type || rec.overtime_type)"
						>
							<text class="record-item__icon-text">{{ typeLabel(rec.day_type || rec.overtime_type) }}</text>
						</view>
						<view class="record-item__info">
							<text class="record-item__type">{{ typeFull(rec.day_type || rec.overtime_type) }}</text>
							<text class="record-item__date">{{ rec.date }} {{ recordTimeStr(rec) }}</text>
								<text class="record-item__project" v-if="rec.project_name">{{ rec.project_name }}</text>
						</view>
						<view class="record-item__right">
							<text class="record-item__pay-mode-tag">{{ modeLabel(rec.pay_mode) }}</text>
								<text class="record-item__settle-badge" :class="rec.settled ? 'record-item__settle-badge--done' : 'record-item__settle-badge--pending'">{{ rec.settled ? '已结' : '未结' }}</text>
							<text class="record-item__hours">{{ recordQtyStr(rec) }}</text>
							<text class="record-item__pay" v-if="(rec.net_pay || rec.pay)">¥{{ (rec.net_pay || rec.pay).toFixed(0) }}</text>
						</view>
					</view>
				</view>
			</view>

				<!-- 查看全部 -->
				<view class="view-all" v-if="showViewAll" @tap="goStatsRecords">
					<text class="view-all__text">查看全部 ›</text>
				</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-if="recentRecords.length === 0">
				<view class="empty-wrap__icon">
					<text class="empty-wrap__icon-text">&#x1F4C5;</text>
				</view>
				<text class="empty-wrap__title">{{ emptyTitle }}</text>
				<text class="empty-wrap__desc">{{ emptyDesc }}</text>
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
							<text class="day-sheet__item-type">{{ typeFull(rec.day_type || rec.overtime_type) }}</text>
							<text class="day-sheet__item-time">{{ recordTimeStr(rec) }}</text>
							<text class="record-item__project" v-if="rec.project_name">{{ rec.project_name }}</text>
						</view>
						<view class="day-sheet__item-right">
							<text class="day-sheet__item-hours">{{ recordQtyStr(rec) }}</text>
							<text class="day-sheet__item-pay" v-if="(rec.net_pay || rec.pay)">¥{{ (rec.net_pay || rec.pay).toFixed(0) }}</text>
							<text class="record-item__settle-badge" :class="rec.settled ? 'record-item__settle-badge--done' : 'record-item__settle-badge--pending'">{{ rec.settled ? '已结' : '未结' }}</text>
						</view>
					</view>
				</view>
				<view class="day-sheet__action" @tap="goRecordDate">
					<text class="day-sheet__action-text">再记一笔</text>
				</view>
			</view>
		</view>
		<ThemeToggle />
	
	</view>
</template>
<script>
import NavBar from '../../components/NavBar.vue'
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '../../stores/projectStore'
import ThemeToggle from '@/components/ThemeToggle.vue'

function pad(n) { return String(n).padStart(2, '0') }

export default {
	components: { NavBar, ThemeToggle },
	data() {
		const now = new Date()
		return {
			weekdays: ['日', '一', '二', '三', '四', '五', '六'],
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			todayStr: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
			showDaySheet: false,
			daySheetDate: '',
			settleFilter: 'all',
			selectedProjectFilter: null,
			clockInTime: null,
			clockElapsed: '0min',
			clockTimer: null
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
			const store = useWorkStore()
			return store.records.filter(r => r.date && r.date.startsWith(this.monthPrefix))
		},
		totalHours() {
			return this.monthRecords.reduce((s, r) => s + (r.duration || 0), 0)
		},
		totalPay() {
			return this.monthRecords.reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
		},
		totalDays() {
			return this.monthRecords.filter(r => r.pay_mode === 'daily').reduce((s, r) => s + (r.days || 0), 0)
		},
		totalQuantity() {
			return this.monthRecords.filter(r => r.pay_mode === 'piece').reduce((s, r) => s + (r.quantity || 0), 0)
		},
		weekdayHours() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type || 'weekday') === 'weekday').reduce((s, r) => s + (r.duration || 0), 0)
		},
		weekendHours() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type || 'weekday') === 'weekend').reduce((s, r) => s + (r.duration || 0), 0)
		},
		holidayHours() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type || 'weekday') === 'holiday').reduce((s, r) => s + (r.duration || 0), 0)
		},
		weekdayDays() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === "weekday" && r.pay_mode === "daily").reduce((s, r) => s + (r.days || 0), 0)
		},
		weekendDays() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === "weekend" && r.pay_mode === "daily").reduce((s, r) => s + (r.days || 0), 0)
		},
		holidayDays() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === "holiday" && r.pay_mode === "daily").reduce((s, r) => s + (r.days || 0), 0)
		},
		weekdayQty() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === "weekday" && r.pay_mode === "piece").reduce((s, r) => s + (r.quantity || 0), 0)
		},
		weekendQty() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === "weekend" && r.pay_mode === "piece").reduce((s, r) => s + (r.quantity || 0), 0)
		},
		holidayQty() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type) === "holiday" && r.pay_mode === "piece").reduce((s, r) => s + (r.quantity || 0), 0)
		},
		weekdayPay() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type || 'weekday') === 'weekday').reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
		},
		weekendPay() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type || 'weekday') === 'weekend').reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
		},
		holidayPay() {
			return this.monthRecords.filter(r => (r.day_type || r.overtime_type || 'weekday') === 'holiday').reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
		},
		recordDates() {
			return new Set(this.monthRecords.map(r => r.date))
		},
		daySheetRecords() {
			if (!this.daySheetDate) return []
			const store = useWorkStore()
			return store.records.filter(r => r.date === this.daySheetDate)
		},
		daySheetTotal() {
			const recs = this.daySheetRecords
			const h = recs.reduce((s, r) => s + (r.duration || 0), 0)
			const p = recs.reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
			const s = recs.reduce((sum, r) => sum + ((r.subsidies ? (r.subsidies.night_shift||0)+(r.subsidies.meal||0)+(r.subsidies.transport||0) : 0) - (r.deduction ? r.deduction.amount||0 : 0)), 0); return h + 'h · ¥' + (p + s).toFixed(0)
		},
		recentRecords() {
			const store = useWorkStore()
			let list = store.records
			if (this.settleFilter === 'unsettled') {
				list = list.filter(r => !r.settled)
			} else if (this.settleFilter === 'settled') {
				list = list.filter(r => r.settled)
			}
			if (this.selectedProjectFilter) {
				list = list.filter(r => r.project_id === this.selectedProjectFilter)
			}
			return list.slice(0, 3)
		},
		showViewAll() {
			const store = useWorkStore()
			let list = store.records
			if (this.settleFilter === "unsettled") list = list.filter(r => !r.settled)
			else if (this.settleFilter === "settled") list = list.filter(r => r.settled)
			if (this.selectedProjectFilter) list = list.filter(r => r.project_id === this.selectedProjectFilter)
			return list.length > 3
		},
		hasAnyRecords() {
			const store = useWorkStore()
			return store.records.length > 0
		},
		emptyTitle() {
			return this.hasAnyRecords ? '当前筛选条件下无记录' : '还没有记工记录'
		},
		emptyDesc() {
			return this.hasAnyRecords ? '切换筛选条件或添加新记录' : '点击下方 + 开始记录第一笔记工'
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
					recordCount: this.monthRecords.filter(function(r) { return r.date === dateStr; }).length || 0,
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
		},
		isClockedIn() {
			return this.clockInTime !== null
		},
		syncStatus() {
			return useWorkStore().syncStatus
		},
		syncStatusText() {
			const m = { synced: "已同步", syncing: "同步中...", error: "同步失败", offline: "未登录 · 数据仅存本地" }
			return m[this.syncStatus] || ""
		}
	},
	onShow() {
		this.settleFilter = 'all'
		const store = useWorkStore()
		store.loadRecords()
		const now = new Date()
		this.todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
		this.restoreClock()
	},
	onHide() {
		if (this.clockTimer) {
			clearInterval(this.clockTimer)
			this.clockTimer = null
		}
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
			const m = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return m[type] || '平日'
			},
			iconClass(type) {
			return type === 'weekend' ? 'record-item__icon--weekend' : type === 'holiday' ? 'record-item__icon--holiday' : 'record-item__icon--weekday'
			},
			restoreClock() {
			const saved = uni.getStorageSync('work_clock_in')
				if (saved) {
					this.clockInTime = saved
					this.updateClockElapsed()
					this.clockTimer = setInterval(() => { this.updateClockElapsed() }, 60000)
				} else {
					this.clockInTime = null
					this.clockElapsed = '0min'
				}
			},
			onSyncTap() {
			const store = useWorkStore()
				if (store.syncStatus === 'offline') {
					uni.showModal({
						title: '数据未同步',
						content: '当前未登录，记工数据仅保存在本地。清除缓存或卸载后将丢失。是否前往登录？',
						success: (res) => {
							if (res.confirm) {
								uni.navigateTo({ url: '/pages/login/login' })
							}
						}
					})
				} else if (store.syncStatus === 'error') {
					uni.showToast({ title: '正在重试同步...', icon: 'none' })
					store.flushSyncQueue()
				}
			},
			toggleClock() {
				if (this.isClockedIn) {
					this.clockInTime = null
					this.clockElapsed = '0min'
					uni.removeStorageSync('work_clock_in')
					if (this.clockTimer) {
						clearInterval(this.clockTimer)
						this.clockTimer = null
					}
				} else {
					this.clockInTime = Date.now()
					uni.setStorageSync('work_clock_in', this.clockInTime)
					this.updateClockElapsed()
					this.clockTimer = setInterval(() => { this.updateClockElapsed() }, 60000)
				}
			},
			updateClockElapsed() {
				if (!this.clockInTime) { this.clockElapsed = '0min'; return }
			const elapsed = Math.floor((Date.now() - this.clockInTime) / 60000)
				if (elapsed < 60) {
					this.clockElapsed = elapsed + 'min'
				} else {
					const h = Math.floor(elapsed / 60)
					const m = elapsed % 60
					this.clockElapsed = h + 'h ' + m + 'min'
				}
			},
			goRecord() {
			const pStore = useProjectStore()
				if (pStore.activeProjects.length === 0) {
					uni.navigateTo({ url: '/pages/project-edit/project-edit' })
				} else {
					uni.navigateTo({ url: '/pages/record/record' })
				}
			},
			goEdit(id) {
				uni.navigateTo({ url: '/pages/record/record?id=' + id })
			},
			goRecon() {
				uni.navigateTo({ url: '/pages/reconciliation/recon' })
			},
			recordTimeStr(rec) {
				if (rec.pay_mode === 'daily') return rec.days + '天'
				if (rec.pay_mode === 'piece') return rec.quantity + (rec.piece_unit || '件')
			return (rec.start_time || '') + '-' + (rec.end_time || '')
			},
			recordQtyStr(rec) {
				if (rec.pay_mode === 'daily') return (rec.days || 1) + '天'
				if (rec.pay_mode === 'piece') return (rec.quantity || 0) + (rec.piece_unit || '件')
			return (rec.duration || 0) + 'h'
			},
			modeLabel(mode) {
			const m = { hourly: '时薪', daily: '日薪', piece: '计件' }
			return m[mode] || '时薪'
			},
			getProjectName(id) {
				if (!id) return '无工作'
			const pStore = useProjectStore()
			const proj = pStore.getProjectById(id)
			return proj ? proj.name : '无项目'
			},
			showProjectFilter() {
			const pStore = useProjectStore()
				pStore.loadProjects()
				setTimeout(() => {
					const items = [{ text: '所有项目', value: null },
						...pStore.activeProjects.map(p => ({ text: p.name, value: p._id }))
					]
					uni.showActionSheet({
						itemList: items.map(i => i.text),
						success: (res) => {
							this.selectedProjectFilter = items[res.tapIndex].value
						}
					})
				}, 100)
			},
			goStatsRecords() {
				uni.navigateTo({ url: '/pages/records/records' })
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
	background: var(--surface);

	&__content {
		padding: 16px 16px 100px;
		max-width: 640px;
		margin: 0 auto;
	}
}

/* 记工状态 */
.clock-status {
	display: flex;
	align-items: center;
	padding: 8px 12px;
	background: var(--primary-light);
	border-radius: 20px;
	margin-bottom: 10px;
	cursor: pointer;
}
.clock-status__dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: #9C9C9C;
	margin-right: 8px;
	flex-shrink: 0;
}
.clock-status__dot--active {
	background: var(--primary);
}
.clock-status__text {
	font-size: 13px;
	font-weight: 600;
	color: var(--primary);
}
.clock-status__text--idle {
	color: var(--text-muted);
}

.sync-status {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 6px 0 2px;
	gap: 6px;
}
.sync-status__dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
}
.sync-status__dot--synced { background: var(--success); }
.sync-status__dot--syncing { background: var(--warning); animation: sync-pulse 1s ease-in-out infinite; }
.sync-status__dot--error { background: var(--error); }
.sync-status__dot--offline { background: var(--text-muted); }
@keyframes sync-pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.3; }
}
.sync-status__text {
	font-size: 11px;
	color: var(--text-muted);
}

/* 摘要卡片 */
.summary-card {
	background: var(--surface-card);
	border: 1px solid var(--border);
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
		color: var(--text-muted);
	}

	&__hours {
		font-size: 28px;
		font-weight: 700;
		color: var(--primary);
		margin-top: 4px;
		display: block;
	}

	&__unit {
		font-size: 15px;
		font-weight: 400;
		color: var(--text-muted);
	}

	&__right {
		text-align: right;
	}

	&__pay-label {
		font-size: 12px;
		color: var(--text-muted);
		display: block;
	}

	&__pay {
		font-size: 20px;
		font-weight: 700;
		color: var(--text-primary);
		margin-top: 4px;
		display: block;
	}

	&__divider {
		height: 1px;
		background: #E8E4DC;
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
		color: var(--text-muted);
		display: block;
	}

	&__breakdown-value {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		margin-top: 2px;
		display: block;
	}
	&__breakdown-pay {
		font-size: 12px;
		color: var(--primary);
		margin-top: 2px;
		display: block;
	}
}

/* 日历 */
.calendar {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
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
		color: var(--text-primary);
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
		color: var(--text-muted);
	}

	&__weekdays {
		display: flex;
		background: var(--surface);
	}

	&__weekday {
		flex: 1;
		text-align: center;
		padding: 8px 0;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted);

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
		border-right: 1px solid #E8E4DC;
		border-bottom: 1px solid var(--border);
		box-sizing: border-box;

		&:nth-child(7n) {
			border-right: none;
		}

		&--empty {
			background: var(--surface);
		}

		&--today {
			background: var(--primary);
			border-radius: 20px;
		}
	}

	&__day {
		font-size: 14px;
		color: var(--text-primary);

		.calendar__cell--weekend & {
			color: #E53935;
		}

		.calendar__cell--today & {
			color: #FFFFFF;
			font-weight: 700;
		}
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
		color: var(--text-primary);
		display: block;
	}

	&__desc {
		font-size: 14px;
		color: var(--text-muted);
		display: block;
		margin-top: 6px;
	}
}

/* 查看全部 */
.view-all {
	text-align: center;
	padding: 12px 0;
	margin-bottom: 16px;
}
.view-all__text {
	font-size: 14px;
	color: var(--primary);
	font-weight: 500;
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
		color: var(--text-primary);
	}

	&__list {
		background: var(--surface-card);
		border-radius: 12px;
		border: 1px solid var(--border);
		overflow: hidden;
	}
}

.record-item {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	border-bottom: 1px solid var(--border);

	&--last {
		border-bottom: none;
	}

	&__icon {
		width: 36px;
		height: 36px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-right: 12px;

		&--weekday {
			background: rgba(27, 138, 90, 0.12);
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
		color: var(--primary);

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
		color: var(--text-primary);
	}

	&__date {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
	}

&__project {
font-size: 11px;
color: var(--primary);
margin-top: 1px;
}

	&__right {
		text-align: right;
	}

	&__hours {
		font-size: 16px;
		font-weight: 600;
		color: var(--primary);
		display: block;
	}

	&__pay {
		font-size: 12px;
		color: var(--text-muted);
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
	background: var(--surface-card);
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
	color: var(--text-primary);
}
.day-sheet__total {
	font-size: 15px;
	font-weight: 600;
	color: var(--primary);
}
.day-sheet__list {
	background: var(--surface);
	border-radius: 20px;
	overflow: hidden;
}
.day-sheet__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	border-bottom: 1px solid var(--border);
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
	color: var(--text-primary);
}
.day-sheet__item-time {
	font-size: 12px;
	color: var(--text-muted);
	margin-top: 2px;
}
.day-sheet__item-right {
	text-align: right;
}
.day-sheet__item-hours {
	font-size: 16px;
	font-weight: 600;
	color: var(--primary);
	display: block;
}
.day-sheet__item-pay {
	font-size: 12px;
	color: var(--text-muted);
	display: block;
	margin-top: 1px;
}
.day-sheet__action {
	margin-top: 16px;
	height: 44px;
	border-radius: 20px;
	background: var(--primary);
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
	background: var(--primary);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 16px rgba(27, 138, 90, 0.35);
	z-index: 50;

	&__icon {
		font-size: 28px;
		color: #FFFFFF;
		font-weight: 300;
	}
	}


/* 筛选栏 */
.records-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    flex-wrap: wrap;
    gap: 8px;
}
.records-section__filters {
    display: flex;
    gap: 6px;
    align-items: center;
}
.filter-chip {
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--surface-hover);
    display: flex;
    align-items: center;
}
.filter-chip--active {
    color: var(--primary);
    background: rgba(27, 138, 90, 0.1);
}
.filter-chip__text {
    font-size: 11px;
    margin-right: 2px;
}
.filter-chip__arrow {
    font-size: 12px;
    color: var(--text-muted);
}

/* 计薪模式标签 */
.record-item__pay-mode-tag {
	font-size: 10px;
	color: var(--primary);
	background: var(--primary-light);
	padding: 1px 5px;
	border-radius: 4px;
	display: inline-block;
	margin-bottom: 2px;
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
	color: var(--primary);
	background: #E6FFF0;
}

/* 有记工记录的日期高亮 */
.calendar__cell--has-record {
	background: rgba(27, 138, 90, 0.06);
	border-radius: 0;
}
.calendar__cell--today.calendar__cell--has-record {
	background: var(--primary);
}
.calendar__badge {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: var(--primary);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 1px;
}
.calendar__badge-text {
	font-size: 9px;
	color: #FFFFFF;
	font-weight: 600;
	line-height: 1;
}
.calendar__cell--today .calendar__badge {
	background: #FFFFFF;
}
.calendar__cell--today .calendar__badge-text {
	color: var(--primary);
}

/* 摘要子行 */
.summary-card__sub-row {
	display: flex;
	gap: 12px;
	margin-top: 4px;
}
.summary-card__sub-text {
	font-size: 13px;
	color: var(--text-muted);
}

/* 筛选分隔 */
.records-section__filters .filter-chip__sep {
	font-size: 11px;
	color: var(--text-muted);
	margin: 0 2px;
}

.summary-card__breakdown-value--dim {
	font-size: 12px;
	font-weight: 400;
	color: var(--text-muted);
	margin-left: 6px;
	display: inline;
}
</style>
