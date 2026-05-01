<template>
	<view class="page-salary">
		<NavBar title="加班费设置" :showBack="true" />

		<view class="page-salary__content">
			<!-- 说明 -->
			<view class="page-salary__intro">
				<text class="page-salary__intro-text">设置每小时的加班费，按你实际拿到的填就行。</text>
			</view>

			<!-- 三个时薪输入 -->
			<view class="rate-inputs">
				<view class="rate-input">
					<view class="rate-input__left">
						<text class="rate-input__type">平日加班</text>
						<text class="rate-input__hint">工作日下班后</text>
					</view>
					<view class="rate-input__right">
						<text class="rate-input__prefix">¥</text>
						<input
							class="rate-input__field"
							type="digit"
							v-model="weekdayRate"
							placeholder="0"
						/>
						<text class="rate-input__suffix">/ 小时</text>
					</view>
				</view>
				<view class="rate-input">
					<view class="rate-input__left">
						<text class="rate-input__type">周末加班</text>
						<text class="rate-input__hint">周六日全天</text>
					</view>
					<view class="rate-input__right">
						<text class="rate-input__prefix">¥</text>
						<input
							class="rate-input__field"
							type="digit"
							v-model="weekendRate"
							placeholder="0"
						/>
						<text class="rate-input__suffix">/ 小时</text>
					</view>
				</view>
				<view class="rate-input rate-input--last">
					<view class="rate-input__left">
						<text class="rate-input__type">节假日加班</text>
						<text class="rate-input__hint">元旦/春节/国庆等</text>
					</view>
					<view class="rate-input__right">
						<text class="rate-input__prefix">¥</text>
						<input
							class="rate-input__field"
							type="digit"
							v-model="holidayRate"
							placeholder="0"
						/>
						<text class="rate-input__suffix">/ 小时</text>
					</view>
				</view>
			</view>

			<!-- 月薪换算工具 -->
			<view class="helper-card">
				<view class="helper-card__header" @tap="showHelper = !showHelper">
					<view class="helper-card__header-left">
						<text class="helper-card__icon">&#x1F4A1;</text>
						<text class="helper-card__title">不确定时薪？用月薪帮你算</text>
					</view>
					<text class="helper-card__arrow" :class="{ 'helper-card__arrow--open': showHelper }">&#x203A;</text>
				</view>
				<view class="helper-card__body" v-show="showHelper">
					<view class="helper-card__input-row">
						<text class="helper-card__prefix">¥</text>
						<input
							class="helper-card__input"
							type="digit"
							v-model="helperSalary"
							placeholder="输入月薪"
							@input="onHelperInput"
						/>
					</view>
					<view class="helper-card__result" v-if="helperSalary > 0">
						<text class="helper-card__result-label">按劳动法标准（月计薪 21.75 天）</text>
						<view class="helper-card__rates">
							<view class="helper-card__rate-item">
								<text class="helper-card__rate-type">平日 × 1.5</text>
								<text class="helper-card__rate-val">¥ {{ helperWeekday.toFixed(0) }}/h</text>
							</view>
							<view class="helper-card__rate-item">
								<text class="helper-card__rate-type">周末 × 2.0</text>
								<text class="helper-card__rate-val">¥ {{ helperWeekend.toFixed(0) }}/h</text>
							</view>
							<view class="helper-card__rate-item">
								<text class="helper-card__rate-type">节假日 × 3.0</text>
								<text class="helper-card__rate-val">¥ {{ helperHoliday.toFixed(0) }}/h</text>
							</view>
						</view>
						<view class="helper-card__apply" @tap="applyHelper">
							<text class="helper-card__apply-text">一键填入上方</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 精度 -->
			<view class="precision-row" @tap="showPrecision = !showPrecision">
				<text class="precision-row__label">结算精度</text>
				<view class="precision-row__right">
					<text class="precision-row__value">{{ precisionOptions[precisionIndex].label }}</text>
					<text class="precision-row__arrow">&#x203A;</text>
				</view>
			</view>
			<view class="precision-detail" v-if="showPrecision">
				<view
					v-for="(opt, idx) in precisionOptions"
					:key="idx"
					class="precision-opt"
					:class="{ 'precision-opt--active': precisionIndex === idx }"
					@tap="precisionIndex = idx; showPrecision = false"
				>
					<text class="precision-opt__label">{{ opt.label }}</text>
					<text class="precision-opt__eg">{{ opt.example }}</text>
				</view>
			</view>

			<!-- 法律说明 -->
			<view class="legal-note">
				<text class="legal-note__icon">&#x26A0;</text>
				<text class="legal-note__text">以上月薪换算依据《劳动法》第四十四条及劳社部发[2008]3号文件。本工具仅为加班费计算参考，不构成法律建议。</text>
			</view>

			<view class="page-salary__spacer"></view>
		</view>

		<!-- 保存 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__save" @tap="handleSave">
					<text class="bottom-bar__save-text">保存</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useSalaryStore } from '../../stores/salaryStore'
