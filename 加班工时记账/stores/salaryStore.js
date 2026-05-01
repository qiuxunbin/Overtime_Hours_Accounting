import { defineStore } from 'pinia'
import { DEFAULT_SALARY_CONFIG } from '../utils/constants'

const LOCAL_KEY = 'salary_config'

function loadLocal() {
	try {
		const raw = uni.getStorageSync(LOCAL_KEY)
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

function saveLocal(config) {
	uni.setStorageSync(LOCAL_KEY, JSON.stringify(config))
}

function hasToken() {
	const token = uni.getStorageSync('uni_id_token')
	if (!token) return false
	const expired = uni.getStorageSync('uni_id_token_expired')
	if (expired && Date.now() > expired) return false
	return true
}

async function callOvertime(action, data = {}) {
	const token = uni.getStorageSync('uni_id_token')
	const res = await uniCloud.callFunction({
		name: 'overtime-calc',
		data: { action, token, ...data }
	})
	if (res.result?.code === 0) return res.result
	return null
}

export const useSalaryStore = defineStore('salary', {
	state: () => ({
		config: { ...DEFAULT_SALARY_CONFIG },
		cloudId: null
	}),

	getters: {
		weekdayRate: (state) => state.config.weekday_rate || 0,
		weekendRate: (state) => state.config.weekend_rate || 0,
		holidayRate: (state) => state.config.holiday_rate || 0,

		rateByType: (state) => (type) => {
			const map = { weekday: state.config.weekday_rate, weekend: state.config.weekend_rate, holiday: state.config.holiday_rate }
			return map[type] || 0
		}
	},

	actions: {
		async loadConfig() {
			// 1. 从本地加载（瞬间完成）
			const local = loadLocal()
			if (local) {
				this.config = { ...DEFAULT_SALARY_CONFIG, ...local }
			}

			// 2. 后台尝试云端拉取
			if (!hasToken()) return
			try {
				const res = await callOvertime('salaryGet')
				if (res?.data) {
					this.cloudId = res.data._id
					this.config = {
						weekday_rate: res.data.weekday_rate || 0,
						weekend_rate: res.data.weekend_rate || 0,
						holiday_rate: res.data.holiday_rate || 0,
						precision: res.data.precision || '15min'
					}
					saveLocal(this.config)
				}
			} catch (e) {
				// 本地数据已加载，云端不可用不影响
			}
		},

		async updateConfig(partial) {
			// 乐观更新 + 本地持久化
			this.config = { ...this.config, ...partial }
			saveLocal(this.config)

			// 尽力推送到云端
			if (!hasToken()) return
			try {
				const cloudData = {
					weekday_rate: this.config.weekday_rate,
					weekend_rate: this.config.weekend_rate,
					holiday_rate: this.config.holiday_rate,
					precision: this.config.precision
				}
				await callOvertime('salarySet', { data: cloudData })
			} catch (e) {
				// 本地已保存，云端下次同步
			}
		},

		resetConfig() {
			this.config = { ...DEFAULT_SALARY_CONFIG }
			saveLocal(this.config)
		}
	}
})
