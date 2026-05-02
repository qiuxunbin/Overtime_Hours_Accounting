<template>
	<view class="page-record">
		<NavBar :title="editId ? '编辑记录' : '记录加班'" :showBack="true" />

		<view class="page-record__content">
			<!-- 日期 -->
			<picker mode="date" :value="pickerDate" :end="todayStr" @change="onDateChange">
				<view class="field-row">
					<text class="field-row__label">日期</text>
					<view class="field-row__right">
						<text class="field-row__value">{{ displayDate }}</text>
						<text class="field-row__arrow">&#x203A;</text>
					</view>
				</view>
			</picker>

			<!-- 项目名称 -->
			<view class="field-row" @tap="showProjectSelector">
				<text class="field-row__label">项目</text>
				<view class="field-row__right">
					<view class="project-tag" v-if="selectedProject" :style="{ background: selectedProject.color + '20' }">
						<view class="project-tag__dot" :style="{ background: selectedProject.color }"></view>
						<text class="project-tag__text" :style="{ color: selectedProject.color }">{{ selectedProject.name }}</text>
					</view>
					<text class="field-row__value" v-else style="color: var(--text-muted);">选项目</text>
					<text class="field-row__arrow">›</text>
				</view>
			</view>

			<!-- ========== 时薪模式 ========== -->
			<template v-if="effectivePayMode === 'hourly'">
				<!-- 起止时间 -->
				<view class="time-row">
					<picker mode="time" :value="pickerStartTime" @change="onStartChange" class="time-row__picker">
						<view class="time-row__item">
							<text class="time-row__label">开始</text>
							<text class="time-row__value">{{ startTime }}</text>
						</view>
					</picker>
					<view class="time-row__sep">
						<text class="time-row__sep-text">—</text>
					</view>
					<picker mode="time" :value="pickerEndTime" @change="onEndChange" class="time-row__picker">
						<view class="time-row__item">
							<text class="time-row__label">结束</text>
							<text class="time-row__value">{{ endTime }}</text>
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

				<!-- 时长（只读） -->
				<view class="duration-display" v-if="duration > 0">
					<text class="duration-display__num">{{ formattedDuration }}</text>
					<text class="duration-display__unit">小时</text>
				</view>

				<!-- 加班类型（自动识别） -->
				<view class="type-row" v-if="overtimeType">
					<text class="type-row__label">类型</text>
					<view class="type-row__options">
						<view class="type-tag type-tag--active">
							<text class="type-tag__text">{{ overtimeTypeLabel }}</text>
						</view>
					</view>
				</view>

				<!-- 预估金额 -->
				<view class="pay-preview" v-if="estimatedPay > 0">
					<text class="pay-preview__label">加班费</text>
					<text class="pay-preview__amount">¥ {{ estimatedPay.toFixed(0) }}</text>
					<text class="pay-preview__detail">{{ formattedDuration }}h × ¥{{ currentRate }}/h</text>
				</view>
				<view class="pay-preview pay-preview--empty" v-else-if="duration > 0">
					<text class="pay-preview__tip">暂未设置该类型的加班时薪</text>
					<text class="pay-preview__action" @tap="showRateSheet = true">点击设置 →</text>
				</view>
			</template>

			<!-- ========== 日薪模式 ========== -->
			<template v-if="effectivePayMode === 'daily'">
				<view class="daily-card">
					<view class="daily-card__header">
						<text class="daily-card__project">{{ selectedProject?.name || '日薪项目' }}</text>
						<text class="daily-card__rate">¥{{ projectDailyRate }}/天</text>
					</view>
					<view class="daily-card__btn" @tap="addOneDay">
						<text class="daily-card__btn-icon">⏱</text>
						<text class="daily-card__btn-text">上班打卡</text>
					</view>
					<view class="daily-card__stats" v-if="monthDailyCount > 0">
						<text class="daily-card__stats-item">今日已记：{{ monthDailyCount }} 天</text>
						<text class="daily-card__stats-item">本月累计 ¥{{ monthDailyPay.toFixed(0) }}</text>
					</view>
				</view>

				<!-- 天数手动调整 -->
				<view class="daily-input">
					<text class="daily-input__label">天数</text>
					<view class="daily-input__right">
						<view class="stepper-btn" @tap="adjustDays(-1)">
							<text class="stepper-btn__text">−</text>
						</view>
						<input class="daily-input__field" type="number" v-model.number="dailyDays" min="0.5" step="0.5" />
						<view class="stepper-btn" @tap="adjustDays(1)">
							<text class="stepper-btn__text">+</text>
						</view>
						<text class="daily-input__unit">天</text>
					</view>
				</view>

				<!-- 预估金额 -->
				<view class="pay-preview" v-if="dailyPay > 0">
					<text class="pay-preview__label">加班费</text>
					<text class="pay-preview__amount">¥ {{ dailyPay.toFixed(0) }}</text>
					<text class="pay-preview__detail">{{ dailyDays }}天 × ¥{{ projectDailyRate }}/天</text>
				</view>
			</template>

			<!-- ========== 计件模式 ========== -->
			<template v-if="effectivePayMode === 'piece'">
				<view class="piece-card">
					<view class="piece-card__header">
						<text class="piece-card__project">{{ selectedProject?.name || '计件项目' }}</text>
						<text class="piece-card__rate">¥{{ projectPieceRate }}/{{ selectedProject?.piece_unit || '件' }}</text>
					</view>

					<view class="piece-card__qty-row">
						<view class="piece-stepper" @tap="adjustQty(-10)">
							<text class="piece-stepper__text">−10</text>
						</view>
						<view class="piece-stepper" @tap="adjustQty(-1)">
							<text class="piece-stepper__text">−1</text>
						</view>
						<view class="piece-stepper piece-stepper--num">
							<text class="piece-stepper__num">{{ pieceQuantity }}</text>
							<text class="piece-stepper__unit">{{ selectedProject?.piece_unit || '件' }}</text>
						</view>
						<view class="piece-stepper piece-stepper--primary" @tap="adjustQty(1)">
							<text class="piece-stepper__text">+1</text>
						</view>
						<view class="piece-stepper piece-stepper--primary" @tap="adjustQty(10)">
							<text class="piece-stepper__text">+10</text>
						</view>
					</view>
				</view>

				<!-- 数量手动输入 -->
				<view class="piece-input">
					<text class="piece-input__label">数量</text>
					<input class="piece-input__field" type="number" v-model.number="pieceQuantity" min="0" />
					<text class="piece-input__unit">{{ selectedProject?.piece_unit || '件' }}</text>
				</view>

				<!-- 预估金额 -->
				<view class="pay-preview" v-if="piecePay > 0">
					<text class="pay-preview__label">加班费</text>
					<text class="pay-preview__amount">¥ {{ piecePay.toFixed(0) }}</text>
					<text class="pay-preview__detail">{{ pieceQuantity }}{{ selectedProject?.piece_unit || '件' }} × ¥{{ projectPieceRate }}/{{ selectedProject?.piece_unit || '件' }}</text>
				</view>
			</template>

			<!-- ========== 通用 ========== -->
			<!-- 补贴 -->
			<view class="subsidy-row" v-if="showSubsidyDeduction">
				<view class="subsidy-row__label">补贴</view>
				<view class="subsidy-row__btns">
					<view class="subsidy-btn" v-for="(s, idx) in subsidyList" :key="idx"
					:class="{ 'subsidy-btn--active': s.amount > 0 }"
					@tap="toggleSubsidy(s.key)">
						<text class="subsidy-btn__label">{{ s.label }}</text>
						<text class="subsidy-btn__value" v-if="s.amount > 0">{{ s.amount }}元</text>
					</view>
				</view>
			</view>

			<!-- 扣款 -->
			<view class="deduction-row" v-if="showSubsidyDeduction">
				<view class="deduction-row__row">
					<text class="deduction-row__label">扣款</text>
					<view class="deduction-row__input-wrap">
						<text class="deduction-row__prefix">¥</text>
						<input class="deduction-row__input" type="digit" v-model="deduction.amount" placeholder="0" @input="onDeductionInput" />
					</view>
				</view>
				<input class="deduction-row__note" type="text" v-model="deduction.note" placeholder="扣款原因（选填）" placeholder-style="color: var(--text-muted); font-size: 12px;" />
			</view>

			<!-- 净额 -->
			<view class="net-pay" v-if="totalSubsidies > 0 || deductionAmount > 0">
				<text class="net-pay__label">实付合计</text>
				<text class="net-pay__amount">¥ {{ netPay.toFixed(0) }}</text>
				<text class="net-pay__detail">加班费 ¥{{ basePay.toFixed(0) }} + 补贴 ¥{{ totalSubsidies.toFixed(0) }} - 扣款 ¥{{ deductionAmount.toFixed(0) }}</text>
			</view>

			<!-- 结算状态 -->
			<view class="settle-row">
				<text class="settle-row__label">结算状态</text>
				<view class="settle-row__right">
					<text class="settle-row__status" :class="{ 'settle-row__status--done': settled }">{{ settled ? '已结算' : '未结算' }}</text>
					<view class="settle-row__switch" :class="{ 'settle-row__switch--on': settled }" @tap="settled = !settled">
						<view class="settle-row__knob"></view>
					</view>
				</view>
			</view>

			<!-- 备注 -->
			<view class="remark-section">
				<textarea
					class="remark-section__input"
					v-model="remark"
					placeholder="备注（选填）"
					placeholder-style="color: var(--text-muted); font-size: 14px;"
				/>
				<text class="remark-section__toggle" @tap="showPhrases = !showPhrases">{{ showPhrases ? '收起' : '常用短语' }}</text>

				<view class="phrase-bar" v-show="showPhrases">
					<view
						v-for="(phrase, idx) in commonPhrases"
						:key="idx"
						class="phrase-bar__chip"
						@tap="remark = remark ? remark + phrase : phrase; showPhrases = false"
					>
						<text class="phrase-bar__chip-text">{{ phrase }}</text>
					</view>
				</view>
			</view>

			<!-- 底部操作 -->
			<view class="bottom-bar" v-show="pageReady">
				<view class="bottom-bar__inner">
					<view class="bottom-bar__save" :class="{ 'bottom-bar__save--disabled': saving }" @tap="!saving && handleSave()">
						<text class="bottom-bar__save-text">{{ saving ? '保存中...' : (editId ? '更新记录' : '保存记录') }}</text>
					</view>
					<view class="bottom-bar__delete" v-if="editId" @tap="handleDelete">
						<text class="bottom-bar__delete-text">删除此记录</text>
					</view>
				</view>
				<view class="bottom-bar__safe"></view>
			</view>

			<!-- 时薪设置弹窗 -->
			<view class="rate-sheet" v-if="showRateSheet" @tap="showRateSheet = false">
				<view class="rate-sheet__panel" @tap.stop>
					<text class="rate-sheet__title">这一小时加班费多少？</text>
					<text class="rate-sheet__desc">填一个数就行，其他类型会自动沿用</text>
					<view class="rate-sheet__input-row">
						<text class="rate-sheet__prefix">¥</text>
						<input
							class="rate-sheet__input"
							type="digit"
							v-model="quickRate"
							placeholder="30"
							focus
						/>
						<text class="rate-sheet__suffix">/ 小时</text>
					</view>
					<view class="rate-sheet__apply" v-if="quickRate > 0">
						<text class="rate-sheet__apply-text" v-if="overtimeType === 'weekday'">工作日加班 ¥{{ quickRate }}/h，周末 ¥{{ Math.round(quickRate * 1.5) }}/h，节假日 ¥{{ Math.round(quickRate * 3) }}/h</text>
						<text class="rate-sheet__apply-text" v-else>保存 ¥{{ quickRate }}/h 并应用到已有的加班记录</text>
					</view>
					<view class="rate-sheet__btns">
						<view class="rate-sheet__btn rate-sheet__btn--confirm" @tap="applyQuickRate">
							<text class="rate-sheet__btn-confirm-text">确认</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'
