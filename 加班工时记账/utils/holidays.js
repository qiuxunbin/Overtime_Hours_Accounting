// ========== 中国法定节假日数据 ==========
// 来源：国务院办公厅 2025年11月4日发布

const HOLIDAYS = {
	// 元旦：1月1日-1月3日
	'2026-01-01': '元旦', '2026-01-02': '元旦', '2026-01-03': '元旦',
	// 春节：2月15日-2月23日（腊月廿八至正月初七）
	'2026-02-15': '春节', '2026-02-16': '春节', '2026-02-17': '春节',
	'2026-02-18': '春节', '2026-02-19': '春节', '2026-02-20': '春节',
	'2026-02-21': '春节', '2026-02-22': '春节', '2026-02-23': '春节',
	// 清明节：4月4日-4月6日
	'2026-04-04': '清明节', '2026-04-05': '清明节', '2026-04-06': '清明节',
	// 劳动节：5月1日-5月5日
	'2026-05-01': '劳动节', '2026-05-02': '劳动节', '2026-05-03': '劳动节',
	'2026-05-04': '劳动节', '2026-05-05': '劳动节',
	// 端午节：6月19日-6月21日
	'2026-06-19': '端午节', '2026-06-20': '端午节', '2026-06-21': '端午节',
	// 中秋节：9月25日-9月27日
	'2026-09-25': '中秋节', '2026-09-26': '中秋节', '2026-09-27': '中秋节',
	// 国庆节：10月1日-10月7日
	'2026-10-01': '国庆节', '2026-10-02': '国庆节', '2026-10-03': '国庆节',
	'2026-10-04': '国庆节', '2026-10-05': '国庆节', '2026-10-06': '国庆节',
	'2026-10-07': '国庆节',
}

// 调休上班日（周末上班）
const MAKEUP_DAYS = {
	'2026-01-04': true,  // 元旦调休
	'2026-02-14': true, '2026-02-28': true, // 春节调休
	'2026-05-09': true,  // 劳动节调休
	'2026-09-20': true, '2026-10-10': true, // 国庆节调休
}

/**
 * 判断日期是否为法定节假日
 * @param {string} dateStr YYYY-MM-DD
 * @returns {{ isHoliday: boolean, name: string }}
 */
export function checkHoliday(dateStr) {
	const name = HOLIDAYS[dateStr]
	return { isHoliday: !!name, name: name || '' }
}

/**
 * 判断日期是否为调休上班日（周末上班）
 */
export function isMakeupDay(dateStr) {
	return !!MAKEUP_DAYS[dateStr]
}

/**
 * 获取加班类型
 * @param {string} dateStr YYYY-MM-DD
 * @returns {'weekday'|'weekend'|'holiday'}
 */
export function getOvertimeType(dateStr) {
	// 法定节假日
	if (checkHoliday(dateStr).isHoliday) return 'holiday'
	// 调休上班日（周末上班 → 按工作日算）
	if (isMakeupDay(dateStr)) return 'weekday'
	// 周末
	const d = new Date(dateStr)
	const day = d.getDay()
	return (day === 0 || day === 6) ? 'weekend' : 'weekday'
}

/**
 * 按月薪计算各加班费率
 * @param {number} monthlySalary 月薪
 * @returns {{ weekday_rate: number, weekend_rate: number, holiday_rate: number }}
 */
export function calcRatesFromSalary(monthlySalary) {
	const hourly = monthlySalary / 21.75 / 8
	return {
		weekday_rate: Math.round(hourly * 1.5 * 100) / 100,
		weekend_rate: Math.round(hourly * 2.0 * 100) / 100,
		holiday_rate: Math.round(hourly * 3.0 * 100) / 100,
	}
}

/**
 * 劳动法规定倍数
 */
export const LEGAL_MULTIPLIERS = {
	weekday: 1.5,
	weekend: 2.0,
	holiday: 3.0,
}
