<template>
	<view class="page-batch">
		<NavBar title="批量记工" :showBack="true" />

		<view class="page-batch__content">
			<!-- 日期范围 -->
			<view class="section">
				<text class="section__title">日期范围</text>
				<view class="date-range">
					<picker mode="date" :value="startDate" :end="todayStr" @change="onStartDateChange">
						<view class="date-range__picker">
							<text class="date-range__label">从</text>
							<text class="date-range__value">{{ startDate }}</text>
						</view>
					</picker>
					<text class="date-range__sep">至</text>
					<picker mode="date" :value="endDate" :end="todayStr" @change="onEndDateChange">
						<view class="date-range__picker">
							<text class="date-range__label">到</text>
							<text class="date-range__value">{{ endDate }}</text>
						</view>
					</picker>
				</view>
			</view>

			<!-- 工作选择 -->
			<view class="section">
				<text class="section__title">工作 <text style="color: #B85C4A;">*</text></text>
				<view class="field-row field-row--warn" v-if="!hasProjects" @tap="goCreateProject">
					<text class="field-row__value" style="color: #C4A46C;">请先创建工作</text>
					<text class="field-row__arrow" style="color: #C4A46C;">›</text>
				</view>
				<view class="field-row" :class="{ 'field-row--empty': !selectedProject }" v-else @tap="showProjectPicker">
					<view class="field-row__left" v-if="selectedProject">
						<view class="field-row__dot" :style="{ background: selectedProject.color }"></view>
						<text class="field-row__value">{{ selectedProject.name }}</text>
						<text class="field-row__mode">{{ modeLabel(selectedProject.pay_mode) }}</text>
					</view>
					<text class="field-row__value" v-else>选工作</text>
					<text class="field-row__arrow">›</text>
				</view>
			</view>

			<!-- 计薪模式 -->
			<view class="pay-mode-section">
				<text class="section__title">计薪方式</text>
				<view class="pay-mode-tabs">
					<view class="pay-mode-tab" :class="{ 'pay-mode-tab--active': payMode === 'hourly' }" @tap="payMode = 'hourly'">
						<text class="pay-mode-tab__icon">⏱</text>
						<text class="pay-mode-tab__label">时薪</text>
					</view>
					<view class="pay-mode-tab" :class="{ 'pay-mode-tab--active': payMode === 'daily' }" @tap="payMode = 'daily'">
						<text class="pay-mode-tab__icon">📅</text>
						<text class="pay-mode-tab__label">日薪</text>
					</view>
					<view class="pay-mode-tab" :class="{ 'pay-mode-tab--active': payMode === 'piece' }" @tap="payMode = 'piece'">
						<text class="pay-mode-tab__icon">📦</text>
						<text class="pay-mode-tab__label">计件</text>
					</view>
				</view>
				<view class="pay-mode-rates" v-if="selectedProject">
					<text class="pay-mode-rates__text" v-if="payMode === 'hourly'">平 ¥{{ selectedProject.weekday_rate || 0 }}/h · 休 ¥{{ selectedProject.weekend_rate || 0 }}/h · 节 ¥{{ selectedProject.holiday_rate || 0 }}/h</text>
					<text class="pay-mode-rates__text" v-if="payMode === 'daily'">¥{{ selectedProject.daily_rate || 0 }}/天</text>
					<text class="pay-mode-rates__text" v-if="payMode === 'piece'">¥{{ selectedProject.piece_rate || 0 }}/{{ selectedProject.piece_unit || '件' }}</text>
				</view>
				<view class="pay-mode-rates pay-mode-rates--hint" v-else>
					<text class="pay-mode-rates__text">选择工作后显示计薪标准</text>
				</view>
			</view>

			<!-- 统一数量 — 时薪 -->
			<view class="section" v-if="payMode === 'hourly'">
				<text class="section__title">统一时间</text>
				<view class="time-range">
					<picker mode="time" :value="startTime" @change="onStartTimeChange" class="time-picker">
						<view class="time-picker__item">
							<text class="time-picker__label">开始</text>
							<text class="time-picker__value">{{ startTime }}</text>
						</view>
					</picker>
					<text class="time-range__sep">—</text>
					<picker mode="time" :value="endTime" @change="onEndTimeChange" class="time-picker">
						<view class="time-picker__item">
							<text class="time-picker__label">结束</text>
							<text class="time-picker__value">{{ endTime }}</text>
						</view>
					</picker>
				</view>
				<text class="section__hint" v-if="startDate !== endDate && duration > 0">每天 {{ duration }}h，共 {{ previewDates.length }} 天，合计 {{ totalPreviewQuantity }}h</text>
				<text class="section__hint" v-else-if="startDate === endDate">起止日期相同，只生成 <text class="section__hint--highlight">1</text> 条记工记录</text>
			</view>

			<!-- 统一数量 — 日薪 -->
			<view class="section" v-if="payMode === 'daily'">
				<text class="section__title">统一天数</text>
				<view class="qty-stepper">
					<view class="qty-stepper__btn" @tap="adjustDailyDays(-0.5)">
						<text>−</text>
					</view>
					<text class="qty-stepper__num">{{ dailyDays }}</text>
					<text class="qty-stepper__unit">天</text>
					<view class="qty-stepper__btn qty-stepper__btn--add" @tap="adjustDailyDays(0.5)">
						<text>+</text>
					</view>
				</view>
				<text class="section__hint" v-if="previewDates.length > 0 && dailyDays > 0">每天 {{ dailyDays }} 天，共 {{ previewDates.length }} 天记工 · 合计 {{ totalPreviewQuantity }} 天</text>
				<text class="section__hint" v-else-if="startDate === endDate">起止日期相同，只生成 <text class="section__hint--highlight">1</text> 条记工记录</text>
			</view>

			<!-- 统一数量 — 计件 -->
			<view class="section" v-if="payMode === 'piece'">
				<text class="section__title">统一件数</text>
				<view class="qty-stepper">
					<view class="qty-stepper__btn" @tap="adjustPieceQty(-1)">
						<text>−</text>
					</view>
					<text class="qty-stepper__num">{{ pieceQuantity }}</text>
					<text class="qty-stepper__unit">{{ pieceUnit }}</text>
					<view class="qty-stepper__btn qty-stepper__btn--add" @tap="adjustPieceQty(1)">
						<text>+</text>
					</view>
				</view>
				<text class="section__hint" v-if="previewDates.length > 0 && pieceQuantity > 0">每天 {{ pieceQuantity }}{{ pieceUnit }}，共 {{ previewDates.length }} 天 · 合计 {{ totalPreviewQuantity }}{{ pieceUnit }}</text>
				<text class="section__hint" v-else-if="startDate === endDate">起止日期相同，只生成 <text class="section__hint--highlight">1</text> 条记工记录</text>
			</view>

			<!-- 备注 -->
			<view class="section">
				<text class="section__title">备注（选填）</text>
				<textarea class="batch-remark" v-model="remark" placeholder="所有记录共用此备注" placeholder-style="color: var(--text-muted); font-size: 14px;" />
			</view>

			<!-- 预览 -->
			<view class="section" v-if="previewDates.length > 0">
				<text class="section__title">预览（共 {{ previewDates.length }} 条）</text>
				<text class="section__summary" v-if="estimatedTotalPay > 0">预估工钱 ¥{{ estimatedTotalPay }}</text>
				<view class="preview-list">
					<view class="preview-item" v-for="(d, idx) in previewDates" :key="idx">
						<text class="preview-item__date">{{ d.date }}</text>
						<text class="preview-item__type">{{ d.typeLabel }}</text>
						<text class="preview-item__qty">{{ d.qtyLabel }}</text>
						<text class="preview-item__pay" v-if="d.pay > 0">¥{{ d.pay }}</text>
						<text class="preview-item__pay preview-item__pay--zero" v-else>¥0</text>
					</view>
				</view>
			</view>

			<view class="page-batch__spacer"></view>
		</view>

		<!-- 底部 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__save" :class="{ 'bottom-bar__save--disabled': saving || previewDates.length === 0 }" @tap="handleBatchSave">
					<text class="bottom-bar__save-text">{{ saving ? '创建中...' : `批量创建 ${previewDates.length} 条` }}</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>
	</view>

	<!-- 工作选择面板 -->
	<view class="work-picker-mask" v-if="showWorkPicker" @tap="showWorkPicker = false">
		<view class="work-picker" @tap.stop>
			<view class="work-picker__head">
				<text class="work-picker__title">选择工作</text>
				<text class="work-picker__close" @tap="showWorkPicker = false">✕</text>
			</view>
			<view class="work-picker__list">
				<view
					v-for="p in pickerProjects"
					:key="p._id"
					class="work-picker__item"
					:class="{ 'work-picker__item--sel': selectedProjectId === p._id }"
					@tap="onPickWork(p._id)"
				>
					<view class="work-picker__dot" :style="{ background: p.color }"></view>
					<view class="work-picker__info">
						<text class="work-picker__name">{{ p.name }}</text>
						<text class="work-picker__rate">{{ rateSummary(p) }}</text>
					</view>
					<text class="work-picker__check" v-if="selectedProjectId === p._id">✓</text>
				</view>
			</view>
			<view class="work-picker__foot" @tap="goCreateProject">
				<text class="work-picker__add">+ 新建工作</text>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '../../stores/projectStore'
