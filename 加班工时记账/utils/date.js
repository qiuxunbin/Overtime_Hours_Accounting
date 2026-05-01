/**
 * 加班工时记账 — 日期工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|number} date
 * @returns {string}
 */
export function formatDate(date) {
	const d = new Date(date)
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 YYYY-MM
 * @param {Date|number} date
 * @returns {string}
 */
export function formatMonth(date) {
	const d = new Date(date)
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 获取某个月的天数
 * @param {number} year
 * @param {number} month (0-11)
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
	return new Date(year, month + 1, 0).getDate()
}

/**
 * 获取某个月第一天是星期几 (0=周日, 1=周一, ...)
 * @param {number} year
 * @param {number} month (0-11)
 * @returns {number}
 */
export function getFirstDayOfMonth(year, month) {
	return new Date(year, month, 1).getDay()
}

/**
 * 获取当前年月
 * @returns {{ year: number, month: number }}
 */
export function getCurrentYearMonth() {
	const now = new Date()
	return { year: now.getFullYear(), month: now.getMonth() }
}

/**
 * 判断是否为同一天
 * @param {Date|number} date1
 * @param {Date|number} date2
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
	const d1 = new Date(date1)
	const d2 = new Date(date2)
	return d1.getFullYear() === d2.getFullYear() &&
		d1.getMonth() === d2.getMonth() &&
		d1.getDate() === d2.getDate()
}

/**
 * 获取中文星期
 * @param {Date|number} date
 * @returns {string}
 */
export function getWeekdayName(date) {
	const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
	return days[new Date(date).getDay()]
}

/**
 * 获取日期范围的所有日期
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string[]} 日期数组
 */
export function getDateRange(startDate, endDate) {
	const dates = []
	const start = new Date(startDate)
	const end = new Date(endDate)
	const current = new Date(start)
	while (current <= end) {
		dates.push(formatDate(current))
		current.setDate(current.getDate() + 1)
	}
	return dates
}

/**
 * 计算两个时间点的时长（小时）
 * @param {string} startTime - "19:00"
 * @param {string} endTime - "22:30"
 * @returns {number}
 */
export function calcDuration(startTime, endTime) {
	const [sh, sm] = startTime.split(':').map(Number)
	const [eh, em] = endTime.split(':').map(Number)
	const startMinutes = sh * 60 + sm
	const endMinutes = eh * 60 + em
	let diff = endMinutes - startMinutes
	if (diff < 0) diff += 24 * 60
	return Math.round((diff / 60) * 100) / 100
}

/**
 * 小时数按精度进位
 * @param {number} hours
 * @param {string} precision - 15min | 30min | 60min | exact
 * @returns {number}
 */
export function roundByPrecision(hours, precision) {
	switch (precision) {
		case '15min':
			return Math.ceil(hours * 4) / 4
		case '30min':
			return Math.ceil(hours * 2) / 2
		case '60min':
			return Math.ceil(hours)
		case 'exact':
			return Math.round(hours * 100) / 100
		default:
			return hours
	}
}
