<script>
	import { useUserStore } from './stores/userStore'
	import { useOvertimeStore } from './stores/overtimeStore'
	import { useSalaryStore } from './stores/salaryStore'
	import { collection } from '@/utils/localStore'
	import { DEFAULT_SALARY_CONFIG } from './utils/constants'

	export default {
		async onLaunch() {
			console.log('App Launch')
			// 防止 uniCloud 客户端读到 undefined token 而 crash
			if (!uni.getStorageSync('uni_id_token')) {
				uni.setStorageSync('uni_id_token', '')
			}
			if (!uni.getStorageSync('uniIdToken')) {
				uni.setStorageSync('uniIdToken', '')
			}

			// 预加载本地数据（在所有页面 onShow 之前）
			this.preloadLocalData()

			const userStore = useUserStore()
			userStore.loadUser()

			// 已有有效 token 则跳过登录
			const token = uni.getStorageSync('uni_id_token')
			const expired = uni.getStorageSync('uni_id_token_expired')
			if (!token || (expired && Date.now() > expired)) {
				await this.silentLogin(userStore)
				// 静默登录成功后，合并本地数据到云端
				if (userStore.isLoggedIn) {
					const overtimeStore = useOvertimeStore()
					await overtimeStore.mergeOnLogin(userStore.uid)
				}
			} else {
				console.log('[silentLogin] 已有有效 token，跳过登录')
			}
			console.log('App Ready')
		},
		methods: {
			preloadLocalData() {
				// 从本地存储预加载工时记录
				const overtimeStore = useOvertimeStore()
				const localDocs = collection('overtime_records').getAll()
				overtimeStore.records = localDocs.map(r => ({ ...r, id: r._id }))
				// 设置当前月份
				const now = new Date()
				const m = String(now.getMonth() + 1).padStart(2, '0')
				overtimeStore.currentMonth = `${now.getFullYear()}-${m}`

				// 从本地存储预加载薪资配置
				const salaryStore = useSalaryStore()
				try {
					const raw = uni.getStorageSync('salary_config')
					if (raw) {
						const local = JSON.parse(raw)
						salaryStore.config = { ...DEFAULT_SALARY_CONFIG, ...local }
					}
				} catch {
					// 使用默认配置
				}
			},

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
			// 每 5 分钟后台同步一次
			this._syncInterval = setInterval(() => {
				const overtimeStore = useOvertimeStore()
				const token = uni.getStorageSync('uni_id_token')
				if (token) {
					overtimeStore.flushSyncQueue()
					overtimeStore.pullFromCloud()
				}
			}, 300000)
		},
		onHide: function() {
			console.log('App Hide')
			clearInterval(this._syncInterval)
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
