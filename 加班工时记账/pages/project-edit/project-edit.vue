<template>
	<view class="page-project-edit">
		<NavBar :title="editId ? '编辑项目' : '新建项目'" :showBack="true" />

		<view class="page-project-edit__content">
			<!-- 名称 -->
			<view class="field-row">
				<text class="field-row__label">项目名称</text>
				<input
					class="field-row__input"
					type="text"
					v-model="form.name"
					placeholder="例如：A项目"
					maxlength="50"
				/>
			</view>

			<!-- 颜色 -->
			<view class="color-section">
				<text class="color-section__label">颜色</text>
				<view class="color-section__options">
					<view
						v-for="(c, idx) in colorOptions"
						:key="idx"
						class="color-chip"
						:class="{ 'color-chip--active': form.color === c.value }"
						:style="{ background: c.value }"
						@tap="form.color = c.value"
					></view>
				</view>
			</view>

			<!-- 排序 -->
			<view class="field-row">
				<text class="field-row__label">排序</text>
				<input
					class="field-row__input field-row__input--number"
					type="number"
					v-model.number="form.sort_order"
					placeholder="数字越小越靠前"
				/>
			</view>

			<!-- 独立时薪 -->
			<view class="rate-section">
				<text class="rate-section__title">单独时薪（选填）</text>
				<text class="rate-section__desc">留空或填 0 表示使用全局时薪设置</text>

				<view class="rate-inputs">
					<view class="rate-input">
						<text class="rate-input__label">平日</text>
						<view class="rate-input__right">
							<text class="rate-input__prefix">¥</text>
							<input class="rate-input__field" type="digit" v-model.number="form.weekday_rate" placeholder="0" />
							<text class="rate-input__suffix">/h</text>
						</view>
					</view>
					<view class="rate-input">
						<text class="rate-input__label">周末</text>
						<view class="rate-input__right">
							<text class="rate-input__prefix">¥</text>
							<input class="rate-input__field" type="digit" v-model.number="form.weekend_rate" placeholder="0" />
							<text class="rate-input__suffix">/h</text>
						</view>
					</view>
					<view class="rate-input rate-input--last">
						<text class="rate-input__label">节假日</text>
						<view class="rate-input__right">
							<text class="rate-input__prefix">¥</text>
							<input class="rate-input__field" type="digit" v-model.number="form.holiday_rate" placeholder="0" />
							<text class="rate-input__suffix">/h</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 归档 -->
			<view class="archive-row" v-if="editId">
				<text class="archive-row__label">归档项目</text>
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
			</view>
			<view class="bottom-bar__safe"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useProjectStore } from '../../stores/projectStore'
import { PROJECT_COLORS } from '../../utils/constants'

export default {
	components: { NavBar },
	data() {
		return {
			editId: null,
			form: {
				name: '',
				color: '#07C160',
				sort_order: 0,
				weekday_rate: 0,
				weekend_rate: 0,
				holiday_rate: 0,
				is_archived: false
			},
			colorOptions: PROJECT_COLORS
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
					color: proj.color || '#07C160',
					sort_order: proj.sort_order || 0,
					weekday_rate: proj.weekday_rate || 0,
					weekend_rate: proj.weekend_rate || 0,
					holiday_rate: proj.holiday_rate || 0,
					is_archived: proj.is_archived || false
				}
			}
		}
	},
	methods: {
		async handleSave() {
			if (!this.form.name.trim()) {
				uni.showToast({ title: '请输入项目名称', icon: 'none' })
				return
			}

			const store = useProjectStore()
			const data = {
				name: this.form.name.trim(),
				color: this.form.color,
				sort_order: parseInt(this.form.sort_order) || 0,
				weekday_rate: parseFloat(this.form.weekday_rate) || 0,
				weekend_rate: parseFloat(this.form.weekend_rate) || 0,
				holiday_rate: parseFloat(this.form.holiday_rate) || 0,
				is_archived: this.form.is_archived
			}

			if (this.editId) {
				await store.updateProject(this.editId, data)
			} else {
				await store.addProject(data)
			}

			uni.showToast({ title: '已保存', icon: 'success' })
			setTimeout(() => { uni.navigateBack() }, 500)
		}
	}
}
</script>

<style lang="scss" scoped>
.page-project-edit {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

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
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-top: 16px;

	&__label {
		font-size: 16px;
		color: #1A1C1C;
		flex-shrink: 0;
		margin-right: 12px;
	}

	&__input {
		flex: 1;
		text-align: right;
		font-size: 15px;
		color: #666666;
		border: none;
		background: transparent;
		padding: 0;

		&--number {
			width: 60px;
			text-align: center;
		}
	}
}

/* 颜色选择 */
.color-section {
	margin-top: 16px;
	padding: 16px 20px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;

	&__label {
		font-size: 15px;
		color: #1A1C1C;
		display: block;
		margin-bottom: 12px;
	}

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
		border-color: #1A1C1C;
		box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #1A1C1C;
	}
}

/* 时薪 */
.rate-section {
	margin-top: 16px;
	padding: 16px 20px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;

	&__title {
		font-size: 16px;
		font-weight: 500;
		color: #1A1C1C;
		display: block;
	}

	&__desc {
		font-size: 12px;
		color: #999999;
		margin-top: 4px;
		display: block;
	}
}

.rate-inputs {
	margin-top: 16px;
}

.rate-input {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 0;
	border-bottom: 1px solid #F3F3F3;

	&--last {
		border-bottom: none;
	}

	&__label {
		font-size: 14px;
		color: #666666;
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__prefix {
		font-size: 14px;
		color: #999999;
	}

	&__field {
		width: 60px;
		text-align: center;
		font-size: 16px;
		font-weight: 600;
		color: #07C160;
		border: none;
		background: transparent;
		border-bottom: 1px solid #E5E5E5;
		padding: 2px 0;
		margin: 0 4px;
	}

	&__suffix {
		font-size: 12px;
		color: #999999;
	}
}

/* 归档 */
.archive-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-top: 16px;

	&__label {
		font-size: 15px;
		color: #1A1C1C;
	}

	&__switch {
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background: #DDDDDD;
		position: relative;

		&--on {
			background: #07C160;
		}
	}

	&__knob {
		width: 20px;
		height: 20px;
		border-radius: 10px;
		background: #FFFFFF;
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
