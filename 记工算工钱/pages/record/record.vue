<template>
	<view class="page-record">
		<NavBar :title="editId ? '编辑记录' : '记录记工'" :showBack="true" />

		<view class="page-record__content">
			<!-- 公共：日期行 -->
			<picker mode="date" :value="pickerDate" :end="todayStr" @change="onDateChange">
				<view class="field-row">
					<text class="field-row__label">日期</text>
					<view class="field-row__right">
						<text class="field-row__value">{{ displayDate }}</text>
						<text class="field-row__arrow">›</text>
					</view>
				</view>
			</picker>

			<!-- 公共：项目行 -->
			<view class="project-row" @tap="showProjectSelector">
				<view class="project-row__left" v-if="selectedProject">
					<view class="project-row__dot" :style="{ background: selectedProject.color }"></view>
					<text class="project-row__name">{{ selectedProject.name }}</text>
				</view>
				<text class="project-row__placeholder" v-else>选项目</text>
				<view class="project-row__right">
					<text class="project-row__mode">{{ payModeIcon }} {{ payModeLabel || '时薪' }}</text>
					<text class="project-row__arrow">›</text>
				</view>
			</view>

			<!-- ==================== 时薪模式 ==================== -->
			<template v-if="effectivePayMode === 'hourly'">
				<!-- 起止时间 — 左右并排 -->
				<view class="time-columns">
					<picker mode="time" :value="pickerStartTime" @change="onStartChange" class="time-col">
						<view class="time-col__inner">
							<text class="time-col__label">开始</text>
							<text class="time-col__value">{{ startTime }}</text>
						</view>
					</picker>
					<view class="time-columns__sep">
						<text class="time-columns__sep-text">—</text>
					</view>
					<picker mode="time" :value="pickerEndTime" @change="onEndChange" class="time-col">
						<view class="time-col__inner">
							<text class="time-col__label">结束</text>
							<text class="time-col__value">{{ endTime }}</text>
						</view>
					</picker>
				</view>

				<!-- 快捷时长 -->
				<view class="quick-hours">
					<view
						v-for="(h, idx) in quickHours"
						:key="idx"
						class="quick-hours__btn"
						:class="{ 'quick-hours__btn--active': quickActive === h }"
						@tap="applyQuickHour(h)"
					>
						<text class="quick-hours__text">{{ h }}h</text>
					</view>
				</view>

				<!-- 标签行：时长 + 类型 -->
				<view class="tag-row" v-if="duration > 0">
					<view class="tag tag--duration">
						<text class="tag__text">{{ formattedDuration }}h</text>
					</view>
					<view class="tag tag--type">
						<text class="tag__text">{{ dayTypeLabel }}</text>
					</view>
				</view>

				<!-- 工钱预览 -->
				<view class="pay-card" v-if="estimatedPay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ estimatedPay.toFixed(0) }}</text>
					<text class="pay-card__detail">{{ formattedDuration }}h × ¥{{ currentRate }}/h</text>
				</view>
				<view class="pay-card pay-card--warn" v-else-if="duration > 0" @tap="showRateSheet = true">
					<text class="pay-card__warn-text">暂未设置该类型的记工时薪，点击设置</text>
				</view>

				<!-- 备注 -->
				<view class="remark-area">
					<textarea class="remark-area__input" v-model="remark" placeholder="备注（选填）"
						placeholder-style="color: var(--text-muted); font-size: 14px;" />
				</view>

				<!-- 快捷短语 -->
				<view class="phrase-row">
					<text
						v-for="(p, idx) in commonPhrases"
						:key="idx"
						class="phrase-tag"
						@tap="remark = p"
					>{{ p }}</text>
				</view>

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

				<view class="settle-row">
					<text class="settle-row__label">已结算</text>
					<switch :checked="settled" @change="settled = $event.detail.value" color="#1B8A5A" />
				</view>
			</template>

			<!-- ==================== 日薪模式 ==================== -->
			<template v-if="effectivePayMode === 'daily'">
				<!-- 打卡卡片 -->
				<view class="punch-card">
					<view class="punch-card__btn" @tap="addOneDay">
						<text class="punch-card__icon">⏱</text>
					</view>
					<text class="punch-card__label">上班打卡</text>
					<text class="punch-card__stats" v-if="monthDailyCount > 0">
						{{ displayDate }} 已记 {{ monthDailyCount }} 天 · 本月 ¥{{ monthDailyPay.toFixed(0) }}
					</text>
				</view>

				<!-- 备注 -->
				<view class="remark-area">
					<textarea class="remark-area__input" v-model="remark" placeholder="记工说明（选填）"
						placeholder-style="color: var(--text-muted); font-size: 14px;" />
				</view>

				<!-- 快捷短语 -->
				<view class="phrase-row">
					<text
						v-for="(p, idx) in commonPhrases"
						:key="idx"
						class="phrase-tag"
						@tap="remark = p"
					>{{ p }}</text>
				</view>

				<!-- 也可手动修改天数 -->
				<text class="mode-hint">也可手动修改天数</text>

				<!-- 天数步进器 -->
				<view class="day-stepper">
					<view class="stepper-circle" @tap="adjustDays(-1)">
						<text class="stepper-circle__text">−</text>
					</view>
					<text class="day-stepper__num">{{ dailyDays }}</text>
					<text class="day-stepper__unit">天</text>
					<view class="stepper-circle stepper-circle--primary" @tap="adjustDays(1)">
						<text class="stepper-circle__text stepper-circle__text--white">+</text>
					</view>
				</view>

				<!-- 工钱 -->
				<view class="pay-card" v-if="dailyPay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ dailyPay.toFixed(0) }}</text>
				</view>

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

				<view class="settle-row">
					<text class="settle-row__label">已结算</text>
					<switch :checked="settled" @change="settled = $event.detail.value" color="#1B8A5A" />
				</view>
			</template>

			<!-- ==================== 计件模式 ==================== -->
			<template v-if="effectivePayMode === 'piece'">
				<!-- 引导文字 -->
				<text class="mode-guide">今天做了多少？</text>

				<!-- 步进按钮 -->
				<view class="qty-steppers">
					<view class="qty-btn" @tap="adjustQty(-10)">
						<text class="qty-btn__text">−10</text>
					</view>
					<view class="qty-btn" @tap="adjustQty(-1)">
						<text class="qty-btn__text">−1</text>
					</view>
					<view class="qty-btn qty-btn--primary" @tap="adjustQty(1)">
						<text class="qty-btn__text qty-btn__text--white">+1</text>
					</view>
					<view class="qty-btn" @tap="adjustQty(10)">
						<text class="qty-btn__text">+10</text>
					</view>
				</view>

				<!-- 大数字 -->
				<view class="big-number">
					<text class="big-number__value">{{ pieceQuantity }}</text>
					<text class="big-number__unit">{{ selectedProject?.piece_unit || '件' }}</text>
				</view>

				<!-- 工钱 -->
				<view class="pay-card" v-if="piecePay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ piecePay.toFixed(0) }}</text>
				</view>

				<!-- 备注 -->
				<view class="remark-area">
					<textarea class="remark-area__input" v-model="remark" placeholder="备注（选填）"
						placeholder-style="color: var(--text-muted); font-size: 14px;" />
				</view>

				<!-- 快捷短语 -->
				<view class="phrase-row">
					<text
						v-for="(p, idx) in commonPhrases"
						:key="idx"
						class="phrase-tag"
						@tap="remark = p"
					>{{ p }}</text>
				</view>

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

				<view class="settle-row">
					<text class="settle-row__label">已结算</text>
					<switch :checked="settled" @change="settled = $event.detail.value" color="#1B8A5A" />
				</view>
			</template>

			<view class="page-record__spacer"></view>
		</view>

		<!-- 底部保存按钮 -->
		<view class="bottom-bar" v-show="pageReady">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__save" :class="{ 'bottom-bar__save--disabled': saving }" @tap="!saving && handleSave()">
					<text class="bottom-bar__save-text">{{ saving ? '保存中...' : (editId ? '更新记录' : '保存') }}</text>
				</view>
				<view class="bottom-bar__delete" v-if="editId" @tap="handleDelete">
					<text class="bottom-bar__delete-text">删除此记录</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>

		<!-- 时薪设置弹窗（零费率时弹出） -->
		<view class="rate-sheet" v-if="showRateSheet" @tap="showRateSheet = false">
			<view class="rate-sheet__panel" @tap.stop>
				<text class="rate-sheet__title">这一小时工钱多少？</text>
				<text class="rate-sheet__desc">填一个数就行，其他类型会自动沿用</text>
				<view class="rate-sheet__input-row">
					<text class="rate-sheet__prefix">¥</text>
					<input class="rate-sheet__input" type="digit" v-model="quickRate" placeholder="30" focus />
					<text class="rate-sheet__suffix">/ 小时</text>
				</view>
				<view class="rate-sheet__apply" v-if="quickRate > 0">
					<text class="rate-sheet__apply-text">保存 ¥{{ quickRate }}/h 并应用到已有的记工记录</text>
				</view>
				<view class="rate-sheet__btns">
					<view class="rate-sheet__btn rate-sheet__btn--confirm" @tap="applyQuickRate">
						<text class="rate-sheet__btn-confirm-text">确认</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useWorkStore } from '@/stores/workStore'
