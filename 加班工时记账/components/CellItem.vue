<template>
	<view class="cell-item" :class="{ 'cell-item--disabled': disabled }" @tap="handleTap">
		<!-- 左侧图标 -->
		<view v-if="icon" class="cell-item__icon">
			<text class="cell-item__icon-text">{{ icon }}</text>
		</view>
		<!-- 内容 -->
		<view class="cell-item__content">
			<text class="cell-item__label" :style="{ color: labelColor }">{{ label }}</text>
			<text v-if="note" class="cell-item__note">{{ note }}</text>
		</view>
		<!-- 右侧 -->
		<view class="cell-item__right">
			<text v-if="value" class="cell-item__value" :style="{ color: valueColor }">{{ value }}</text>
			<slot name="right"></slot>
			<text v-if="showArrow" class="cell-item__arrow">›</text>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		label: {
			type: String,
			default: ''
		},
		note: {
			type: String,
			default: ''
		},
		value: {
			type: String,
			default: ''
		},
		icon: {
			type: String,
			default: ''
		},
		showArrow: {
			type: Boolean,
			default: true
		},
		disabled: {
			type: Boolean,
			default: false
		},
		labelColor: {
			type: String,
			default: '#1A1C1C'
		},
		valueColor: {
			type: String,
			default: '#999999'
		}
	},
	methods: {
		handleTap() {
			if (!this.disabled) {
				this.$emit('tap')
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.cell-item {
	display: flex;
	align-items: center;
	padding: 16px;
	background: #FFFFFF;
	min-height: 56px;

	&--disabled {
		opacity: 0.5;
	}

	&__icon {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 12px;
	}

	&__icon-text {
		font-size: 20px;
	}

	&__content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	&__label {
		font-size: 15px;
		line-height: 22px;
		font-weight: 400;
	}

	&__note {
		font-size: 12px;
		line-height: 16px;
		color: #999999;
	}

	&__right {
		display: flex;
		align-items: center;
		margin-left: 12px;
		flex-shrink: 0;
	}

	&__value {
		font-size: 15px;
		line-height: 22px;
	}

	&__arrow {
		font-size: 20px;
		color: #CCCCCC;
		line-height: 1;
	}
}
</style>
