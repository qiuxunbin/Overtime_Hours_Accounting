<template>
	<view class="page-profile">
		<NavBar title="我的" />

		<view class="page-profile__content">
			<!-- 个人信息 -->
			<view class="profile-header">
				<view class="profile-header__avatar">
					<text class="profile-header__avatar-text">&#x1F464;</text>
				</view>
				<view class="profile-header__info">
					<text class="profile-header__name">加班人</text>
					<text class="profile-header__desc">记录每一笔加班</text>
				</view>
			</view>

			<!-- App端登录入口 -->
			<!-- #ifdef APP-PLUS -->
			<view class="profile-menu" v-if="!isLoggedIn">
				<view class="cell-item" @tap="goLogin">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F512;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">登录 / 注册</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
			</view>
			<!-- #endif -->

			<!-- 功能菜单 -->
			<view class="profile-menu" v-if="isLoggedIn || !isApp">
				<view class="cell-item" @tap="goProjects">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F3E0;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">项目管理</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item" @tap="goBatchRecord">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4DD;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">批量记工时</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item" @tap="goSalary">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4B0;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">薪资设置</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item" @tap="goClock">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x23F0;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">考勤提醒</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item" @tap="handleExport">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4E4;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">导出数据</text></view>
					<view class="cell-item__right"><text class="cell-item__desc">备份全部记录</text><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item cell-item--last" @tap="showImport = true">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4E5;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">导入数据</text></view>
					<view class="cell-item__right"><text class="cell-item__desc">恢复备份</text><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
			</view>

			<view class="profile-menu">
				<view class="cell-item" @tap="goFeedback">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4AC;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">意见反馈</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item cell-item--last" @tap="showAbout">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x2139;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">关于</text></view>
					<view class="cell-item__right"><text class="cell-item__value">v1.0.0</text><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
			</view>

			<text class="page-profile__tip">数据存储在云数据库。导出备份可复制 JSON 保存到备忘录。导入时粘贴 JSON 或 CSV 恢复。</text>
		</view>

		<!-- 导入弹窗 -->
		<view class="import-mask" v-if="showImport" @tap="showImport = false">
			<view class="import-panel" @tap.stop>
				<text class="import-panel__title">导入数据</text>

				<!-- 导入类型 Tab -->
				<view class="import-tabs">
					<view class="import-tabs__item" :class="{ 'import-tabs__item--active': importMode === 'json' }" @tap="importMode = 'json'">
						<text>JSON</text>
					</view>
					<view class="import-tabs__item" :class="{ 'import-tabs__item--active': importMode === 'csv' }" @tap="importMode = 'csv'">
						<text>CSV</text>
					</view>
				</view>

				<!-- JSON 导入 -->
				<template v-if="importMode === 'json'">
					<text class="import-panel__desc">粘贴之前导出的 JSON 备份数据</text>
					<textarea
						class="import-panel__textarea"
						v-model="importText"
						placeholder="在此粘贴 JSON 数据..."
						placeholder-style="color: var(--text-muted); font-size: 13px;"
					/>
				</template>

				<!-- CSV 导入 -->
				<template v-if="importMode === 'csv'">
					<text class="import-panel__desc">粘贴 CSV 数据（可从导出 CSV 文件复制），自动匹配项目名称</text>
					<textarea
						class="import-panel__textarea"
						v-model="csvText"
						placeholder="日期,类型,计薪方式,明细,公式,加班费,项目,备注,补贴,扣款&#10;2026-05-02,平日,时薪,18:00-21:00 3h,3h × ¥30/h,90,xx工地,,0,0"
						placeholder-style="color: var(--text-muted); font-size: 12px;"
						@input="onCsvInput"
					/>
					<!-- CSV 预览 -->
					<view class="csv-preview" v-if="csvPreview.records.length > 0">
						<text class="csv-preview__summary">
							识别 {{ csvPreview.records.length }} 条记录，
							匹配项目 {{ csvPreview.matched }} 条，
							<text class="csv-preview__warn" v-if="csvPreview.unmatched > 0">未匹配 {{ csvPreview.unmatched }} 条</text>
						</text>
						<view class="csv-preview__list">
							<view class="csv-preview__item" v-for="(item, idx) in csvPreview.records.slice(0, 20)" :key="idx">
								<text class="csv-preview__date">{{ item.date }}</text>
								<text class="csv-preview__proj" :style="{ color: item.project_id ? 'var(--primary)' : 'var(--error)' }">{{ item.project_name || '未匹配' }}</text>
								<text class="csv-preview__detail">{{ item.detail }}</text>
								<text class="csv-preview__pay">¥{{ (item.pay || 0).toFixed(0) }}</text>
							</view>
							<text class="csv-preview__more" v-if="csvPreview.records.length > 20">... 还有 {{ csvPreview.records.length - 20 }} 条</text>
						</view>
					</view>
				</template>

				<view class="import-panel__btns">
					<view class="import-panel__btn import-panel__btn--cancel" @tap="closeImport">
						<text>取消</text>
					</view>
					<view class="import-panel__btn import-panel__btn--confirm" @tap="handleImport">
						<text>{{ importing ? '导入中...' : '确认导入' }}</text>
					</view>
				</view>
			</view>
		</view>
		<ThemeToggle />

	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useWorkStore } from '@/stores/workStore'
