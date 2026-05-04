'use strict'

const crypto = require('crypto')
const db = uniCloud.database()
const cmd = db.command

// ========== 配置 ==========
const SECRET = 'overtime-app-jwt-secret-change-in-production'
const TOKEN_EXPIRES_IN = 604800
const WEXIN_APPID = 'wxed059ca24650f6c3'
const WEXIN_APPSECRET = 'b86f314d2c3c0b75f495888e8b5be07e'
const PASSWORD_SECRET = [{ type: 'hmac-sha256', version: 1 }]

// ========== JWT 工具 ==========
function b64d(str) {
	str = str.replace(/-/g, '+').replace(/_/g, '/')
	while (str.length % 4) str += '='
	return Buffer.from(str, 'base64').toString('utf-8')
}
function b64e(str) {
	return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function hmac(data, secret) {
	return crypto.createHmac('sha256', secret).update(data).digest('base64')
		.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function createToken(payload) {
	const header = b64e(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
	const now = Math.floor(Date.now() / 1000)
	const body = b64e(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_EXPIRES_IN }))
	return header + '.' + body + '.' + hmac(header + '.' + body, SECRET)
}
function getUidFromEvent(event) {
	const token = event.token || ''
	if (!token) return null
	const parts = token.split('.')
	if (parts.length !== 3) return null
	const [h, b, s] = parts
	if (hmac(h + '.' + b, SECRET) !== s) return null
	const pl = JSON.parse(b64d(b))
	return pl.exp * 1000 < Date.now() ? null : pl.uid
}

// ========== 主入口 ==========
exports.main = async (event, context) => {
	const noAuthActions = [
		'loginByWeixin', 'loginByPassword', 'loginByUniverify',
		'register', 'sendSmsCode', 'loginBySms',
		'holidayQuery', 'holidayCheck'
	]

	if (noAuthActions.includes(event.action)) {
		return await handlePublicAction(event)
	}

	// sync 允许匿名设备（无 token）
	if (event.action === 'sync') {
		return await syncRecords(getUidFromEvent(event), event)
	}
	if (event.action === 'syncProjects') {
		return await syncProjects(getUidFromEvent(event), event)
	}

	const uid = getUidFromEvent(event)
	if (!uid) {
		return { code: 401, message: '请先登录' }
	}

	switch (event.action) {
		// 记工记录
		case 'summary':       return await getMonthlySummary(uid, event.year, event.month)
		case 'recalc':        return await recalcMonth(uid, event.year, event.month)
		case 'yearStats':     return await getYearStats(uid, event.year)
		case 'list':          return await listRecords(uid)
		case 'add':           return await addRecord(uid, event.data)
		case 'update':        return await updateRecord(uid, event.id, event.data)
		case 'delete':        return await deleteRecord(uid, event.id)
		// 薪资配置
		case 'salaryGet':     return await getSalaryConfig(uid)
		case 'salarySet':     return await setSalaryConfig(uid, event.data)
		// 工作管理
		case 'projectList':   return await listProjects(uid)
		case 'projectAdd':    return await addProject(uid, event.data)
		case 'projectUpdate': return await updateProject(uid, event.id, event.data)
		case 'projectDelete': return await deleteProject(uid, event.id)
		// 用户
		case 'refreshToken':  return await refreshToken(uid)
		case 'logout':        return await logout(uid)
		case 'getUserInfo':   return await getUserInfo(uid)
		case 'updateUserInfo':return await updateUserInfo(uid, event)
		// 数据备份
		case 'backupExport':  return await exportAll(uid)
		case 'backupImport':  return await importAll(uid, event)
		case 'backupInfo':    return await backupInfo(uid)
		// 意见反馈
		case 'feedbackSubmit': return await submitFeedback(uid, event)
		case 'feedbackList':  return await listFeedback(uid, event)
		case 'feedbackDetail':return await getFeedbackDetail(uid, event)
		// 节假日
		case 'holidayQuery':  return await queryHolidays(event.year)
		case 'holidayCheck':  return await checkHoliday(event.date)

		default: return { code: 400, message: '未知动作' }
	}
}

async function handlePublicAction(event) {
	switch (event.action) {
		case 'loginByWeixin':    return await loginByWeixin(event)
		case 'loginByPassword':  return await loginByPassword(event)
		case 'loginByUniverify': return await loginByUniverify(event)
		case 'register':         return await register(event)
		case 'sendSmsCode':      return { code: -1, message: '短信登录功能暂未开放' }
		case 'loginBySms':       return { code: -1, message: '短信登录功能暂未开放' }
		case 'holidayQuery':     return await queryHolidays(event.year)
		case 'holidayCheck':     return await checkHoliday(event.date)
		default: return { code: 400, message: '未知动作' }
	}
}

// ========== 记工记录 ==========

async function getMonthlySummary(uid, year, month) {
	const prefix = `${year}-${String(month).padStart(2, '0')}`
	const collection = db.collection('work-record')
	const { data: records } = await collection
		.where({ user_id: uid, date: new RegExp(`^${prefix}`) })
		.limit(1000)
		.get()

	const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
	const totalPay = records.reduce((s, r) => s + (r.pay || 0), 0)
	const totalDays = records.reduce((s, r) => s + (r.days || 0), 0)
	const totalQuantity = records.reduce((s, r) => s + (r.quantity || 0), 0)
	const breakdown = { weekday: { hours: 0, pay: 0 }, weekend: { hours: 0, pay: 0 }, holiday: { hours: 0, pay: 0 } }
	records.forEach(r => { const dt = r.day_type || r.overtime_type; if (dt && breakdown[dt]) { breakdown[dt].hours += r.duration || 0; breakdown[dt].pay += r.pay || 0 } })

	return { code: 0, data: { year, month, recordCount: records.length, totalHours: Math.round(totalHours * 100) / 100, totalPay: Math.round(totalPay * 100) / 100, totalDays: Math.round(totalDays * 100) / 100, totalQuantity: Math.round(totalQuantity * 100) / 100, breakdown, records } }
}

async function recalcMonth(uid, year, month) {
	const prefix = `${year}-${String(month).padStart(2, '0')}`

	const { data: projects } = await db.collection('project-config').where({ user_id: uid }).limit(100).get()
	const projMap = {}
	projects.forEach(p => { projMap[p._id] = p })

	const collection = db.collection('work-record')
	const { data: records } = await collection.where({ user_id: uid, date: new RegExp(`^${prefix}`) }).limit(1000).get()
	let updated = 0
	for (const rec of records) {
		const payMode = rec.pay_mode || 'hourly'
		const project = rec.project_id ? projMap[rec.project_id] : null
		let pay = 0, rate = 0

		switch (payMode) {
			case 'daily': {
				rate = project?.daily_rate || rec.daily_rate || 0
				pay = Math.round((rec.days || 1) * rate * 100) / 100
				break
			}
			case 'piece': {
				rate = project?.piece_rate || rec.piece_rate || 0
				pay = Math.round((rec.quantity || 0) * rate * 100) / 100
				break
			}
			case 'hourly':
			default: {
				const key = (rec.day_type || rec.overtime_type) + '_rate'
				const projRate = (project && project[key] > 0) ? project[key] : 0
				rate = projRate || rec.rate || 0
				pay = Math.round((rec.duration || 0) * rate * 100) / 100
				break
			}
		}

		const subsidies = typeof rec.subsidies === 'object'
			? ((rec.subsidies.night_shift || 0) + (rec.subsidies.meal || 0) + (rec.subsidies.transport || 0))
			: (rec.subsidies || 0)
		const deduction = typeof rec.deduction === 'object'
			? (rec.deduction.amount || 0)
			: (rec.deduction || 0)
		const netPay = Math.round((pay + subsidies - deduction) * 100) / 100

		if (pay !== rec.pay || rate !== rec.rate || netPay !== rec.net_pay) {
			await collection.doc(rec._id).update({ rate, pay, net_pay: netPay, updated_at: Date.now() })
			updated++
		}
	}
	return { code: 0, data: { updated, total: records.length } }
}

async function getYearStats(uid, year) {
	const { data: records } = await db.collection('work-record')
		.where({ user_id: uid, date: new RegExp(`^${String(year)}`) })
		.limit(5000).get()
	const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
	const totalPay = records.reduce((s, r) => s + (r.pay || 0), 0)
	const totalDays = records.reduce((s, r) => s + (r.days || 0), 0)
	const totalQuantity = records.reduce((s, r) => s + (r.quantity || 0), 0)
	const months = new Set()
	records.forEach(r => { if (r.date) months.add(r.date.slice(0, 7)) })
	return { code: 0, data: { year, totalHours: Math.round(totalHours * 100) / 100, totalPay: Math.round(totalPay * 100) / 100, totalDays: Math.round(totalDays * 100) / 100, totalQuantity: Math.round(totalQuantity * 100) / 100, recordCount: records.length, activeMonths: months.size, monthlyBreakdown: [...months].sort() } }
}

async function listRecords(uid) {
	const { data } = await db.collection('work-record')
		.where({ user_id: uid }).orderBy('created_at', 'desc').limit(1000).get()
	return { code: 0, data }
}

function validateRecord(record) {
	const mode = record.pay_mode || 'hourly'
	const errors = []
	switch (mode) {
		case 'hourly':
			if (!record.duration || record.duration <= 0) errors.push('时薪模式必须填写记工时长')
			if (!record.start_time) errors.push('时薪模式必须填写开始时间')
			if (!record.end_time) errors.push('时薪模式必须填写结束时间')
			if (!['weekday', 'weekend', 'holiday'].includes(record.day_type)) errors.push('日期类型无效')
			break
		case 'daily':
			if (!record.days || record.days < 1) errors.push('日薪模式必须填写天数')
			break
		case 'piece':
			if (record.quantity === undefined || record.quantity < 0) errors.push('计件模式必须填写数量')
			break
	}
	return errors
}

async function addRecord(uid, record) {
	const payMode = record.pay_mode || 'hourly'
	const errors = validateRecord(record)
	if (errors.length > 0) return { code: 400, message: errors.join('; ') }

	if (payMode === 'daily' || payMode === 'piece') {
		const data = { ...record, user_id: uid, created_at: Date.now() }
		const res = await db.collection('work-record').add(data)
		return { code: 0, id: res.id, data: { ...data, _id: res.id }, duplicated: false }
	}

	const dup = await db.collection('work-record')
		.where({
			user_id: uid,
			date: record.date,
			start_time: cmd.lt(record.end_time),
			end_time: cmd.gt(record.start_time)
		}).limit(1).get()
	if (dup.data.length > 0) return { code: 0, data: dup.data[0], duplicated: true }

	const data = { ...record, user_id: uid, created_at: Date.now() }
	const res = await db.collection('work-record').add(data)
	return { code: 0, id: res.id, data: { ...data, _id: res.id }, duplicated: false }
}

async function updateRecord(uid, id, record) {
	const { data: exist } = await db.collection('work-record').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '记录不存在' }
	const merged = { ...exist[0], ...record }
	const modeErrors = validateRecord(merged)
	if (modeErrors.length > 0) return { code: 400, message: modeErrors.join('; ') }
	if (record.date || record.start_time || record.end_time) {
		const date = record.date || exist[0].date
		const st = record.start_time || exist[0].start_time
		const et = record.end_time || exist[0].end_time
		const dup = await db.collection('work-record')
			.where({
				user_id: uid,
				date,
				start_time: cmd.lt(et),
				end_time: cmd.gt(st),
				_id: cmd.neq(id)
			}).limit(1).get()
		if (dup.data.length > 0) return { code: 0, duplicated: true }
	}
	await db.collection('work-record').doc(id).update({ ...record, updated_at: Date.now() })
	return { code: 0 }
}

