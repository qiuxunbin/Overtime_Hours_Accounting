<template>
	<view class="page-record">
		<NavBar title="批量记工" :showBack="true" />

		<view class="page-record__content">
			<!-- 日期范围 — 与记工页 field-row 同款 -->
			<view class="field-row">
				<text class="field-row__label">日期</text>
				<view class="field-row__right">
					<picker mode="date" :value="startDate" :end="todayStr" @change="onStartDateChange">
						<text class="field-row__value">{{ startDate }}</text>
					</picker>
					<text class="field-row__sep">—</text>
					<picker mode="date" :value="endDate" :end="todayStr" @change="onEndDateChange">
						<text class="field-row__value">{{ endDate }}</text>
					</picker>
				</view>
			</view>

			<!-- 工作行 -->
			<view class="project-row" :class="{ 'project-row--empty': !selectedProject }" @tap="showProjectPicker">
				<view class="project-row__left" v-if="selectedProject">
					<view class="project-row__dot" :style="{ background: selectedProject.color }"></view>
					<text class="project-row__name">{{ selectedProject.name }}</text>
				</view>
				<view class="project-row__placeholder" v-else><text>请先设置工作 </text><text style="color: #E5A100;">*</text></view>
				<view class="project-row__right">
					<text class="project-row__mode">{{ payModeIcon }} {{ payModeLabel }}</text>
				</view>
			</view>

			<!-- ==================== 时薪 ==================== -->
			<template v-if="effectivePayMode === 'hourly'">
				<view class="time-columns">
					<picker mode="time" :value="startTime" @change="onStartTimeChange" class="time-col">
						<view class="time-col__inner">
							<text class="time-col__label">开始</text>
							<text class="time-col__value">{{ startTime }}</text>
						</view>
					</picker>
					<view class="time-columns__sep">
						<text class="time-columns__sep-text">—</text>
					</view>
					<picker mode="time" :value="endTime" @change="onEndTimeChange" class="time-col">
						<view class="time-col__inner">
							<text class="time-col__label">结束</text>
							<text class="time-col__value">{{ endTime }}</text>
						</view>
					</picker>
				</view>

				<view class="tag-row" v-if="duration > 0">
					<view class="tag tag--duration">
						<text class="tag__text">{{ duration }}h</text>
					</view>
					<view class="tag tag--type">
						<text class="tag__text">每天</text>
					</view>
				</view>

				<view class="pay-card" v-if="duration > 0 && currentRate > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ estimatedPay.toFixed(0) }}</text>
					<text class="pay-card__detail">{{ duration }}h × ¥{{ currentRate }}/h = ¥{{ estimatedPay.toFixed(0) }} / 天</text>
				</view>
				<view class="pay-card pay-card--warn" v-else-if="duration > 0" @tap="goEditProject">
					<text class="pay-card__warn-text">暂未设置该类型的记工时薪，点击设置</text>
				</view>
			</template>

			<!-- ==================== 日薪 ==================== -->
			<template v-if="effectivePayMode === 'daily'">
				<view class="qty-stepper">
					<view class="qty-stepper__btn" @tap="adjustDailyDays(-0.5)"><text>−</text></view>
					<text class="qty-stepper__num">{{ dailyDays }}</text>
					<text class="qty-stepper__unit">天</text>
					<view class="qty-stepper__btn qty-stepper__btn--add" @tap="adjustDailyDays(0.5)"><text>+</text></view>
				</view>

				<view class="pay-card" v-if="dailyPay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ dailyPay.toFixed(0) }}</text>
					<text class="pay-card__detail">{{ dailyDays }}天 × ¥{{ projectDailyRate }}/天 = ¥{{ dailyPay.toFixed(0) }} / 天</text>
				</view>
			</template>

			<!-- ==================== 计件 ==================== -->
			<template v-if="effectivePayMode === 'piece'">
				<view class="qty-stepper">
					<view class="qty-stepper__btn" @tap="adjustPieceQty(-1)"><text>−</text></view>
					<text class="qty-stepper__num">{{ pieceQuantity }}</text>
					<text class="qty-stepper__unit">{{ pieceUnit }}</text>
					<view class="qty-stepper__btn qty-stepper__btn--add" @tap="adjustPieceQty(1)"><text>+</text></view>
				</view>

				<view class="pay-card" v-if="piecePay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ piecePay.toFixed(0) }}</text>
					<text class="pay-card__detail">{{ pieceQuantity }}{{ pieceUnit }} × ¥{{ projectPieceRate }}/{{ pieceUnit }} = ¥{{ piecePay.toFixed(0) }} / 天</text>
				</view>
			</template>

			<!-- 备注 -->
			<view class="remark-area">
				<textarea class="remark-area__input" v-model="remark" placeholder="备注（选填）"
					placeholder-style="color: var(--text-muted); font-size: 14px;" />
			</view>

			<!-- 预览 -->
			<view class="preview-section" v-if="previewDates.length > 0">
				<text class="preview-section__title">预览（共 {{ previewDates.length }} 条）</text>
				<text class="preview-section__sum" v-if="estimatedTotalPay > 0">合计 ¥{{ estimatedTotalPay }}</text>
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

			<view class="page-record__spacer"></view>
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

		<!-- 工作选择面板 -->
		<view class="work-picker-mask" v-if="showWorkPicker" @tap="showWorkPicker = false">
			<view class="work-picker" @tap.stop>
				<view class="work-picker__head">
					<text class="work-picker__title">选择工作</text>
					<text class="work-picker__close" @tap="showWorkPicker = false">✕</text>
				</view>
				<view class="work-picker__list">
					<view v-for="p in pickerProjects" :key="p._id" class="work-picker__item" :class="{ 'work-picker__item--sel': selectedProjectId === p._id }" :data-id="p._id" @tap="onPickWork">
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
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '../../stores/projectStore'
import { useHolidayStore } from '@/stores/holidayStore'
import { requireAuth } from '@/utils/auth'
import { round2 } from '@/utils/calculator'

