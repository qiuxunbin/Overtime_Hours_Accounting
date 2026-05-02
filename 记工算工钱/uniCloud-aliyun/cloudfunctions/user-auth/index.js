'use strict'

const db = uniCloud.database()
const crypto = require('crypto')
const CONFIG = require('./config.js')

// ========== JWT 工具函数 ==========
function base64UrlDecode(str) {
	str = str.replace(/-/g, '+').replace(/_/g, '/')
	while (str.length % 4) str += '='
	return Buffer.from(str, 'base64').toString('utf-8')
}
function hmacSign(data, secret) {
	return crypto.createHmac('sha256', secret).update(data).digest('base64')
		.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function base64UrlEncode(str) {
	return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function createToken(payload) {
	const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
	const now = Math.floor(Date.now() / 1000)
	const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + CONFIG.tokenExpiresIn }))
	const signature = hmacSign(header + '.' + body, CONFIG.tokenSecret)
	return header + '.' + body + '.' + signature
}
function verifyToken(token) {
	const parts = token.split('.')
	if (parts.length !== 3) return null
	const [header, body, signature] = parts
	if (hmacSign(header + '.' + body, CONFIG.tokenSecret) !== signature) return null
	const payload = JSON.parse(base64UrlDecode(body))
	return payload.exp * 1000 < Date.now() ? null : payload
}
function getUidFromEvent(event) {
	const token = event.token || ''
	if (!token) return null
	const pl = verifyToken(token)
	return pl ? pl.uid : null
}

// ========== 主入口 ==========
exports.main = async (event, context) => {
	console.log('[user-auth] action:', event.action)
	try {
		switch (event.action) {
			case 'loginByWeixin':    return await loginByWeixin(event)
			case 'loginByPassword':   return await loginByPassword(event)
			case 'register':          return await register(event)
			case 'refreshToken':      return await refreshToken(event)
			case 'logout':            return await logout(event)
			case 'getUserInfo':       return await getUserInfo(event)
			case 'updateUserInfo':    return await updateUserInfo(event)
			default:                  return { code: 400, message: '未知动作: ' + event.action }
		}
	} catch (e) {
		console.log('[user-auth] 顶层错误:', e)
		return { code: -1, message: '服务器错误: ' + (e.message || '') }
	}
}

// ========== 微信登录 ==========
async function loginByWeixin(event) {
	const { code } = event
	if (!code) return { code: 400, message: '缺少 code' }
	try {
		const { appid, appsecret } = CONFIG.weixin
		const https = require('https')
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${appsecret}&js_code=${code}&grant_type=authorization_code`
		const wxRes = await new Promise((resolve, reject) => {
			https.get(wxUrl, (res) => {
				let data = ''
				res.on('data', chunk => data += chunk)
				res.on('end', () => resolve(data))
			}).on('error', reject)
		})
		const wxData = JSON.parse(wxRes)
		if (wxData.errcode) return { code: -1, message: '微信登录失败: ' + (wxData.errmsg || '') }
		const { openid, unionid } = wxData
		const { data } = await db.collection('uni-id-users').where({ wx_openid: openid }).limit(1).get()
		let uid, isNewUser = false
		if (data.length > 0) {
			uid = data[0]._id
		} else {
			const addRes = await db.collection('uni-id-users').add({
				wx_openid: openid, wx_unionid: unionid || '',
				nickname: '微信用户', register_date: Date.now()
			})
			uid = addRes.id; isNewUser = true
		}
		const token = createToken({ uid })
		return {
			code: 0, message: '登录成功',
			data: { uid, token, tokenExpired: Date.now() + CONFIG.tokenExpiresIn * 1000, isNewUser }
		}
	} catch (e) {
		console.log('[user-auth] loginByWeixin error:', e)
		return { code: -1, message: '登录异常: ' + (e.message || '') }
	}
}

// ========== 密码登录 ==========
async function loginByPassword(event) {
	const { username, password } = event
	if (!username || !password) return { code: 400, message: '缺少用户名或密码' }
	try {
		const { data } = await db.collection('uni-id-users').where({ username }).limit(1).get()
		if (!data.length) return { code: -1, message: '用户不存在' }
		const user = data[0]
		const secret = CONFIG.passwordSecret[0]
		const expected = crypto.createHmac('sha256', password + secret.version).update(password).digest('hex')
		if (user.password !== password && user.password !== expected) return { code: -1, message: '密码错误' }
		const token = createToken({ uid: user._id })
		return {
			code: 0, message: '登录成功',
			data: { uid: user._id, token, tokenExpired: Date.now() + CONFIG.tokenExpiresIn * 1000, isNewUser: false }
		}
	} catch (e) {
		console.log('[user-auth] loginByPassword error:', e)
		return { code: -1, message: '登录异常: ' + (e.message || '') }
	}
}

// ========== 注册 ==========
async function register(event) {
	const { username, password } = event
	if (!username || !password) return { code: 400, message: '缺少用户名或密码' }
	if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) return { code: 400, message: '用户名需3-20位字母或数字' }
	if (password.length < 6 || password.length > 20) return { code: 400, message: '密码需6-20位' }
	try {
		const { data: exist } = await db.collection('uni-id-users').where({ username }).limit(1).get()
		if (exist.length) return { code: -1, message: '用户名已存在' }
		const secret = CONFIG.passwordSecret[0]
		const hashed = crypto.createHmac('sha256', password + secret.version).update(password).digest('hex')
		const addRes = await db.collection('uni-id-users').add({ username, password: hashed, nickname: username, register_date: Date.now() })
		const token = createToken({ uid: addRes.id })
		return {
			code: 0, message: '注册成功',
			data: { uid: addRes.id, token, tokenExpired: Date.now() + CONFIG.tokenExpiresIn * 1000, isNewUser: true }
		}
	} catch (e) {
		console.log('[user-auth] register error:', e)
		return { code: -1, message: '注册异常: ' + (e.message || '') }
	}
}

// ========== 刷新/登出/查询/更新 Token ==========
async function refreshToken(event) {
	const uid = getUidFromEvent(event)
	if (!uid) return { code: 401, message: '未登录' }
	const token = createToken({ uid })
	return { code: 0, data: { token, tokenExpired: Date.now() + CONFIG.tokenExpiresIn * 1000 } }
}

async function logout(event) {
	const uid = getUidFromEvent(event)
	if (!uid) return { code: 401, message: '未登录' }
	await db.collection('uni-id-users').doc(uid).update({ token: [] })
	return { code: 0, message: '已登出' }
}

async function getUserInfo(event) {
	const uid = getUidFromEvent(event)
	if (!uid) return { code: 401, message: '未登录' }
	const { data } = await db.collection('uni-id-users').where({ _id: uid }).limit(1).get()
	return data.length ? { code: 0, data: data[0] } : { code: 404, message: '用户不存在' }
}

async function updateUserInfo(event) {
	const uid = getUidFromEvent(event)
	if (!uid) return { code: 401, message: '未登录' }
	const ud = {}
	if (event.nickname) ud.nickname = event.nickname
	if (event.avatar) ud.avatar_file = event.avatar
	if (!Object.keys(ud).length) return { code: 400, message: '没有要更新的字段' }
	await db.collection('uni-id-users').doc(uid).update(ud)
	return { code: 0, message: '更新成功' }
}