import { useSalaryStore } from '../../stores/salaryStore'
import { COMMON_PHRASES } from '../../utils/constants.js'
import { useProjectStore } from '../../stores/projectStore'
import { formatDate, calcDuration } from '../../utils/date.js'
import { useHolidayStore } from '@/stores/holidayStore'
import { round2 } from '@/utils/calculator'

function pad(n) { return String(n).padStart(2, '0') }

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		return {
			pickerDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
			startTime: '18:00',
			endTime: '21:00',
			pickerStartTime: '18:00',
			pickerEndTime: '21:00',
			dayType: 'weekday',
			dayTypes: [
				{ value: 'weekday', label: '平日' },
				{ value: 'weekend', label: '周末' },
				{ value: 'holiday', label: '节假日' }
			],
			remark: '',
			projectName: '',
			selectedProjectId: null,
			editId: null,
			pageReady: false,
			saving: false,
			showRateSheet: false,
			quickRate: '',
			quickHours: [0.5, 1, 1.5, 2, 3],
			quickActive: null,
			showPhrases: false,
			commonPhrases: COMMON_PHRASES,
			settled: false,
			subsidies: { night_shift: 0, meal: 0, transport: 0 },
			deduction: { amount: 0, note: "" },
			showSubsidy: false,
			dailyDays: 1,
			pieceQuantity: 0
		}
	},
	computed: {
		todayStr() {
			const n = new Date()
			return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
		},
		displayDate() {
			const parts = this.pickerDate.split('-')
			if (parts.length === 3) return `${parts[1]}月${parts[2]}日`
			return this.pickerDate
		},
		selectedProject() {
			if (!this.selectedProjectId) return null
			const pStore = useProjectStore()
			return pStore.getProjectById(this.selectedProjectId)
		},
		effectivePayMode() {
			if (this.selectedProject?.pay_mode) return this.selectedProject.pay_mode
			return useSalaryStore().config?.pay_mode || 'hourly'
		},
		payModeIcon() {
			const icons = { hourly: '⏱', daily: '📅', piece: '📦' }
			return icons[this.effectivePayMode] || '⏱'
		},
		payModeLabel() {
			const labels = { hourly: '时薪', daily: '日薪', piece: '计件' }
			const p = this.selectedProject
			const mode = this.effectivePayMode
			if (mode === 'daily') return `日薪 ¥${p?.daily_rate || 0}/天`
			if (mode === 'piece') return `计件 ¥${p?.piece_rate || 0}/${p?.piece_unit || '件'}`
			return '时薪'
		},
		dayTypeLabel() {
			const map = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return map[this.dayType] || '平日'
		},
		// 时薪
		duration() { return calcDuration(this.startTime, this.endTime) },
		formattedDuration() { return String(Math.round(this.duration * 100) / 100) },
		currentRate() {
			if (this.selectedProject) {
				const key = this.dayType + '_rate'
				const pr = this.selectedProject[key]
				if (pr && pr > 0) return pr
			}
			return useSalaryStore().rateByType(this.dayType)
		},
		estimatedPay() {
			if (this.duration <= 0 || this.currentRate <= 0) return 0
			return round2(this.duration * this.currentRate)
		},
		// 日薪
		projectDailyRate() {
			if (this.selectedProject?.daily_rate > 0) return this.selectedProject.daily_rate
			return useSalaryStore().config?.daily_rate || 0
		},
		dailyPay() { return round2((this.dailyDays || 0) * this.projectDailyRate) },
		monthDailyCount() {
			if (!this.pickerDate) return 0
			const store = useWorkStore()
			return store.records.filter(r =>
				r.date === this.pickerDate && r.project_id === this.selectedProjectId && r.pay_mode === 'daily'
			).length
		},
		monthDailyPay() {
			if (!this.pickerDate) return 0
			const store = useWorkStore()
			return store.records.filter(r =>
				r.date === this.pickerDate && r.project_id === this.selectedProjectId && r.pay_mode === 'daily'
			).reduce((s, r) => s + (r.pay || 0), 0)
		},
		// 计件
		projectPieceRate() {
			if (this.selectedProject?.piece_rate > 0) return this.selectedProject.piece_rate
			return useSalaryStore().config?.piece_rate || 0
		},
		piecePay() { return round2((this.pieceQuantity || 0) * this.projectPieceRate) },
		// 通用
		basePay() { return this.estimatedPay || this.dailyPay || this.piecePay || 0 },
		totalSubsidies() { return (this.subsidies.night_shift || 0) + (this.subsidies.meal || 0) + (this.subsidies.transport || 0) },
		deductionAmount() { return Number(this.deduction.amount) || 0 },
		netPay() { return this.basePay + this.totalSubsidies - this.deductionAmount }
	},
	onReady() { setTimeout(() => { this.pageReady = true }, 350) },
	onLoad(options) {
		if (options.date) this.pickerDate = options.date
		this.loadProjectPicker()
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
				this.dayType = rec.day_type || rec.overtime_type
				this.remark = rec.remark || ''
				this.projectName = rec.project_name || ''
				this.selectedProjectId = rec.project_id || null
				this.subsidies = rec.subsidies || { night_shift: 0, meal: 0, transport: 0 }
				this.deduction = rec.deduction || { amount: 0, note: '' }
				this.settled = rec.settled || false
				if (rec.pay_mode === 'daily') this.dailyDays = rec.days || 1
				if (rec.pay_mode === 'piece') this.pieceQuantity = rec.quantity || 0
			}
		} else {
			this.autoDetectType(this.pickerDate)
		}
	},
	methods: {
		onDateChange(e) { this.pickerDate = e.detail.value; this.autoDetectType(e.detail.value) },
		loadProjectPicker() {
			const pStore = useProjectStore()
			if (pStore.projects.length === 0) pStore.loadProjects()
		},
		autoDetectType(date) { this.dayType = useHolidayStore().getDayType(date) },
		onStartChange(e) { this.startTime = e.detail.value; this.pickerStartTime = e.detail.value },
		onEndChange(e) { this.endTime = e.detail.value; this.pickerEndTime = e.detail.value },
		applyQuickHour(h) {
			const [hh, mm] = this.startTime.split(':').map(Number)
			const totalMinutes = hh * 60 + mm + Math.round(h * 60)
			const endH = Math.floor(totalMinutes / 60) % 24
			const endM = totalMinutes % 60
			this.endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
			this.pickerEndTime = this.endTime
			this.quickActive = h
		},
		addOneDay() { this.dailyDays = 1 },
		adjustDays(delta) { this.dailyDays = Math.max(0.5, (this.dailyDays || 1) + delta) },
		adjustQty(delta) { this.pieceQuantity = Math.max(0, (this.pieceQuantity || 0) + delta) },
		showProjectSelector() {
			const pStore = useProjectStore()
			pStore.loadProjects()
			setTimeout(() => {
				const items = [
					{ text: '无项目', value: null },
					...pStore.activeProjects.map(p => ({ text: p.name, value: p._id }))
				]
				uni.showActionSheet({
					itemList: items.map(i => i.text),
					success: (res) => {
						const selected = items[res.tapIndex]
						this.selectedProjectId = selected.value
						const proj = pStore.getProjectById(selected.value)
						this.projectName = proj ? proj.name : ''
					}
				})
			}, 100)
		},
		handleDelete() {
			uni.showModal({
				title: '确认删除', content: '删除后无法恢复', confirmText: '删除', confirmColor: '#B85C4A',
				success: (res) => {
					if (res.confirm) {
						useWorkStore().deleteRecord(this.editId)
						uni.showToast({ title: '已删除', icon: 'success' })
						setTimeout(() => { uni.navigateBack() }, 500)
					}
				}
			})
		},
		async applyQuickRate() {
			if (!this.quickRate || parseInt(this.quickRate) <= 0) return
			const rate = parseInt(this.quickRate)
			const salaryStore = useSalaryStore()
			const cfg = salaryStore.config
			try {
				await salaryStore.updateConfig({
					weekday_rate: cfg.weekday_rate > 0 ? cfg.weekday_rate : rate,
					weekend_rate: cfg.weekend_rate > 0 ? cfg.weekend_rate : Math.round(rate * 1.5),
					holiday_rate: cfg.holiday_rate > 0 ? cfg.holiday_rate : Math.round(rate * 3)
				})
			} catch (e) { /* 云端不可用 */ }
			this.showRateSheet = false
			uni.showToast({ title: '时薪已设置', icon: 'success' })
		},
		async handleSave() {
			if (this.saving) return
			const store = useWorkStore()
			const payMode = this.effectivePayMode

			if (payMode === 'hourly') {
				if (this.duration <= 0) { uni.showToast({ title: '请设置起止时间', icon: 'none' }); return }
				if (this.currentRate <= 0) { this.showRateSheet = true; return }
			}
			if (payMode === 'daily' && (!this.dailyDays || this.dailyDays <= 0)) {
				uni.showToast({ title: '请输入天数', icon: 'none' }); return
			}
			if (payMode === 'daily' && this.projectDailyRate <= 0) {
				uni.showToast({ title: '未设置日薪金额，请前往薪资设置', icon: 'none' }); return
			}
			if (payMode === 'piece' && (!this.pieceQuantity || this.pieceQuantity <= 0)) {
				uni.showToast({ title: '请输入数量', icon: 'none' }); return
			}
			if (payMode === 'piece' && this.projectPieceRate <= 0) {
				uni.showToast({ title: '未设置计件单价，请前往薪资设置', icon: 'none' }); return
			}

			this.saving = true

			const baseData = {
				date: this.pickerDate,
				pay_mode: payMode,
				remark: this.remark,
				project_name: this.projectName,
				project_id: this.selectedProjectId,
				photos: [],
				settled: this.settled,
				subsidies: { ...this.subsidies },
				deduction: { ...this.deduction }
			}

			if (payMode === 'hourly') {
				Object.assign(baseData, {
					start_time: this.startTime, end_time: this.endTime,
					duration: this.duration, day_type: this.dayType,
					rate: this.currentRate, pay: this.estimatedPay, net_pay: this.netPay
				})
			} else if (payMode === 'daily') {
				const rate = this.projectDailyRate
				Object.assign(baseData, {
					start_time: '', end_time: '', duration: 0,
					day_type: useHolidayStore().getDayType(this.pickerDate),
					rate, days: this.dailyDays, daily_rate: rate,
					pay: this.dailyPay, net_pay: this.netPay
				})
			} else if (payMode === 'piece') {
				const rate = this.projectPieceRate
				Object.assign(baseData, {
					start_time: '', end_time: '', duration: 0,
					day_type: useHolidayStore().getDayType(this.pickerDate),
					rate, quantity: this.pieceQuantity, piece_rate: rate,
					piece_unit: this.selectedProject?.piece_unit || useSalaryStore().config?.piece_unit || '件',
					pay: this.piecePay, net_pay: this.netPay
				})
			}

			if (this.editId) {
				const updRes = await store.updateRecord(this.editId, baseData)
				if (updRes && updRes.duplicated) {
					uni.showToast({ title: '该时段已有记录', icon: 'warning' }); this.saving = false; return
				}
				uni.showToast({ title: '已更新', icon: 'success' })
			} else {
				const saveRes = await store.addRecord(baseData)
				if (saveRes.duplicated) {
					uni.showToast({ title: '该时段已有记录', icon: 'warning' }); this.saving = false; return
				}
				uni.showToast({ title: '已保存', icon: 'success' })
			}
			setTimeout(() => { uni.navigateBack() }, 500)
		}
	}
}
</script>

