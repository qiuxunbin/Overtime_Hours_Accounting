'use strict'

const db = uniCloud.database()

/**
 * 节假日数据服务
 *
 * 动作：
 *   query   - 查询指定年份的节假日列表
 *   isHoliday - 判断某个日期是否为法定节假日
 */
exports.main = async (event, context) => {
	const { action, year, date } = event

	switch (action) {
		case 'query':
			return await queryHolidays(year)
		case 'isHoliday':
			return await checkHoliday(date)
		default:
			return { code: 400, message: '未知动作，支持: query / isHoliday' }
	}
}

/**
 * 查询指定年份的节假日
 */
async function queryHolidays(year) {
	const collection = db.collection('holiday-data')

	const { data } = await collection
		.where({ year: parseInt(year) })
		.limit(1)
		.get()

	if (data.length === 0) {
		return {
			code: 0,
			data: { year, holidays: [], message: '暂无该年份的节假日数据' }
		}
	}

	return {
		code: 0,
		data: data[0]
	}
}

/**
 * 判断某个日期是否为法定节假日
 * @param {string} date - YYYY-MM-DD
 */
async function checkHoliday(date) {
	if (!date) {
		return { code: 400, message: '请提供日期 date (YYYY-MM-DD)' }
	}

	const year = parseInt(date.slice(0, 4))
	const collection = db.collection('holiday-data')

	const { data } = await collection
		.where({ year })
		.limit(1)
		.get()

	if (data.length === 0 || !data[0].holidays) {
		return {
			code: 0,
			data: { date, isHoliday: false, name: '' }
		}
	}

	const holiday = data[0].holidays.find(h => h.date === date)

	return {
		code: 0,
		data: {
			date,
			isHoliday: !!holiday,
			name: holiday ? holiday.name : ''
		}
	}
}