function pad(n) { return String(n).padStart(2, '0') }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		const today = formatDate(now)
		return {
			startDate: today,
			endDate: today,
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
		hasProjects() {
			return useProjectStore().activeProjects.length > 0
		},
		pickerProjects() {
			return useProjectStore().activeProjects
		},
		selectedProject() {
			if (!this.selectedProjectId) return null
			return useProjectStore().getProjectById(this.selectedProjectId)
		},
		effectivePayMode() {
			if (this.selectedProject?.pay_mode) return this.selectedProject.pay_mode
			return 'hourly'
		},
		payModeIcon() {
			const icons = { hourly: '⏱', daily: '📅', piece: '📦' }
			if (!this.selectedProjectId) return ''; return icons[this.effectivePayMode] || '⏱'
		},
		payModeLabel() {
			if (!this.selectedProjectId) return ''
			const p = this.selectedProject
			const mode = this.effectivePayMode
			if (mode === 'daily') return `日薪 ¥${p?.daily_rate || 0}/天`
			if (mode === 'piece') return `计件 ¥${p?.piece_rate || 0}/${p?.piece_unit || '件'}`
			return `平¥${p?.weekday_rate || 0} 休¥${p?.weekend_rate || 0} 节¥${p?.holiday_rate || 0}`
		},
		pieceUnit() {
			if (this.selectedProject?.piece_unit) return this.selectedProject.piece_unit
			return '件'
		},
		currentRate() {
			if (!this.selectedProject) return 0
			const key = this.dayType + '_rate'
			return this.selectedProject[key] || 0
		},
		dayType() {
			return useHolidayStore().getDayType(this.startDate)
		},
		estimatedPay() {
			const d = parseFloat(this.duration) || 0
			if (d <= 0 || this.currentRate <= 0) return 0
			return round2(d * this.currentRate)
		},
		projectDailyRate() {
			if (this.selectedProject?.daily_rate > 0) return this.selectedProject.daily_rate
			return 0
		},
		dailyPay() { return round2((this.dailyDays || 0) * this.projectDailyRate) },
		projectPieceRate() {
			if (this.selectedProject?.piece_rate > 0) return this.selectedProject.piece_rate
			return 0
		},
		piecePay() { return round2((this.pieceQuantity || 0) * this.projectPieceRate) },
		previewDates() {
			const dates = []
			const start = new Date(this.startDate)
			const end = new Date(this.endDate)
			if (end < start) return []

			const typeLabels = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			const mode = this.effectivePayMode

			if (mode === 'hourly') {
				const h = parseFloat(this.duration) || 0
				if (h <= 0) return []
				const proj = this.selectedProject
				let d = new Date(start)
				while (d <= end) {
					const dateStr = formatDate(d)
					const type = useHolidayStore().getDayType(dateStr)
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
		estimatedTotalPay() {
			return this.previewDates.reduce(function(s, d) { return s + (d.pay || 0); }, 0).toFixed(0)
		},
	},
	async onShow() {
		await useProjectStore().loadProjects()
		this.$nextTick(() => {
			if (!this.selectedProjectId || !this.selectedProject) this.autoSelectProject()
		})
	},
	autoSelectProject() {
		const pStore = useProjectStore()
		const wStore = useWorkStore()
		const activeProjects = pStore.activeProjects
		if (activeProjects.length === 0) return
		const sortedRecords = [...wStore.records].sort((a, b) => {
			const da = a.date || '', db = b.date || ''
			if (da !== db) return db.localeCompare(da)
			return (b.created_at || 0) - (a.created_at || 0)
		})
		const lastUsedId = sortedRecords[0]?.project_id
		if (lastUsedId && activeProjects.some(p => p._id === lastUsedId)) {
			this.selectedProjectId = lastUsedId
			return
		}
		const first = activeProjects[0]
		if (first) { this.selectedProjectId = first._id }
	},
	methods: {
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
		goCreateProject() {
			uni.navigateTo({ url: '/pages/project-edit/project-edit' })
		},
		goEditProject() {
			if (!this.selectedProjectId) {
				uni.navigateTo({ url: '/pages/project-edit/project-edit' }); return
			}
			uni.navigateTo({ url: '/pages/project-edit/project-edit?id=' + this.selectedProjectId })
		},
		showProjectPicker() {
			const pStore = useProjectStore()
			if (pStore.activeProjects.length === 0) {
				uni.navigateTo({ url: '/pages/project-edit/project-edit' }); return
			}
			this.showWorkPicker = true
		},
		onPickWork(e) {
			const id = e.currentTarget.dataset.id
			this.selectedProjectId = id
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

			const mode = this.effectivePayMode
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
			if (mode === 'hourly' && this.currentRate <= 0) { this.goEditProject(); return }
			if (!requireAuth()) return

			this.saving = true
			const store = useWorkStore()
			const proj = this.selectedProject
			let success = 0
			let fail = 0

			for (const item of this.previewDates) {
				try {
					const base = {
						date: item.date, pay_mode: mode, remark: this.remark,
						project_id: this.selectedProjectId,
						project_name: proj ? proj.name : '',
						photos: [], settled: false,
						subsidies: { night_shift: 0, meal: 0, transport: 0 },
						deduction: { amount: 0, note: '' },
						day_type: item.type
					}

					if (mode === 'hourly') {
						Object.assign(base, {
							start_time: this.startTime, end_time: this.endTime,
							duration: parseFloat(this.duration) || 0,
							rate: item.rate || 0, pay: item.pay, net_pay: item.pay
						})
					} else if (mode === 'daily') {
						Object.assign(base, {
							start_time: '', end_time: '', duration: 0,
							days: item.days || 1, daily_rate: item.rate || 0,
							rate: item.rate || 0, pay: item.pay, net_pay: item.pay
						})
					} else if (mode === 'piece') {
						Object.assign(base, {
							start_time: '', end_time: '', duration: 0,
							quantity: item.quantity || 0, piece_rate: item.rate || 0,
							piece_unit: item.unit || '件',
							rate: item.rate || 0, pay: item.pay, net_pay: item.pay
						})
					}

					await store.addRecord(base)
					success++
				} catch (e) {
					fail++
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
/* 复用 record.vue 的所有核心样式 */
.page-record {
	padding-top: 56px; min-height: 100vh; background: var(--surface);
	&__content { padding: 0 16px 100px; max-width: 640px; margin: 0 auto; }
	&__spacer { height: 60px; }
}

/* 日期/工作行 */
.field-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 16px; background: var(--surface-card); border-radius: 12px;
	border: 1px solid var(--border); margin-top: 12px;
	&__label { font-size: 16px; color: var(--text-primary); font-weight: 500; }
	&__right { display: flex; align-items: center; gap: 6px; }
	&__value { font-size: 14px; color: var(--text-secondary); }
	&__sep { font-size: 14px; color: var(--text-muted); margin: 0 4px; }
	&__arrow { font-size: 18px; color: var(--text-muted); margin-left: 4px; }
}

/* 工作行 */
.project-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 12px 14px; background: var(--surface); border-radius: 8px; margin-top: 12px;
	&__left { display: flex; align-items: center; gap: 8px; }
	&__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
	&__name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
	&__placeholder { font-size: 15px; color: var(--text-muted); }
	&__right { display: flex; align-items: center; }
	&__mode { font-size: 12px; color: var(--text-muted); margin-right: 4px; }
	&--empty { border: 1px solid #E5A100; background: #FFFBF0; }
	&--warn { border: 1px solid #C4A46C; background: #FFFBF0; margin-top: 12px; }
}

/* 时薪时间列 */
.time-columns {
	display: flex; align-items: center; margin-top: 12px;
	&__sep { padding: 0 16px; &-text { font-size: 16px; color: var(--text-muted); } }
}
.time-col {
	flex: 1; background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border); padding: 12px;
	&__inner { text-align: center; }
	&__label { font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 4px; }
	&__value { font-size: 22px; font-weight: 700; color: var(--text-primary); }
}

/* 标签行 */
.tag-row { display: flex; gap: 8px; margin-top: 12px; }
.tag {
	padding: 4px 10px; border-radius: 20px;
	&--duration { background: var(--primary-light); }
	&--type { background: var(--surface-hover); }
	&__text { font-size: 12px; font-weight: 500; color: var(--primary); }
	.tag--type &__text { color: var(--text-secondary); }
}

/* 日薪/计件步进器 */
.qty-stepper {
	display: flex; align-items: center; justify-content: center; gap: 16px;
	background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border);
	padding: 16px; margin-top: 12px;
	&__btn {
		width: 40px; height: 40px; border-radius: 50%;
		background: var(--surface-hover); display: flex; align-items: center; justify-content: center;
		font-size: 22px; color: var(--text-secondary);
		&--add { background: var(--primary); color: #FFFFFF; }
	}
	&__num { font-size: 28px; font-weight: 700; color: var(--text-primary); min-width: 60px; text-align: center; }
	&__unit { font-size: 15px; color: var(--text-muted); }
}

/* 工钱卡片 */
.pay-card {
	display: flex; align-items: center; justify-content: space-between;
	padding: 12px 14px; background: var(--primary-light); border-radius: 8px; margin-top: 12px;
	&__label { font-size: 14px; color: var(--text-secondary); }
	&__amount { font-size: 20px; font-weight: 700; color: var(--primary); }
	&__detail { font-size: 12px; color: var(--text-muted); }
	&--warn { background: #FFFBF0; justify-content: center; }
	&__warn-text { font-size: 14px; color: #E5A100; }
}

/* 备注 */
.remark-area { margin-top: 12px; }
.remark-area__input {
	width: 100%; min-height: 80px; padding: 14px 16px;
	background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border);
	font-size: 14px; color: var(--text-primary); box-sizing: border-box;
}

/* 预览 */
.preview-section {
	margin-top: 16px;
	&__title { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 8px; }
	&__sum { font-size: 13px; color: var(--primary); font-weight: 500; display: block; margin-bottom: 6px; }
}
.preview-list {
	background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border);
	max-height: 260px; overflow-y: auto;
}
.preview-item {
	display: flex; align-items: center; padding: 8px 14px; border-bottom: 1px solid var(--border);
	&:last-child { border-bottom: none; }
	&__date { font-size: 13px; color: var(--text-primary); flex: 2; }
	&__type { font-size: 11px; color: var(--text-muted); flex: 1; text-align: center; }
	&__qty { font-size: 12px; font-weight: 500; color: var(--primary); flex: 1; text-align: right; padding-right: 8px; }
	&__pay { font-size: 13px; font-weight: 600; color: var(--primary); flex: 0 0 55px; text-align: right;
		&--zero { color: var(--text-muted); font-weight: 400; font-size: 11px; }
	}
}

/* 底部 */
.bottom-bar {
	position: fixed; bottom: 0; left: 0; right: 0;
	background: var(--surface-card); border-top: 1px solid var(--border); z-index: 100;
	&__inner { max-width: 640px; margin: 0 auto; padding: 12px 16px; }
	&__save {
		height: 48px; border-radius: 20px; background: var(--primary);
		display: flex; align-items: center; justify-content: center;
		&--disabled { opacity: 0.5; pointer-events: none; }
	}
	&__save-text { font-size: 17px; font-weight: 600; color: #FFFFFF; }
	&__safe { height: constant(safe-area-inset-bottom); height: env(safe-area-inset-bottom); }
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
	display: flex; align-items: center; padding: 12px 8px; border-radius: 10px; gap: 10px;
}
.work-picker__item--sel { background: var(--primary-light); }
.work-picker__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.work-picker__info { flex: 1; display: flex; flex-direction: column; }
.work-picker__name { font-size: 15px; font-weight: 500; color: var(--text-primary); }
.work-picker__rate { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.work-picker__check { font-size: 16px; color: var(--primary); font-weight: 700; }
.work-picker__foot { padding: 12px 20px 24px; border-top: 1px solid var(--border); }
.work-picker__add {
	display: block; text-align: center; font-size: 16px; font-weight: 600;
	color: var(--primary); padding: 10px 0;
}
</style>