import { useSalaryStore } from '../../stores/salaryStore'
import { useUserStore } from '../../stores/userStore'
import { useProjectStore } from '../../stores/projectStore'
import { useHolidayStore } from '@/stores/holidayStore'

function parseCSVLine(line) {
	const result = []
	let current = ''
	let inQuotes = false
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (ch === '"') {
			inQuotes = !inQuotes
		} else if (ch === ',' && !inQuotes) {
			result.push(current.trim())
			current = ''
		} else {
			current += ch
		}
	}
	result.push(current.trim())
	return result
}

// Map CSV column names to record fields
const COLUMN_MAP = {
	'日期': 'date',
	'项目': 'project_name',
	'项目名称': 'project_name',
	'计薪方式': 'pay_mode_str',
	'类型': 'overtime_type_str',
	'开始时间': 'start_time',
	'结束时间': 'end_time',
	'时长': 'duration_str',
	'时数': 'duration_str',
	'天数': 'days_str',
	'件数': 'quantity_str',
	'单价': 'rate',
	'加班费': 'pay',
	'金额': 'pay',
	'备注': 'remark',
	'是否结算': 'settled_str',
	'补贴': 'subsidies',
	'扣款': 'deduction'
}

const PAY_MODE_MAP = { '时薪': 'hourly', '日薪': 'daily', '计件': 'piece', 'hourly': 'hourly', 'daily': 'daily', 'piece': 'piece' }
const TYPE_MAP = { '平日': 'weekday', '周末': 'weekend', '节假日': 'holiday' }

