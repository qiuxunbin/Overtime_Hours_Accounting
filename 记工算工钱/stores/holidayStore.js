import { defineStore } from 'pinia'

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

const CACHE_KEY = 'holiday_data'
const CACHE_YEAR_KEY = 'holiday_data_year'

export const useHolidayStore = defineStore('holiday', {
  state: () => ({
    holidays: { ...STATIC_HOLIDAYS },
    makeupDays: { ...STATIC_MAKEUP_DAYS },
    year: new Date().getFullYear()
  }),

  getters: {
    getDayType: (state) => (dateStr) => {
      if (state.holidays[dateStr]) return 'holiday'
      if (state.makeupDays[dateStr]) return 'weekday'
      const day = new Date(dateStr).getDay()
      return (day === 0 || day === 6) ? 'weekend' : 'weekday'
    },

    checkHoliday: (state) => (dateStr) => {
      const name = state.holidays[dateStr]
      return { isHoliday: !!name, name: name || '' }
    },

    calcRatesFromSalary: () => (monthlySalary) => {
      if (!monthlySalary || monthlySalary <= 0) return { weekday_rate: 0, weekend_rate: 0, holiday_rate: 0 }
      const hourly = monthlySalary / 21.75 / 8
      return {
        weekday_rate: Math.round(hourly * 1.5 * 100) / 100,
        weekend_rate: Math.round(hourly * 2.0 * 100) / 100,
        holiday_rate: Math.round(hourly * 3.0 * 100) / 100,
      }
    }
  },

  actions: {
    mergeCloudData(holidaysList, makeupDaysList) {
      if (holidaysList) holidaysList.forEach(d => { if (!this.holidays[d]) this.holidays[d] = '法定节假日' })
      if (makeupDaysList) makeupDaysList.forEach(d => { this.makeupDays[d] = true })
    },

    loadFromLocal() {
      try {
        const cachedYear = uni.getStorageSync(CACHE_YEAR_KEY)
        if (cachedYear === this.year) {
          const raw = uni.getStorageSync(CACHE_KEY)
          if (raw) {
            const data = JSON.parse(raw)
            this.mergeCloudData(data.holidays, data.makeupDays)
          }
        }
      } catch { /* ignore */ }
    },

    async fetchFromCloud() {
      this.loadFromLocal()

      try {
        const result = await uniCloud.callFunction({
          name: 'holiday-data',
          data: { action: 'query', year: this.year }
        })
        if (result.result && result.result.code === 0) {
          const data = result.result.data
          this.mergeCloudData(data.holidays, data.makeupDays)
          uni.setStorageSync(CACHE_KEY, JSON.stringify({
            holidays: data.holidays || [],
            makeupDays: data.makeupDays || []
          }))
          uni.setStorageSync(CACHE_YEAR_KEY, this.year)
        }
      } catch (e) {
        console.log('[holidayStore] 云端拉取失败，使用本地数据:', e.message)
      }
    }
  }
})
