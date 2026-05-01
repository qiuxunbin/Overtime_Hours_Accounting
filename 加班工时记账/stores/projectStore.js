import { defineStore } from 'pinia'
import { collection } from '@/utils/localStore'
import { getDeviceId, getOwner } from '@/utils/device'
import { DEFAULT_PROJECT_CONFIG } from '@/utils/constants'

const col = collection('projects')

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
	if (res.result?.code === 401) throw new Error('NOT_AUTH')
	throw new Error(res.result?.message || '操作失败')
}

export const useProjectStore = defineStore('project', {
	state: () => ({
		projects: [],
		syncStatus: 'synced',
		lastSyncAt: null,
		_syncQueue: [],
		_syncTimer: null
	}),

	getters: {
		activeProjects: (state) => {
			return state.projects
				.filter(p => !p.is_archived)
				.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
		},

		archivedProjects: (state) => {
			return state.projects.filter(p => p.is_archived)
		},

		getProjectById: (state) => (id) => {
			return state.projects.find(p => p._id === id) || null
		}
	},

	actions: {
		// ========== 加载 ==========

		async loadProjects() {
			// 1. 从本地加载
			const localDocs = col.getAll()
			this.projects = localDocs.map(p => ({ ...p, id: p._id }))

			// 2. 后台尝试云同步
			if (hasToken()) {
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
		},

		// ========== CRUD — 本地优先 ==========

		async addProject(data) {
			const owner = getOwner()
			const doc = {
				...DEFAULT_PROJECT_CONFIG,
				...data,
				user_id: owner.type === 'user' ? owner.id : null,
				device_id: owner.type === 'device' ? owner.id : null,
				created_at: Date.now()
			}

			const id = col.add(doc)
			const newProject = { ...doc, _id: id, id }
			this.projects.push(newProject)

			this.enqueueSync('add', id, doc)

			return newProject
		},

		async updateProject(id, data) {
			col.update(id, data)

			const index = this.projects.findIndex(p => p.id === id || p._id === id)
			if (index !== -1) {
				this.projects[index] = {
					...this.projects[index],
					...data,
					updated_at: Date.now()
				}
			}

			this.enqueueSync('update', id, data)
		},

		async deleteProject(id) {
			col.remove(id)
			this.projects = this.projects.filter(p => p.id !== id && p._id !== id)
			this.enqueueSync('delete', id, null)
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
				const res = await callOvertime('syncProjects', {
					operations: batch,
					device_id: getDeviceId()
				})

				if (res.code === 0) {
					if (res.id_mappings) {
						for (const [localId, cloudId] of Object.entries(res.id_mappings)) {
							col.update(localId, { _id: cloudId, _synced: true, updated_at: Date.now() })
							const proj = this.projects.find(p => p._id === localId || p.id === localId)
							if (proj) {
								proj._id = cloudId
								proj.id = cloudId
								proj._synced = true
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
				this._syncQueue = [...batch, ...this._syncQueue]
				this.syncStatus = 'error'
			}
		},

		async pullFromCloud() {
			if (!hasToken()) return

			try {
				const res = await callOvertime('projectList')
				if (res.data && Array.isArray(res.data)) {
					const localDocs = col.getAll()
					const localMap = new Map(localDocs.map(p => [p._id, p]))

					for (const cloudProj of res.data) {
						const localProj = localMap.get(cloudProj._id)
						const cloudTime = cloudProj.updated_at || 0
						const localTime = localProj ? (localProj._updated_at || 0) : 0

						if (localProj && localTime > cloudTime) {
							this.enqueueSync('update', cloudProj._id, {
								...localProj,
								_id: undefined,
								id: undefined,
								_synced: undefined,
								_updated_at: undefined
							})
						} else if (!localProj || cloudTime >= localTime) {
							col.update(cloudProj._id, {
								...cloudProj,
								_synced: true,
								_updated_at: cloudProj.updated_at || Date.now()
							})
						}
					}

					this.projects = col.getAll().map(p => ({ ...p, id: p._id }))
				}
			} catch (e) {
				// 静默
			}
		},

		async mergeOnLogin(uid) {
			const deviceId = getDeviceId()
			const localDocs = col.getAll()
			let changed = false

			for (const proj of localDocs) {
				if (proj.device_id === deviceId && !proj.user_id) {
					col.update(proj._id, {
						user_id: uid,
						device_id: null,
						_updated_at: Date.now(),
						_synced: false
					})
					changed = true
				}
			}

			if (changed) {
				this.projects = col.getAll().map(p => ({ ...p, id: p._id }))
			}

			try {
				await this.pullFromCloud()
				await this.flushSyncQueue()
			} catch (e) {
				// 静默
			}
		}
	}
})
