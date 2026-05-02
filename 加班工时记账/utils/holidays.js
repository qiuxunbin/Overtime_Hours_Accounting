// ========== 中国法定节假日数据 ==========
// 本地静态数据为兜底，云端数据通过 mergeCloudData() 动态合并

const STATIC_HOLIDAYS = {
	'2026-01-01': '元旦', '2026-01-02': '元旦', '2026-01-03': '元旦',
	'2026-02-15': '春节', '2026-02-16': '春节', '2026-02-17': '春节',
	'2026-02-18': '春节', '2026-02-19': '春节', '2026-02-20': '春节',
	'2026-02-21': '春节', '2026-02-22': '春节', '2026-02-23': '春节',
	'2026-04-04': '清明节', '2026-04-05': '清明节', '2026-04-06': '清明节',
	'2026-05-01': '劳动节', '2026-05-02': '劳动节', '2026-05-03': '劳动节',
	'2026-05-04': '劳动节', '2026-05-05': '劳动节',
	'2026-06-19': '端午节', '2026-06-20': '端午节', '2026-06-21': '端午节',
	'2026-09-25': '中秋节', '2026-09-26': '中秋节', '2026-09-27': '中秋节',
	'2026-10-01': '国庆节', '2026-10-02': '国庆节', '2026-10-03': '国庆节',
	'2026-10-04': '国庆节', '2026-10-05': '国庆节', '2026-10-06': '国庆节',
	'2026-10-07': '国庆节',
}

const STATIC_MAKEUP_DAYS = {
	'2026-01-04': true,
	'2026-02-14': true, '2026-02-28': true,
	'2026-05-09': true,
	'2026-09-20': true, '2026-10-10': true,
}

// 可变数据 — mergeCloudData() 会写入
const HOLIDAYS = { ...STATIC_HOLIDAYS }
const MAKEUP_DAYS = { ...STATIC_MAKEUP_DAYS }

const CACHE_KEY = 'holiday_data'
const CACHE_YEAR_KEY = 'holiday_data_year'

/**
 * 合并云端节假日数据
 * @param {string[]} holidays 日期数组 ['2026-01-01', ...]
 * @param {string[]} makeupDays 调休上班日数组
 */
export function mergeCloudData(holidays, makeupDays) {
	if (holidays) holidays.forEach(d => { if (!HOLIDAYS[d]) HOLIDAYS[d] = '法定节假日' })
	if (makeupDays) makeupDays.forEach(d => { MAKEUP_DAYS[d] = true })
}

/**
 * 从云端拉取节假日并合并
 * 调用时机：App.vue onLaunch
 */
export async function fetchFromCloud() {
	const year = new Date().getFullYear()

	// 先读缓存
	try {
		const cachedYear = uni.getStorageSync(CACHE_YEAR_KEY)
		if (cachedYear === year) {
			const raw = uni.getStorageSync(CACHE_KEY)
			if (raw) {
				const data = JSON.parse(raw)
				mergeCloudData(data.holidays, data.makeupDays)
				console.log('[holidays] 从缓存加载, 共', Object.keys(HOLIDAYS).length, '条')
				return
			}
		}
	} catch { /* ignore */ }

	// 云端拉取
	try {
		const result = await uniCloud.callFunction({
			name: 'holiday-data',
			data: { action: 'query', year }
		})
		if (result.result && result.result.code === 0) {
			const data = result.result.data
			mergeCloudData(data.holidays, data.makeupDays)
			// 写缓存
			uni.setStorageSync(CACHE_KEY, JSON.stringify({
				holidays: data.holidays || [],
				makeupDays: data.makeupDays || []
			}))
			uni.setStorageSync(CACHE_YEAR_KEY, year)
			console.log('[holidays] 云端拉取成功, 共', Object.keys(HOLIDAYS).length, '条')
		}
	} catch (e) {
		console.log('[holidays] 云端拉取失败，使用本地数据:', e.message)
	}
}

/**
 * 判断日期是否为法定节假日
 */
export function checkHoliday(dateStr) {
	const name = HOLIDAYS[dateStr]
	return { isHoliday: !!name, name: name || '' }
}

/**
 * 判断日期是否为调休上班日
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
	if (checkHoliday(dateStr).isHoliday) return 'holiday'
	if (isMakeupDay(dateStr)) return 'weekday'
	const d = new Date(dateStr)
	const day = d.getDay()
	return (day === 0 || day === 6) ? 'weekend' : 'weekday'
}

/**
 * 按月薪计算各加班费率
 */
export function calcRatesFromSalary(monthlySalary) {
	const hourly = monthlySalary / 21.75 / 8
	return {
		weekday_rate: Math.round(hourly * 1.5 * 100) / 100,
		weekend_rate: Math.round(hourly * 2.0 * 100) / 100,
		holiday_rate: Math.round(hourly * 3.0 * 100) / 100,
	}
}

export const LEGAL_MULTIPLIERS = {
	weekday: 1.5,
	weekend: 2.0,
	holiday: 3.0,
}
