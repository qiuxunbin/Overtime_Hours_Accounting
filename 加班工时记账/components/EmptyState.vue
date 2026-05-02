<template>
	<view class="empty-state">
		<text class="empty-state__icon">{{ icon }}</text>
		<text class="empty-state__title">{{ title }}</text>
		<text v-if="description" class="empty-state__description">{{ description }}</text>
		<view v-if="actionText" class="empty-state__action" @tap="handleAction">
			<text class="empty-state__action-text">{{ actionText }}</text>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		icon: { type: String, default: '📋' },
		title: { type: String, default: '暂无数据' },
		description: { type: String, default: '' },
		actionText: { type: String, default: '' }
	},
	methods: {
		handleAction() { this.$emit('action') }
	}
}
</script>

<style lang="scss" scoped>
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 0;

	&__icon {
		font-size: 48px;
		line-height: 1;
		margin-bottom: 16px;
	}

	&__title {
		font-size: 14px;
		font-weight: 400;
		color: var(--text-muted);
		margin-bottom: 4px;
	}

	&__description {
		font-size: 13px;
		color: var(--text-muted);
		text-align: center;
		line-height: 18px;
		margin-bottom: 16px;
		opacity: 0.7;
	}

	&__action {
		padding: 8px 20px;
		background: var(--primary);
		border-radius: var(--radius-full);
	}

	&__action-text {
		font-size: 14px;
		font-weight: 500;
		color: #FFFFFF;
	}
}
</style>
