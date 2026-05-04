<template>
	<view class="page-project-edit">
		<NavBar :title="editId ? '编辑工作' : '新建工作'" :showBack="true" />

		<view class="page-project-edit__content">
			<!-- 工作名称 -->
			<view class="field-row">
				<text class="field-row__label">工作名称</text>
				<input
					class="field-row__input"
					type="text"
					v-model="form.name"
					placeholder="例如：xx工地"
					maxlength="50"
				/>
			</view>

			<!-- 计薪方式 -->
			<view class="pay-mode-section">
				<text class="section-label">计薪方式</text>

				<!-- 三模式 Tab 切换 -->
				<view class="pay-mode-tabs">
					<view
						v-for="m in payModeOptions"
						:key="m.value"
						class="pay-mode-tab"
						:class="{ 'pay-mode-tab--active': form.pay_mode === m.value }"
						@tap="form.pay_mode = m.value"
					>
						<text class="pay-mode-tab__icon">{{ m.icon }}</text>
						<text class="pay-mode-tab__label">{{ m.label }}</text>
					</view>
				</view>

				<!-- 时薪表单 -->
				<view v-if="form.pay_mode === 'hourly'" class="rate-section">
					<text class="rate-section__title">时薪标准</text>
					<text class="rate-section__desc">设置每小时的计酬标准</text>
					<view class="rate-inputs">
						<view class="rate-input">
							<text class="rate-input__label">平日</text>
							<view class="rate-input__right">
								<text class="rate-input__prefix">¥</text>
								<input class="rate-input__field" type="digit" :value="form.weekday_rate || ''" @input="e => onRateInput(e, 'weekday_rate')" placeholder="0" />
								<text class="rate-input__suffix">/h</text>
							</view>
						</view>
						<view class="rate-input">
							<text class="rate-input__label">周末</text>
							<view class="rate-input__right">
								<text class="rate-input__prefix">¥</text>
								<input class="rate-input__field" type="digit" :value="form.weekend_rate || ''" @input="e => onRateInput(e, 'weekend_rate')" placeholder="0" />
								<text class="rate-input__suffix">/h</text>
							</view>
						</view>
						<view class="rate-input rate-input--last">
							<text class="rate-input__label">节假日</text>
							<view class="rate-input__right">
								<text class="rate-input__prefix">¥</text>
								<input class="rate-input__field" type="digit" :value="form.holiday_rate || ''" @input="e => onRateInput(e, 'holiday_rate')" placeholder="0" />
								<text class="rate-input__suffix">/h</text>
							</view>
						</view>
					</view>
					<text class="rate-section__example">例：3.5h × ¥25/h = ¥87.5</text>
				</view>

				<!-- 日薪表单 -->
				<view v-if="form.pay_mode === 'daily'" class="rate-section">
					<text class="rate-section__title">日薪标准</text>
					<text class="rate-section__desc">设置每天的工作报酬</text>
					<view class="rate-inputs">
						<view class="rate-input rate-input--last">
							<text class="rate-input__label">日薪</text>
							<view class="rate-input__right">
								<text class="rate-input__prefix">¥</text>
								<input class="rate-input__field" type="digit" :value="form.daily_rate || ''" @input="e => onRateInput(e, 'daily_rate')" placeholder="0" />
								<text class="rate-input__suffix">/天</text>
							</view>
						</view>
					</view>
					<text class="rate-section__example">例：1天 × ¥300/天 = ¥300</text>
				</view>

				<!-- 计件表单 -->
				<view v-if="form.pay_mode === 'piece'" class="rate-section">
					<text class="rate-section__title">计件标准</text>
					<text class="rate-section__desc">设置每件的计酬单价</text>
					<view class="rate-inputs">
						<view class="rate-input rate-input--last">
							<text class="rate-input__label">单价</text>
							<view class="rate-input__right">
								<text class="rate-input__prefix">¥</text>
								<input class="rate-input__field" type="digit" :value="form.piece_rate || ''" @input="e => onRateInput(e, 'piece_rate')" placeholder="0" />
								<text class="rate-input__suffix">/</text>
								<picker class="rate-input__picker" :value="pieceUnitIndex" :range="pieceUnitOptions" @change="onPieceUnitChange">
									<text class="rate-input__picker-text">{{ form.piece_unit }}</text>
									<text class="rate-input__picker-arrow">▼</text>
								</picker>
							</view>
						</view>
					</view>
					<text class="rate-section__example">例：50件 × ¥6/件 = ¥300</text>
				</view>
			</view>

	

			<!-- 归档 -->
			<view class="archive-row" v-if="editId">
				<text class="archive-row__label">归档工作</text>
				<view class="archive-row__switch" :class="{ 'archive-row__switch--on': form.is_archived }" @tap="form.is_archived = !form.is_archived">
					<view class="archive-row__knob"></view>
				</view>
			</view>
		</view>

		<!-- 底部 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__save" @tap="handleSave">
					<text class="bottom-bar__save-text">保存</text>
				</view>
				<view class="delete-btn" v-if="isEditing" @tap="handleDelete">
					<text class="delete-btn__text">删除工作</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useProjectStore } from '../../stores/projectStore'

