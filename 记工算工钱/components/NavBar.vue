<template>
	<view class="nav-bar" :style="{ background: bgColor, borderBottom: borderColor ? '1px solid ' + borderColor : 'none' }">
		<view class="nav-bar__inner">
			<view class="nav-bar__left" @tap="handleBack">
				<text v-if="showBack" class="nav-bar__back-icon" :style="{ color: iconColor }">←</text>
			</view>
			<text class="nav-bar__title" :style="{ color: titleColor }">{{ title }}</text>
			<view class="nav-bar__right">
				<SyncStatus />
				<slot name="right" />
			</view>
		</view>
	</view>
</template>

<script>
import SyncStatus from './SyncStatus.vue'

export default {
	components: { SyncStatus },
	props: {
		title: { type: String, default: '' },
		showBack: { type: Boolean, default: false },
		green: { type: Boolean, default: false }
	},
	computed: {
		bgColor() {
			return this.green ? '#1B8A5A' : 'var(--surface-card)'
		},
		titleColor() {
			return this.green ? '#FFFFFF' : 'var(--text-primary)'
		},
		iconColor() {
			return this.green ? '#FFFFFF' : 'var(--primary)'
		},
		borderColor() {
			return this.green ? null : 'var(--border)'
		}
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
	padding-top: var(--status-bar-height);

	&__inner {
		display: flex;
		align-items: center;
		height: 44px;
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
		min-width: 40px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	&__back-icon {
		font-size: 22px;
		line-height: 1;
		font-weight: 300;
	}

	&__title {
		flex: 1;
		text-align: center;
		font-size: 17px;
		font-weight: 600;
	}
}
</style>
