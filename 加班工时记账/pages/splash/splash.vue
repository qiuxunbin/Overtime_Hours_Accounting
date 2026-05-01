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

		<!-- 价值点 -->
		<view class="splash__features">
			<view class="feature">
				<view class="feature__icon-wrap">
					<text class="feature__icon">&#x1F4DD;</text>
				</view>
				<view class="feature__text">
					<text class="feature__title">记录加班</text>
					<text class="feature__desc">选日期、设起止时间，自动算时长</text>
				</view>
			</view>
			<view class="feature">
				<view class="feature__icon-wrap">
					<text class="feature__icon">&#x1F4B0;</text>
				</view>
				<view class="feature__text">
					<text class="feature__title">自动算钱</text>
					<text class="feature__desc">设好时薪，每笔加班费自动算好</text>
				</view>
			</view>
			<view class="feature">
				<view class="feature__icon-wrap">
					<text class="feature__icon">&#x2705;</text>
				</view>
				<view class="feature__text">
					<text class="feature__title">月结对账</text>
					<text class="feature__desc">跟工资条对比，少没少发一眼看出</text>
				</view>
			</view>
		</view>

		<!-- 底部 -->
		<view class="splash__footer">
			<view class="splash__progress">
				<view class="splash__progress-fill" :style="{ width: progress + '%' }"></view>
			</view>
			<text class="splash__hint">首次使用 · 了解功能</text>
			<text class="splash__version">v1.0.0</text>
		</view>
	</view>
</template>

<script>
const SPLASH_SHOWN_KEY = 'splash_shown'

export default {
	data() {
		return {
			visible: true,
			progress: 0,
			timer: null
		}
	},
	onShow() {
		// 第二次开始直接跳过
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
			const start = Date.now()
			const duration = 1500
			const step = () => {
				const elapsed = Date.now() - start
				this.progress = Math.min((elapsed / duration) * 100, 100)
				if (elapsed < duration) {
					this.timer = setTimeout(step, 30)
				} else {
					this.goHome()
				}
			}
			step()
		},
		goHome() {
			clearTimeout(this.timer)
			this.visible = false
			uni.switchTab({ url: '/pages/index/index' })
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
	background: linear-gradient(160deg, #07C160 0%, #00A650 50%, #008A3D 100%);
}

.splash__skip {
	position: absolute;
	top: 0;
	right: 16px;
	z-index: 20;
	padding-top: calc(var(--status-bar-height) + 10px);
}

.splash__skip-text {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.8);
	background: rgba(0, 0, 0, 0.18);
	padding: 5px 14px;
	border-radius: 16px;
}

/* 品牌 */
.splash__brand {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: calc(var(--status-bar-height) + 80px);
	padding-bottom: 40px;
}

.splash__logo {
	width: 72px;
	height: 72px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20px;
}

.splash__logo-icon {
	font-size: 38px;
}

.splash__title {
	font-size: 26px;
	font-weight: 700;
	color: #FFFFFF;
	letter-spacing: 2px;
}

.splash__tagline {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.65);
	margin-top: 8px;
	letter-spacing: 1px;
}

/* 价值点 */
.splash__features {
	position: relative;
	z-index: 1;
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 0 32px;
}

.feature {
	display: flex;
	align-items: center;
	padding: 16px 0;
}

.feature__icon-wrap {
	width: 44px;
	height: 44px;
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.15);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 16px;
}

.feature__icon {
	font-size: 22px;
}

.feature__text {
	display: flex;
	flex-direction: column;
}

.feature__title {
	font-size: 16px;
	font-weight: 600;
	color: #FFFFFF;
}

.feature__desc {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.6);
	margin-top: 3px;
}

/* 底部 */
.splash__footer {
	position: relative;
	z-index: 1;
	padding: 20px 32px;
	padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.splash__progress {
	width: 160px;
	height: 2px;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 1px;
	overflow: hidden;
	margin-bottom: 8px;
}

.splash__progress-fill {
	height: 100%;
	background: rgba(255, 255, 255, 0.5);
	border-radius: 1px;
}

.splash__hint {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.35);
}

.splash__version {
	font-size: 11px;
	color: rgba(255, 255, 255, 0.2);
	margin-top: 4px;
}
</style>