import { requireAuth } from '@/utils/auth'
import { PAY_MODES, PIECE_UNITS } from '../../utils/constants'

export default {
	components: { NavBar },
	data() {
		return {
			editId: null,
			form: {
				name: '',
				color: '#1B8A5A',
				sort_order: 0,
				pay_mode: 'hourly',
				weekday_rate: 0,
				weekend_rate: 0,
				holiday_rate: 0,
				daily_rate: 0,
				piece_rate: 0,
				piece_unit: '件',
				is_archived: false
			},
			payModeOptions: PAY_MODES,
			pieceUnitOptions: PIECE_UNITS
		}
	},
	computed: {
		pieceUnitIndex() {
			return Math.max(0, this.pieceUnitOptions.indexOf(this.form.piece_unit))
		},
		isEditing() {
			return !!this.editId
		}
	},
	onLoad(options) {
		if (options.id) {
			this.editId = options.id
			const store = useProjectStore()
			const proj = store.projects.find(p => p._id === options.id || p.id === options.id)
			if (proj) {
				this.form = {
					name: proj.name || '',
					color: proj.color || '#1B8A5A',
					sort_order: proj.sort_order || 0,
					pay_mode: proj.pay_mode || 'hourly',
					weekday_rate: proj.weekday_rate || 0,
					weekend_rate: proj.weekend_rate || 0,
					holiday_rate: proj.holiday_rate || 0,
					daily_rate: proj.daily_rate || 0,
					piece_rate: proj.piece_rate || 0,
					piece_unit: proj.piece_unit || '件',
					is_archived: proj.is_archived || false
				}
			} else {
				this.autoFillRates()
			}
		}
	},
	onShow() {
			const pStore = useProjectStore()
			pStore.loadProjects()
		},

		methods: {
		autoFillRates() {
			const pStore = useProjectStore()
			pStore.loadProjects()
			const same = pStore.projects.filter(p => p.pay_mode === this.form.pay_mode && p._id !== this.editId).sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
			const last = same[0]
			if (!last) return
			if (this.form.pay_mode === 'hourly') {
				if (last.weekday_rate > 0) this.form.weekday_rate = last.weekday_rate
				if (last.weekend_rate > 0) this.form.weekend_rate = last.weekend_rate
				if (last.holiday_rate > 0) this.form.holiday_rate = last.holiday_rate
			} else if (this.form.pay_mode === 'daily') {
				if (last.daily_rate > 0) this.form.daily_rate = last.daily_rate
			} else if (this.form.pay_mode === 'piece') {
				if (last.piece_rate > 0) this.form.piece_rate = last.piece_rate
				if (last.piece_unit) this.form.piece_unit = last.piece_unit
			}
		},
		onPieceUnitChange(e) {
			this.form.piece_unit = this.pieceUnitOptions[e.detail.value] || '件'
		},
		onRateInput(e, field) {
			const raw = String(e.detail?.value ?? e.target?.value ?? "")
			let filtered = raw.replace(/[^\d.]/g, "")
			const dotIdx = filtered.indexOf(".")
			if (dotIdx >= 0) {
				filtered = filtered.substring(0, dotIdx + 1) + filtered.substring(dotIdx + 1).replace(/\./g, "")
			}
			this.form[field] = filtered === "" || filtered === "." ? 0 : parseFloat(filtered)
			this.$forceUpdate()
		},

		async handleSave() {
			if (!requireAuth()) return
			if (!this.form.name.trim()) {
				uni.showToast({ title: '请输入工作名称', icon: 'none' })
				return
			}
			const mode = this.form.pay_mode
			if (mode === 'daily' && !this.form.daily_rate) {
				uni.showToast({ title: '请设置日薪标准', icon: 'none' }); return
			}
			if (mode === 'piece' && !this.form.piece_rate) {
				uni.showToast({ title: '请设置计件单价', icon: 'none' }); return
			}
			if (mode === 'hourly' && (!this.form.weekday_rate || !this.form.weekend_rate || !this.form.holiday_rate)) {
				uni.showToast({ title: '请设置完整的时薪标准（平日/周末/节假日）', icon: 'none' }); return
			}

			const store = useProjectStore()
			const data = {
				name: this.form.name.trim(),
				color: this.form.color,
				sort_order: parseInt(this.form.sort_order) || 0,
				pay_mode: this.form.pay_mode,
				weekday_rate: this.form.weekday_rate || 0,
				weekend_rate: this.form.weekend_rate || 0,
				holiday_rate: this.form.holiday_rate || 0,
				daily_rate: this.form.daily_rate || 0,
				piece_rate: this.form.piece_rate || 0,
				piece_unit: this.form.piece_unit || '件',
				is_archived: this.form.is_archived
			}

			if (this.editId) {
				await store.updateProject(this.editId, data)
			} else {
				await store.addProject(data)
			}

			uni.showToast({ title: '已保存', icon: 'success' })
			setTimeout(() => {
				const pages = getCurrentPages()
				if (pages.length > 1) { uni.navigateBack() }
				else { uni.switchTab({ url: '/pages/index/index' }) }
			}, 500)
		},
		handleDelete() {
			uni.showModal({
				title: '确认删除',
				content: `删除工作「${this.form.name}」不会删除记工记录，但记录将不再关联该工作。`,
				confirmText: '删除',
				confirmColor: '#B85C4A',
				success: (res) => {
					if (res.confirm) {
						const pStore = useProjectStore()
						pStore.deleteProject(this.editId)
						uni.showToast({ title: '已删除', icon: 'success' })
						setTimeout(() => {
							const pages = getCurrentPages()
							if (pages.length > 1) { uni.navigateBack() }
							else { uni.switchTab({ url: '/pages/index/index' }) }
						}, 500)
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-project-edit {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 0 16px 100px;
		max-width: 640px;
		margin: 0 auto;
	}
}

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
		flex-shrink: 0;
		margin-right: 12px;
	}

	&__input {
		flex: 1;
		text-align: right;
		font-size: 15px;
		color: var(--text-secondary);
		border: none;
		background: transparent;
		padding: 0;

		&--number {
			width: 60px;
			text-align: center;
		}
	}
}

.section-label {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
	display: block;
	margin-bottom: 12px;
}

/* 计薪方式 */
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
	margin-bottom: 16px;
}

.pay-mode-tab {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 10px 6px;
	border-radius: 8px;
	background: var(--surface);
	border: 1.5px solid var(--border);

	&--active {
		background: var(--primary-light);
		border-color: var(--primary);
	}

	&__icon {
		font-size: 18px;
		display: block;
		margin-bottom: 2px;
	}

	&__label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted);
		display: block;
	}

	&--active &__label {
		color: var(--primary);
	}
}

/* 费率输入 */
.rate-section {
	background: var(--surface);
	border-radius: 8px;
	padding: 14px;
	margin-top: 4px;

	&__title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		display: block;
	}

	&__desc {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}

	&__example {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 8px;
		display: block;
		font-style: italic;
	}
}

