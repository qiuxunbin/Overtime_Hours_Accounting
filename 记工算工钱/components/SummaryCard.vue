<template>
	<view class="summary-card">
		<view class="summary-card__header">
			<text class="summary-card__title">{{ title }}</text>
			<text v-if="subtitle" class="summary-card__subtitle">{{ subtitle }}</text>
		</view>
		<view class="summary-card__body">
			<slot />
		</view>
	</view>
</template>

<script>
export default {
	props: {
		title: { type: String, default: '月度概览' },
		subtitle: { type: String, default: '' }
	}
}
</script>

<style lang="scss" scoped>
.summary-card {
	background: var(--surface-card);
	border-radius: var(--radius-lg);
	padding: 16px;
	box-shadow: var(--shadow-sm);

	&__header {
		margin-bottom: 12px;
	}

	&__title {
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 28px;
	}

	&__subtitle {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}

	&__body {
		display: flex;
		align-items: center;
		justify-content: space-around;
	}
}
</style>