async function deleteRecord(uid, id) {
	const { data: exist } = await db.collection('work-record').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '记录不存在' }
	await db.collection('work-record').doc(id).remove()
	return { code: 0 }
}

// ========== 薪资配置 ==========

async function getSalaryConfig(uid) {
	const { data } = await db.collection('salary-config').where({ user_id: uid }).limit(1).get()
	return { code: 0, data: data[0] || null }
}

async function setSalaryConfig(uid, config) {
	const { data } = await db.collection('salary-config').where({ user_id: uid }).limit(1).get()
	if (data.length > 0) {
		await db.collection('salary-config').doc(data[0]._id).update({ ...config, updated_at: Date.now() })
	} else {
		await db.collection('salary-config').add({ ...config, user_id: uid, updated_at: Date.now() })
	}
	return { code: 0 }
}

// ========== 批量同步 ==========

async function syncRecords(uid, event) {
	const { operations, device_id } = event
	const collection = db.collection('work-record')
	const idMappings = {}
	const conflicts = []
	const realUid = uid || null

	for (const op of (operations || [])) {
		try {
			switch (op.action) {
				case 'add': {
					const doc = { ...op.data }
					delete doc._id; delete doc.id; delete doc._synced; delete doc._updated_at

					if (realUid) {
						doc.user_id = realUid
						doc.device_id = null
					} else {
						doc.user_id = null
						doc.device_id = device_id || null
					}

					doc.created_at = doc.created_at || Date.now()
					doc.updated_at = Date.now()

					const vErrors = validateRecord(doc)
					if (vErrors.length > 0) {
						conflicts.push({ _id: op.id, reason: 'validation: ' + vErrors.join('; ') })
						continue
					}

					const res = await collection.add(doc)
					idMappings[op.id] = res.id
					break
				}

				case 'update': {
					const ownerFilter = realUid ? { user_id: realUid } : { device_id: device_id }
					const { data: exist } = await collection
						.where({ _id: op.id, ...ownerFilter }).limit(1).get()
					if (!exist.length) {
						conflicts.push({ _id: op.id, reason: 'not_found' })
						continue
					}

					const updateData = { ...op.data }
					delete updateData._id; delete updateData.id; delete updateData._synced; delete updateData._updated_at
					updateData.updated_at = Date.now()

					await collection.doc(op.id).update(updateData)
					break
				}

				case 'delete': {
					const ownerFilter = realUid ? { user_id: realUid } : { device_id: device_id }
					const { data: exist } = await collection
						.where({ _id: op.id, ...ownerFilter }).limit(1).get()
					if (exist.length) {
						await collection.doc(op.id).remove()
					}
					break
				}
			}
		} catch (e) {
			conflicts.push({ _id: op.id, reason: e.message })
		}
	}

	return { code: 0, id_mappings: idMappings, conflicts: conflicts, server_time: Date.now() }
}

