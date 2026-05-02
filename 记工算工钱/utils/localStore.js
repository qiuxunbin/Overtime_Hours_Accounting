/**
 * 本地存储层 — 基于 uni.setStorageSync 的轻量 NoSQL
 *
 * 用法:
 *   import { collection } from '@/utils/localStore'
 *   const col = collection('work_records')
 *   col.add({ date: '2026-01-01', duration: 2 })
 *   const all = col.getAll()
 */

const PREFIX = 'local:'

function makeKey(name) {
	return PREFIX + name
}

function readAll(name) {
	try {
		const raw = uni.getStorageSync(makeKey(name))
		return raw ? JSON.parse(raw) : {}
	} catch {
		return {}
	}
}

function writeAll(name, data) {
	uni.setStorageSync(makeKey(name), JSON.stringify(data))
}

let idCounter = 0

function generateId() {
	idCounter++
	const ts = Date.now().toString(36)
	const rand = Math.random().toString(36).substring(2, 6)
	return `local_${ts}${rand}_${idCounter}`
}

export function collection(name) {
	return {
		getAll() {
			const map = readAll(name)
			return Object.values(map)
		},

		getById(id) {
			const map = readAll(name)
			return map[id] || null
		},

		setAll(docs) {
			const map = {}
			for (const doc of docs) {
				map[doc._id] = doc
			}
			writeAll(name, map)
		},

		add(doc) {
			const map = readAll(name)
			const id = doc._id || generateId()
			const record = {
				...doc,
				_id: id,
				created_at: doc.created_at || Date.now(),
				_updated_at: Date.now(),
				_synced: false
			}
			map[id] = record
			writeAll(name, map)
			return id
		},

		update(id, data) {
			const map = readAll(name)
			if (map[id]) {
				map[id] = { ...map[id], ...data, _updated_at: Date.now(), _synced: false }
				writeAll(name, map)
			}
		},

		remove(id) {
			const map = readAll(name)
			delete map[id]
			writeAll(name, map)
		},

		clear() {
			uni.setStorageSync(makeKey(name), JSON.stringify({}))
		},

		count() {
			const map = readAll(name)
			return Object.keys(map).length
		}
	}
}