<style lang="scss" scoped>
.page-record {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content { padding: 0 16px; max-width: 640px; margin: 0 auto; }
	&__spacer { height: 80px; }
}

/* ===== 公共：日期行 ===== */
.field-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 16px; background: var(--surface-card); border-radius: 12px;
	border: 1px solid var(--border); margin-top: 12px;

	&__label { font-size: 15px; color: var(--text-primary); }
	&__right { display: flex; align-items: center; }
	&__value { font-size: 14px; color: var(--text-secondary); }
	&__arrow { font-size: 18px; color: var(--text-muted); margin-left: 4px; }
}

/* ===== 公共：项目行 ===== */
.project-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 12px 14px; background: var(--surface); border-radius: 8px;
	margin-top: 12px;

	&__left { display: flex; align-items: center; gap: 8px; }
	&__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
	&__name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
	&__placeholder { font-size: 14px; color: var(--text-muted); }
	&__right { display: flex; align-items: center; }
	&__mode { font-size: 11px; color: var(--text-muted); margin-right: 4px; }
	&__arrow { font-size: 16px; color: var(--text-muted); }
}

/* ===== 时薪：时间列 ===== */
.time-columns {
	display: flex; align-items: center; margin-top: 12px;

	&__sep { padding: 0 16px; &-text { font-size: 16px; color: var(--text-muted); } }
}
.time-col {
	flex: 1;
	&__inner {
		background: var(--surface-card); border: 1px solid var(--border);
		border-radius: 12px; padding: 16px 12px; text-align: center;
	}
	&__label { font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 8px; }
	&__value { font-size: 42px; font-weight: 700; color: var(--text-primary); font-family: var(--font-number); display: block; }
}