import { useHolidayStore } from '@/stores/holidayStore'
import { requireAuth } from '@/utils/auth'

function pad(n) { return String(n).padStart(2, '0') }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const PIECE_UNITS = ['件', '个', '米', '吨', '套', '次']

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		const today = formatDate(now)
		return {
			startDate: today,
			endDate: today,
			payMode: 'hourly',
			startTime: '18:00',
			endTime: '21:00',
			dailyDays: 1,
			pieceQuantity: 0,
			remark: '',
			selectedProjectId: null,
			showWorkPicker: false,
			saving: false
		}
	},
	computed: {
		todayStr() {
			const n = new Date()
			return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
		},
		duration() {
			const [sh, sm] = this.startTime.split(':').map(Number)
			const [eh, em] = this.endTime.split(':').map(Number)
			const minutes = (eh * 60 + em) - (sh * 60 + sm)
			return minutes > 0 ? (minutes / 60).toFixed(1) : '0'
		},
		pieceUnit() {
			if (this.selectedProject?.piece_unit) return this.selectedProject.piece_unit
			return '件'
		},
		pieceUnitOptions() {
			return PIECE_UNITS
		},
		hasProjects() {
			return useProjectStore().activeProjects.length > 0
		},
		pickerProjects() {
			return useProjectStore().activeProjects
		},
		previewDates() {
			const dates = []
			const start = new Date(this.startDate)
			const end = new Date(this.endDate)
			if (end < start) return []

			const typeLabels = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			const mode = this.payMode

			if (mode === 'hourly') {
				const h = parseFloat(this.duration) || 0
				if (h <= 0) return []
				let d = new Date(start)
				while (d <= end) {
					const dateStr = formatDate(d)
					const type = useHolidayStore().getDayType(dateStr)
					const proj = this.selectedProject
					const rateKey = type + '_rate'
					const rate = (proj && proj[rateKey] > 0) ? proj[rateKey] : 0
					const pay = rate > 0 ? Math.round(h * rate) : 0
					dates.push({ date: dateStr, typeLabel: typeLabels[type] || '平日', qtyLabel: h + 'h', type, pay, rate })
					d.setDate(d.getDate() + 1)
				}
			} else if (mode === 'daily') {
				const days = this.dailyDays
				if (days <= 0) return []
				const proj = this.selectedProject
				const rate = (proj && proj.daily_rate > 0) ? proj.daily_rate : 0
				const pay = rate > 0 ? Math.round(days * rate) : 0
				let d = new Date(start)
				while (d <= end) {
					const dateStr = formatDate(d)
					const type = useHolidayStore().getDayType(dateStr)
					dates.push({ date: dateStr, typeLabel: typeLabels[type] || '平日', qtyLabel: days + '天', type, pay, rate, days })
					d.setDate(d.getDate() + 1)
				}
			} else if (mode === 'piece') {
				const qty = this.pieceQuantity
				if (qty <= 0) return []
				const proj = this.selectedProject
				const rate = (proj && proj.piece_rate > 0) ? proj.piece_rate : 0
				const unit = this.pieceUnit
				const pay = rate > 0 ? Math.round(qty * rate) : 0
				let d = new Date(start)
				while (d <= end) {
					const dateStr = formatDate(d)
					const type = useHolidayStore().getDayType(dateStr)
					dates.push({ date: dateStr, typeLabel: typeLabels[type] || '平日', qtyLabel: qty + unit, type, pay, rate, quantity: qty, unit })
					d.setDate(d.getDate() + 1)
				}
			}
			return dates
		},
		selectedProject() {
			if (!this.selectedProjectId) return null
			const pStore = useProjectStore()
			return pStore.getProjectById(this.selectedProjectId)
		},
		totalPreviewQuantity() {
			const mode = this.payMode
			const len = this.previewDates.length
			if (len === 0) return '0'
			if (mode === 'hourly') return (parseFloat(this.duration) * len || 0).toFixed(1)
			if (mode === 'daily') return (this.dailyDays * len || 0)
			return (this.pieceQuantity * len || 0)
		},
		estimatedTotalPay() {
			return this.previewDates.reduce(function(s, d) { return s + (d.pay || 0); }, 0).toFixed(0)
		},
	},
	onShow() {
		const pStore = useProjectStore()
		if (pStore.projects.length === 0) {
			pStore.loadProjects()
		}
	},
	methods: {
		modeLabel(mode) {
			const m = { hourly: "时薪", daily: "日薪", piece: "计件" }
			return m[mode] || ""
		},
		goCreateProject() {
			uni.navigateTo({ url: "/pages/project-edit/project-edit" })
		},
		onStartDateChange(e) { this.startDate = e.detail.value },
		onEndDateChange(e) { this.endDate = e.detail.value },
		onStartTimeChange(e) { this.startTime = e.detail.value },
		onEndTimeChange(e) { this.endTime = e.detail.value },

		adjustDailyDays(delta) {
			this.dailyDays = Math.max(0.5, Math.round((this.dailyDays + delta) * 10) / 10)
		},
		adjustPieceQty(delta) {
			this.pieceQuantity = Math.max(0, this.pieceQuantity + delta)
		},

		showProjectPicker() {
			const pStore = useProjectStore()
			pStore.loadProjects()
			if (pStore.activeProjects.length === 0) {
				uni.navigateTo({ url: '/pages/project-edit/project-edit' }); return
			}
			this.showWorkPicker = true
		},
		onPickWork(id) {
			this.selectedProjectId = id
			const proj = id ? useProjectStore().getProjectById(id) : null
			if (proj && proj.pay_mode) { this.payMode = proj.pay_mode }
			this.showWorkPicker = false
		},
		rateSummary(p) {
			if (!p) return ''
			if (p.pay_mode === 'daily') return '日薪 ¥' + (p.daily_rate || 0) + '/天'
			if (p.pay_mode === 'piece') return '计件 ¥' + (p.piece_rate || 0) + '/' + (p.piece_unit || '件')
			return '平¥' + (p.weekday_rate || 0) + ' 休¥' + (p.weekend_rate || 0) + ' 节¥' + (p.holiday_rate || 0)
		},

		async handleBatchSave() {
			if (this.saving || this.previewDates.length === 0) return

			const mode = this.payMode
			if (mode === 'hourly' && (parseFloat(this.duration) || 0) <= 0) {
				uni.showToast({ title: '请设置有效时间', icon: 'none' }); return
			}
			if (mode === 'daily' && this.dailyDays <= 0) {
				uni.showToast({ title: '请设置天数', icon: 'none' }); return
			}
			if (mode === 'piece' && this.pieceQuantity <= 0) {
				uni.showToast({ title: '请设置件数', icon: 'none' }); return
			}

					if (!this.selectedProjectId) {
				if (!this.hasProjects) { uni.navigateTo({ url: '/pages/project-edit/project-edit' }); return }
				this.showProjectPicker(); return
			}
			if (!requireAuth()) return
			this.saving = true
			const store = useWorkStore()
			const pStore = useProjectStore()
			const proj = this.selectedProjectId ? pStore.getProjectById(this.selectedProjectId) : null
			let success = 0
			let fail = 0

			for (const item of this.previewDates) {
				try {
					const base = {
						date: item.date,
						pay_mode: mode,
						remark: this.remark,
						project_id: this.selectedProjectId,
						project_name: proj ? proj.name : '',
						photos: [],
						settled: false,
						subsidies: { night_shift: 0, meal: 0, transport: 0 },
						deduction: { amount: 0, note: '' },
						day_type: item.type,
						pay: item.pay,
						net_pay: item.pay
					}

					if (mode === 'hourly') {
						Object.assign(base, {
							start_time: this.startTime,
							end_time: this.endTime,
							duration: parseFloat(this.duration) || 0,
							rate: item.rate,
							pay: item.pay,
							net_pay: item.pay
						})
					} else if (mode === 'daily') {
						Object.assign(base, {
							start_time: '', end_time: '', duration: 0,
							days: item.days, daily_rate: item.rate,
							pay: item.pay, net_pay: item.pay
						})
					} else if (mode === 'piece') {
						Object.assign(base, {
							start_time: '', end_time: '', duration: 0,
							quantity: item.quantity, piece_rate: item.rate,
							piece_unit: item.unit,
							pay: item.pay, net_pay: item.pay
						})
					}

					await store.addRecord(base)
					success++
				} catch (e) {
					fail++
					console.log('[batch-save] error:', e)
				}
			}

			this.saving = false
			uni.showToast({ title: `创建 ${success} 条${fail > 0 ? '，' + fail + ' 条失败' : ''}`, icon: 'success' })
			setTimeout(() => { uni.navigateBack() }, 1000)
		}
	}
}
</script>

