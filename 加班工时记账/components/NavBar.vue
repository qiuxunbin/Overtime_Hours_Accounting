<template>
	<view class="nav-bar">
		<view class="nav-bar__inner">
			<view class="nav-bar__left" @tap="handleBack">
				<text v-if="showBack" class="nav-bar__back-icon">&#x2039;</text>
			</view>
			<text class="nav-bar__title">{{ title }}</text>
			<view class="nav-bar__right">
				<slot name="right" />
			</view>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		title: { type: String, default: '' },
		showBack: { type: Boolean, default: false }
	},
	methods: {
		handleBack() {
			if (this.showBack) {
				uni.navigateBack()
			}
			this.$emit('back')
		}
	}
}
</script>

<style lang="scss" scoped>
.nav-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	background: #FFFFFF;
	border-bottom: 1px solid #E5E5E5;
	padding-top: var(--status-bar-height);

	&__inner {
		display: flex;
		align-items: center;
		height: 56px;
		padding: 0 16px;
		max-width: 640px;
		margin: 0 auto;
	}

	&__left {
		width: 40px;
		display: flex;
		align-items: center;
	}

	&__right {
		width: 40px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	&__back-icon {
		font-size: 28px;
		color: #07C160;
		line-height: 1;
		font-weight: 300;
	}

	&__title {
		flex: 1;
		text-align: center;
		font-size: 17px;
		font-weight: 600;
		color: #1A1C1C;
		letter-spacing: -0.02em;
	}
}
</style>
