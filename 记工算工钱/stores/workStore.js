import { defineStore } from 'pinia'
import { collection } from '@/utils/localStore'
import { getDeviceId, getOwner } from '@/utils/device'

import { requireAuth } from '@/utils/auth'

// 查重工具：时间字符串 → 分钟数
function toMinutes(t) { if (!t) return -1; const p = t.split(':'); return parseInt(p[0] || 0, 10) * 60 + parseInt(p[1] || 0, 10) }

const col = collection('work_records')

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
	if (res.result?.code === 401) throw new Error('NOT_AUTH')
	throw new Error(res.result?.message || '操作失败')
}

export const useWorkStore = defineStore('work', {
	state: () => ({
		records: [],
		currentMonth: '',
		loading: false,
		syncStatus: 'synced',     // synced | syncing | error | offline
		lastSyncAt: null,
		_syncQueue: [],
		_syncTimer: null
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
				.filter(r => r.date?.startsWith(state.currentMonth) && r.pay_mode === 'hourly')
				.reduce((sum, r) => sum + (r.duration || 0), 0)
		},

		recordDates: (state) => {
			return [...new Set(state.records.map(r => r.date))]
		},

		monthTotalDays: (state) => {
			return state.records
				.filter(r => r.date?.startsWith(state.currentMonth))
				.reduce((sum, r) => sum + (r.days || 0), 0)
		},

		monthTotalQuantity: (state) => {
			return state.records
				.filter(r => r.date?.startsWith(state.currentMonth))
				.reduce((sum, r) => sum + (r.quantity || 0), 0)
		},

		monthTotalPay: (state) => {
			return state.records
				.filter(r => r.date?.startsWith(state.currentMonth))
				.reduce((sum, r) => sum + (r.net_pay || r.pay || 0), 0)
		},

		monthBreakdown: (state) => {
			const def = () => ({ pay: 0, hours: 0, days: 0, qty: 0 })
			const bd = { weekday: def(), weekend: def(), holiday: def() }
			state.records
				.filter(r => r.date?.startsWith(state.currentMonth))
				.forEach(r => {
					const type = r.day_type || r.overtime_type || 'weekday'
					if (!bd[type]) bd[type] = def()
					bd[type].pay += r.net_pay || r.pay || 0
					bd[type].hours += r.duration || 0
					bd[type].days += r.days || 0
					bd[type].qty += r.quantity || 0
				})
			return bd
		},
	},

	actions: {
		/**
		 * 确保旧记录有多模式字段默认值
		 */
		_ensureRecordDefaults(r) {
			return {
				pay_mode: 'hourly',
				days: 1,
				quantity: 0,
				piece_rate: 0,
				daily_rate: 0,
				daily_weekday_rate: 0,
				daily_weekend_rate: 0,
				daily_holiday_rate: 0,
				piece_weekday_rate: 0,
				piece_weekend_rate: 0,
				piece_holiday_rate: 0,
				subsidies: { night_shift: 0, meal: 0, transport: 0 },
				deduction: { amount: 0, note: '' },
				...r,
				id: r._id
			}
		},


		// ========== 加载 ==========

		async loadRecords() {
			this.loading = true

			// 1. 从本地加载（瞬间完成）
			const localDocs = col.getAll()
			this.records = localDocs.map(r => this._ensureRecordDefaults(r))

			// 2. 后台尝试云同步（30s 去重）
			const MIN_SYNC_GAP = 30000
			if (hasToken()) {
				if (this.lastSyncAt && Date.now() - this.lastSyncAt < MIN_SYNC_GAP) {
					this.loading = false
					return
				}
				this.syncStatus = 'syncing'
				try {
					await this.pullFromCloud()
					this.syncStatus = 'synced'
					this.lastSyncAt = Date.now()
				} catch (e) {
					this.syncStatus = 'error'
				}
			} else {
				this.syncStatus = 'offline'
			}

			this.loading = false
		},

		// ========== CRUD — 本地优先 ==========

		async addRecord(record) {
			if (!requireAuth()) return
			const owner = getOwner()
			const payMode = record.pay_mode || 'hourly'
			const doc = {
				pay_mode: payMode,
				days: payMode === 'daily' ? (record.days || 1) : 1,
				quantity: payMode === 'piece' ? (record.quantity || 0) : 0,
				piece_rate: record.piece_rate || 0,
				daily_rate: record.daily_rate || 0,
				...record,
				user_id: owner.type === 'user' ? owner.id : null,
				device_id: owner.type === 'device' ? owner.id : null,
				created_at: record.created_at || Date.now(),
				settled: record.settled || false,
				project_id: record.project_id || null,
				subsidies: record.subsidies || { night_shift: 0, meal: 0, transport: 0 },
				deduction: record.deduction || { amount: 0, note: '' }
			}

			// 查重：相同日期+项目+时段禁止重复
			const dup = this.records.find(r => {
				if (r.date !== doc.date || r.project_id !== doc.project_id) return false
				if (payMode === 'hourly') {
					const s1 = toMinutes(r.start_time); const e1 = toMinutes(r.end_time)
					const s2 = toMinutes(doc.start_time); const e2 = toMinutes(doc.end_time)
					return s1 >= 0 && e1 >= 0 && s1 < e2 && s2 < e1
				}
				if (payMode === 'daily') return r.pay_mode === 'daily'
				if (payMode === 'piece') return r.pay_mode === 'piece'
				return false
			})
			if (dup) return { duplicated: true }

			const recordId = col.add(doc)
			const newRecord = { ...doc, _id: recordId, id: recordId }
			this.records.unshift(newRecord)

			this.enqueueSync('add', recordId, doc)

			return { record: newRecord, duplicated: false }
		},

		async updateRecord(id, data) {
			if (!requireAuth()) return
			col.update(id, data)

			const index = this.records.findIndex(r => r.id === id || r._id === id)
			if (index !== -1) {
				this.records[index] = {
					...this.records[index],
					...data,
					updated_at: Date.now()
				}
			}

			this.enqueueSync('update', id, data)

			return { duplicated: false }
		},

		async deleteRecord(id) {
			if (!requireAuth()) return { success: false, reason: 'no_auth' }
			col.remove(id)
			this.records = this.records.filter(r => r.id !== id && r._id !== id)
			this.enqueueSync('delete', id, null)
			return { success: true }
		},

		setCurrentMonth(month) {
			this.currentMonth = month
		},

		// ========== 同步队列 ==========

		enqueueSync(action, id, data) {
			this._syncQueue.push({ action, id, data, timestamp: Date.now() })
			this.syncStatus = 'syncing'

			clearTimeout(this._syncTimer)
			this._syncTimer = setTimeout(() => this.flushSyncQueue(), 2000)
		},

		async flushSyncQueue() {
			if (this._syncQueue.length === 0) return
			if (!hasToken()) {
				this.syncStatus = 'offline'
				return
			}

			const batch = [...this._syncQueue]
			this._syncQueue = []

			try {
				const res = await callWork('sync', {
					operations: batch,
					device_id: getDeviceId()
				})

				if (res.code === 0) {
					// 应用云端 ID 映射
					if (res.id_mappings) {
						for (const [localId, cloudId] of Object.entries(res.id_mappings)) {
							col.replaceId(localId, cloudId)
							const rec = this.records.find(r => r._id === localId || r.id === localId)
							if (rec) {
								rec._id = cloudId
								rec.id = cloudId
								rec._synced = true
							}
						}
					}
					this.syncStatus = 'synced'
					this.lastSyncAt = Date.now()
				} else {
					this._syncQueue = [...batch, ...this._syncQueue]
					this.syncStatus = 'error'
				}
			} catch (e) {
				// 本地数据完好，重新入队
				this._syncQueue = [...batch, ...this._syncQueue]
				this.syncStatus = 'error'
			}
		},

		// ========== 从云端拉取合并 ==========

		async pullFromCloud() {
			if (!hasToken()) return

			try {
				const res = await callWork('list')
				if (res.data && Array.isArray(res.data)) {
					const localDocs = col.getAll()
					const localMap = new Map(localDocs.map(r => [r._id, r]))

					for (const cloudRec of res.data) {
						const localRec = localMap.get(cloudRec._id)
						const cloudTime = cloudRec.updated_at || 0
						const localTime = localRec ? (localRec._updated_at || 0) : 0

						if (localRec && localTime > cloudTime) {
							// 本地更新 → 推送到云端
							this.enqueueSync('update', cloudRec._id, {
								...localRec,
								_id: undefined,
								id: undefined,
								_synced: undefined,
								_updated_at: undefined
							})
						} else if (!localRec || cloudTime >= localTime) {
							// 云端更新 → 覆盖本地
							col.upsert(cloudRec._id, {
								...cloudRec,
								_synced: true,
								_updated_at: cloudRec.updated_at || Date.now()
							})
						}
					}

					// 重新加载到 Pinia state
					this.records = col.getAll().map(r => this._ensureRecordDefaults(r))
				}
			} catch (e) {
				// 静默失败，本地数据完好
			}
		},

		// ========== 登录合并 ==========

		async mergeOnLogin(uid) {
			const deviceId = getDeviceId()
			const localDocs = col.getAll()
			let changed = false

			for (const rec of localDocs) {
				if (rec.device_id === deviceId && !rec.user_id) {
					col.update(rec._id, {
						user_id: uid,
						device_id: null,
						_updated_at: Date.now(),
						_synced: false
					})
					changed = true
				}
			}

			if (changed) {
				this.records = col.getAll().map(r => this._ensureRecordDefaults(r))
			}

			// 拉取云端数据合并，再推送本地变更
			try {
				await this.pullFromCloud()
				await this.flushSyncQueue()
				this.syncStatus = 'synced'
				this.lastSyncAt = Date.now()
			} catch (e) {
				// 静默
			}
		}
	}
})
