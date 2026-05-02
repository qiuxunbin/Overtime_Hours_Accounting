<template>
	<view class="page-salary">
		<NavBar title="加班费设置" :showBack="true" />

		<view class="page-salary__content">
			<!-- 说明 -->
			<view class="page-salary__intro">
				<text class="page-salary__intro-text">设置默认计薪方式和费率，新建项目时会自动沿用。按你实际拿到手的填就行。</text>
			</view>

			<!-- 默认计薪方式 -->
			<view class="mode-selector">
				<text class="mode-selector__label">默认计薪方式</text>
				<view class="mode-selector__tabs">
					<view
						v-for="m in payModes"
						:key="m.value"
						class="mode-selector__tab"
						:class="{ 'mode-selector__tab--active': payMode === m.value }"
						@tap="payMode = m.value"
					>
						<text class="mode-selector__tab-icon">{{ m.icon }}</text>
						<text class="mode-selector__tab-label">{{ m.label }}</text>
					</view>
				</view>
			</view>

			<!-- 时薪模式费率 -->
			<view class="rate-inputs" v-if="payMode === 'hourly'">
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

			<!-- 日薪模式费率 -->
			<view class="rate-inputs" v-if="payMode === 'daily'">
				<view class="rate-input rate-input--last">
					<view class="rate-input__left">
						<text class="rate-input__type">日薪</text>
						<text class="rate-input__hint">按天计薪，适合建筑工、临时工等</text>
					</view>
					<view class="rate-input__right">
						<text class="rate-input__prefix">¥</text>
						<input
							class="rate-input__field"
							type="digit"
							v-model="dailyRate"
							placeholder="0"
						/>
						<text class="rate-input__suffix">/ 天</text>
					</view>
				</view>
			</view>

			<!-- 计件模式费率 -->
			<view class="rate-inputs" v-if="payMode === 'piece'">
				<view class="rate-input">
					<view class="rate-input__left">
						<text class="rate-input__type">计件单价</text>
						<text class="rate-input__hint">每件或每单位的工价</text>
					</view>
					<view class="rate-input__right">
						<text class="rate-input__prefix">¥</text>
						<input
							class="rate-input__field"
							type="digit"
							v-model="pieceRate"
							placeholder="0"
						/>
						<text class="rate-input__suffix">/ {{ pieceUnit }}</text>
					</view>
				</view>
				<view class="rate-input rate-input--last">
					<view class="rate-input__left">
						<text class="rate-input__type">计量单位</text>
						<text class="rate-input__hint">按什么单位计件</text>
					</view>
					<view class="rate-input__right">
						<picker @change="onPieceUnitChange" :value="pieceUnitIndex" :range="pieceUnitOptions">
							<view class="rate-input__picker">
								<text class="rate-input__value">{{ pieceUnit }}</text>
								<text class="rate-input__arrow">›</text>
							</view>
						</picker>
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

			<!-- 各项目设置 -->


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
import { PAY_MODES, PIECE_UNITS } from '../../utils/constants'

const LEGAL_DAYS = 21.75
const LEGAL_HOURS = 8

