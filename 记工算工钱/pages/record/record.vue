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

<!-- 工作行 -->
			<view class="project-row" :class="{ 'project-row--empty': !selectedProject }" @tap="showProjectSelector">
				<view class="project-row__left" v-if="selectedProject">
					<view class="project-row__dot" :style="{ background: selectedProject.color }"></view>
					<text class="project-row__name">{{ selectedProject.name }}</text>
				</view>
				<view class="project-row__placeholder" v-else><text>请先设置工作 </text><text style="color: #E5A100;">*</text></view>
				<view class="project-row__right">
					<text class="project-row__mode">{{ payModeIcon }} {{ payModeLabel }}</text>
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
				<view class="pay-card" v-if="netPay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ netPay.toFixed(0) }}</text>
					<text class="pay-card__detail">{{ payFormula }}</text>
					<text class="pay-card__detail pay-card__detail--sub" v-if="totalSubsidies > 0 || deductionAmount > 0">{{ netPayDetail }}</text>
				</view>
				<view class="pay-card pay-card--warn" v-else-if="duration > 0" @tap="goEditProject">
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
								<input class="subsidy-row__input" type="digit" v-model="subsidies.night_shift" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">餐补</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="subsidies.meal" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">交通补贴</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="subsidies.transport" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-divider"></view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">扣款金额</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="deduction.amount" placeholder="0" />
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



				<!-- 工钱 -->
				<view class="pay-card" v-if="netPay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ netPay.toFixed(0) }}</text>
					<text class="pay-card__detail pay-card__detail--sub" v-if="totalSubsidies > 0 || deductionAmount > 0">{{ netPayDetail }}</text>
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
								<input class="subsidy-row__input" type="digit" v-model="subsidies.night_shift" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">餐补</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="subsidies.meal" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">交通补贴</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="subsidies.transport" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-divider"></view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">扣款金额</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="deduction.amount" placeholder="0" />
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
				<view class="pay-card" v-if="netPay > 0">
					<text class="pay-card__label">工钱</text>
					<text class="pay-card__amount">¥{{ netPay.toFixed(0) }}</text>
					<text class="pay-card__detail pay-card__detail--sub" v-if="totalSubsidies > 0 || deductionAmount > 0">{{ netPayDetail }}</text>
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
								<input class="subsidy-row__input" type="digit" v-model="subsidies.night_shift" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">餐补</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="subsidies.meal" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">交通补贴</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="subsidies.transport" placeholder="0" />
							</view>
						</view>
						<view class="subsidy-divider"></view>
						<view class="subsidy-row">
							<text class="subsidy-row__label">扣款金额</text>
							<view class="subsidy-row__input-wrap">
								<text class="subsidy-row__prefix">¥</text>
								<input class="subsidy-row__input" type="digit" v-model="deduction.amount" placeholder="0" />
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
					:data-id="p._id" @tap="onPickWork"
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
import { COMMON_PHRASES } from '../../utils/constants.js'
import { useProjectStore } from '../../stores/projectStore'
import { formatDate, calcDuration } from '../../utils/date.js'
import { useHolidayStore } from '@/stores/holidayStore'
import { round2, getPayFormula } from '@/utils/calculator'
import { requireAuth } from '@/utils/auth'

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
			quickHours: [0.5, 1, 1.5, 2, 3],
			quickActive: null,
			showPhrases: false,
			commonPhrases: COMMON_PHRASES,
			settled: false,
			subsidies: { night_shift: 0, meal: 0, transport: 0 },
			deduction: { amount: 0, note: "" },
			showSubsidy: false,
			showWorkPicker: false,
			dailyDays: 1,
			pieceQuantity: 0
		}
	},
	computed: {
		hasProjects() {
			const pStore = useProjectStore()
			return pStore.activeProjects.length > 0
		},
		pickerProjects() {
			return useProjectStore().activeProjects
		},
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
			return this.selectedProject?.pay_mode || 'hourly'
		},
		payModeIcon() {
			const icons = { hourly: '⏱', daily: '📅', piece: '📦' }
			if (!this.selectedProjectId) return ''; return icons[this.effectivePayMode] || '⏱'
		},
		payModeLabel() {
			const labels = { hourly: '时薪', daily: '日薪', piece: '计件' }; if (!this.selectedProjectId) return ''
			const p = this.selectedProject
			const mode = this.effectivePayMode
			if (mode === 'daily') { const wd = p?.daily_weekday_rate || p?.daily_rate || 0; const we = p?.daily_weekend_rate || 0; const hd = p?.daily_holiday_rate || 0; return `日薪 平¥${wd} 休¥${we} 节¥${hd}/天` }
			if (mode === 'piece') { const wd = p?.piece_weekday_rate || p?.piece_rate || 0; const we = p?.piece_weekend_rate || 0; const hd = p?.piece_holiday_rate || 0; return `计件 平¥${wd} 休¥${we} 节¥${hd}/${p?.piece_unit || '件'}` }
			return `平¥${p?.weekday_rate || 0} 休¥${p?.weekend_rate || 0} 节¥${p?.holiday_rate || 0}`
		},
		dayTypeLabel() {
			const map = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return map[this.dayType] || '平日'
		},
		// 时薪
		duration() { return calcDuration(this.startTime, this.endTime) },
		formattedDuration() { return String(Math.round(this.duration * 100) / 100) },
		currentRate() {
			if (!this.selectedProject) return 0
			const t = this.dayType
			const mode = this.effectivePayMode
			let key
			if (mode === 'daily') key = 'daily_' + t + '_rate'
			else if (mode === 'piece') key = 'piece_' + t + '_rate'
			else key = t + '_rate'
			const pr = this.selectedProject[key]
			if (pr > 0) return pr
			const fb = mode === 'daily' ? this.selectedProject.daily_rate : mode === 'piece' ? this.selectedProject.piece_rate : 0
			return fb || 0
		},
		rateSourceLabel() {
			if (this.selectedProject) {
				const key = this.dayType + '_rate'
				if (this.selectedProject[key] > 0) return this.selectedProject.name
			}
			return this.selectedProject ? this.selectedProject.name : '未设置'
		},
		estimatedPay() {
			if (this.duration <= 0 || this.currentRate <= 0) return 0
			return round2(this.duration * this.currentRate)
		},
		// 公式显示
		payFormula() {
			if (this.effectivePayMode !== 'hourly' || this.duration <= 0) return ''
			const rec = { duration: this.duration, pay_mode: 'hourly', day_type: this.dayType, rate: this.currentRate }
			const project = this.selectedProject
			return getPayFormula(rec, project)
		},
		// 日薪
		projectDailyRate() {
			if (!this.selectedProject) return 0
			return this.currentRate || 0
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
			if (!this.selectedProject) return 0
			return this.currentRate || 0
		},
		piecePay() { return round2((this.pieceQuantity || 0) * this.projectPieceRate) },
		// 通用
		basePay() { return this.estimatedPay || this.dailyPay || this.piecePay || 0 },
		totalSubsidies() { return Number(this.subsidies.night_shift || 0) + Number(this.subsidies.meal || 0) + Number(this.subsidies.transport || 0) },
		deductionAmount() { return Number(this.deduction.amount) || 0 },
		netPay() { return this.basePay + this.totalSubsidies - this.deductionAmount },
		netPayDetail() {
			const parts = []
			if (this.totalSubsidies > 0) parts.push('+ ¥' + this.totalSubsidies + ' 补贴')
			if (this.deductionAmount > 0) parts.push('- ¥' + this.deductionAmount + ' 扣款')
			return parts.join('  ')
		}
	},
		watch: {
			selectedProject(val) {
				if (!val && this.selectedProjectId) {
					this.autoSelectProject()
				}
			}
		},
	onReady() { setTimeout(() => { this.pageReady = true }, 350) },
	async onShow() {
		await this.loadProjectPicker()
		this.$nextTick(() => {
			if (!this.selectedProjectId || !this.selectedProject) this.autoSelectProject()
		})
	},
	async onLoad(options) {
		if (options.date) this.pickerDate = options.date
		await this.loadProjectPicker()
		this.$nextTick(() => {
			this.autoSelectProject()
		})
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
		goCreateProject() {
			uni.navigateTo({ url: '/pages/project-edit/project-edit' })
		},
		autoSelectProject() {
			const pStore = useProjectStore()
			const wStore = useWorkStore()
			const activeProjects = pStore.activeProjects
			if (activeProjects.length === 0) return
			// 1. 优先选最近记工记录用过的工作
			const sortedRecords = [...wStore.records].sort((a, b) => {
				const da = a.date || '', db = b.date || ''
				if (da !== db) return db.localeCompare(da)
				return (b.created_at || 0) - (a.created_at || 0)
			})
			const lastUsedId = sortedRecords[0]?.project_id
			if (lastUsedId && activeProjects.some(p => p._id === lastUsedId)) {
				this.selectedProjectId = lastUsedId
				const proj = pStore.getProjectById(lastUsedId)
				this.projectName = proj ? proj.name : ''
				return
			}
			// 2. 否则选第一个工作（最近创建的排前面）
			const first = activeProjects[0]
			if (first) {
				this.selectedProjectId = first._id
				this.projectName = first.name
			}
		},
		async loadProjectPicker() {
			await useProjectStore().loadProjects()
		},
		autoDetectType(date) { this.dayType = useHolidayStore().getDayType(date) },
		onStartChange(e) { this.startTime = e.detail.value; this.pickerStartTime = e.detail.value; this._syncQuickHour() },
		onEndChange(e) { this.endTime = e.detail.value; this.pickerEndTime = e.detail.value; this._syncQuickHour() },
		applyQuickHour(h) {
			const [hh, mm] = this.startTime.split(':').map(Number)
			const totalMinutes = hh * 60 + mm + Math.round(h * 60)
			const endH = Math.floor(totalMinutes / 60) % 24
			const endM = totalMinutes % 60
			this.endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
			this.pickerEndTime = this.endTime
			this.quickActive = h
		},
		_syncQuickHour() {
			const dur = this.duration
			if (dur <= 0) { this.quickActive = null; return }
			const closest = this.quickHours.reduce((prev, curr) =>
				Math.abs(curr - dur) < Math.abs(prev - dur) ? curr : prev
			)
			this.quickActive = closest
		},
		addOneDay() { this.dailyDays = 1 },
		adjustQty(delta) { this.pieceQuantity = Math.max(0, (this.pieceQuantity || 0) + delta) },
		showProjectSelector() {
			const pStore = useProjectStore()
			if (pStore.activeProjects.length === 0) {
				this.goCreateProject(); return
			}
			this.showWorkPicker = true
		},
		onPickWork(e) {
			const id = e.currentTarget.dataset.id
			this.selectedProjectId = id
			const proj = id ? useProjectStore().getProjectById(id) : null
			this.projectName = proj ? proj.name : ''
			this.showWorkPicker = false
		},
		rateSummary(p) {
			if (!p) return ''
			if (p.pay_mode === 'daily') return '日薪 平¥' + (p.daily_weekday_rate || p.daily_rate || 0) + ' 休¥' + (p.daily_weekend_rate || 0) + ' 节¥' + (p.daily_holiday_rate || 0) + '/天'
			if (p.pay_mode === 'piece') return '计件 平¥' + (p.piece_weekday_rate || p.piece_rate || 0) + ' 休¥' + (p.piece_weekend_rate || 0) + ' 节¥' + (p.piece_holiday_rate || 0) + '/' + (p.piece_unit || '件')
			return '平¥' + (p.weekday_rate || 0) + ' 休¥' + (p.weekend_rate || 0) + ' 节¥' + (p.holiday_rate || 0)
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
		goEditProject() {
				if (!this.selectedProjectId) {
					uni.navigateTo({ url: '/pages/project-edit/project-edit' })
					return
				}
				uni.navigateTo({ url: '/pages/project-edit/project-edit?id=' + this.selectedProjectId })
			},
		async handleSave() {
			if (this.saving) return
			const store = useWorkStore()
			const payMode = this.effectivePayMode

			if (!this.selectedProjectId) {
				this.saving = false
				if (!this.hasProjects) { uni.navigateTo({ url: '/pages/project-edit/project-edit' }); return }
				this.showProjectSelector(); return
			}
			if (payMode === 'hourly') {
				if (this.duration <= 0) { uni.showToast({ title: '请设置起止时间', icon: 'none' }); return }
				if (this.currentRate <= 0) { this.goEditProject(); return }
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

			if (!requireAuth()) { this.saving = false; return }

			this.saving = true

			const baseData = {
				date: this.pickerDate,
				pay_mode: payMode,
				remark: this.remark,
				project_name: this.projectName,
				project_id: this.selectedProjectId,
				photos: [],
				settled: this.settled,
				subsidies: { night_shift: Number(this.subsidies.night_shift) || 0, meal: Number(this.subsidies.meal) || 0, transport: Number(this.subsidies.transport) || 0 },
				deduction: { amount: Number(this.deduction.amount) || 0, note: this.deduction.note }
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
					rate, days: 1, daily_rate: rate,
					pay: this.dailyPay, net_pay: this.netPay
				})
			} else if (payMode === 'piece') {
				const rate = this.projectPieceRate
				Object.assign(baseData, {
					start_time: '', end_time: '', duration: 0,
					day_type: useHolidayStore().getDayType(this.pickerDate),
					rate, quantity: this.pieceQuantity, piece_rate: rate,
					piece_unit: this.selectedProject?.piece_unit || '件',
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
				if (saveRes && saveRes.duplicated) {
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

	&__label { font-size: 16px; color: var(--text-primary); font-weight: 500; }
	&__right { display: flex; align-items: center; }
	&__value { font-size: 14px; color: var(--text-secondary); }
	&__arrow { font-size: 18px; color: var(--text-muted); margin-left: 4px; }
}

/* ===== 公共：工作行 ===== */
.project-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 12px 14px; background: var(--surface); border-radius: 8px;
	margin-top: 12px;

	&__left { display: flex; align-items: center; gap: 8px; }
	&__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
	&__name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
	&__placeholder { font-size: 15px; color: var(--text-muted); }
	&__right { display: flex; align-items: center; }
	&__mode { font-size: 12px; color: var(--text-muted); margin-right: 4px; }
	&__arrow { font-size: 16px; color: var(--text-muted); }
t	&--empty { border: 1px solid #E5A100; background: #FFFBF0; }
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

	&__label { font-size: 14px; color: var(--text-secondary); }
	&__amount { font-size: 20px; font-weight: 700; color: var(--primary); font-family: var(--font-number); }
	&__detail { font-size: 12px; color: var(--text-muted); &--sub { color: var(--primary); margin-top: 2px; } }
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
</style>