<style lang="scss" scoped>
.page-batch {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 0 16px 100px;
		max-width: 640px;
		margin: 0 auto;
	}

	&__spacer {
		height: 60px;
	}
}

.section {
	margin-top: 16px;

	&__title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 10px;
		display: block;
	}

	&__hint {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 8px;
		display: block;
		text-align: center;
	}
}

/* 计薪模式 tabs */
.pay-mode-section {
	margin-top: 16px;
	padding: 16px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
}
.pay-mode-tabs {
	display: flex;
	gap: 8px;
	margin-top: 12px;
}
.pay-mode-tab {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 12px 6px;
	border-radius: 10px;
	background: var(--surface);
	border: 1.5px solid var(--border);
}
.pay-mode-tab--active {
	background: var(--primary-light);
	border-color: var(--primary);
}
.pay-mode-tab__icon {
	font-size: 20px;
	display: block;
	margin-bottom: 4px;
}
.pay-mode-tab__label {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-muted);
}
.pay-mode-tab--active .pay-mode-tab__label {
	color: var(--primary);
	font-weight: 600;
}

/* 数量步进器 */
.qty-stepper {
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 16px;
	gap: 16px;

	&__btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface-hover);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		color: var(--text-secondary);

		&--add {
			background: var(--primary);
			color: #FFFFFF;
		}
	}

	&__num {
		font-size: 28px;
		font-weight: 700;
		color: var(--text-primary);
		min-width: 60px;
		text-align: center;
	}

	&__unit {
		font-size: 15px;
		color: var(--text-muted);
	}
}

