/**
 * 加班工时记账 — 全局常量
 */

// 加班类型枚举
export const OVERTIME_TYPES = [
	{ value: 'weekday', label: '工作日加班' },
	{ value: 'weekend', label: '周末加班' },
	{ value: 'holiday', label: '法定节假日' }
]

// 精度选项
export const PRECISION_OPTIONS = [
	{ value: '15min', label: '15 分钟', divisor: 0.25 },
	{ value: '30min', label: '30 分钟', divisor: 0.5 },
	{ value: '60min', label: '1 小时', divisor: 1.0 },
	{ value: 'exact', label: '精确计算', divisor: 0 }
]

// 默认薪资配置（时薪模式，单位：元/小时）
export const DEFAULT_SALARY_CONFIG = {
	weekday_rate: 0,
	weekend_rate: 0,
	holiday_rate: 0,
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
	LOCAL_RECORDS: 'local:overtime_records',
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
	'日常项目加班',
	'紧急故障处理',
	'系统上线部署',
	'会议加班',
	'文档编写',
	'客户技术支持',
	'值班',
	'项目赶工',
	'培训学习',
	'产品验收',
	'数据迁移',
	'代码审查'
]

// 补贴类型
export const SUBSIDY_TYPES = [
	{ value: 'night_shift', label: '夜班补贴', icon: '🌙' },
	{ value: 'meal', label: '餐补', icon: '🍱' },
	{ value: 'transport', label: '交通补贴', icon: '🚗' }
]

// 月历配置
export const CALENDAR = {
	weekStartsOn: 1,
	monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
	weekdayNames: ['一', '二', '三', '四', '五', '六', '日']
}
