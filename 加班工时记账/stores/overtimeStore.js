import { defineStore } from 'pinia'

function hasToken() {
	const token = uni.getStorageSync('uni_id_token')
	if (!token) return false
	const expired = uni.getStorageSync('uni_id_token_expired')
	if (expired && Date.now() > expired) return false
	return true
}

function requireAuth() {
	if (!hasToken()) {
		throw new Error('NOT_AUTH')
	}
}

async function callOvertime(action, data = {}) {
	const token = uni.getStorageSync('uni_id_token')
	const res = await uniCloud.callFunction({
		name: 'overtime-calc',
		data: { action, token, ...data }
	})
	if (res.result?.code === 0) return res.result
	if (res.result?.code === 401) throw new Error('NOT_AUTH')
	throw new Error(res.result?.message || '操作失败')
}

export const useOvertimeStore = defineStore('overtime', {
	state: () => ({
		records: [],
		currentMonth: '',
		loading: false
	}),

	getters: {
		monthRecords: (state) => {
			return state.records.filter(r => r.date?.startsWith(state.currentMonth))
		},

		recordsByDate: (state) => {
			const map = {}
			state.records.forEach(r => {
				if (!map[r.date]) map[r.date] = []
				map[r.date].push(r)
			})
			return map
		},

		monthTotalHours: (state) => {
			return state.records
				.filter(r => r.date?.startsWith(state.currentMonth))
				.reduce((sum, r) => sum + (r.duration || 0), 0)
		},

		recordDates: (state) => {
			return [...new Set(state.records.map(r => r.date))]
		}
	},

	actions: {
		async loadRecords() {
			if (!hasToken()) return
			this.loading = true
			try {
				const res = await callOvertime('list')
				this.records = (res.data || []).map(r => ({ ...r, id: r._id }))
			} catch (e) {
				this.records = []
			}
			this.loading = false
		},

		async addRecord(record) {
			requireAuth()
			const res = await callOvertime('add', { data: record })

			const newRecord = {
				...record,
				id: res.id,
				_id: res.id,
				created_at: Date.now()
			}

			this.records.unshift(newRecord)
			return { record: newRecord, duplicated: res.duplicated }
		},

		async updateRecord(id, data) {
			requireAuth()
			const res = await callOvertime('update', { id, data })
			if (res.duplicated) return { duplicated: true }

			const index = this.records.findIndex(r => r.id === id || r._id === id)
			if (index !== -1) {
				this.records[index] = {
					...this.records[index],
					...data,
					updated_at: Date.now()
				}
			}
			return { duplicated: false }
		},

		async deleteRecord(id) {
			requireAuth()
			await callOvertime('delete', { id })

			this.records = this.records.filter(r => r.id !== id && r._id !== id)
		},

		setCurrentMonth(month) {
			this.currentMonth = month
		}
	}
})
