<template>
	<!-- 小程序端静默登录，不展示登录页 -->
	<!-- #ifndef MP-WEIXIN -->
	<view class="page-login">
		<!-- 顶部装饰 — 对齐原型绿色背景 -->
		<view class="login-header">
			<view class="login-header__logo">
				<text class="login-header__logo-icon">&#x23F0;</text>
			</view>
			<text class="login-header__title">记工算工钱</text>
			<text class="login-header__desc">登录后同步您的记工数据</text>
		</view>

		<!-- 登录方式切换 -->
		<view class="login-tabs">
			<view
				class="login-tabs__item"
				:class="{ 'login-tabs__item--active': mode === 'sms' }"
				@tap="mode = 'sms'"
			>
				<text>验证码登录</text>
			</view>
			<view
				class="login-tabs__item"
				:class="{ 'login-tabs__item--active': mode === 'pwd' }"
				@tap="mode = 'pwd'"
			>
				<text>密码登录</text>
			</view>
		</view>

		<!-- #ifdef APP-PLUS -->
		<view class="univerify-btn" @tap="handleUniverify">
			<text class="univerify-btn__text">本机号码一键登录</text>
		</view>
		<view class="login-divider">
			<view class="login-divider__line"></view>
			<text class="login-divider__text">其他方式登录</text>
			<view class="login-divider__line"></view>
		</view>
		<!-- #endif -->

		<!-- 验证码登录 -->
		<view class="login-form" v-if="mode === 'sms'">
			<view class="input-row">
				<text class="input-row__prefix">+86</text>
				<input
					class="input-row__field"
					type="number"
					v-model="phone"
					placeholder="请输入手机号"
					maxlength="11"
				/>
			</view>
			<view class="input-row">
				<input
					class="input-row__field"
					type="number"
					v-model="smsCode"
					placeholder="验证码"
					maxlength="6"
				/>
				<view
					class="input-row__sms-btn"
					:class="{ 'input-row__sms-btn--disabled': sending || countdown > 0 }"
					@tap="sendSms"
				>
					<text v-if="countdown === 0">{{ sending ? '发送中...' : '获取验证码' }}</text>
					<text v-else>{{ countdown }}s</text>
				</view>
			</view>
			<view class="login-btn" @tap="loginBySms">
				<text class="login-btn__text">{{ loading ? '登录中...' : '登录' }}</text>
			</view>
			<view class="switch-link" @tap="mode = 'pwd'">
				<text class="switch-link__text">切换密码登录</text>
			</view>
		</view>

		<!-- 密码登录 -->
		<view class="login-form" v-if="mode === 'pwd'">
			<view class="input-row">
				<input
					class="input-row__field"
					type="text"
					v-model="username"
					placeholder="请输入用户名"
				/>
			</view>
			<view class="input-row">
				<input
					class="input-row__field"
					type="password"
					v-model="password"
					placeholder="请输入密码"
				/>
			</view>
			<view class="login-btn" @tap="loginByPassword">
				<text class="login-btn__text">{{ loading ? '登录中...' : '登录' }}</text>
			</view>
			<view class="switch-link" @tap="mode = 'register'">
				<text class="switch-link__text">没有账号？去注册</text>
			</view>
		</view>

		<!-- 注册 -->
		<view class="login-form" v-if="mode === 'register'">
			<view class="input-row">
				<input
					class="input-row__field"
					type="text"
					v-model="regUsername"
					placeholder="设置用户名（3-20位字母或数字）"
				/>
			</view>
			<view class="input-row">
				<input
					class="input-row__field"
					type="password"
					v-model="regPassword"
					placeholder="设置密码（6-20位）"
				/>
			</view>
			<view class="login-btn" @tap="register">
				<text class="login-btn__text">{{ loading ? '注册中...' : '注册并登录' }}</text>
			</view>
			<view class="switch-link" @tap="mode = 'pwd'">
				<text class="switch-link__text">已有账号？去登录</text>
			</view>
		</view>

		<!-- 跳过 -->
		<view class="skip-wrap" @tap="skip">
			<text class="skip-wrap__text">暂不登录，先看看</text>
		</view>

		<view class="login-footer">
			<text class="login-footer__text">登录即代表同意《用户协议》《隐私政策》</text>
		</view>
	</view>
	<!-- #endif -->
