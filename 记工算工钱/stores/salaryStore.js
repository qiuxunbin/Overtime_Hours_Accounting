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

async function callWork(action, data = {}) {
	const token = uni.getStorageSync('uni_id_token')
	const res = await uniCloud.callFunction({
		name: 'work-calc',
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
			const local = loadLocal()
			if (local) {
				this.config = { ...DEFAULT_SALARY_CONFIG, ...local }
			}

			if (!hasToken()) return
			try {
				const res = await callWork('salaryGet')
				if (res?.data) {
					this.cloudId = res.data._id
					this.config = {
						pay_mode: res.data.pay_mode || 'hourly',
						weekday_rate: res.data.weekday_rate || 0,
						weekend_rate: res.data.weekend_rate || 0,
						holiday_rate: res.data.holiday_rate || 0,
						daily_rate: res.data.daily_rate || 0,
						piece_rate: res.data.piece_rate || 0,
						piece_unit: res.data.piece_unit || '件',
						precision: res.data.precision || '15min'
					}
					saveLocal(this.config)
				}
			} catch (e) {}
		},

		async updateConfig(partial) {
			this.config = { ...this.config, ...partial }
			saveLocal(this.config)

			if (!hasToken()) return
			try {
				await callWork('salarySet', {
					data: {
						pay_mode: this.config.pay_mode || 'hourly',
						weekday_rate: this.config.weekday_rate,
						weekend_rate: this.config.weekend_rate,
						holiday_rate: this.config.holiday_rate,
						daily_rate: this.config.daily_rate || 0,
						piece_rate: this.config.piece_rate || 0,
						piece_unit: this.config.piece_unit || '件',
						precision: this.config.precision
					}
				})
			} catch (e) {}
		},

		resetConfig() {
			this.config = { ...DEFAULT_SALARY_CONFIG }
			saveLocal(this.config)
		}
	}
})