import { useSalaryStore } from '../../stores/salaryStore'
import { COMMON_PHRASES } from '../../utils/constants.js'
import { useProjectStore } from '../../stores/projectStore'
import { formatDate, calcDuration } from '../../utils/date.js'
import { getOvertimeType } from '../../utils/holidays.js'

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
			overtimeType: 'weekday',
			overtimeTypes: [
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
			// 日薪模式
			dailyDays: 1,
			// 计件模式
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
			if (parts.length === 3) {
				return `${parts[1]}月${parts[2]}日`
			}
			return this.pickerDate
		},
		selectedProject() {
			if (!this.selectedProjectId) return null
			const pStore = useProjectStore()
			return pStore.getProjectById(this.selectedProjectId)
		},
		effectivePayMode() {
			return this.selectedProject?.pay_mode || 'hourly'
		},
		overtimeTypeLabel() {
			const map = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return map[this.overtimeType] || '平日'
		},
		// ===== 时薪 =====
		duration() {
			return calcDuration(this.startTime, this.endTime)
		},
		formattedDuration() {
			return String(Math.round(this.duration * 100) / 100)
		},
		currentRate() {
			if (this.selectedProject) {
				const key = this.overtimeType + '_rate'
				const projectRate = this.selectedProject[key]
				if (projectRate && projectRate > 0) return projectRate
			}
			const store = useSalaryStore()
			return store.rateByType(this.overtimeType)
		},
		estimatedPay() {
			if (this.duration <= 0 || this.currentRate <= 0) return 0
			return this.duration * this.currentRate
		},
		// ===== 日薪 =====
		projectDailyRate() {
			return this.selectedProject?.daily_rate || 0
		},
		dailyPay() {
			return (this.dailyDays || 0) * this.projectDailyRate
		},
		monthDailyCount() {
			if (!this.pickerDate) return 0
			const store = useOvertimeStore()
			return store.records.filter(r =>
				r.date === this.pickerDate &&
				r.project_id === this.selectedProjectId &&
				(r.pay_mode === 'daily')
			).length
		},
		monthDailyPay() {
			if (!this.pickerDate) return 0
			const store = useOvertimeStore()
			return store.records.filter(r =>
				r.date === this.pickerDate &&
				r.project_id === this.selectedProjectId &&
				(r.pay_mode === 'daily')
			).reduce((s, r) => s + (r.pay || 0), 0)
		},
		// ===== 计件 =====
		projectPieceRate() {
			return this.selectedProject?.piece_rate || 0
		},
		piecePay() {
			return (this.pieceQuantity || 0) * this.projectPieceRate
		},
		// ===== 通用 =====
		showSubsidyDeduction() {
			if (this.effectivePayMode === 'hourly') return this.duration > 0
			return true
		},
		basePay() {
			return this.estimatedPay || this.dailyPay || this.piecePay || 0
		},
		subsidyList() {
			const s = this.subsidies
			return [
				{ key: "night_shift", label: "夜班", amount: s.night_shift || 0 },
				{ key: "meal", label: "餐补", amount: s.meal || 0 },
				{ key: "transport", label: "交通", amount: s.transport || 0 }
			]
		},
		totalSubsidies() {
			const s = this.subsidies
			return (s.night_shift || 0) + (s.meal || 0) + (s.transport || 0)
		},
		deductionAmount() {
			return this.deduction.amount || 0
		},
		netPay() {
			return this.basePay + this.totalSubsidies - this.deductionAmount
		},
	},
	onReady() {
		setTimeout(() => {
			this.pageReady = true
		}, 350)
	},
	onLoad(options) {
		if (options.date) {
			this.pickerDate = options.date
		}
		if (options.id) {
			this.editId = options.id
			const store = useOvertimeStore()
			const rec = store.records.find(r => r.id === options.id)
			if (rec) {
				this.pickerDate = rec.date
				this.startTime = rec.start_time
				this.endTime = rec.end_time
				this.pickerStartTime = rec.start_time
				this.pickerEndTime = rec.end_time
				this.overtimeType = rec.overtime_type
				this.remark = rec.remark || ''
				this.projectName = rec.project_name || ''
				this.selectedProjectId = rec.project_id || null
				this.subsidies = rec.subsidies || { night_shift: 0, meal: 0, transport: 0 }
				this.deduction = rec.deduction || { amount: 0, note: '' }
				this.settled = rec.settled || false
				// 日薪/计件编辑
				if (rec.pay_mode === 'daily') this.dailyDays = rec.days || 1
				if (rec.pay_mode === 'piece') this.pieceQuantity = rec.quantity || 0
			}
		} else {
			this.autoDetectType(this.pickerDate)
			this.loadProjectPicker()
		}
	},
	methods: {
		onDateChange(e) {
			this.pickerDate = e.detail.value
			this.autoDetectType(e.detail.value)
		},
		loadProjectPicker() {
			const pStore = useProjectStore()
			if (pStore.projects.length === 0) {
				pStore.loadProjects()
			}
		},
		autoDetectType(date) {
			this.overtimeType = getOvertimeType(date)
		},
		onStartChange(e) {
			this.startTime = e.detail.value
			this.pickerStartTime = e.detail.value
		},
		onEndChange(e) {
			this.endTime = e.detail.value
			this.pickerEndTime = e.detail.value
		},
		applyQuickHour(h) {
			const [hh, mm] = this.startTime.split(':').map(Number)
			const totalMinutes = hh * 60 + mm + Math.round(h * 60)
			const endH = Math.floor(totalMinutes / 60) % 24
			const endM = totalMinutes % 60
			this.endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
			this.pickerEndTime = this.endTime
			this.quickActive = h
		},
		// 日薪方法
t		addOneDay() {
				this.dailyDays = 1
			},
		adjustDays(delta) {
			const newVal = Math.max(0.5, (this.dailyDays || 1) + delta)
			this.dailyDays = newVal
		},
		// 计件方法
		adjustQty(delta) {
			const newVal = Math.max(0, (this.pieceQuantity || 0) + delta)
			this.pieceQuantity = newVal
		},
		// 通用
		toggleSubsidy(key) {
			const amounts = { night_shift: 20, meal: 15, transport: 10 }
			if (this.subsidies[key] > 0) {
				this.subsidies[key] = 0
			} else {
				this.subsidies[key] = amounts[key] || 20
			}
		},
		onDeductionInput() {
			const v = parseFloat(this.deduction.amount)
			if (v < 0) this.deduction.amount = 0
			if (this.deduction.amount !== undefined && this.deduction.amount.toString().length > 5) {
				this.deduction.amount = parseFloat(this.deduction.amount.toString().slice(0, 5))
			}
		},
		showProjectSelector() {
			const pStore = useProjectStore()
			pStore.loadProjects()
			setTimeout(() => {
				const items = [{ text: '无项目', value: null },
					...pStore.activeProjects.map(p => ({ text: p.name, value: p._id }))
				]
				uni.showActionSheet({
					itemList: items.map(i => i.text),
					success: (res) => {
						const selected = items[res.tapIndex]
						this.selectedProjectId = selected.value
						const proj = pStore.getProjectById(selected.value)
						if (proj) this.projectName = proj.name
						else this.projectName = ''
					}
				})
			}, 100)
		},
		handleDelete() {
			uni.showModal({
				title: '确认删除',
				content: '删除后无法恢复',
				confirmText: '删除',
				confirmColor: '#B85C4A',
				success: (res) => {
					if (res.confirm) {
						const store = useOvertimeStore()
						store.deleteRecord(this.editId)
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

			const store = useOvertimeStore()
			const payMode = this.effectivePayMode

			// 验证
			if (payMode === 'hourly') {
				if (this.duration <= 0) {
					uni.showToast({ title: '请设置起止时间', icon: 'none' })
					return
				}
				if (this.currentRate <= 0) {
					this.showRateSheet = true
					return
				}
			}
			if (payMode === 'daily' && (!this.dailyDays || this.dailyDays <= 0)) {
				uni.showToast({ title: '请输入天数', icon: 'none' })
				return
			}
			if (payMode === 'piece' && (!this.pieceQuantity || this.pieceQuantity <= 0)) {
				uni.showToast({ title: '请输入数量', icon: 'none' })
				return
			}

			this.saving = true

			// 构建基础数据
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

			// 按模式补充字段
			let pay = 0
			if (payMode === 'hourly') {
				Object.assign(baseData, {
					start_time: this.startTime,
					end_time: this.endTime,
					duration: this.duration,
					overtime_type: this.overtimeType,
					rate: this.currentRate,
					pay: this.estimatedPay
t				net_pay: this.netPay,
				})
				pay = this.estimatedPay
			} else if (payMode === 'daily') {
				const rate = this.projectDailyRate
				Object.assign(baseData, {
					start_time: '',
					end_time: '',
					duration: 0,
					overtime_type: getOvertimeType(this.pickerDate),
					rate: rate,
					days: this.dailyDays,
					daily_rate: rate,
					pay: this.dailyPay
t				net_pay: this.netPay,
				})
				pay = this.dailyPay
			} else if (payMode === 'piece') {
				const rate = this.projectPieceRate
				Object.assign(baseData, {
					start_time: '',
					end_time: '',
					duration: 0,
					overtime_type: getOvertimeType(this.pickerDate),
					rate: rate,
					quantity: this.pieceQuantity,
					piece_rate: rate,
					pay: this.piecePay
t				net_pay: this.netPay,
				})
				pay = this.piecePay
			}

			if (this.editId) {
				const updRes = await store.updateRecord(this.editId, baseData)
				if (updRes && updRes.duplicated) {
					uni.showToast({ title: '该时段已有记录', icon: 'warning' })
					this.saving = false
					return
				}
				uni.showToast({ title: '已更新', icon: 'success' })
			} else {
				const saveRes = await store.addRecord(baseData)
				if (saveRes.duplicated) {
					uni.showToast({ title: '该时段已有记录', icon: 'warning' })
					this.saving = false
					return
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

	&__content {
		padding: 0 16px;
		max-width: 640px;
		margin: 0 auto;
	}
}

/* 日期行 */
.field-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	margin-top: 16px;

	&__label {
		font-size: 16px;
		color: var(--text-primary);
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__value {
		font-size: 15px;
		color: var(--text-secondary);
	}

	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
		margin-left: 4px;
	}
}

/* 时间行 */
.time-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	margin-top: 12px;

	&__picker { flex: 1; }
	&__item { flex: 1; text-align: center; }
	&__label { font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 8px; }
	&__value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
	&__sep { padding: 0 16px; }
	&__sep-text { font-size: 16px; color: var(--text-muted); }
}

/* 时长 */
.duration-display {
	text-align: center;
	padding: 16px 0;
	margin-top: 12px;
	&__num { font-size: 36px; font-weight: 700; color: var(--primary); }
	&__unit { font-size: 16px; color: var(--text-muted); margin-left: 4px; }
}

/* 快捷时长 */
.quick-hours {
	display: flex;
	padding: 12px 0;
	gap: 8px;
}
.quick-hours__btn {
	flex: 1;
	height: 40px;
	border-radius: 8px;
	background: var(--surface-hover);
	display: flex;
	align-items: center;
	justify-content: center;
}
.quick-hours__btn--active { background: rgba(27, 138, 90, 0.15); }
.quick-hours__text { font-size: 15px; font-weight: 600; color: var(--text-secondary); }
.quick-hours__btn--active .quick-hours__text { color: var(--primary); }

/* 类型选择 */
.type-row {
	padding: 16px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	margin-top: 12px;
	&__label { font-size: 14px; color: var(--text-muted); margin-bottom: 10px; display: block; }
	&__options { display: flex; }
}

.type-tag {
	flex: 1;
	text-align: center;
	padding: 8px 0;
	border-radius: 8px;
	background: var(--surface);
	margin-right: 8px;
	&:last-child { margin-right: 0; }
	&--active { background: rgba(27, 138, 90, 0.1); }
	&__text { font-size: 14px; font-weight: 500; color: var(--text-muted); }
	.type-tag--active &__text { color: var(--primary); }
}

/* 预估金额（通用） */
.pay-preview {
	text-align: center;
	padding: 20px;
	margin-top: 12px;
	background: linear-gradient(135deg, #F7FFF9 0%, #E8F5ED 100%);
	border-radius: 12px;
	&--empty { background: #FFFBF0; }
	&__label { font-size: 13px; color: var(--text-muted); display: block; }
	&__amount { font-size: 32px; font-weight: 700; color: var(--primary); margin-top: 4px; display: block; }
	&__detail { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block; }
	&__tip { font-size: 14px; color: #E5A100; display: block; }
	&__action { font-size: 14px; color: var(--primary); margin-top: 8px; display: block; }
}

/* 项目标签 */
.project-tag {
	display: flex;
	align-items: center;
	padding: 4px 10px;
	border-radius: 12px;
	margin-right: 4px;
}
.project-tag__dot { width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
.project-tag__text { font-size: 13px; font-weight: 500; }

/* ===== 日薪模式 ===== */
.daily-card {
	margin-top: 12px;
	padding: 24px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	text-align: center;

	&__header {
		margin-bottom: 16px;
	}
	&__project {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
	}
	&__rate {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}
	&__btn {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: var(--primary);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		box-shadow: 0 4px 16px rgba(27, 138, 90, 0.3);
	}
	&__btn-icon {
		font-size: 32px;
	}
	&__btn-text {
		font-size: 14px;
		font-weight: 600;
		color: #FFFFFF;
		margin-top: 4px;
	}
	&__stats {
		margin-top: 16px;
	}
	&__stats-item {
		font-size: 13px;
		color: var(--text-muted);
		display: block;
		margin-top: 2px;
	}
}

.daily-input {
	margin-top: 12px;
	padding: 16px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	display: flex;
	align-items: center;
	justify-content: space-between;

	&__label {
		font-size: 15px;
		color: var(--text-primary);
	}
	&__right {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	&__field {
		width: 48px;
		text-align: center;
		font-size: 18px;
		font-weight: 700;
		color: var(--primary);
		border: none;
		background: var(--surface);
		border-radius: 6px;
		padding: 6px 0;
	}
	&__unit {
		font-size: 13px;
		color: var(--text-muted);
	}
}

.stepper-btn {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--surface-hover);
	display: flex;
	align-items: center;
	justify-content: center;
	&__text {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-secondary);
	}
}

/* ===== 计件模式 ===== */
.piece-card {
	margin-top: 12px;
	padding: 24px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);

	&__header {
		text-align: center;
		margin-bottom: 20px;
	}
	&__project {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
	}
	&__rate {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}
	&__qty-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}
}

.piece-stepper {
	width: 48px;
	height: 44px;
	border-radius: 8px;
	background: var(--surface-hover);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;

	&--num {
		width: 80px;
		background: transparent;
	}
	&--primary {
		background: var(--primary);
		.piece-stepper__text { color: #FFFFFF; }
	}
	&__text {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
	}
	&__num {
		font-size: 28px;
		font-weight: 700;
		color: var(--primary);
		line-height: 1;
	}
	&__unit {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 1px;
	}
}

.piece-input {
	margin-top: 12px;
	padding: 16px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;

	&__label {
		font-size: 14px;
		color: var(--text-secondary);
	}
	&__field {
		width: 60px;
		text-align: center;
		font-size: 20px;
		font-weight: 700;
		color: var(--primary);
		border: none;
		background: var(--surface);
		border-radius: 6px;
		padding: 6px 0;
	}
	&__unit {
		font-size: 14px;
		color: var(--text-muted);
	}
}

/* 补贴 */
.subsidy-row {
	margin-top: 12px;
	padding: 12px 16px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
}
.subsidy-row__label { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; display: block; }
.subsidy-row__btns { display: flex; gap: 8px; }
.subsidy-btn {
	flex: 1; height: 36px; border-radius: 8px; background: var(--surface-hover);
	display: flex; align-items: center; justify-content: center; flex-direction: column; line-height: 1.2;
}
.subsidy-btn--active { background: rgba(27, 138, 90, 0.1); }
.subsidy-btn__label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.subsidy-btn--active .subsidy-btn__label { color: var(--primary); }
.subsidy-btn__value { font-size: 10px; color: var(--primary); margin-top: 1px; }

/* 扣款 */
.deduction-row {
	margin-top: 12px; padding: 12px 16px; background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border);
}
.deduction-row__row { display: flex; align-items: center; justify-content: space-between; }
.deduction-row__label { font-size: 14px; color: var(--error); }
.deduction-row__input-wrap { display: flex; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 2px; }
.deduction-row__prefix { font-size: 14px; color: var(--text-muted); margin-right: 2px; }
.deduction-row__input { width: 60px; text-align: center; font-size: 16px; font-weight: 600; color: var(--error); background: transparent; border: none; padding: 2px 0; }
.deduction-row__note { width: 100%; border: none; background: transparent; font-size: 12px; color: var(--text-muted); margin-top: 6px; padding: 0; }

/* 净额 */
.net-pay {
	text-align: center; padding: 12px; margin-top: 12px;
	background: linear-gradient(135deg, #E8F5ED 0%, #E6FFF0 100%); border-radius: 12px;
}
.net-pay__label { font-size: 13px; color: var(--text-muted); display: block; }
.net-pay__amount { font-size: 28px; font-weight: 700; color: var(--primary); margin-top: 2px; display: block; }
.net-pay__detail { font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block; }

/* 结算 */
.settle-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 16px 20px; background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border); margin-top: 12px;
}
.settle-row__label { font-size: 15px; color: var(--text-primary); }
.settle-row__right { display: flex; align-items: center; }
.settle-row__status { font-size: 14px; color: var(--text-muted); margin-right: 8px; }
.settle-row__status--done { color: var(--primary); }
.settle-row__switch {
	width: 44px; height: 24px; border-radius: 12px; background: var(--border); position: relative; transition: background 0.2s;
}
.settle-row__switch--on { background: var(--primary); }
.settle-row__knob { width: 20px; height: 20px; border-radius: 50%; background: var(--surface-card); position: absolute; top: 2px; left: 2px; transition: left 0.2s; }
.settle-row__switch--on .settle-row__knob { left: 22px; }

/* 备注 */
.remark-section { margin-top: 12px; }
.remark-section__input {
	width: 100%; height: 80px; background: var(--surface-card); border-radius: 12px;
	padding: 14px 16px; font-size: 14px; color: var(--text-primary); border: 1px solid var(--border); box-sizing: border-box;
}
.remark-section__toggle { font-size: 12px; color: var(--primary); margin-top: 8px; display: inline-block; }

.phrase-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 50%; }
.phrase-bar__chip { padding: 4px 10px; border-radius: 4px; background: #E8F5ED; border: 1px solid #D4EDDA; }
.phrase-bar__chip:active { background: #C3E6CB; }
.phrase-bar__chip-text { font-size: 12px; color: var(--primary); }

/* 底部 */
.bottom-bar {
	position: fixed; bottom: 0; left: 0; right: 0;
	background: var(--surface-card); border-top: 1px solid var(--border); z-index: 100;
}
.bottom-bar__inner { max-width: 640px; margin: 0 auto; padding: 12px 16px; }
.bottom-bar__save {
	height: 48px; border-radius: 20px; background: var(--primary);
	display: flex; align-items: center; justify-content: center;
}
.bottom-bar__save--disabled { opacity: 0.5; pointer-events: none; }
.bottom-bar__save-text { font-size: 17px; font-weight: 600; color: #FFFFFF; }
.bottom-bar__delete { margin-top: 12px; height: 44px; border-radius: 20px; border: 1px solid var(--error); display: flex; align-items: center; justify-content: center; }
.bottom-bar__delete-text { font-size: 15px; color: var(--error); }
.bottom-bar__safe { height: constant(safe-area-inset-bottom); height: env(safe-area-inset-bottom); }

/* 时薪设置弹窗 */
.rate-sheet {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200;
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
</style>
