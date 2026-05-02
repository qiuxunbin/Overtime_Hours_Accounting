/**
 * 加班费计算工具 — PLAN.md v2.0 8.5
 */
import { getOvertimeType } from './holidays'

export function round2(num) {
	return Math.round(num * 100) / 100
}

/**
 * 计算时长（根据精度取整）
 * @param {string} startTime - HH:MM
 * @param {string} endTime - HH:MM
 * @param {string} precision - 15min|30min|60min|exact
 */
export function calcDuration(startTime, endTime, precision = 'exact') {
	const [sh, sm] = startTime.split(':').map(Number)
	const [eh, em] = endTime.split(':').map(Number)
	const minutes = eh * 60 + em - (sh * 60 + sm)
	if (minutes <= 0) return 0

	switch (precision) {
		case '15min': return Math.floor(minutes / 15) * 15 / 60
		case '30min': return Math.floor(minutes / 30) * 30 / 60
		case '60min': return Math.floor(minutes / 60) * 60 / 60
		case 'exact':
		default: return minutes / 60
	}
}

/**
 * 计算单条记录的加班费
 * @param {Object} record - 记录对象
 * @param {Object} project - 项目对象
 * @returns {number}
 */
export function calculatePay(record, project) {
	switch (record.pay_mode) {
		case 'hourly': {
			const otType = record.overtime_type || getOvertimeType(record.date)
			const rate = otType === 'weekend'
				? project.weekend_rate
				: otType === 'holiday'
				? project.holiday_rate
				: project.weekday_rate
			return round2((record.duration || 0) * (rate || 0))
		}
		case 'daily':
			return round2((record.days || 0) * (project.daily_rate || 0))
		case 'piece':
			return round2((record.quantity || 0) * (project.piece_rate || 0))
		default:
			return 0
	}
}

/**
 * 计算净额（加班费 + 补贴 - 扣款）
 */
export function calculateNetPay(record, project) {
	const pay = calculatePay(record, project)
	const subsidies = typeof record.subsidies === 'object'
		? ((record.subsidies.night_shift || 0) + (record.subsidies.meal || 0) + (record.subsidies.transport || 0))
		: (record.subsidies || 0)
	const deduction = typeof record.deduction === 'object'
		? (record.deduction.amount || 0)
		: (record.deduction || 0)
	return round2(pay + subsidies - deduction)
}
