<template>
	<view class="empty-state">
		<view class="empty-state__icon-wrapper">
			<text class="empty-state__icon">{{ icon }}</text>
		</view>
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
		icon: {
			type: String,
			default: '📋'
		},
		title: {
			type: String,
			default: '暂无数据'
		},
		description: {
			type: String,
			default: ''
		},
		actionText: {
			type: String,
			default: ''
		}
	},
	methods: {
		handleAction() {
			this.$emit('action')
		}
	}
}
</script>

<style lang="scss" scoped>
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60px 32px;

	&__icon-wrapper {
		width: 80px;
		height: 80px;
		border-radius: 40px;
		background: #F3F3F3;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 16px;
	}

	&__icon {
		font-size: 36px;
	}

	&__title {
		font-size: 17px;
		font-weight: 600;
		color: #1A1C1C;
		margin-bottom: 8px;
	}

	&__description {
		font-size: 14px;
		color: #999999;
		text-align: center;
		line-height: 20px;
		margin-bottom: 20px;
	}

	&__action {
		padding: 10px 24px;
		background: #07C160;
		border-radius: 12px;
	}

	&__action-text {
		font-size: 15px;
		font-weight: 500;
		color: #FFFFFF;
	}
}
</style>