.date-range {
	display: flex;
	align-items: center;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 12px 16px;

	&__picker {
		flex: 1;
		display: flex;
		align-items: center;
	}

	&__label {
		font-size: 14px;
		color: var(--text-muted);
		margin-right: 8px;
	}

	&__value {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
	}

	&__sep {
		font-size: 14px;
		color: var(--text-muted);
		margin: 0 12px;
	}
}

.time-range {
	display: flex;
	align-items: center;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 16px;

	&__sep {
		font-size: 16px;
		color: var(--text-muted);
		margin: 0 20px;
	}
}

.time-picker {
	flex: 1;

	&__item {
		text-align: center;
	}

	&__label {
		font-size: 13px;
		color: var(--text-muted);
		display: block;
		margin-bottom: 4px;
	}

	&__value {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
	}
}

.field-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);

	&__left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	&__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	&__value {
		font-size: 15px;
		color: var(--text-primary);
	}

	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
		margin-left: 4px;
	}
		&__mode {
			font-size: 11px;
			color: var(--primary);
			background: var(--primary-light);
			padding: 2px 8px;
			border-radius: 10px;
			margin-left: auto;
			margin-right: 8px;
		}
		&--empty {
			border-color: #E5A100;
			background: #FFFBF0;
		}
		&--warn {
			border-color: #C4A46C;
			background: #FFFBF0;
		}
}