.rate-inputs {
	margin-top: 12px;
}

.rate-input {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 0;
	border-bottom: 1px solid var(--border);

	&--last {
		border-bottom: none;
	}

	&__label {
		font-size: 14px;
		color: var(--text-secondary);
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__prefix {
		font-size: 14px;
		color: var(--text-muted);
	}

	&__field {
		width: 60px;
		text-align: center;
		font-size: 16px;
		font-weight: 600;
		color: var(--primary);
		border: none;
		background: transparent;
		border-bottom: 1px solid var(--border);
		padding: 2px 0;
		margin: 0 4px;
	}

	&__suffix {
		font-size: 12px;
		color: var(--text-muted);
		margin-right: 4px;
	}

	&__picker {
		display: inline-flex;
		align-items: center;
	}

	&__picker-text {
		font-size: 14px;
		font-weight: 500;
		color: var(--primary);
	}

	&__picker-arrow {
		font-size: 8px;
		color: var(--text-muted);
		margin-left: 2px;
	}
}

/* 颜色选择 */
.color-section {
	margin-top: 16px;
	padding: 16px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);

	&__options {
		display: flex;
		gap: 12px;
	}
}

.color-chip {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	border: 2px solid transparent;
	box-sizing: border-box;

	&--active {
		border-color: var(--text-primary);
		box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #1E1E1E;
	}
}

/* 归档 */
.archive-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	margin-top: 16px;

	&__label {
		font-size: 15px;
		color: var(--text-primary);
	}

	&__switch {
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background: #E8E4DC;
		position: relative;

		&--on {
			background: var(--primary);
		}
	}

	&__knob {
		width: 20px;
		height: 20px;
		border-radius: 20px;
		background: var(--surface-card);
		position: absolute;
		top: 2px;
		left: 2px;
	}

	&__switch--on &__knob {
		left: 22px;
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

.delete-btn {
	margin-top: 12px;
	height: 44px;
	border-radius: 20px;
	border: 1px solid var(--error, #B85C4A);
	display: flex;
	align-items: center;
	justify-content: center;
}

.delete-btn__text {
	font-size: 15px;
	color: var(--error, #B85C4A);
}
</style>