</template>

<script>
import { useUserStore } from '../../stores/userStore'
import { useWorkStore } from '@/stores/workStore'

export default {
	data() {
		return {
			mode: 'sms',
			phone: '',
			smsCode: '',
			username: '',
			password: '',
			regUsername: '',
			regPassword: '',
			loading: false,
			sending: false,
			countdown: 0,
			timer: null
		}
	},
	onUnload() {
		clearInterval(this.timer)
	},
	methods: {
		async sendSms() {
			if (this.sending || this.countdown > 0) return
			if (!/^1\d{10}$/.test(this.phone)) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return
			}

			this.sending = true
			try {
				const result = await uniCloud.callFunction({
					name: 'work-calc',
					data: {
						action: 'sendSmsCode',
						phone: this.phone
					}
				})

				if (result.result && result.result.code === 0) {
					uni.showToast({ title: '验证码已发送', icon: 'success' })
					this.countdown = 60
					this.timer = setInterval(() => {
						this.countdown--
						if (this.countdown <= 0) {
							clearInterval(this.timer)
						}
					}, 1000)
				} else {
					uni.showToast({ title: result.result?.message || '发送失败', icon: 'none' })
				}
			} catch (e) {
				uni.showToast({ title: '网络错误', icon: 'none' })
			}
			this.sending = false
		},

		async handleUniverify() {
			if (this.loading) return
			this.loading = true
			try {
				const loginRes = await uni.login({ provider: 'univerify' })
				if (!loginRes || !loginRes.authResult) {
					uni.showToast({ title: '一键登录失败，请用其他方式', icon: 'none' })
					this.loading = false
					return
				}
				await this.doLogin({
					action: 'loginByUniverify',
					access_token: loginRes.authResult.access_token,
					openid: loginRes.authResult.openid
				})
			} catch (e) {
				uni.showToast({ title: '一键登录不可用，请用其他方式', icon: 'none' })
				this.loading = false
			}
		},

		async loginBySms() {
			if (!/^1\d{10}$/.test(this.phone)) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return
			}
			if (!this.smsCode) {
				uni.showToast({ title: '请输入验证码', icon: 'none' })
				return
			}

			await this.doLogin({
				action: 'loginBySms',
				phone: this.phone,
				code: this.smsCode
			})
		},

		async loginByPassword() {
			if (!this.username.trim()) {
				uni.showToast({ title: '请输入用户名', icon: 'none' })
				return
			}
			if (!this.password) {
				uni.showToast({ title: '请输入密码', icon: 'none' })
				return
			}

			await this.doLogin({
				action: 'loginByPassword',
				username: this.username.trim(),
				password: this.password
			})
		},

		async register() {
			if (!/^[a-zA-Z0-9]{3,20}$/.test(this.regUsername)) {
				uni.showToast({ title: '用户名需3-20位字母或数字', icon: 'none' })
				return
			}
			if (this.regPassword.length < 6 || this.regPassword.length > 20) {
				uni.showToast({ title: '密码需6-20位', icon: 'none' })
				return
			}

			await this.doLogin({
				action: 'register',
				username: this.regUsername.trim(),
				password: this.regPassword
			})
		},

		async doLogin(params) {
			if (this.loading) return
			this.loading = true

			try {
				const result = await uniCloud.callFunction({
					name: 'work-calc',
					data: params
				})

				if (result.result && result.result.code === 0) {
					this.onLoginSuccess(result.result.data)
				} else {
					uni.showToast({ title: result.result?.message || '登录失败', icon: 'none' })
				}
			} catch (e) {
				uni.showToast({ title: '网络错误', icon: 'none' })
			}
			this.loading = false
		},

		onLoginSuccess(data) {
			const { uid, token, tokenExpired } = data
			const userStore = useUserStore()
			userStore.setUser({ uid })
			uni.setStorageSync('uni_id_token', token)
			uni.setStorageSync('uni_id_token_expired', tokenExpired)

			// 合并本地数据到该用户账户
			const workStore = useWorkStore()
			workStore.mergeOnLogin(uid)

			uni.showToast({ title: '登录成功', icon: 'success' })
			setTimeout(() => {
				uni.navigateBack()
			}, 800)
		},

		skip() {
			uni.navigateBack({ delta: 1, fail: () => {
				uni.reLaunch({ url: '/pages/index/index' })
			}})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-login {
	min-height: 100vh;
	background: var(--surface-card);
}

.login-header {
	background: var(--primary);
	padding: calc(var(--status-bar-height) + 32px) 24px 24px;
	display: flex;
	flex-direction: column;
	align-items: center;

	&__logo {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 8px;
	}

	&__logo-icon {
		font-size: 24px;
	}

	&__title {
		font-size: 20px;
		font-weight: 700;
		color: #FFFFFF;
	}

	&__desc {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 4px;
	}
}

.login-tabs {
	display: flex;
	border-bottom: 1px solid var(--border);
	margin: 0 28px 24px;

	&__item {
		flex: 1;
		text-align: center;
		padding: 14px 0;
		font-size: 15px;
		color: var(--text-muted);
		border-bottom: 2px solid transparent;
		transition: all 0.2s;

		&--active {
			color: var(--primary);
			border-bottom-color: var(--primary);
			font-weight: 600;
		}
	}
}

.univerify-btn {
	margin: 0 28px 20px;
	height: 50px;
	border-radius: 25px;
	background: linear-gradient(135deg, #1B8A5A, #15734B);
	display: flex;
	align-items: center;
	justify-content: center;

	&__text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}
}

.login-divider {
	display: flex;
	align-items: center;
	margin: 0 28px 24px;

	&__line {
		flex: 1;
		height: 1px;
		background: var(--surface-hover);
	}

	&__text {
		font-size: 13px;
		color: var(--text-muted);
		padding: 0 16px;
	}
}

.login-form {
	margin: 0 28px 24px;
}

.input-row {
	display: flex;
	align-items: center;
	height: 52px;
	border-bottom: 1px solid var(--border);
	margin-bottom: 20px;

	&__prefix {
		font-size: 16px;
		color: var(--text-primary);
		font-weight: 500;
		margin-right: 12px;
		padding-right: 12px;
		border-right: 1px solid #E8E4DC;
	}

	&__field {
		flex: 1;
		font-size: 16px;
		color: var(--text-primary);
	}

	&__sms-btn {
		flex-shrink: 0;
		height: 32px;
		border-radius: 16px;
		background: #E8F5ED;
		padding: 0 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 12px;

		text {
			font-size: 13px;
			color: var(--primary);
			white-space: nowrap;
		}

		&--disabled {
			background: var(--surface);

			text {
				color: var(--text-muted);
			}
		}
	}
}

.login-btn {
	height: 50px;
	border-radius: 20px;
	background: var(--primary);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 28px;

	&__text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}
}

.switch-link {
	text-align: center;
	margin-top: 16px;

	&__text {
		font-size: 14px;
		color: var(--primary);
	}
}

.skip-wrap {
	text-align: center;
	padding: 20px 0;
	margin: 0 28px;

	&__text {
		font-size: 14px;
		color: var(--text-muted);
	}
}

.login-footer {
	text-align: center;
	padding: 20px 0;
	margin: 0 28px;

	&__text {
		font-size: 11px;
		color: var(--text-muted);
	}
}
</style>
