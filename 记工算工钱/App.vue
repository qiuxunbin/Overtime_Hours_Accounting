<script>
	import { useUserStore } from './stores/userStore'
	import { useWorkStore } from './stores/workStore'
	import { useSalaryStore } from './stores/salaryStore'
	import { collection } from '@/utils/localStore'
	import { DEFAULT_SALARY_CONFIG, DEFAULT_PROJECT_CONFIG } from './utils/constants'
	import { useProjectStore } from './stores/projectStore'
	import { useHolidayStore } from './stores/holidayStore'
	import { themeState, applyThemeClass } from './utils/theme.js'

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

			// 恢复主题偏好
			const savedTheme = uni.getStorageSync('theme')
			if (savedTheme === 'dark') {
				themeState.isDark = true
				applyThemeClass()
			}

			// 预加载本地数据（在所有页面 onShow 之前）
			this.preloadLocalData()

			// 预加载节假日数据（异步，不阻塞）
			useHolidayStore().fetchFromCloud()

			// 首次安装 → 跳转启动页
			const hasLaunched = uni.getStorageSync("has_launched")
			if (!hasLaunched) {
				uni.setStorageSync("has_launched", true)
				uni.reLaunch({ url: "/pages/splash/splash" })
				return
			}

			const userStore = useUserStore()
			userStore.loadUser()

			// 已有有效 token 则跳过登录
			const token = uni.getStorageSync('uni_id_token')
			const expired = uni.getStorageSync('uni_id_token_expired')
			if (!token || (expired && Date.now() > expired)) {
				// 静默登录 → 最多等15秒（云函数冷启动+微信API约5-10秒），超时不阻碍本地功能
				try {
					await Promise.race([
						this.silentLogin(userStore),
						new Promise(r => setTimeout(r, 15000))
					])
					if (userStore.isLoggedIn) {
						const workStore = useWorkStore()
						workStore.mergeOnLogin(userStore.uid)
					}
				} catch (e) {
					console.log("[silentLogin] 超时或失败:", e.message || e)
				}
			} else {
				console.log('[silentLogin] 已有有效 token，跳过登录')
			}
			console.log('App Ready')
		},
		methods: {
			_scheduleSync(intervalMs) {
				if (this._syncInterval) clearInterval(this._syncInterval)
				this._syncInterval = setInterval(() => {
					this._doBackgroundSync()
				}, intervalMs)
			},
			_doBackgroundSync() {
				// 防止并发
				if (this._syncPending) return
				const workStore = useWorkStore()
				const token = uni.getStorageSync('uni_id_token')
				if (!token) return
				this._syncPending = true
				Promise.all([
					workStore.flushSyncQueue(),
					workStore.pullFromCloud()
				]).finally(() => {
					this._syncPending = false
				})
			},
			preloadLocalData() {
				// 从本地存储预加载工时记录
				const workStore = useWorkStore()
				const localDocs = collection('work_records').getAll()
				workStore.records = localDocs.map(r => ({
						pay_mode: 'hourly', days: 1, quantity: 0,
						piece_rate: 0, daily_rate: 0,
						subsidies: { night_shift: 0, meal: 0, transport: 0 },
						deduction: { amount: 0, note: '' },
						...r, id: r._id
					}))
				// 设置当前月份
				const now = new Date()
				const m = String(now.getMonth() + 1).padStart(2, '0')
				workStore.currentMonth = `${now.getFullYear()}-${m}`

				// 从本地存储预加载工作列表
				const projectStore = useProjectStore()
				const projectDocs = collection('projects').getAll()
				projectStore.projects = projectDocs.map(p => ({
						...DEFAULT_PROJECT_CONFIG,
						...p, id: p._id
					}))

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
					console.log('[silentLogin] uni.login 返回 code:', loginRes?.code)
					if (!loginRes || !loginRes.code) {
						console.log('[silentLogin] 未获取到 code，终止登录')
						return
					}
					console.log('[silentLogin] 获取到 code:', loginRes.code)
					const result = await Promise.race([
						uniCloud.callFunction({
							name: 'work-calc',
							data: { action: 'loginByWeixin', code: loginRes.code }
						}),
						new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
					])
					console.log('[silentLogin] 云函数返回 code:', result?.result?.code)
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
					console.log('[silentLogin] uni.login(univerify) 返回 authResult:', !!loginRes?.authResult)
					if (loginRes && loginRes.authResult) {
						const { access_token, openid } = loginRes.authResult
						const result = await uniCloud.callFunction({
							name: 'work-calc',
							data: { action: 'loginByUniverify', access_token, openid }
						})
						console.log('[silentLogin] 云函数返回 code:', result?.result?.code)
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
			// 清除旧定时器防止泄漏（每次 onShow 都会创建新的）
			if (this._syncInterval) {
				clearInterval(this._syncInterval)
				this._syncInterval = null
			}
			// 清除上次的防抖标记
			this._syncPending = false
			// 立刻同步一次，之后每 30 分钟同步一次
			this._doBackgroundSync()
			this._scheduleSync(30 * 60 * 1000)
		},
		onHide: function() {
			console.log('App Hide')
			if (this._syncInterval) {
				clearInterval(this._syncInterval)
				this._syncInterval = null
			}
			if (this._syncTimer) {
				clearTimeout(this._syncTimer)
				this._syncTimer = null
			}
		}
	}
</script>

<style>
	/* 引入 Google Fonts — 仅在 App/H5 端生效，小程序会 fallback 到系统字体 */
	// #ifndef MP-WEIXIN
	@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Noto+Sans+SC:wght@400;500;600;700&family=Source+Han+Serif+SC:wght@600;700&display=swap');
	// #endif
	/* ===== 设计系统 CSS 变量（浅色模式） ===== */
	page {
		--primary: #1B8A5A;
		--primary-hover: #15734B;
		--primary-light: #E8F5EE;
		--accent: #C4A46C;
		--accent-light: #F5EDE0;
		--surface: #F8F6F2;
		--surface-card: #FFFFFF;
		--surface-hover: #F0EDE6;
		--text-primary: #1E1E1E;
		--text-secondary: #5C5C5C;
		--text-muted: #9C9C9C;
		--border: #E8E4DC;
		--success: #1B8A5A;
		--warning: #C4A46C;
		--error: #B85C4A;
		--error-light: #FDF0ED;
		--info: #4A6B8A;
		--info-light: #EDF1F5;
		--radius-sm: 4px;
		--radius-md: 6px;
		--radius-lg: 12px;
		--radius-full: 20px;
		--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
		--shadow-md: 0 2px 8px rgba(0,0,0,0.06);
		--shadow-lg: 0 4px 16px rgba(0,0,0,0.08);
	}

	/* ===== 深色模式变量覆盖 ===== */
	page.dark-mode,
	.dark-mode page {
		--primary: #2ECC71;
		--primary-hover: #27AE60;
		--primary-light: #1a3a2a;
		--accent: #C4A46C;
		--accent-light: #2a2418;
		--surface: #1A1C1E;
		--surface-card: #242628;
		--surface-hover: #2F3133;
		--text-primary: #E8E8E8;
		--text-secondary: #A0A0A0;
		--text-muted: #6C6C6C;
		--border: #333538;
		--error-light: #2a1a1a;
		--info-light: #1a242a;
	}

	/* 全局样式 */
	page {
		background-color: var(--surface);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans SC', 'Helvetica Neue', sans-serif;
	}

	/* 数字/金额字体 — DM Sans + tabular-nums */
	.number, .amount, [class*="__amount"], [class*="__hours"], [class*="__num"],
	[class*="__value"], [class*="__pay"] {
		font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
		font-variant-numeric: tabular-nums;
	}

	/* 展示性标题 — 思源宋体 */
	.font-display, [class*="__title"]:not(.field-row__label):not(.section__title) {
		font-family: 'Source Han Serif SC', 'Noto Serif SC', serif;
		font-weight: 600;
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
