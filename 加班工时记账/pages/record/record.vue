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

			<!-- 加班类型 -->
			<view class="type-row">
				<text class="type-row__label">类型</text>
				<view class="type-row__options">
					<view
						v-for="(t, idx) in overtimeTypes"
						:key="idx"
						class="type-tag"
						:class="{ 'type-tag--active': overtimeType === t.value }"
						@tap="overtimeType = t.value"
					>
						<text class="type-tag__text">{{ t.label }}</text>
					</view>
				</view>
			</view>

			<!-- 项目名称 -->
			<view class="field-row">
				<text class="field-row__label">项目</text>
				<view class="field-row__right">
					<input class="project-input" type="text" v-model="projectName" placeholder="选填" placeholder-style="color: #CCCCCC; font-size: 14px;" />
				</view>
			</view>
			<!-- 预估金额 -->
			<view class="pay-preview" v-if="estimatedPay > 0">
				<text class="pay-preview__label">预估加班费</text>
				<text class="pay-preview__amount">¥ {{ estimatedPay.toFixed(0) }}</text>
				<text class="pay-preview__detail">{{ formattedDuration }}h × ¥{{ currentRate }}/h</text>
			</view>
			<view class="pay-preview pay-preview--empty" v-else-if="duration > 0">
				<text class="pay-preview__tip">暂未设置该类型的加班时薪</text>
				<text class="pay-preview__action" @tap="showRateSheet = true">点击设置 →</text>
			</view>

			<!-- 补贴 -->
			<view class="subsidy-row" v-if="duration > 0">
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
			<view class="deduction-row" v-if="duration > 0">
				<view class="deduction-row__row">
					<text class="deduction-row__label">扣款</text>
					<view class="deduction-row__input-wrap">
						<text class="deduction-row__prefix">¥</text>
						<input class="deduction-row__input" type="digit" v-model="deduction.amount" placeholder="0" @input="onDeductionInput" />
					</view>
				</view>
				<input class="deduction-row__note" type="text" v-model="deduction.note" placeholder="扣款原因（选填）" placeholder-style="color: #CCCCCC; font-size: 12px;" />
			</view>

			<!-- 净额 -->
			<view class="net-pay" v-if="totalSubsidies > 0 || deductionAmount > 0">
				<text class="net-pay__label">实付合计</text>
				<text class="net-pay__amount">¥ {{ netPay.toFixed(0) }}</text>
				<text class="net-pay__detail">加班费 ¥{{ estimatedPay.toFixed(0) }} + 补贴 ¥{{ totalSubsidies.toFixed(0) }} - 扣款 ¥{{ deductionAmount.toFixed(0) }}</text>
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
					placeholder-style="color: #CCCCCC; font-size: 14px;"
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

		<!-- 首次设置时薪弹窗 -->
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
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'
import { useSalaryStore } from '../../stores/salaryStore'
import { COMMON_PHRASES } from '../../utils/constants.js'
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
			deduction: { amount: 0, note: "" }
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
		duration() {
			return calcDuration(this.startTime, this.endTime)
		},
		formattedDuration() {
			const h = Math.floor(this.duration)
			const m = Math.round((this.duration - h) * 60)
			if (m === 0) return String(h)
			return `${h}.${String(m).padStart(2, '0')}`
		},
		currentRate() {
			const store = useSalaryStore()
			return store.rateByType(this.overtimeType)
		},
		estimatedPay() {
			if (this.duration <= 0 || this.currentRate <= 0) return 0
			return this.duration * this.currentRate
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
			return this.estimatedPay + this.totalSubsidies - this.deductionAmount
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
				this.subsidies = rec.subsidies || { night_shift: 0, meal: 0, transport: 0 }
				this.deduction = rec.deduction || { amount: 0, note: '' }
				this.settled = rec.settled || false
			}
		} else {
			this.autoDetectType(this.pickerDate)
		}
	},
	methods: {
		onDateChange(e) {
			this.pickerDate = e.detail.value
			this.autoDetectType(e.detail.value)
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
			
			handleDelete() {
				uni.showModal({
					title: '确认删除',
					content: '删除后无法恢复',
					confirmText: '删除',
					confirmColor: '#BA1A1A',
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
		asyn
		async handleSave() {
			if (this.saving) return
			if (this.duration <= 0) {
				uni.showToast({ title: '请设置起止时间', icon: 'none' })
				return
			}

			if (this.currentRate <= 0) {
				this.showRateSheet = true
				return
			}

			this.saving = true
			const store = useOvertimeStore()
			const data = {
				date: this.pickerDate,
				start_time: this.startTime,
				end_time: this.endTime,
				duration: this.duration,
				overtime_type: this.overtimeType,
				rate: this.currentRate,
				pay: this.estimatedPay,
				remark: this.remark,
				project_name: this.projectName,
				photos: [],
				settled: this.settled,
				subsidies: { ...this.subsidies },
				deduction: { ...this.deduction }
			}

			if (this.editId) {
				const updRes = await store.updateRecord(this.editId, data)
				if (updRes && updRes.duplicated) {
					uni.showToast({ title: '该时段已有记录', icon: 'warning' })
					this.saving = false
					return
				}
				uni.showToast({ title: '已更新', icon: 'success' })
			} else {
				const saveRes = await store.addRecord(data)
				if (saveRes.duplicated) {
					uni.showToast({ title: '该时段已有记录', icon: 'warning' })
					this.saving = false
					return
				}
				uni.showToast({ title: '已保存', icon: 'success' })
			}
			setTimeout(() => { uni.navigateBack() }, 500)
		}		}
	}
}
</script>

<style lang="scss" scoped>
.page-record {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

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
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-top: 16px;

	&__label {
		font-size: 16px;
		color: #1A1C1C;
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__value {
		font-size: 15px;
		color: #666666;
	}

	&__arrow {
		font-size: 18px;
		color: #CCCCCC;
		margin-left: 4px;
	}
}

/* 时间行 */
.time-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-top: 12px;

	&__picker {
		flex: 1;
	}

	&__item {
		flex: 1;
		text-align: center;
	}

	&__label {
		font-size: 13px;
		color: #999999;
		display: block;
		margin-bottom: 8px;
	}

	&__value {
		font-size: 28px;
		font-weight: 700;
		color: #1A1C1C;
	}

	&__sep {
		padding: 0 16px;
	}

	&__sep-text {
		font-size: 16px;
		color: #CCCCCC;
	}
}

/* 时长 */
.duration-display {
	text-align: center;
	padding: 16px 0;
	margin-top: 12px;

	&__num {
		font-size: 36px;
		font-weight: 700;
		color: #07C160;
	}

	&__unit {
		font-size: 16px;
		color: #999999;
		margin-left: 4px;
	}
}

/* 类型选择 */
.type-row {
	padding: 16px 20px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-top: 12px;

	&__label {
		font-size: 14px;
		color: #999999;
		margin-bottom: 10px;
		display: block;
	}

	&__options {
		display: flex;
	}
}

.type-tag {
	flex: 1;
	text-align: center;
	padding: 8px 0;
	border-radius: 8px;
	background: #F7F7F7;
	margin-right: 8px;

	&:last-child {
		margin-right: 0;
	}

	&--active {
		background: rgba(7, 193, 96, 0.1);
	}

	&__text {
		font-size: 14px;
		font-weight: 500;
		color: #999999;

		.type-tag--active & {
			color: #07C160;
		}
	}
}

/* 预估金额 */
.pay-preview {
	text-align: center;
	padding: 20px;
	margin-top: 12px;
	background: linear-gradient(135deg, #F7FFF9 0%, #F0FFF4 100%);
	border-radius: 12px;

	&--empty {
		background: #FFFBF0;
	}

	&__label {
		font-size: 13px;
		color: #999999;
		display: block;
	}

	&__amount {
		font-size: 32px;
		font-weight: 700;
		color: #07C160;
		margin-top: 4px;
		display: block;
	}

	&__detail {
		font-size: 12px;
		color: #999999;
		margin-top: 4px;
		display: block;
	}

	&__tip {
		font-size: 14px;
		color: #E5A100;
		display: block;
	}

	&__action {
		font-size: 14px;
		color: #07C160;
		margin-top: 8px;
		display: block;
	}
}

/* 备注 */
.remark-section {
	margin-top: 12px;

	&__input {
		width: 100%;
		height: 80px;
		background: #FFFFFF;
		border-radius: 12px;
		padding: 14px 16px;
		font-size: 14px;
		color: #1A1C1C;
		border: 1px solid #E5E5E5;
		box-sizing: border-box;
	}
}



/* 项目输入 */
.project-input {
	font-size: 15px;
	color: #666666;
	text-align: right;
	border: none;
	background: transparent;
	padding: 0;
	min-width: 120px;
}
/* 底部栏 */
.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #FFFFFF;
	border-top: 1px solid #E5E5E5;
	z-index: 100;

	&__inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	&__save {
		height: 48px;
		border-radius: 10px;
		background: #07C160;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__save--disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	&__save-text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}

	&__delete {
		margin-top: 12px;
		height: 44px;
		border-radius: 10px;
		border: 1px solid #BA1A1A;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__delete-text {
		font-size: 15px;
		color: #BA1A1A;
	}

	&__safe {
		height: constant(safe-area-inset-bottom);
		height: env(safe-area-inset-bottom);
	}
}

/* 时薪设置弹窗 */
.rate-sheet {
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

	&__panel {
		width: 100%;
		background: #FFFFFF;
		border-radius: 20px 20px 0 0;
		padding: 28px 24px 32px;
	}

	&__title {
		font-size: 20px;
		font-weight: 700;
		color: #1A1C1C;
		display: block;
	}

	&__desc {
		font-size: 13px;
		color: #999999;
		display: block;
		margin-top: 6px;
	}

	&__input-row {
		margin-top: 24px;
		display: flex;
		align-items: center;
		border-bottom: 2px solid #07C160;
		padding-bottom: 8px;
	}

	&__prefix {
		font-size: 24px;
		font-weight: 600;
		color: #1A1C1C;
		margin-right: 8px;
	}

	&__input {
		flex: 1;
		font-size: 36px;
		font-weight: 700;
		color: #07C160;
		background: transparent;
		border: none;
	}

	&__suffix {
		font-size: 15px;
		color: #999999;
	}

	&__apply {
		margin-top: 16px;
		padding: 10px 14px;
		background: #F7FFF9;
		border-radius: 8px;
	}

	&__apply-text {
		font-size: 12px;
		color: #07C160;
		line-height: 18px;
	}

	&__btns {
		margin-top: 24px;
	}

	&__btn {
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;

		&--confirm {
			background: #07C160;
		}
	}

	&__btn-confirm-text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}
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
	background: #F0F0F0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.quick-hours__btn--active {
	background: rgba(7, 193, 96, 0.15);
}
.quick-hours__text {
	font-size: 15px;
	font-weight: 600;
	color: #666666;
}
.quick-hours__btn--active .quick-hours__text {
	color: #07C160;
}

/* 常用短语 */
.phrase-bar {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 10px;
}
.phrase-bar__chip {
	padding: 4px 10px;
	border-radius: 12px;
	background: #F0FFF4;
	border: 1px solid #D4EDDA;
}
.phrase-bar__chip:active {
	background: #C3E6CB;
}
.phrase-bar__chip-text {
	font-size: 12px;
	color: #07C160;
}
.remark-section__toggle {
	font-size: 12px;
	color: #07C160;
	margin-top: 8px;
	display: inline-block;
}



/* 补贴按钮 */
.subsidy-row {
	margin-top: 12px;
	padding: 12px 16px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
}
.subsidy-row__label {
	font-size: 13px;
	color: #999999;
	margin-bottom: 8px;
	display: block;
}
.subsidy-row__btns {
	display: flex;
	gap: 8px;
}
.subsidy-btn {
	flex: 1;
	height: 36px;
	border-radius: 8px;
	background: #F0F0F0;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	line-height: 1.2;
}
.subsidy-btn--active {
	background: rgba(7, 193, 96, 0.1);
}
.subsidy-btn__label {
	font-size: 13px;
	font-weight: 500;
	color: #666666;
}
.subsidy-btn--active .subsidy-btn__label {
	color: #07C160;
}
.subsidy-btn__value {
	font-size: 10px;
	color: #07C160;
	margin-top: 1px;
}

/* 扣款 */
.deduction-row {
	margin-top: 12px;
	padding: 12px 16px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
}
.deduction-row__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.deduction-row__label {
	font-size: 14px;
	color: #BA1A1A;
}
.deduction-row__input-wrap {
	display: flex;
	align-items: center;
	border-bottom: 1px solid #E5E5E5;
	padding-bottom: 2px;
}
.deduction-row__prefix {
	font-size: 14px;
	color: #999999;
	margin-right: 2px;
}
.deduction-row__input {
	width: 60px;
	text-align: center;
	font-size: 16px;
	font-weight: 600;
	color: #BA1A1A;
	background: transparent;
	border: none;
	padding: 2px 0;
}
.deduction-row__note {
	width: 100%;
	border: none;
	background: transparent;
	font-size: 12px;
	color: #999999;
	margin-top: 6px;
	padding: 0;
}

/* 净额 */
.net-pay {
	text-align: center;
	padding: 12px;
	margin-top: 12px;
	background: linear-gradient(135deg, #F0FFF4 0%, #E6FFF0 100%);
	border-radius: 12px;
}
.net-pay__label {
	font-size: 13px;
	color: #999999;
	display: block;
}
.net-pay__amount {
	font-size: 28px;
	font-weight: 700;
	color: #07C160;
	margin-top: 2px;
	display: block;
}
.net-pay__detail {
	font-size: 11px;
	color: #999999;
	margin-top: 4px;
	display: block;
}
/* 结算状态 */
.settle-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-top: 12px;
}
.settle-row__label {
	font-size: 15px;
	color: #1A1C1C;
}
.settle-row__right {
	display: flex;
	align-items: center;
}
.settle-row__status {
	font-size: 14px;
	color: #999999;
	margin-right: 8px;
}
.settle-row__status--done {
	color: #07C160;
}
.settle-row__switch {
	width: 44px;
	height: 24px;
	border-radius: 12px;
	background: #DDDDDD;
	position: relative;
	transition: background 0.2s;
}
.settle-row__switch--on {
	background: #07C160;
}
.settle-row__knob {
	width: 20px;
	height: 20px;
	border-radius: 10px;
	background: #FFFFFF;
	position: absolute;
	top: 2px;
	left: 2px;
	transition: left 0.2s;
}
.settle-row__switch--on .settle-row__knob {
	left: 22px;
}
</style>
