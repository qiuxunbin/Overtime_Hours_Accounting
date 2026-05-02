<template>
	<view class="theme-toggle" @tap="handleToggle">
		<text class="theme-toggle__icon">{{ isDark ? '☀️' : '🌙' }}</text>
	</view>
</template>

<script>
import { themeState, toggleTheme } from '@/utils/theme'

export default {
	computed: {
		isDark() {
			return themeState.isDark
		}
	},
	methods: {
		handleToggle() {
			toggleTheme()
		}
	}
}
</script>

<style lang="scss" scoped>
.theme-toggle {
	position: fixed;
	bottom: 24px;
	right: 24px;
	z-index: 999;
	width: 44px;
	height: 44px;
	border-radius: 22px;
	background: var(--surface-card);
	box-shadow: var(--shadow-md);
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--border);

	&__icon {
		font-size: 20px;
		line-height: 1;
	}
}
</style>