export default {
	components: { NavBar },
	data() {
		return {
			payMode: 'hourly',
			weekdayRate: '',
			weekendRate: '',
			holidayRate: '',
			dailyRate: '',
			pieceRate: '',
			pieceUnit: '件',
			pieceUnitIndex: 0,
			pieceUnitOptions: PIECE_UNITS,
			payModes: PAY_MODES,
			precisionOptions: [
				{ label: '按 15 分钟', example: '1h10m → 1h15m' },
				{ label: '按半小时', example: '1h10m → 1h30m' },
				{ label: '按 1 小时', example: '1h10m → 2h' },
				{ label: '精确到分钟', example: '1h10m → 1h10m' }
			],
			precisionIndex: 0,
			showPrecision: false,
		}
	},
	computed: {
	},
	onShow() {
		this.loadConfig()
	},
	methods: {
		onPieceUnitChange(e) {
			const idx = parseInt(e.detail.value) || 0
			this.pieceUnitIndex = idx
			this.pieceUnit = PIECE_UNITS[idx] || '件'
		},
		async loadConfig() {
			const store = useSalaryStore()
			await store.loadConfig()
			const cfg = store.config
			if (cfg.pay_mode) this.payMode = cfg.pay_mode
			if (cfg.weekday_rate > 0) this.weekdayRate = String(cfg.weekday_rate)
			if (cfg.weekend_rate > 0) this.weekendRate = String(cfg.weekend_rate)
			if (cfg.holiday_rate > 0) this.holidayRate = String(cfg.holiday_rate)
			if (cfg.daily_rate > 0) this.dailyRate = String(cfg.daily_rate)
			if (cfg.piece_rate > 0) this.pieceRate = String(cfg.piece_rate)
			this.pieceUnit = cfg.piece_unit || '件'
			const unitIdx = PIECE_UNITS.indexOf(this.pieceUnit)
			this.pieceUnitIndex = unitIdx >= 0 ? unitIdx : 0
			const precMap = { '15min': 0, '30min': 1, '60min': 2, 'exact': 3 }
			this.precisionIndex = precMap[cfg.precision] !== undefined ? precMap[cfg.precision] : 0
		},
		async handleSave() {
			const store = useSalaryStore()
			const precValues = ['15min', '30min', '60min', 'exact']
			await store.updateConfig({
				pay_mode: this.payMode,
				weekday_rate: parseInt(this.weekdayRate) || 0,
				weekend_rate: parseInt(this.weekendRate) || 0,
				holiday_rate: parseInt(this.holidayRate) || 0,
				daily_rate: parseInt(this.dailyRate) || 0,
				piece_rate: parseInt(this.pieceRate) || 0,
				piece_unit: this.pieceUnit,
				precision: precValues[this.precisionIndex]
			})

			uni.showToast({ title: '已保存', icon: 'success' })

			const now = new Date()
			uni.showModal({
				title: '应用到已有记录',
				content: '是否用新费率重算 ' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月 的加班费？',
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
								uni.showToast({ title: '已更新 ' + n + ' 条记录', icon: 'success' })
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
	background: var(--surface);

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
		color: var(--text-muted);
		line-height: 20px;
	}

	&__spacer {
		height: 100px;
	}
}

/* 默认计薪方式选择器 */
.mode-selector {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 16px 20px;
	margin-bottom: 16px;

	&__label {
		font-size: 14px;
		color: var(--text-secondary);
		display: block;
		margin-bottom: 12px;
	}

	&__tabs {
		display: flex;
		gap: 10px;
	}

	&__tab {
		flex: 1;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 8px 4px;
		border-radius: 6px;
		border: 1.5px solid var(--border);
		background: var(--surface);

		&--active {
			border-color: var(--primary);
			background: var(--primary-light);
			.mode-selector__tab-label {
				color: var(--primary);
				font-weight: 600;
			}
		}
	}

	&__tab-icon {
		font-size: 14px;
	}

	&__tab-label {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 500;
	}
}

/* 时薪输入 */
.rate-inputs {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	overflow: hidden;
	margin-bottom: 16px;
}

.rate-input {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--border);

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
		color: var(--text-primary);
	}

	&__hint {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	&__right {
		display: flex;
		align-items: baseline;
	}

	&__prefix {
		font-size: 15px;
		color: var(--text-muted);
	}

	&__field {
		width: 80px;
		text-align: center;
		font-size: 24px;
		font-weight: 700;
		color: var(--primary);
		background: transparent;
		border: none;
		border-bottom: 2px solid var(--primary);
		margin: 0 4px;
		padding: 4px 0;
	}

	&__suffix {
		font-size: 13px;
		color: var(--text-muted);
	}

	&__value {
		font-size: 18px;
		font-weight: 600;
		color: var(--primary);
		min-width: 40px;
		text-align: center;
	}

	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
		margin-left: 4px;
	}

	&__picker {
		display: flex;
		align-items: baseline;
		padding: 4px 8px;
		border-bottom: 2px solid var(--primary);
	}
}




/* 底部 */
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
