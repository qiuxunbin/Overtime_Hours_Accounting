<template>
	<view class="splash" v-if="visible">
		<view class="splash__bg"></view>

		<!-- 跳过 -->
		<view class="splash__skip" @tap="goHome">
			<text class="splash__skip-text">跳过</text>
		</view>

		<!-- 品牌区 -->
		<view class="splash__brand">
			<view class="splash__logo">
				<text class="splash__logo-icon">&#x23F0;</text>
			</view>
			<text class="splash__title">加班工时记账</text>
			<text class="splash__tagline">记的每一分钟，都算数</text>
		</view>

		<!-- 底部 -->
		<view class="splash__footer">
			<view class="splash__dots">
				<view class="splash__dot"></view>
				<view class="splash__dot"></view>
				<view class="splash__dot splash__dot--active"></view>
			</view>
		</view>
	</view>
</template>

<script>
const SPLASH_SHOWN_KEY = 'splash_shown'

export default {
	data() {
		return {
			visible: true,
			timer: null
		}
	},
	onShow() {
		if (uni.getStorageSync(SPLASH_SHOWN_KEY)) {
			this.goHome()
			return
		}
		uni.setStorageSync(SPLASH_SHOWN_KEY, true)
		this.animateProgress()
	},
	onHide() {
		clearTimeout(this.timer)
		this.timer = null
	},
	methods: {
		animateProgress() {
			this.timer = setTimeout(() => {
				this.goHome()
			}, 3000)
		},
		goHome() {
			clearTimeout(this.timer)
			this.visible = false
			const token = uni.getStorageSync('uni_id_token')
			const expired = uni.getStorageSync('uni_id_token_expired')
			const hasToken = token && !(expired && Date.now() > expired)

			// #ifdef MP-WEIXIN
			// 小程序：静默登录，不跳登录页，直接进首页
			uni.reLaunch({ url: '/pages/index/index' })
			// #endif

			// #ifdef APP-PLUS
			// App：无 token 则跳一键登录页
			if (!hasToken) {
				uni.reLaunch({ url: '/pages/login/login' })
			} else {
				uni.reLaunch({ url: '/pages/index/index' })
			}
			// #endif

			// #ifdef H5
			if (!hasToken) {
				uni.reLaunch({ url: '/pages/login/login' })
			} else {
				uni.reLaunch({ url: '/pages/index/index' })
			}
			// #endif
		}
	}
}
</script>

<style lang="scss" scoped>
.splash {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	overflow: hidden;
}

.splash__bg {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(160deg, #1B8A5A 0%, #167A4E 50%, #15734B 100%);
}

.splash__skip {
	position: absolute;
	top: 0;
	right: 16px;
	z-index: 20;
	padding-top: calc(var(--status-bar-height) + 10px);
}

.splash__skip-text {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.6);
	background: rgba(0, 0, 0, 0.15);
	padding: 5px 14px;
	border-radius: 16px;
}

.splash__brand {
	position: relative;
	z-index: 1;
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-bottom: 80px;
}

.splash__logo {
	width: 56px;
	height: 56px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 12px;
}

.splash__logo-icon {
	font-size: 28px;
}

.splash__title {
	font-size: 22px;
	font-weight: 700;
	color: #FFFFFF;
}

.splash__tagline {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.7);
	margin-top: 4px;
}

.splash__footer {
	position: relative;
	z-index: 1;
	padding-bottom: calc(env(safe-area-inset-bottom) + 40px);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.splash__dots {
	display: flex;
	gap: 6px;
}

.splash__dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.4);

	&--active {
		background: #FFFFFF;
	}
}
</style>