// ========== 工作管理 ==========

async function listProjects(uid) {
	const { data } = await db.collection('project-config')
		.where({ user_id: uid }).orderBy('sort_order', 'asc').limit(100).get()
	return { code: 0, data }
}

async function addProject(uid, data) {
	const doc = { ...data, user_id: uid, created_at: Date.now(), updated_at: Date.now() }
	const res = await db.collection('project-config').add(doc)
	return { code: 0, id: res.id, data: { ...doc, _id: res.id } }
}

async function updateProject(uid, id, data) {
	const { data: exist } = await db.collection('project-config').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '工作不存在' }
	await db.collection('project-config').doc(id).update({ ...data, updated_at: Date.now() })
	return { code: 0 }
}

async function deleteProject(uid, id) {
	const { data: exist } = await db.collection('project-config').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '项目不存在' }
	await db.collection('project-config').doc(id).remove()
	return { code: 0 }
}

async function syncProjects(uid, event) {
	const { operations, device_id } = event
	const collection = db.collection('project-config')
	const idMappings = {}
	const conflicts = []
	const realUid = uid || null

	for (const op of (operations || [])) {
		try {
			switch (op.action) {
				case 'add': {
					const doc = { ...op.data }
					delete doc._id; delete doc.id; delete doc._synced; delete doc._updated_at

					if (realUid) {
						doc.user_id = realUid
						doc.device_id = null
					} else {
						doc.user_id = null
						doc.device_id = device_id || null
					}

					doc.created_at = doc.created_at || Date.now()
					doc.updated_at = Date.now()

					const res = await collection.add(doc)
					idMappings[op.id] = res.id
					break
				}

				case 'update': {
					const ownerFilter = realUid ? { user_id: realUid } : { device_id: device_id }
					const { data: exist } = await collection
						.where({ _id: op.id, ...ownerFilter }).limit(1).get()
					if (!exist.length) {
						conflicts.push({ _id: op.id, reason: 'not_found' })
						continue
					}
					const updateData = { ...op.data }
					delete updateData._id; delete updateData.id; delete updateData._synced; delete updateData._updated_at
					updateData.updated_at = Date.now()
					await collection.doc(op.id).update(updateData)
					break
				}

				case 'delete': {
					const ownerFilter = realUid ? { user_id: realUid } : { device_id: device_id }
					const { data: exist } = await collection
						.where({ _id: op.id, ...ownerFilter }).limit(1).get()
					if (exist.length) {
						await collection.doc(op.id).remove()
					}
					break
				}
			}
		} catch (e) {
			conflicts.push({ _id: op.id, reason: e.message })
		}
	}

	return { code: 0, id_mappings: idMappings, conflicts: conflicts, server_time: Date.now() }
}

