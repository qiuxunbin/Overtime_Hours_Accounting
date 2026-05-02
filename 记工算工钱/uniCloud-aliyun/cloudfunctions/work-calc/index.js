'use strict'

const crypto = require('crypto')
const db = uniCloud.database()
const cmd = db.command
const SECRET = 'work-app-jwt-secret-change-in-production'

// ========== JWT 验证 ==========
function b64d(str) {
	str = str.replace(/-/g, '+').replace(/_/g, '/')
	while (str.length % 4) str += '='
	return Buffer.from(str, 'base64').toString('utf-8')
}
function hmac(data, secret) {
	return crypto.createHmac('sha256', secret).update(data).digest('base64')
		.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
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

exports.main = async (event, context) => {
	const uid = getUidFromEvent(event)

	// sync 动作允许无 token（使用 device_id）
	if (event.action === 'sync') {
		return await syncRecords(uid, event)
	}

	if (!uid) {
		return { code: 401, message: '请先登录' }

	}

	switch (event.action) {
		case 'summary':
			return await getMonthlySummary(uid, event.year, event.month)
		case 'recalc':
			return await recalcMonth(uid, event.year, event.month)
		case 'yearStats':
			return await getYearStats(uid, event.year)
		case 'list':
			return await listRecords(uid)
		case 'add':
			return await addRecord(uid, event.data)
		case 'update':
			return await updateRecord(uid, event.id, event.data)
		case 'delete':
			return await deleteRecord(uid, event.id)
		case 'salaryGet':
			return await getSalaryConfig(uid)
		case 'salarySet':
			return await setSalaryConfig(uid, event.data)

		case 'projectList':
			return await listProjects(uid)
		case 'projectAdd':
			return await addProject(uid, event.data)
		case 'projectUpdate':
			return await updateProject(uid, event.id, event.data)
		case 'projectDelete':
			return await deleteProject(uid, event.id)
		case 'syncProjects':
			return await syncProjects(uid, event)
		default:
			return { code: 400, message: '未知动作' }
	}
}

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
	records.forEach(r => { if (breakdown[r.day_type]) { breakdown[r.day_type].hours += r.duration || 0; breakdown[r.day_type].pay += r.pay || 0 } })

	return { code: 0, data: { year, month, recordCount: records.length, totalHours: Math.round(totalHours * 100) / 100, totalPay: Math.round(totalPay * 100) / 100, totalDays: Math.round(totalDays * 100) / 100, totalQuantity: Math.round(totalQuantity * 100) / 100, breakdown, records } }
}

async function recalcMonth(uid, year, month) {
	const prefix = `${year}-${String(month).padStart(2, '0')}`
	const { data: configs } = await db.collection('salary-config').where({ user_id: uid }).limit(1).get()
	const cfg = configs[0] || {}
	const rateMap = { weekday: cfg.weekday_rate || 0, weekend: cfg.weekend_rate || 0, holiday: cfg.holiday_rate || 0 }

	// 读取项目配置用于多模式费率
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
				rate = rec.daily_rate || project?.daily_rate || 0
				pay = Math.round((rec.days || 1) * rate * 100) / 100
				break
			}
			case 'piece': {
				rate = rec.piece_rate || project?.piece_rate || 0
				pay = Math.round((rec.quantity || 0) * rate * 100) / 100
				break
			}
			case 'hourly':
			default: {
				rate = rateMap[rec.day_type || rec.overtime_type] || rec.rate || 0
				pay = Math.round((rec.duration || 0) * rate * 100) / 100
				break
			}
		}

		// 计算 net_pay（补贴嵌套结构 {night_shift, meal, transport} / 扣款嵌套结构 {amount, note}）
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

	// 非时薪模式不检测时间段重叠
	if (payMode === 'daily' || payMode === 'piece') {
		const data = { ...record, user_id: uid, created_at: Date.now() }
		const res = await db.collection('work-record').add(data)
		return { code: 0, id: res.id, data: { ...data, _id: res.id }, duplicated: false }
	}

	// 时薪模式检测时间段重叠
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
	// 验证模式相关字段
	const merged = { ...exist[0], ...record }
	const modeErrors = validateRecord(merged)
	if (modeErrors.length > 0) return { code: 400, message: modeErrors.join('; ') }
	// 改时间时也要检测重叠（排除自身）
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

// ========== 批量同步（支持匿名设备） ==========

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
					delete doc._id
					delete doc.id
					delete doc._synced
					delete doc._updated_at

					// 有用户登录则使用 user_id，否则用 device_id
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
					delete updateData._id
					delete updateData.id
					delete updateData._synced
					delete updateData._updated_at
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

	return {
		code: 0,
		id_mappings: idMappings,
		conflicts: conflicts,
		server_time: Date.now()
	}
}

// ========== 项目管理 CRUD ==========

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
	if (!exist.length) return { code: 404, message: '项目不存在' }
	await db.collection('project-config').doc(id).update({ ...data, updated_at: Date.now() })
	return { code: 0 }
}

async function deleteProject(uid, id) {
	const { data: exist } = await db.collection('project-config').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '项目不存在' }
	await db.collection('project-config').doc(id).remove()
	return { code: 0 }
}

// ========== 项目批量同步（支持匿名设备） ==========

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
					delete doc._id
					delete doc.id
					delete doc._synced
					delete doc._updated_at

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
					delete updateData._id
					delete updateData.id
					delete updateData._synced
					delete updateData._updated_at
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
