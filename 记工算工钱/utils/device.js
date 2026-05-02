/**
 * 匿名设备标识
 *
 * 生成设备级 UUID，无需登录即可使用全部功能。
 * 未登录用户的记录以 device_id 标识归属，登录后合并到用户账户。
 */

const STORAGE_KEY = 'device_id'

// 跨平台 base64 解码 — atob() 在微信小程序基础库 < 2.24.0 上不可用
function base64Decode(str) {
	// #ifdef MP-WEIXIN
	try {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
		let output = ''
		let i = 0
		str = str.replace(/[^A-Za-z0-9+/=]/g, '')
		while (i < str.length) {
			const e1 = chars.indexOf(str.charAt(i++))
			const e2 = chars.indexOf(str.charAt(i++))
			const e3 = chars.indexOf(str.charAt(i++))
			const e4 = chars.indexOf(str.charAt(i++))
			const c1 = (e1 << 2) | (e2 >> 4)
			const c2 = ((e2 & 15) << 4) | (e3 >> 2)
			const c3 = ((e3 & 3) << 6) | e4
			output += String.fromCharCode(c1)
			if (e3 !== 64) output += String.fromCharCode(c2)
			if (e4 !== 64) output += String.fromCharCode(c3)
		}
		return decodeURIComponent(Array.prototype.map.call(output, function(c) {
			return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
		}).join(''))
	} catch { return '' }
	// #endif
	// #ifndef MP-WEIXIN
	try { return atob(str) } catch { return '' }
	// #endif
}

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
				const payload = JSON.parse(base64Decode(parts[1]))
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
