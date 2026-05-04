/**
 * 记工算工钱 — 统一计算引擎
 * 所有金额计算收敛到此文件，作为唯一入口。
 * 页面和 Store 不自行计算金额。
 * 费率优先级：工作费率 > 记录保存时费率(兜底) > 0
 */

/**
 * 计算时长（小时）
 * @param {string} startTime HH:MM
 * @param {string} endTime HH:MM
 * @param {string} precision '15min'|'30min'|'60min'|'exact'
 * @returns {number} 小时数
 */
export function calcDuration(startTime, endTime, precision = 'exact') {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes <= 0) return 0

  switch (precision) {
    case '15min': return Math.floor(minutes / 15) * 15 / 60
    case '30min': return Math.floor(minutes / 30) * 30 / 60
    case '60min': return Math.floor(minutes / 60)
    case 'exact':
    default:     return Math.round(minutes / 60 * 100) / 100
  }
}

/**
 * 根据 day_type 获取对应时薪费率
 * @param {string} dayType 'weekday'|'weekend'|'holiday'
 * @param {object} project 工作配置
 * @returns {number} 时薪费率
 */
export function getRateByType(dayType, project) {
  const key = dayType + '_rate'
  if (project?.[key] > 0) return project[key]
  return 0
}

/**
 * 补贴金额求和（兼容嵌套对象和扁平数字）
 * @param {object|number} subsidies {night_shift, meal, transport} 或数字
 * @returns {number}
 */
export function calcSubsidies(subsidies) {
  if (!subsidies) return 0
  if (typeof subsidies === 'object') {
    return (subsidies.night_shift || 0) + (subsidies.meal || 0) + (subsidies.transport || 0)
  }
  return Number(subsidies) || 0
}

/**
 * 扣款金额取值（兼容嵌套对象和扁平数字）
 * @param {object|number} deduction {amount, note} 或数字
 * @returns {number}
 */
export function calcDeduction(deduction) {
  if (!deduction) return 0
  if (typeof deduction === 'object') return Number(deduction.amount) || 0
  return Number(deduction) || 0
}

/**
 * 计算单条记录的应付金额 pay
 * 费率优先级：工作费率 > 记录保存时费率(兜底) > 0
 * @param {object} record 记工记录
 * @param {object|null} project 工作配置（null=无工作）
 * @returns {number}
 */
export function calcPay(record, project) {
  switch (record.pay_mode) {
    case 'daily': {
      const rate = project?.daily_rate || record.daily_rate || 0
      return round2((record.days || 0) * rate)
    }
    case 'piece': {
      const rate = project?.piece_rate || record.piece_rate || 0
      return round2((record.quantity || 0) * rate)
    }
    case 'hourly':
    default: {
      const key = (record.day_type || 'weekday') + '_rate'
      const projectRate = project?.[key]
      const rate = (projectRate > 0) ? projectRate : (record.rate || 0)
      return round2((record.duration || 0) * rate)
    }
  }
}

/**
 * 获取单条记录的费率来源说明文字
 * @param {object} record
 * @param {object|null} project
 * @returns {string}
 */
export function getPayFormula(record, project) {
  if (!record || (!record.duration && !record.days && !record.quantity)) return ''
  const pay = record.pay ?? calcPay(record, project)
  switch (record.pay_mode) {
    case 'daily': {
      const rate = project?.daily_rate || record.daily_rate || 0
      const src = project?.daily_rate > 0 ? (project.name || '工作') : '保存记录'
      return (record.days || 1) + '天×¥' + rate + '/天=¥' + pay.toFixed(0) + '(' + src + ')'
    }
    case 'piece': {
      const rate = project?.piece_rate || record.piece_rate || 0
      const src = project?.piece_rate > 0 ? (project.name || '工作') : '保存记录'
      return (record.quantity || 0) + '件×¥' + rate + '/' + (record.piece_unit || '件') + '=¥' + pay.toFixed(0) + '(' + src + ')'
    }
    case 'hourly':
    default: {
      const key = (record.day_type || 'weekday') + '_rate'
      const projectRate = project?.[key]
      const rate = (projectRate > 0) ? projectRate : (record.rate || 0)
      const src = projectRate > 0 ? (project?.name || '工作') : '保存记录'
      return (record.duration || 0) + 'h×¥' + rate + '/h=¥' + pay.toFixed(0) + '(' + src + ')'
    }
  }
}

/**
 * 计算净额 net_pay = pay + 补贴 - 扣款
 * @param {object} record 记工记录（需含 pay 字段或可计算）
 * @param {object} project 工作配置
 * @returns {number}
 */
export function calcNetPay(record, project) {
  const pay = record.pay ?? calcPay(record, project)
  return round2(pay + calcSubsidies(record.subsidies) - calcDeduction(record.deduction))
}

/**
 * 获取记录净收入 net_pay，兼容旧记录（无 net_pay 时回退 pay）
 * @param {object} r 记工记录
 * @returns {number}
 */
export function getNetPay(r) { return r.net_pay ?? r.pay ?? 0 }

/**
 * 保留两位小数
 * @param {number} n
 * @returns {number}
 */
export function round2(n) {
  return Math.round(n * 100) / 100
}
