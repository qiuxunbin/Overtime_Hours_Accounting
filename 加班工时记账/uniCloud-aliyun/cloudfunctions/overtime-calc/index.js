'use strict'

const crypto = require('crypto')
const db = uniCloud.database()
const cmd = db.command
const SECRET = 'overtime-app-jwt-secret-change-in-production'

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
		default:
			return { code: 400, message: '未知动作' }
	}
}

async function getMonthlySummary(uid, year, month) {
	const prefix = `${year}-${String(month).padStart(2, '0')}`
	const collection = db.collection('overtime-record')
	const { data: records } = await collection
		.where({ user_id: uid, date: new RegExp(`^${prefix}`) })
		.limit(1000)
		.get()

	const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
	const totalPay = records.reduce((s, r) => s + (r.pay || 0), 0)
	const breakdown = { weekday: { hours: 0, pay: 0 }, weekend: { hours: 0, pay: 0 }, holiday: { hours: 0, pay: 0 } }
	records.forEach(r => { if (breakdown[r.overtime_type]) { breakdown[r.overtime_type].hours += r.duration || 0; breakdown[r.overtime_type].pay += r.pay || 0 } })

	return { code: 0, data: { year, month, recordCount: records.length, totalHours: Math.round(totalHours * 100) / 100, totalPay: Math.round(totalPay * 100) / 100, breakdown, records } }
}

async function recalcMonth(uid, year, month) {
	const prefix = `${year}-${String(month).padStart(2, '0')}`
	const { data: configs } = await db.collection('salary-config').where({ user_id: uid }).limit(1).get()
	const cfg = configs[0] || { weekday_rate: 0, weekend_rate: 0, holiday_rate: 0 }
	const rateMap = { weekday: cfg.weekday_rate || 0, weekend: cfg.weekend_rate || 0, holiday: cfg.holiday_rate || 0 }
	const collection = db.collection('overtime-record')
	const { data: records } = await collection.where({ user_id: uid, date: new RegExp(`^${prefix}`) }).limit(1000).get()
	let updated = 0
	for (const rec of records) {
		const rate = rateMap[rec.overtime_type] || rec.rate || 0
		const pay = Math.round((rec.duration || 0) * rate * 100) / 100
		if (pay !== rec.pay || rate !== rec.rate) {
			await collection.doc(rec._id).update({ rate, pay, updated_at: Date.now() })
			updated++
		}
	}
	return { code: 0, data: { updated, total: records.length } }
}

async function getYearStats(uid, year) {
	const { data: records } = await db.collection('overtime-record')
		.where({ user_id: uid, date: new RegExp(`^${String(year)}`) })
		.limit(5000).get()
	const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
	const totalPay = records.reduce((s, r) => s + (r.pay || 0), 0)
	const months = new Set()
	records.forEach(r => { if (r.date) months.add(r.date.slice(0, 7)) })
	return { code: 0, data: { year, totalHours: Math.round(totalHours * 100) / 100, totalPay: Math.round(totalPay * 100) / 100, recordCount: records.length, activeMonths: months.size, monthlyBreakdown: [...months].sort() } }
}

async function listRecords(uid) {
	const { data } = await db.collection('overtime-record')
		.where({ user_id: uid }).orderBy('created_at', 'desc').limit(1000).get()
	return { code: 0, data }
}

async function addRecord(uid, record) {
	// 检测时间段重叠：同一天已存在 a—b，新加 x—y 满足 a<y 且 b>x 即重叠
	const dup = await db.collection('overtime-record')
		.where({
			user_id: uid,
			date: record.date,
			start_time: cmd.lt(record.end_time),
			end_time: cmd.gt(record.start_time)
		}).limit(1).get()
	if (dup.data.length > 0) return { code: 0, data: dup.data[0], duplicated: true }

	const data = { ...record, user_id: uid, created_at: Date.now() }
	const res = await db.collection('overtime-record').add(data)
	return { code: 0, id: res.id, data: { ...data, _id: res.id }, duplicated: false }
}

async function updateRecord(uid, id, record) {
	const { data: exist } = await db.collection('overtime-record').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '记录不存在' }
	// 改时间时也要检测重叠（排除自身）
	if (record.date || record.start_time || record.end_time) {
		const date = record.date || exist[0].date
		const st = record.start_time || exist[0].start_time
		const et = record.end_time || exist[0].end_time
		const dup = await db.collection('overtime-record')
			.where({
				user_id: uid,
				date,
				start_time: cmd.lt(et),
				end_time: cmd.gt(st),
				_id: cmd.neq(id)
			}).limit(1).get()
		if (dup.data.length > 0) return { code: 0, duplicated: true }
	}
	await db.collection('overtime-record').doc(id).update({ ...record, updated_at: Date.now() })
	return { code: 0 }
}

async function deleteRecord(uid, id) {
	const { data: exist } = await db.collection('overtime-record').where({ _id: id, user_id: uid }).limit(1).get()
	if (!exist.length) return { code: 404, message: '记录不存在' }
	await db.collection('overtime-record').doc(id).remove()
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