/* ===== 时薪：快捷时长 ===== */
.quick-hours {
	display: flex; gap: 8px; margin-top: 12px;
	&__btn {
		flex: 1; height: 40px; border-radius: 8px; background: var(--surface-hover);
		display: flex; align-items: center; justify-content: center;
		&--active { background: rgba(27,138,90,0.15); }
	}
	&__text { font-size: 15px; font-weight: 600; color: var(--text-secondary); }
	.quick-hours__btn--active &__text { color: var(--primary); }
}

/* ===== 时薪：标签行 ===== */
.tag-row {
	display: flex; gap: 8px; margin-top: 12px;
}
.tag {
	padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 500;
	&--duration { background: var(--primary); color: #FFFFFF; }
	&--type { background: var(--primary-light); color: var(--primary); }
	&__text { line-height: 1; }
}

/* ===== 工钱预览卡片（三种模式共用） ===== */
.pay-card {
	display: flex; align-items: center; justify-content: space-between;
	padding: 12px 14px; background: var(--primary-light); border-radius: 8px; margin-top: 12px;

	&__label { font-size: 13px; color: var(--text-secondary); }
	&__amount { font-size: 20px; font-weight: 700; color: var(--primary); font-family: var(--font-number); }
	&__detail { font-size: 11px; color: var(--text-muted); }
	&--warn { background: #FFFBF0; justify-content: center; }
	&__warn-text { font-size: 14px; color: #E5A100; }
}

/* ===== 日薪：打卡卡片 ===== */
.punch-card {
	background: var(--surface-card); border: 1px solid var(--border);
	border-radius: 12px; padding: 24px 20px 16px; text-align: center; margin-top: 12px;

	&__btn {
		width: 72px; height: 72px; border-radius: 50%; background: var(--primary);
		display: flex; align-items: center; justify-content: center;
		margin: 0 auto; box-shadow: 0 4px 16px rgba(27,138,90,0.3);
	}
	&__icon { font-size: 32px; color: #FFFFFF; }
	&__label { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-top: 12px; display: block; }
	&__stats { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block; }
}

/* ===== 日薪 / 计件 通用 ===== */
.mode-hint { display: block; text-align: center; font-size: 13px; color: var(--text-muted); margin: 12px 0; }
.mode-guide { display: block; text-align: center; font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 16px 0; }

/* ===== 日薪：步进器 ===== */
.day-stepper {
	display: flex; align-items: center; justify-content: center; gap: 10px;

	&__num { font-size: 24px; font-weight: 700; color: var(--text-primary); font-family: var(--font-number); min-width: 40px; text-align: center; }
	&__unit { font-size: 14px; color: var(--text-muted); }
}
.stepper-circle {
	width: 36px; height: 36px; border-radius: 50%; background: var(--surface-hover);
	display: flex; align-items: center; justify-content: center;
	&--primary { background: var(--primary); }
	&__text { font-size: 20px; color: var(--text-muted); }
	&__text--white { color: #FFFFFF; }
}

/* ===== 计件：步进按钮 ===== */
.qty-steppers { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
.qty-btn {
	padding: 8px 14px; border-radius: 8px; background: var(--surface-hover);
	&--primary { background: var(--primary); }
	&__text { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
	&__text--white { color: #FFFFFF; }
}

/* ===== 计件：大数字 ===== */
.big-number {
	text-align: center; margin-bottom: 12px;
	&__value { font-size: 42px; font-weight: 700; color: var(--text-primary); font-family: var(--font-number); }
	&__unit { font-size: 16px; color: var(--text-muted); margin-left: 4px; }
}

/* ===== 备注 ===== */
.remark-area {
	margin-top: 12px;
	&__input {
		width: 100%; height: 80px; background: var(--surface-card); border-radius: 12px;
		padding: 14px 16px; font-size: 14px; color: var(--text-primary);
		border: 1px solid var(--border); box-sizing: border-box;
	}
}

/* ===== 底部 ===== */
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
	&__delete {
		margin-top: 12px; height: 44px; border-radius: 20px;
		border: 1px solid var(--error); display: flex; align-items: center; justify-content: center;
	}
	&__delete-text { font-size: 15px; color: var(--error); }
	&__safe { height: constant(safe-area-inset-bottom); height: env(safe-area-inset-bottom); }
}

/* ===== 时薪设置弹窗 ===== */
.rate-sheet {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5); z-index: 200;
	display: flex; align-items: flex-end; justify-content: center;
}
.rate-sheet__panel { width: 100%; background: var(--surface-card); border-radius: 20px 20px 0 0; padding: 28px 24px 32px; }
.rate-sheet__title { font-size: 20px; font-weight: 700; color: var(--text-primary); display: block; }
.rate-sheet__desc { font-size: 13px; color: var(--text-muted); display: block; margin-top: 6px; }
.rate-sheet__input-row { margin-top: 24px; display: flex; align-items: center; border-bottom: 2px solid var(--primary); padding-bottom: 8px; }
.rate-sheet__prefix { font-size: 24px; font-weight: 600; color: var(--text-primary); margin-right: 8px; }
.rate-sheet__input { flex: 1; font-size: 36px; font-weight: 700; color: var(--primary); background: transparent; border: none; }
.rate-sheet__suffix { font-size: 15px; color: var(--text-muted); }
.rate-sheet__apply { margin-top: 16px; padding: 10px 14px; background: #F7FFF9; border-radius: 8px; }
.rate-sheet__apply-text { font-size: 12px; color: var(--primary); line-height: 18px; }
.rate-sheet__btns { margin-top: 24px; }
.rate-sheet__btn { height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.rate-sheet__btn--confirm { background: var(--primary); }
.rate-sheet__btn-confirm-text { font-size: 17px; font-weight: 600; color: #FFFFFF; }

.subsidy-section {
    margin-top: 12px;
    background: var(--surface-card);
    border-radius: 12px;
    border: 1px solid var(--border);
    overflow: hidden;

    &__header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
    &__title { font-size: 14px; color: var(--text-primary); font-weight: 500; }
    &__toggle { font-size: 12px; color: var(--text-muted); }
    &__body { padding: 0 16px 12px; }
}

.subsidy-row {
    display: flex; align-items: center; justify-content: space-between; padding: 8px 0;

    &__label { font-size: 14px; color: var(--text-secondary); }
    &__input-wrap { display: flex; align-items: center; }
    &__prefix { font-size: 14px; color: var(--text-muted); margin-right: 4px; }
    &__input { width: 80px; text-align: right; font-size: 16px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border); padding: 4px 0; }
    &__note { flex: 1; text-align: right; font-size: 14px; color: var(--text-primary); max-width: 160px; }
}

.subsidy-divider { height: 1px; background: var(--border); margin: 4px 0; }

.settle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: var(--surface-card);
    border-radius: 12px; border: 1px solid var(--border); margin-top: 12px;
    &__label { font-size: 14px; color: var(--text-primary); }
}

.phrase-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.phrase-tag {
    padding: 4px 10px; border-radius: 12px;
    background: var(--primary-light); color: var(--primary); font-size: 11px;
}
</style>