.batch-remark {
	width: 100%;
	min-height: 80px;
	padding: 14px 16px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	font-size: 14px;
	color: var(--text-primary);
	box-sizing: border-box;
}

.preview-list {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	max-height: 300px;
	overflow-y: auto;
}

.preview-item {
	display: flex;
	align-items: center;
	padding: 10px 16px;
	border-bottom: 1px solid var(--border);

	&:last-child { border-bottom: none; }

	&__date {
		font-size: 14px;
		color: var(--text-primary);
		flex: 2;
	}

	&__type {
		font-size: 12px;
		color: var(--text-muted);
		flex: 1;
		text-align: center;
	}

	&__qty {
		font-size: 13px;
		font-weight: 500;
		color: var(--primary);
		flex: 1;
		text-align: right;
		padding-right: 8px;
	}

	&__pay {
		font-size: 14px;
		font-weight: 600;
		color: var(--primary);
		flex: 0 0 60px;
		text-align: right;

		&--zero {
			color: var(--text-muted);
			font-weight: 400;
			font-size: 12px;
		}
	}
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: var(--surface-card);
	border-top: 1px solid var(--border);
	z-index: 100;

	&__inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	&__save {
		height: 48px;
		border-radius: 20px;
		background: var(--primary);
		display: flex;
		align-items: center;
		justify-content: center;

		&--disabled {
			opacity: 0.5;
			pointer-events: none;
		}
	}

	&__save-text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}

	&__safe {
		height: constant(safe-area-inset-bottom);
		height: env(safe-area-inset-bottom);
	}
}