import { useOvertimeStore } from '../../stores/overtimeStore'

const LEGAL_DAYS = 21.75
const LEGAL_HOURS = 8

export default {
	components: { NavBar },
	data() {
		return {
			weekdayRate: '',
			weekendRate: '',
			holidayRate: '',
			precisionOptions: [
				{ label: '按 15 分钟', example: '1h10m → 1h15m' },
				{ label: '按半小时', example: '1h10m → 1h30m' },
				{ label: '按 1 小时', example: '1h10m → 2h' },
				{ label: '精确到分钟', example: '1h10m → 1h10m' }
			],
			precisionIndex: 0,
			showPrecision: false,
			showHelper: false,
			helperSalary: ''
		}
	},
	computed: {
		helperHourly() {
			const s = parseFloat(this.helperSalary) || 0
			if (s <= 0) return 0
			return s / LEGAL_DAYS / LEGAL_HOURS
		},
		helperWeekday() {
			return this.helperHourly * 1.5
		},
		helperWeekend() {
			return this.helperHourly * 2.0
		},
		helperHoliday() {
			return this.helperHourly * 3.0
		}
	},
	onShow() {
		this.loadConfig()
	},
	methods: {
		onHelperInput() {
			if (this.helperSalary.length > 6) {
				this.helperSalary = this.helperSalary.slice(0, 6)
			}
		},
		async loadConfig() {
			const store = useSalaryStore()
			await store.loadConfig()
			const cfg = store.config
			if (cfg.weekday_rate > 0) this.weekdayRate = String(cfg.weekday_rate)
			if (cfg.weekend_rate > 0) this.weekendRate = String(cfg.weekend_rate)
			if (cfg.holiday_rate > 0) this.holidayRate = String(cfg.holiday_rate)
			const precMap = { '15min': 0, '30min': 1, '60min': 2, 'exact': 3 }
			this.precisionIndex = precMap[cfg.precision] !== undefined ? precMap[cfg.precision] : 0
		},
		applyHelper() {
			this.weekdayRate = String(Math.round(this.helperWeekday))
			this.weekendRate = String(Math.round(this.helperWeekend))
			this.holidayRate = String(Math.round(this.helperHoliday))
		},
		async handleSave() {
			const store = useSalaryStore()
			const precValues = ['15min', '30min', '60min', 'exact']
			await store.updateConfig({
				weekday_rate: parseInt(this.weekdayRate) || 0,
				weekend_rate: parseInt(this.weekendRate) || 0,
				holiday_rate: parseInt(this.holidayRate) || 0,
				precision: precValues[this.precisionIndex]
			})

			uni.showToast({ title: '已保存', icon: 'success' })

			const now = new Date()
			uni.showModal({
				title: '应用到已有记录',
				content: `是否用新费率重算 ${now.getFullYear()}年${now.getMonth() + 1}月 的加班费？`,
				confirmText: '重算',
				success: async (res) => {
					if (res.confirm) {
						uni.showLoading({ title: '重算中...' })
						try {
							const token = uni.getStorageSync('uni_id_token')
							const calcRes = await uniCloud.callFunction({
								name: 'overtime-calc',
								data: {
									action: 'recalc',
									token,
									year: now.getFullYear(),
									month: now.getMonth() + 1
								}
							})
							uni.hideLoading()
							if (calcRes.result && calcRes.result.code === 0) {
								const n = calcRes.result.data.updated
								uni.showToast({ title: `已更新 ${n} 条记录`, icon: 'success' })
								const overtimeStore = useOvertimeStore()
								await overtimeStore.loadRecords()
							} else {
								uni.showToast({ title: calcRes.result?.message || '重算失败', icon: 'none' })
							}
						} catch (e) {
							uni.hideLoading()
							uni.showToast({ title: '网络错误', icon: 'none' })
						}
					}
					setTimeout(() => { uni.navigateBack() }, 300)
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-salary {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

	&__content {
		padding: 0 16px;
		max-width: 640px;
		margin: 0 auto;
	}

	&__intro {
		padding: 16px 0 12px;
	}

	&__intro-text {
		font-size: 14px;
		color: #999999;
		line-height: 20px;
	}

	&__spacer {
		height: 100px;
	}
}

/* 时薪输入 */
.rate-inputs {
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	overflow: hidden;
	margin-bottom: 16px;
}

.rate-input {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid #F3F3F3;

	&--last {
		border-bottom: none;
	}

	&__left {
		display: flex;
		flex-direction: column;
	}

	&__type {
		font-size: 16px;
		font-weight: 500;
		color: #1A1C1C;
	}

	&__hint {
		font-size: 12px;
		color: #999999;
		margin-top: 2px;
	}

	&__right {
		display: flex;
		align-items: baseline;
	}

	&__prefix {
		font-size: 15px;
		color: #999999;
	}

	&__field {
		width: 80px;
		text-align: center;
		font-size: 24px;
		font-weight: 700;
		color: #07C160;
		background: transparent;
		border: none;
		border-bottom: 2px solid #07C160;
		margin: 0 4px;
		padding: 4px 0;
	}

	&__suffix {
		font-size: 13px;
		color: #999999;
	}
}

/* 月薪换算 */
.helper-card {
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-bottom: 16px;
	overflow: hidden;

	&__header {
		padding: 14px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	&__header-left {
		display: flex;
		align-items: center;
	}

	&__icon {
		font-size: 16px;
		margin-right: 6px;
	}

	&__title {
		font-size: 14px;
		color: #666666;
	}

	&__arrow {
		font-size: 16px;
		color: #CCCCCC;
	}

	&__arrow--open {
		transform: rotate(90deg);
	}

	&__body {
		padding: 0 20px 20px;
		border-top: 1px solid #F3F3F3;
		padding-top: 16px;
	}

	&__input-row {
		display: flex;
		align-items: center;
		border-bottom: 2px solid #E5E5E5;
		padding-bottom: 8px;
	}

	&__prefix {
		font-size: 20px;
		font-weight: 600;
		color: #1A1C1C;
		margin-right: 8px;
	}

	&__input {
		flex: 1;
		font-size: 20px;
		font-weight: 600;
		color: #1A1C1C;
		background: transparent;
		border: none;
	}

	&__result {
		margin-top: 16px;
		padding: 14px;
		background: #F7FFF9;
		border-radius: 8px;
	}

	&__result-label {
		font-size: 12px;
		color: #07C160;
	}

	&__rates {
		margin-top: 10px;
	}

	&__rate-item {
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
	}

	&__rate-type {
		font-size: 14px;
		color: #666666;
	}

	&__rate-val {
		font-size: 14px;
		font-weight: 600;
		color: #1A1C1C;
	}

	&__apply {
		margin-top: 12px;
		height: 36px;
		border-radius: 18px;
		background: #07C160;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__apply-text {
		font-size: 13px;
		font-weight: 500;
		color: #FFFFFF;
	}
}

/* 精度 */
.precision-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;
	margin-bottom: 12px;

	&__label {
		font-size: 15px;
		color: #1A1C1C;
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__value {
		font-size: 14px;
		color: #999999;
	}

	&__arrow {
		font-size: 16px;
		color: #CCCCCC;
		margin-left: 4px;
	}
}

.precision-detail {
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	padding: 8px;
	margin-bottom: 16px;
	display: flex;
	flex-wrap: wrap;
}

.precision-opt {
	width: calc(50% - 8px);
	margin: 4px;
	padding: 10px 12px;
	border-radius: 8px;
	text-align: center;

	&--active {
		background: rgba(7, 193, 96, 0.06);
	}

	&__label {
		font-size: 14px;
		font-weight: 500;
		color: #1A1C1C;
		display: block;
	}

	&__eg {
		font-size: 11px;
		color: #999999;
		display: block;
		margin-top: 2px;
	}
}

/* 法律说明 */
.legal-note {
	display: flex;
	padding: 0 0 24px;

	&__icon {
		font-size: 13px;
		margin-right: 4px;
		flex-shrink: 0;
	}

	&__text {
		font-size: 11px;
		color: #BBBBBB;
		line-height: 16px;
	}
}

/* 底部 */
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
</style>
