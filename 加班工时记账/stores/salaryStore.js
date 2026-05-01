import { defineStore } from 'pinia'
import { DEFAULT_SALARY_CONFIG } from '../utils/constants'

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
			const token = uni.getStorageSync('uni_id_token')
			if (!token) return
			const expired = uni.getStorageSync('uni_id_token_expired')
			if (expired && Date.now() > expired) return
			try {
				const res = await callOvertime('salaryGet')
				if (res?.data) {
					this.cloudId = res.data._id
					this.config = {
						weekday_rate: res.data.weekday_rate || 0,
						weekend_rate: res.data.weekend_rate || 0,
						holiday_rate: res.data.holiday_rate || 0
					}
				}
			} catch (e) {
				// 云端不可用，保持当前配置
			}
		},

		async updateConfig(partial) {
			this.config = { ...this.config, ...partial }

			const token = uni.getStorageSync('uni_id_token')
			if (!token) return
			const expired = uni.getStorageSync('uni_id_token_expired')
			if (expired && Date.now() > expired) return

			try {
				const cloudData = {
					weekday_rate: this.config.weekday_rate,
					weekend_rate: this.config.weekend_rate,
					holiday_rate: this.config.holiday_rate
				}
				await callOvertime('salarySet', { data: cloudData })
			} catch (e) {
				// 云端保存失败，本地配置仍保留
			}
		},

		resetConfig() {
			this.config = { ...DEFAULT_SALARY_CONFIG }
		}
	}
})