// ========== 用户认证 ==========

async function loginByWeixin(event) {
	const { code } = event
	if (!code) return { code: 400, message: '缺少 code' }
	try {
		const https = require('https')
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WEXIN_APPID}&secret=${WEXIN_APPSECRET}&js_code=${code}&grant_type=authorization_code`
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
			data: { uid, token, tokenExpired: Date.now() + TOKEN_EXPIRES_IN * 1000, isNewUser }
		}
	} catch (e) {
		console.log('[work-calc] loginByWeixin error:', e)
		return { code: -1, message: '登录异常: ' + (e.message || '') }
	}
}

async function loginByPassword(event) {
	const { username, password } = event
	if (!username || !password) return { code: 400, message: '缺少用户名或密码' }
	try {
		const { data } = await db.collection('uni-id-users').where({ username }).limit(1).get()
		if (!data.length) return { code: -1, message: '用户不存在' }
		const user = data[0]
		const secret = PASSWORD_SECRET[0]
		const expected = crypto.createHmac('sha256', password + secret.version).update(password).digest('hex')
		if (user.password !== password && user.password !== expected) return { code: -1, message: '密码错误' }
		const token = createToken({ uid: user._id })
		return {
			code: 0, message: '登录成功',
			data: { uid: user._id, token, tokenExpired: Date.now() + TOKEN_EXPIRES_IN * 1000, isNewUser: false }
		}
	} catch (e) {
		console.log('[work-calc] loginByPassword error:', e)
		return { code: -1, message: '登录异常: ' + (e.message || '') }
	}
}

async function loginByUniverify(event) {
	return { code: -1, message: '一键登录功能暂未开放' }
}

async function register(event) {
	const { username, password } = event
	if (!username || !password) return { code: 400, message: '缺少用户名或密码' }
	if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) return { code: 400, message: '用户名需3-20位字母或数字' }
	if (password.length < 6 || password.length > 20) return { code: 400, message: '密码需6-20位' }
	try {
		const { data: exist } = await db.collection('uni-id-users').where({ username }).limit(1).get()
		if (exist.length) return { code: -1, message: '用户名已存在' }
		const secret = PASSWORD_SECRET[0]
		const hashed = crypto.createHmac('sha256', password + secret.version).update(password).digest('hex')
		const addRes = await db.collection('uni-id-users').add({ username, password: hashed, nickname: username, register_date: Date.now() })
		const token = createToken({ uid: addRes.id })
		return {
			code: 0, message: '注册成功',
			data: { uid: addRes.id, token, tokenExpired: Date.now() + TOKEN_EXPIRES_IN * 1000, isNewUser: true }
		}
	} catch (e) {
		console.log('[work-calc] register error:', e)
		return { code: -1, message: '注册异常: ' + (e.message || '') }
	}
}

async function refreshToken(uid) {
	const token = createToken({ uid })
	return { code: 0, data: { token, tokenExpired: Date.now() + TOKEN_EXPIRES_IN * 1000 } }
}

async function logout(uid) {
	await db.collection('uni-id-users').doc(uid).update({ token: [] })
	return { code: 0, message: '已登出' }
}

async function getUserInfo(uid) {
	const { data } = await db.collection('uni-id-users').where({ _id: uid }).limit(1).get()
	return data.length ? { code: 0, data: data[0] } : { code: 404, message: '用户不存在' }
}

async function updateUserInfo(uid, event) {
	const ud = {}
	if (event.nickname) ud.nickname = event.nickname
	if (event.avatar) ud.avatar_file = event.avatar
	if (!Object.keys(ud).length) return { code: 400, message: '没有要更新的字段' }
	await db.collection('uni-id-users').doc(uid).update(ud)
	return { code: 0, message: '更新成功' }
}

// ========== 节假日 ==========

async function queryHolidays(year) {
	const collection = db.collection('holiday-data')
	const { data } = await collection
		.where({ year: parseInt(year) })
		.limit(1)
		.get()

	if (data.length === 0) {
		return { code: 0, data: { year, holidays: [], message: '暂无该年份的节假日数据' } }
	}
	return { code: 0, data: data[0] }
}

async function checkHoliday(date) {
	if (!date) return { code: 400, message: '请提供日期 date (YYYY-MM-DD)' }

	const year = parseInt(date.slice(0, 4))
	const collection = db.collection('holiday-data')
	const { data } = await collection.where({ year }).limit(1).get()

	if (data.length === 0 || !data[0].holidays) {
		return { code: 0, data: { date, isHoliday: false, name: '' } }
	}

	const holiday = data[0].holidays.find(h => h.date === date)
	return { code: 0, data: { date, isHoliday: !!holiday, name: holiday ? holiday.name : '' } }
}

// ========== 数据备份 ==========

async function exportAll(uid) {
	const collections = ['work-record', 'salary-config', 'feedback']
	const backup = { version: 1, exported_at: new Date().toISOString(), user_id: uid, data: {} }

	for (const colName of collections) {
		const { data } = await db.collection(colName)
			.where({ user_id: uid })
			.limit(10000)
			.get()
		backup.data[colName] = data.map(record => {
			const { _id, ...rest } = record
			return rest
		})
	}
	return { code: 0, data: backup }
}

async function importAll(uid, event) {
	const { data: backupData, overwrite = false } = event
	if (!backupData || !backupData.data) {
		return { code: 400, message: '无效的备份数据格式' }
	}

	const collections = ['work-record', 'salary-config', 'feedback']
	const result = { imported: {}, skipped: {} }

	for (const colName of collections) {
		const records = backupData.data[colName]
		if (!records || !Array.isArray(records) || records.length === 0) {
			result.skipped[colName] = 0
			continue
		}

		const collection = db.collection(colName)

		if (overwrite) {
			const { deleted } = await collection.where({ user_id: uid }).remove()
			result.skipped[colName] = deleted
		}

		let imported = 0
		for (let i = 0; i < records.length; i += 50) {
			const batch = records.slice(i, i + 50).map(record => ({
				...record,
				user_id: uid,
				created_at: record.created_at || Date.now(),
				updated_at: Date.now()
			}))
			await collection.add(batch)
			imported += batch.length
		}
		result.imported[colName] = imported
	}

	return { code: 0, message: '数据导入完成', data: result }
}

async function backupInfo(uid) {
	const collections = ['work-record', 'salary-config', 'feedback']
	const info = {}

	for (const colName of collections) {
		const { data } = await db.collection(colName)
			.where({ user_id: uid })
			.limit(10000)
			.get()
		info[colName] = data.length
	}

	return {
		code: 0,
		data: {
			info,
			totalRecords: info['work-record'] || 0,
			hasSalaryConfig: (info['salary-config'] || 0) > 0,
			feedbackCount: info['feedback'] || 0
		}
	}
}

// ========== 意见反馈 ==========

async function submitFeedback(uid, event) {
	const { title, content, images } = event
	if (!title || !title.trim()) return { code: 400, message: '请输入反馈标题' }
	if (!content || !content.trim()) return { code: 400, message: '请输入反馈内容' }

	const { id } = await db.collection('feedback').add({
		user_id: uid,
		title: title.trim(),
		content: content.trim(),
		images: images || [],
		status: 'pending',
		created_at: Date.now()
	})

	return { code: 0, message: '反馈提交成功', data: { id } }
}

async function listFeedback(uid, event) {
	const { skip = 0, limit = 50 } = event || {}
	const { data } = await db.collection('feedback')
		.where({ user_id: uid })
		.orderBy('created_at', 'desc')
		.skip(skip)
		.limit(Math.min(limit, 100))
		.get()

	return {
		code: 0,
		data: data.map(item => ({
			id: item._id,
			title: item.title,
			content: item.content,
			status: item.status,
			created_at: item.created_at
		}))
	}
}

async function getFeedbackDetail(uid, event) {
	const { feedbackId } = event
	if (!feedbackId) return { code: 400, message: '请提供 feedbackId' }

	const { data } = await db.collection('feedback')
		.where({ _id: feedbackId, user_id: uid })
		.limit(1)
		.get()

	if (data.length === 0) return { code: 404, message: '反馈不存在' }
	return { code: 0, data: data[0] }
}
