<script>
	import { useUserStore } from './stores/userStore'

	export default {
		async onLaunch() {
			console.log('App Launch')
			// 防止 uniCloud 客户端读到 undefined token 而 crash
			// 客户端代码: getStorageSync("uni_id_token") || getStorageSync("uniIdToken")
			// 若两个 key 都不存在则返回 undefined，后续 .split('.') 报错
			if (!uni.getStorageSync('uni_id_token')) {
				uni.setStorageSync('uni_id_token', '')
			}
			if (!uni.getStorageSync('uniIdToken')) {
				uni.setStorageSync('uniIdToken', '')
			}
			const userStore = useUserStore()
			userStore.loadUser()
			// 已有有效 token 则跳过登录，避免重复消耗资源
			const token = uni.getStorageSync('uni_id_token')
			const expired = uni.getStorageSync('uni_id_token_expired')
			if (!token || (expired && Date.now() > expired)) {
				// 不 await，避免阻塞启动
				this.silentLogin(userStore)
			} else {
				console.log('[silentLogin] 已有有效 token，跳过登录')
			}
			console.log('App Ready')
		},
		methods: {
			async silentLogin(userStore) {
				// #ifdef MP-WEIXIN
				try {
					console.log('[silentLogin] 开始微信静默登录...')
					const loginRes = await uni.login()
					console.log('[silentLogin] uni.login 返回:', JSON.stringify(loginRes))
					if (!loginRes || !loginRes.code) {
						console.log('[silentLogin] 未获取到 code，终止登录')
						return
					}
					console.log('[silentLogin] 获取到 code:', loginRes.code)
					// 加 6 秒超时，避免卡死
					const result = await Promise.race([
						uniCloud.callFunction({
							name: 'user-auth',
							data: { action: 'loginByWeixin', code: loginRes.code }
						}),
						new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
					])
					console.log('[silentLogin] 云函数返回:', JSON.stringify(result))
					if (result && result.result && result.result.code === 0) {
						const { uid, token, tokenExpired } = result.result.data
						userStore.setUser({ uid })
						uni.setStorageSync('uni_id_token', token)
						uni.setStorageSync('uni_id_token_expired', tokenExpired)
						console.log('[silentLogin] 登录成功, uid:', uid)
					} else {
						console.log('[silentLogin] 登录失败:', result.result?.message || '未知错误')
					}
				} catch (e) {
					console.log('[silentLogin] 异常:', e.message || e)
				}
				// #endif

				// #ifdef APP-PLUS
				try {
					console.log('[silentLogin] 开始 App 一键登录...')
					const loginRes = await uni.login({ provider: 'univerify' })
					console.log('[silentLogin] uni.login(univerify) 返回:', JSON.stringify(loginRes))
					if (loginRes && loginRes.authResult) {
						const { access_token, openid } = loginRes.authResult
						const result = await uniCloud.callFunction({
							name: 'user-auth',
							data: { action: 'loginByUniverify', access_token, openid }
						})
						console.log('[silentLogin] 云函数返回:', JSON.stringify(result))
						if (result && result.result && result.result.code === 0) {
							const { uid, token, tokenExpired } = result.result.data
							userStore.setUser({ uid })
							uni.setStorageSync('uni_id_token', token)
							uni.setStorageSync('uni_id_token_expired', tokenExpired)
							console.log('[silentLogin] 一键登录成功, uid:', uid)
						} else {
							console.log('[silentLogin] 一键登录失败:', result.result?.message || '未知错误')
						}
					} else {
						console.log('[silentLogin] 未获取到 authResult')
					}
				} catch (e) {
					console.log('[silentLogin] 一键登录异常:', e.message || e)
				}
				// #endif
			}
		},
		onShow: function() {
			console.log('App Show')
			// 不重复调用登录，onLaunch 已经处理了
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* 全局样式 */
	page {
		background-color: #F7F7F7;
		color: #1A1C1C;
		font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif;
	}

	/* iOS safe area 辅助 */
	.safe-area-bottom {
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* 按钮重置 */
	button {
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		font: inherit;
		color: inherit;
		line-height: inherit;
	}

	/* 图片块级化 */
	image {
		display: block;
	}
</style>
