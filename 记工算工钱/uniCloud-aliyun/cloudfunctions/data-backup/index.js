'use strict'

const db = uniCloud.database()

/**
 * 数据备份恢复服务
 *
 * 动作：
 *   export - 导出用户全部数据（加班记录、薪资配置、反馈）
 *   import - 导入恢复数据
 *   backupInfo - 查看备份概况
 */
exports.main = async (event, context) => {
	const uid = context.UNIID_USER?._id
	if (!uid) {
		return { code: 401, message: '请先登录' }
	}

	const { action } = event

	switch (action) {
		case 'export':
			return await exportAll(uid)
		case 'import':
			return await importAll(uid, event)
		case 'backupInfo':
			return await backupInfo(uid)
		default:
			return { code: 400, message: '未知动作，支持: export / import / backupInfo' }
	}
}

/**
 * 导出全部数据
 */
async function exportAll(uid) {
	const collections = ['work-record', 'salary-config', 'feedback']

	const backup = {
		version: 1,
		exported_at: new Date().toISOString(),
		user_id: uid,
		data: {}
	}

	for (const colName of collections) {
		const { data } = await db.collection(colName)
			.where({ user_id: uid })
			.limit(10000)
			.get()

		backup.data[colName] = data.map(record => {
			// 移除 _id 便于跨账号导入
			const { _id, ...rest } = record
			return rest
		})
	}

	return {
		code: 0,
		data: backup
	}
}

/**
 * 导入恢复数据
 * @param {Object} event.data - 备份数据对象
 * @param {boolean} event.overwrite - 是否覆盖已有数据
 */
async function importAll(uid, { data: backupData, overwrite = false }) {
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
			// 先删除旧数据
			const { deleted } = await collection.where({ user_id: uid }).remove()
			result.skipped[colName] = deleted
		}

		// 批量写入新数据，每批最多 50 条
		let imported = 0
		for (let i = 0; i < records.length; i += 50) {
			const batch = records.slice(i, i + 50).map(record => ({
				...record,
				user_id: uid, // 绑定到当前用户
				created_at: record.created_at || Date.now(),
				updated_at: Date.now()
			}))
			await collection.add(batch)
			imported += batch.length
		}

		result.imported[colName] = imported
	}

	return {
		code: 0,
		message: '数据导入完成',
		data: result
	}
}

/**
 * 查看备份概况
 */
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
