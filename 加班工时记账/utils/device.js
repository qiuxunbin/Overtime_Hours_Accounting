/**
 * 匿名设备标识
 *
 * 生成设备级 UUID，无需登录即可使用全部功能。
 * 未登录用户的记录以 device_id 标识归属，登录后合并到用户账户。
 */

const STORAGE_KEY = 'device_id'

function generateUUID() {
	try {
		const info = uni.getSystemInfoSync()
		const seed = [
			info.platform || '',
			info.model || '',
			info.brand || '',
			Date.now().toString(36),
			Math.random().toString(36).substring(2, 8)
		].join('|')

		let hash = 0
		for (let i = 0; i < seed.length; i++) {
			const ch = seed.charCodeAt(i)
			hash = ((hash << 5) - hash) + ch
			hash = hash & hash
		}

		const parts = [
			Math.abs(hash).toString(16).padStart(8, '0'),
			Date.now().toString(36).padStart(8, '0'),
			Math.random().toString(36).substring(2, 6)
		]
		return parts.join('-')
	} catch {
		return 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6)
	}
}

export function getDeviceId() {
	let id = uni.getStorageSync(STORAGE_KEY)
	if (!id) {
		id = generateUUID()
		uni.setStorageSync(STORAGE_KEY, id)
	}
	return id
}

export function getOwner() {
	const token = uni.getStorageSync('uni_id_token')
	if (token) {
		try {
			const parts = token.split('.')
			if (parts.length === 3) {
				const payload = JSON.parse(atob(parts[1]))
				if (payload.uid) {
					return { type: 'user', id: payload.uid }
				}
			}
		} catch {
			// fall through to device
		}
	}
	return { type: 'device', id: getDeviceId() }
}