export default {
	components: { NavBar, ThemeToggle },
	data() {
		return {
			showImport: false,
			importMode: 'json',
			importText: '',
			csvText: '',
			importing: false,
			csvPreview: { records: [], matched: 0, unmatched: 0 }
		}
	},
	computed: {
		isLoggedIn() {
			return useUserStore().isLoggedIn
		},
		isApp() {
			// #ifdef APP-PLUS
			return true
			// #endif
			// #ifndef APP-PLUS
			return false
			// #endif
		}
	},
	methods: {
		closeImport() {
			this.showImport = false
			this.csvText = ''
			this.importText = ''
			this.csvPreview = { records: [], matched: 0, unmatched: 0 }
			this.importMode = 'json'
		},

		goLogin() {
			uni.navigateTo({ url: '/pages/login/login' })
		},

		goProjects() {
			uni.navigateTo({ url: '/pages/projects/projects' })
		},
		goBatchRecord() {
			uni.navigateTo({ url: '/pages/batch-record/batch-record' })
		},

		goSalary() {
			uni.navigateTo({ url: "/pages/salary/salary" })
		},

		goClock() {
			uni.navigateTo({ url: '/pages/clock/clock' })
		},

		async handleExport() {
			uni.showLoading({ title: '导出中...' })

			try {
				const result = await uniCloud.callFunction({
					name: 'data-backup',
					data: { action: 'export' }
				})

				uni.hideLoading()

				if (result.result && result.result.code === 0) {
					const backup = result.result.data
					const jsonStr = JSON.stringify(backup, null, 2)

					uni.showActionSheet({
						itemList: ['复制 JSON 到剪贴板', '生成可读文本分享'],
						success: (actionRes) => {
							if (actionRes.tapIndex === 0) {
								uni.setClipboardData({
									data: jsonStr,
									success: () => {
										uni.showToast({ title: 'JSON 已复制到剪贴板', icon: 'success' })
									}
								})
							} else if (actionRes.tapIndex === 1) {
								const records = backup.data['overtime-record'] || []
								const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
								const summary = `加班工时记账 - 数据备份\n记录数：${records.length} 条\n总工时：${totalHours} 小时\n导出时间：${new Date().toLocaleString()}\n\n--- 以下是 JSON 数据 ---\n${jsonStr}`
								uni.setClipboardData({
									data: summary,
									success: () => {
										uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
									}
								})
							}
						}
					})
				} else {
					uni.showToast({ title: result.result?.message || '导出失败', icon: 'none' })
				}
			} catch (e) {
				uni.hideLoading()
				uni.showToast({ title: '网络错误，请重试', icon: 'none' })
			}
		},

		// CSV parsing
		onCsvInput() {
			if (!this.csvText.trim()) {
				this.csvPreview = { records: [], matched: 0, unmatched: 0 }
				return
			}
			try {
				this.csvPreview = this.parseCSV(this.csvText)
			} catch (e) {
				this.csvPreview = { records: [], matched: 0, unmatched: 0, error: e.message }
			}
		},

		parseCSV(csvText) {
			const lines = csvText.split(/\r?\n/).filter(l => l.trim())
			if (lines.length < 2) {
				return { records: [], matched: 0, unmatched: 0, error: '至少需要标题行和一行数据' }
			}

			// Parse header
			let headerLine = lines[0]
			if (headerLine.charCodeAt(0) === 0xFEFF) headerLine = headerLine.slice(1)
			const headers = headerLine.split(',').map(h => h.trim())

			// Map column indices
			const colIndex = {}
			headers.forEach((h, i) => {
				const key = COLUMN_MAP[h] || h
				if (key !== h || COLUMN_MAP[h]) colIndex[key] = i
			})
			if (!('date' in colIndex)) {
				return { records: [], matched: 0, unmatched: 0, error: 'CSV 缺少"日期"列' }
			}

			// Build project name lookup
			const pStore = useProjectStore()
			pStore.loadProjects()
			const projByName = {}
			const allProjects = [...pStore.projects, ...pStore.archivedProjects]
			allProjects.forEach(p => { if (p.name) projByName[p.name] = p })

			// Parse data rows
			const records = []
			let matched = 0
			let unmatched = 0

			for (let i = 1; i < lines.length; i++) {
				const cols = parseCSVLine(lines[i])
				if (cols.length < 2) continue

				const getCol = (key) => cols[colIndex[key]] || ''

				const date = getCol('date')
				if (!date) continue

				const project_name = getCol('project_name')
				const proj = projByName[project_name] || null
				if (proj) matched++

				const payModeStr = getCol('pay_mode_str')
				const payMode = PAY_MODE_MAP[payModeStr] || proj?.pay_mode || 'hourly'
				const typeStr = getCol('overtime_type_str')
				const overtimeType = TYPE_MAP[typeStr] || useHolidayStore().getDayType(date)

				// Parse duration/days/quantity from CSV
				let duration = 0, days = 0, quantity = 0

				if (payMode === 'hourly') {
					const durStr = getCol('duration_str')
					if (durStr) duration = parseFloat(durStr.replace('h', '')) || 0
					if (!duration && getCol('start_time')) {
						// Try to extract duration from detail field or calculate from start/end
						const st = getCol('start_time')
						const et = getCol('end_time')
						if (st && et) {
							const [sh, sm] = st.split(':').map(Number)
							const [eh, em] = et.split(':').map(Number)
							if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
								duration = parseFloat(durStr) || 0
							} else {
								duration = ((eh * 60 + em) - (sh * 60 + sm)) / 60
								if (duration < 0) duration = 0
							}
						}
					}
				} else if (payMode === 'daily') {
					days = parseInt(getCol('days_str')) || parseFloat(getCol('duration_str')) || 1
				} else if (payMode === 'piece') {
					quantity = parseInt(getCol('quantity_str')) || 0
				}

				const pay = parseFloat(getCol('pay')) || 0
				const rate = parseFloat(getCol('rate')) || 0
				const settledStr = getCol('settled_str')
				const settled = settledStr === '已结算' || settledStr === 'true' || settledStr === '是'
				const remark = getCol('remark')
				const subsidies = parseFloat(getCol('subsidies')) || 0
				const deduction = parseFloat(getCol('deduction')) || 0

				const detail = payMode === 'hourly' ? `${duration.toFixed(1)}h` :
					payMode === 'daily' ? `${days}天` : `${quantity}件`

				records.push({
					date,
					project_name: project_name || '',
					project_id: proj ? proj._id : null,
					pay_mode: payMode,
					overtime_type: overtimeType,
					start_time: getCol('start_time'),
					end_time: getCol('end_time'),
					duration,
					days,
					quantity,
					rate,
					pay,
					settled,
					remark,
					subsidies: { night_shift: 0, meal: 0, transport: subsidies },
					deduction: { amount: deduction, note: '' },
					net_pay: pay + subsidies - deduction,
					detail
				})
			}

			return { records, matched, unmatched }
		},

		// Unified import handler
		async handleImport() {
			if (this.importing) return

			if (this.importMode === 'csv') {
				await this.handleCsvImport()
			} else {
				await this.handleJsonImport()
			}
		},

		async handleCsvImport() {
			if (this.csvPreview.records.length === 0) {
				uni.showToast({ title: '无有效 CSV 数据', icon: 'none' })
				return
			}

			const unmatchedItems = this.csvPreview.records.filter(r => !r.project_id)
			let msg = `将导入 ${this.csvPreview.records.length} 条记录，匹配到 ${this.csvPreview.matched} 条项目`
			if (unmatchedItems.length > 0) {
				const names = [...new Set(unmatchedItems.map(r => r.project_name).filter(Boolean))]
				msg += `\n\n未匹配的项目：${names.join('、')}\n这些记录将不关联项目`
			}

			uni.showModal({
				title: '确认导入',
				content: msg,
				confirmText: '确认导入',
				success: async (res) => {
					if (!res.confirm) return

					this.importing = true
					uni.showLoading({ title: '导入中...' })

					const store = useWorkStore()
					store.loadRecords()
					const existingKeys = new Set(store.records.map(r =>
						`${r.date}|${r.project_id || ''}|${r.start_time}|${r.end_time}|${r.pay_mode}`
					))

					let imported = 0
					let skipped = 0

					for (const rec of this.csvPreview.records) {
						const key = `${rec.date}|${rec.project_id || ''}|${rec.start_time}|${rec.end_time}|${rec.pay_mode}`
						if (existingKeys.has(key)) {
							skipped++
							continue
						}
						try {
							const recordData = {
								...rec,
								photos: [],
								created_at: Date.now(),
								updated_at: Date.now()
							}
							const result = await store.addRecord(recordData)
							if (result && !result.duplicated) {
								imported++
								existingKeys.add(key)
							} else {
								skipped++
							}
						} catch (e) {
							skipped++
						}
					}

					uni.hideLoading()
					this.importing = false
					this.closeImport()
					uni.showToast({ title: `导入 ${imported} 条${skipped > 0 ? '，跳过 ' + skipped + ' 条' : ''}`, icon: 'success' })
				}
			})
		},

		async handleJsonImport() {
			if (!this.importText.trim()) {
				uni.showToast({ title: '请粘贴 JSON 数据', icon: 'none' })
				return
			}

			let backup
			try {
				backup = JSON.parse(this.importText.trim())
			} catch (e) {
				uni.showToast({ title: 'JSON 格式错误', icon: 'none' })
				return
			}

			if (!backup.data || typeof backup.data !== 'object') {
				uni.showToast({ title: '无效的备份数据', icon: 'none' })
				return
			}

			const recordCount = backup.data['overtime-record']
				? (Array.isArray(backup.data['overtime-record']) ? backup.data['overtime-record'].length : '?')
				: 0

			uni.showModal({
				title: '确认导入',
				content: `将从备份恢复 ${recordCount} 条加班记录。\n云端现有数据将被覆盖，是否继续？`,
				confirmText: '确认导入',
				confirmColor: '#B85C4A',
				success: async (res) => {
					if (!res.confirm) return

					this.importing = true
					uni.showLoading({ title: '导入中...' })

					try {
						const result = await uniCloud.callFunction({
							name: 'data-backup',
							data: {
								action: 'import',
								data: backup,
								overwrite: true
							}
						})

						uni.hideLoading()

						if (result.result && result.result.code === 0) {
							const overtimeStore = useWorkStore()
							await overtimeStore.loadRecords()
							const salaryStore = useSalaryStore()
							await salaryStore.loadConfig()

							uni.showToast({ title: '导入成功', icon: 'success' })
							this.closeImport()
						} else {
							uni.showToast({ title: result.result?.message || '导入失败', icon: 'none' })
						}
					} catch (e) {
						uni.hideLoading()
						uni.showToast({ title: '网络错误，请重试', icon: 'none' })
					}
					this.importing = false
				}
			})
		},

		goFeedback() {
			uni.navigateTo({ url: '/pages/feedback/feedback' })
		},
		showAbout() {
			uni.showModal({
				title: '加班工时记账',
				content: '记录加班、自动算钱、月结对账。\n让每一分钟加班都算数。\n\nv1.0.0',
				showCancel: false,
				confirmText: '知道了'
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-profile {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 16px 0 80px;
	}

	&__tip {
		font-size: 12px;
		color: var(--text-muted);
		text-align: center;
		display: block;
		padding: 0 32px;
		line-height: 18px;
	}
}

.profile-header {
	display: flex;
	align-items: center;
	padding: 20px 20px;
	background: var(--surface-card);
	margin: 0 16px 16px;
	border-radius: 12px;

	&__avatar {
		width: 56px;
		height: 56px;
		border-radius: 28px;
		background: var(--primary-light);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 16px;
	}

	&__avatar-text {
		font-size: 28px;
	}

	&__info {
		flex: 1;
	}

	&__name {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
	}

	&__desc {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}
}

.cell-item {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	background: var(--surface-card);
	border-bottom: 1px solid var(--border);

	&--last {
		border-bottom: none;
	}

	&__icon {
		width: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 12px;
	}

	&__icon-text {
		font-size: 18px;
	}

	&__content {
		flex: 1;
	}

	&__label {
		font-size: 15px;
		color: var(--text-primary);
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__value {
		font-size: 13px;
		color: var(--text-muted);
		margin-right: 4px;
	}

	&__desc {
		font-size: 12px;
		color: var(--text-muted);
		margin-right: 4px;
	}

	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
	}
}

.profile-menu {
	background: var(--surface-card);
	border-radius: 12px;
	margin: 0 16px 16px;
	overflow: hidden;
}

/* ===== 导入弹窗 ===== */
.import-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 200;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.import-panel {
	width: 100%;
	max-height: 80vh;
	overflow-y: auto;
	background: var(--surface-card);
	border-radius: 20px 20px 0 0;
	padding: 28px 24px 32px;

	&__title {
		font-size: 20px;
		font-weight: 700;
		color: var(--text-primary);
		display: block;
	}

	&__desc {
		font-size: 13px;
		color: var(--text-muted);
		display: block;
		margin-top: 6px;
	}

	&__textarea {
		width: 100%;
		height: 140px;
		background: var(--surface);
		border-radius: 8px;
		padding: 12px;
		font-size: 13px;
		color: var(--text-primary);
		margin-top: 16px;
		line-height: 20px;
		box-sizing: border-box;
	}

	&__btns {
		display: flex;
		margin-top: 20px;
	}

	&__btn {
		flex: 1;
		height: 44px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 6px;
		font-size: 15px;

		&--cancel {
			background: var(--surface);
			color: var(--text-secondary);
		}

		&--confirm {
			background: var(--primary);
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}

/* ===== 导入类型 Tab ===== */
.import-tabs {
	display: flex;
	margin-top: 16px;
	gap: 0;
}

.import-tabs__item {
	flex: 1;
	text-align: center;
	padding: 8px 0;
	font-size: 15px;
	font-weight: 500;
	color: var(--text-muted);
	border-bottom: 2px solid var(--border);
	transition: all 0.15s;

	&--active {
		color: var(--primary);
		border-bottom-color: var(--primary);
	}
}

/* ===== CSV 预览 ===== */
.csv-preview {
	margin-top: 12px;

	&__summary {
		font-size: 13px;
		color: var(--text-secondary);
		display: block;
	}

	&__warn {
		color: var(--error);
	}

	&__list {
		margin-top: 8px;
		background: var(--surface);
		border-radius: 8px;
		max-height: 220px;
		overflow-y: auto;
		padding: 4px 0;
	}

	&__item {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		font-size: 13px;

		&:last-child {
			border-bottom: none;
		}
	}

	&__date {
		color: var(--text-primary);
		flex: 0 0 90px;
	}

	&__proj {
		color: var(--primary);
		flex: 0 0 70px;
		font-weight: 500;
	}

	&__detail {
		color: var(--text-muted);
		flex: 1;
		font-size: 12px;
	}

	&__pay {
		color: var(--primary);
		font-weight: 600;
		flex: 0 0 50px;
		text-align: right;
	}

	&__more {
		font-size: 12px;
		color: var(--text-muted);
		text-align: center;
		padding: 8px;
		display: block;
	}
}
</style>
