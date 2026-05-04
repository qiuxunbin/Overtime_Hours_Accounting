/**
 * 记工算工钱 — 全局常量
 */

// 计薪方式枚举
export const PAY_MODES = [
	{ value: 'hourly', label: '时薪', icon: '⏱' },
	{ value: 'daily', label: '日薪', icon: '📅' },
	{ value: 'piece', label: '计件', icon: '📦' }
]

// 计件单位
export const PIECE_UNITS = ['件', '㎡', 'm³', '吨']

// 日期类型枚举
export const DAY_TYPES = [
	{ value: 'weekday', label: '平日' },
	{ value: 'weekend', label: '周末' },
	{ value: 'holiday', label: '节假日' }
]

// 精度选项
export const PRECISION_OPTIONS = [
	{ value: '15min', label: '15 分钟', divisor: 0.25 },
	{ value: '30min', label: '30 分钟', divisor: 0.5 },
	{ value: '60min', label: '1 小时', divisor: 1.0 },
	{ value: 'exact', label: '精确计算', divisor: 0 }
]

// 默认薪资配置（多模式）
export const DEFAULT_SALARY_CONFIG = {
	pay_mode: 'hourly',
	weekday_rate: 25,
	weekend_rate: 32.5,
	holiday_rate: 50,
	daily_rate: 200,
	piece_rate: 5,
	piece_unit: '件',
	precision: '15min'
}

// 月计薪天数（劳动法固定值，不可配置）
export const LEGAL_WORK_DAYS = 21.75
export const LEGAL_STANDARD_HOURS = 8
export const LEGAL_RATES = {
	weekday: 1.5,
	weekend: 2.0,
	holiday: 3.0
}

// 存储 key
export const STORAGE_KEYS = {
	USER_INFO: 'user_info',
	DEVICE_ID: 'device_id',
	LOCAL_RECORDS: 'local:work_records',
	LOCAL_SALARY_CONFIG: 'salary_config',
	LAST_SYNC_TIME: 'last_sync_time'
}

// 工时滑块配置
export const DURATION_SLIDER = {
	min: 0,
	max: 24,
	step: 0.5,
	defaultValue: 1
}

// 日期格式
export const DATE_FORMAT = {
	display: 'YYYY-MM-DD',
	short: 'MM/DD',
	month: 'YYYY-MM',
	weekday: 'dddd'
}

// 常用备注短语
export const COMMON_PHRASES = [
	'赶工期',
	'晚上加班',
	'周末补工',
	'节假日值班',
	'临时加单',
	'帮忙顶班',
	'材料搬运',
	'设备检修',
	'清理场地',
	'培训学习'
]

// 补贴类型
export const SUBSIDY_TYPES = [
	{ value: 'night_shift', label: '夜班补贴', icon: '🌙' },
	{ value: 'meal', label: '餐补', icon: '🍱' },
	{ value: 'transport', label: '交通补贴', icon: '🚗' }
]

// 工作预设颜色
export const PROJECT_COLORS = [
	{ value: '#1B8A5A', label: '绿' },
	{ value: '#006495', label: '蓝' },
	{ value: '#FF8C00', label: '橙' },
	{ value: '#BA1A1A', label: '红' }
]

// 默认工作配置
export const DEFAULT_PROJECT_CONFIG = {
	name: '',
	color: '#1B8A5A',
	sort_order: 0,
	pay_mode: 'hourly',
	weekday_rate: 0,
	weekend_rate: 0,
	holiday_rate: 0,
	daily_rate: 0,
	piece_rate: 0,
	piece_unit: '件',
	is_archived: false
}

// 存储 key（补充）
export const STORAGE_KEYS_PROJECTS = 'local:projects'

// 月历配置
export const CALENDAR = {
	weekStartsOn: 1,
	monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
	weekdayNames: ['一', '二', '三', '四', '五', '六', '日']
}
