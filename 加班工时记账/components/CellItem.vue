<template>
	<view class="cell-item" :class="{ 'cell-item--disabled': disabled }" @tap="handleTap">
		<view v-if="icon" class="cell-item__icon">
			<text class="cell-item__icon-text">{{ icon }}</text>
		</view>
		<view class="cell-item__content">
			<text class="cell-item__label">{{ label }}</text>
			<text v-if="note" class="cell-item__note">{{ note }}</text>
		</view>
		<view class="cell-item__right">
			<text v-if="value" class="cell-item__value">{{ value }}</text>
			<slot name="right"></slot>
			<text v-if="showArrow" class="cell-item__arrow">›</text>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		label: { type: String, default: '' },
		note: { type: String, default: '' },
		value: { type: String, default: '' },
		icon: { type: String, default: '' },
		showArrow: { type: Boolean, default: true },
		disabled: { type: Boolean, default: false }
	},
	methods: {
		handleTap() {
			if (!this.disabled) { this.$emit('tap') }
		}
	}
}
</script>

<style lang="scss" scoped>
.cell-item {
	display: flex;
	align-items: center;
	padding: 0 16px;
	background: var(--surface-card);
	height: 48px;
	border-bottom: 1px solid var(--border);

	&--disabled {
		opacity: 0.5;
	}

	&__icon {
		width: 20px;
		height: 20px;
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
		color: var(--text-primary);
	}

	&__note {
		font-size: 12px;
		line-height: 16px;
		color: var(--text-muted);
	}

	&__right {
		display: flex;
		align-items: center;
		margin-left: 12px;
		flex-shrink: 0;
	}

	&__value {
		font-size: 15px;
		color: var(--text-muted);
	}

	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
		line-height: 1;
	}
}
</style>