.section__summary {
	font-size: 13px;
	color: var(--primary);
	display: block;
	margin-bottom: 8px;
	font-weight: 500;
}
.section__hint--highlight {
	color: var(--primary);
	font-weight: 700;
}

/* 工作选择面板 */
.work-picker-mask {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.45); z-index: 300;
	display: flex; align-items: flex-end; justify-content: center;
}
.work-picker {
	width: 100%; max-width: 640px; max-height: 70vh;
	background: var(--surface-card); border-radius: 20px 20px 0 0;
	display: flex; flex-direction: column; overflow: hidden;
}
.work-picker__head {
	display: flex; align-items: center; justify-content: space-between;
	padding: 20px 20px 12px; border-bottom: 1px solid var(--border);
}
.work-picker__title { font-size: 17px; font-weight: 600; color: var(--text-primary); }
.work-picker__close { font-size: 18px; color: var(--text-muted); padding: 4px; }
.work-picker__list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.work-picker__item {
	display: flex; align-items: center; padding: 12px 8px;
	border-radius: 10px; gap: 10px;
}
.work-picker__item--sel { background: var(--primary-light); }
.work-picker__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.work-picker__info { flex: 1; display: flex; flex-direction: column; }
.work-picker__name { font-size: 15px; font-weight: 500; color: var(--text-primary); }
.work-picker__rate { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.work-picker__check { font-size: 16px; color: var(--primary); font-weight: 700; }
.work-picker__foot {
	padding: 12px 20px 24px; border-top: 1px solid var(--border);
}
.work-picker__add {
	display: block; text-align: center; font-size: 16px; font-weight: 600;
	color: var(--primary); padding: 10px 0;
}

.pay-mode-rates {
	margin-top: 12px; padding: 10px 12px;
	background: var(--surface); border-radius: 8px;
	text-align: center;
}
.pay-mode-rates--hint { background: transparent; }
.pay-mode-rates__text {
	font-size: 13px; color: var(--text-secondary); font-weight: 500;
}
</style>
