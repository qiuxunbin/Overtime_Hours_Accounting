<template>
	<view class="page-batch">
		<NavBar title="批量记工时" :showBack="true" />

		<view class="page-batch__content">
			<!-- 日期范围 -->
			<view class="section">
				<text class="section__title">日期范围</text>
				<view class="date-range">
					<picker mode="date" :value="startDate" :end="todayStr" @change="onStartDateChange">
						<view class="date-range__picker">
							<text class="date-range__label">从</text>
							<text class="date-range__value">{{ startDate }}</text>
						</view>
					</picker>
					<text class="date-range__sep">至</text>
					<picker mode="date" :value="endDate" :end="todayStr" @change="onEndDateChange">
						<view class="date-range__picker">
							<text class="date-range__label">到</text>
							<text class="date-range__value">{{ endDate }}</text>
						</view>
					</picker>
				</view>
			</view>

			<!-- 统一时间 -->
			<view class="section">
				<text class="section__title">统一时间</text>
				<view class="time-range">
					<picker mode="time" :value="startTime" @change="onStartTimeChange" class="time-picker">
						<view class="time-picker__item">
							<text class="time-picker__label">开始</text>
							<text class="time-picker__value">{{ startTime }}</text>
						</view>
					</picker>
					<text class="time-range__sep">—</text>
					<picker mode="time" :value="endTime" @change="onEndTimeChange" class="time-picker">
						<view class="time-picker__item">
							<text class="time-picker__label">结束</text>
							<text class="time-picker__value">{{ endTime }}</text>
						</view>
					</picker>
				</view>
				<text class="section__hint">每天 {{ duration }} 小时</text>
			</view>

			<!-- 项目选择（仅时薪项目） -->
			<view class="section">
				<text class="section__title">项目</text>
				<view class="field-row" @tap="showProjectPicker">
					<text class="field-row__value" :style="{ color: selectedProject ? '#1E1E1E' : '#9C9C9C' }">{{ selectedProject ? selectedProject.name : '选项目（选填）' }}</text>
					<text class="field-row__arrow">›</text>
				</view>
			</view>

			<!-- 备注 -->
			<view class="section">
				<text class="section__title">备注（选填）</text>
				<input class="batch-remark" type="text" v-model="remark" placeholder="所有记录共用此备注" />
			</view>

			<!-- 预览 -->
			<view class="section" v-if="previewDates.length > 0">
				<text class="section__title">预览（共 {{ previewDates.length }} 条）</text>
				<view class="preview-list">
					<view class="preview-item" v-for="(d, idx) in previewDates" :key="idx">
						<text class="preview-item__date">{{ d.date }}</text>
						<text class="preview-item__type">{{ d.typeLabel }}</text>
						<text class="preview-item__hours">{{ d.hours }}h</text>
					</view>
				</view>
			</view>

			<view class="page-batch__spacer"></view>
		</view>

		<!-- 底部 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__save" :class="{ 'bottom-bar__save--disabled': saving || previewDates.length === 0 }" @tap="handleBatchSave">
					<text class="bottom-bar__save-text">{{ saving ? '创建中...' : `批量创建 ${previewDates.length} 条` }}</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'
import { useProjectStore } from '../../stores/projectStore'
import { getOvertimeType } from '../../utils/holidays.js'

function pad(n) { return String(n).padStart(2, '0') }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		const today = formatDate(now)
		return {
			startDate: today,
			endDate: today,
			startTime: '18:00',
			endTime: '21:00',
			remark: '',
			selectedProjectId: null,
			saving: false
		}
	},
	computed: {
		todayStr() {
			const n = new Date()
			return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
		},
		duration() {
			const [sh, sm] = this.startTime.split(':').map(Number)
			const [eh, em] = this.endTime.split(':').map(Number)
			const minutes = (eh * 60 + em) - (sh * 60 + sm)
			return minutes > 0 ? (minutes / 60).toFixed(1) : '0'
		},
		previewDates() {
			const dates = []
			const start = new Date(this.startDate)
			const end = new Date(this.endDate)
			if (end < start) return []

			const typeLabels = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			const h = parseFloat(this.duration) || 0
			if (h <= 0) return []

			let d = new Date(start)
			while (d <= end) {
				const dateStr = formatDate(d)
				const type = getOvertimeType(dateStr)
				dates.push({ date: dateStr, typeLabel: typeLabels[type] || '平日', hours: h, type })
				d.setDate(d.getDate() + 1)
			}
			return dates
		},
		selectedProject() {
			if (!this.selectedProjectId) return null
			const pStore = useProjectStore()
			return pStore.getProjectById(this.selectedProjectId)
		}
	},
	onShow() {
		const pStore = useProjectStore()
		if (pStore.projects.length === 0) {
			pStore.loadProjects()
		}
	},
	methods: {
		onStartDateChange(e) { this.startDate = e.detail.value },
		onEndDateChange(e) { this.endDate = e.detail.value },
		onStartTimeChange(e) { this.startTime = e.detail.value },
		onEndTimeChange(e) { this.endTime = e.detail.value },

		showProjectPicker() {
			const pStore = useProjectStore()
			pStore.loadProjects()
			setTimeout(() => {
				const hourlyProjects = pStore.activeProjects.filter(p => p.pay_mode === 'hourly')
				const items = [{ text: '无项目', value: null },
					...hourlyProjects.map(p => ({ text: p.name, value: p._id }))
				]
				uni.showActionSheet({
					itemList: items.map(i => i.text),
					success: (res) => {
						this.selectedProjectId = items[res.tapIndex].value
					}
				})
			}, 100)
		},

		async handleBatchSave() {
			if (this.saving || this.previewDates.length === 0) return

			const h = parseFloat(this.duration) || 0
			if (h <= 0) {
				uni.showToast({ title: '请设置有效时间', icon: 'none' })
				return
			}

			this.saving = true
			const store = useOvertimeStore()
			const pStore = useProjectStore()
			const proj = this.selectedProjectId ? pStore.getProjectById(this.selectedProjectId) : null
			let success = 0
			let fail = 0

			for (const item of this.previewDates) {
				try {
					const record = {
						date: item.date,
						pay_mode: 'hourly',
						remark: this.remark,
						project_id: this.selectedProjectId,
						project_name: proj ? proj.name : '',
						photos: [],
						settled: false,
						subsidies: { night_shift: 0, meal: 0, transport: 0 },
						deduction: { amount: 0, note: '' },
						start_time: this.startTime,
						end_time: this.endTime,
						duration: parseFloat(this.duration) || 0,
						overtime_type: item.type
					}

					const res = await store.addRecord(record)
					if (res && !res.duplicated) success++
					else fail++
				} catch (e) {
					fail++
				}
			}

			this.saving = false
			uni.showToast({ title: `创建 ${success} 条${fail > 0 ? '，' + fail + ' 条重复' : ''}`, icon: 'success' })
			setTimeout(() => { uni.navigateBack() }, 1000)
		}
	}
}
</script>

<style lang="scss" scoped>
.page-batch {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 0 16px 100px;
		max-width: 640px;
		margin: 0 auto;
	}

	&__spacer {
		height: 60px;
	}
}

.section {
	margin-top: 16px;

	&__title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 10px;
		display: block;
	}

	&__hint {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 8px;
		display: block;
		text-align: center;
	}
}

.date-range {
	display: flex;
	align-items: center;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 12px 16px;

	&__picker {
		flex: 1;
		display: flex;
		align-items: center;
	}

	&__label {
		font-size: 14px;
		color: var(--text-muted);
		margin-right: 8px;
	}

	&__value {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
	}

	&__sep {
		font-size: 14px;
		color: var(--text-muted);
		margin: 0 12px;
	}
}

.time-range {
	display: flex;
	align-items: center;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 16px;

	&__sep {
		font-size: 16px;
		color: var(--text-muted);
		margin: 0 20px;
	}
}

.time-picker {
	flex: 1;

	&__item {
		text-align: center;
	}

	&__label {
		font-size: 13px;
		color: var(--text-muted);
		display: block;
		margin-bottom: 4px;
	}

	&__value {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
	}
}

.field-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);

	&__value {
		font-size: 15px;
		color: var(--text-primary);
	}

	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
		margin-left: 4px;
	}
}

.batch-remark {
	width: 100%;
	padding: 14px 16px;
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	font-size: 14px;
	color: var(--text-primary);
	box-sizing: border-box;
}

.preview-list {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	max-height: 300px;
	overflow-y: auto;
}

.preview-item {
	display: flex;
	align-items: center;
	padding: 10px 16px;
	border-bottom: 1px solid var(--border);

	&:last-child { border-bottom: none; }

	&__date {
		font-size: 14px;
		color: var(--text-primary);
		flex: 2;
	}

	&__type {
		font-size: 12px;
		color: var(--text-muted);
		flex: 1;
		text-align: center;
	}

	&__hours {
		font-size: 14px;
		font-weight: 500;
		color: var(--primary);
		flex: 1;
		text-align: right;
	}
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: var(--surface-card);
	border-top: 1px solid var(--border);
	z-index: 100;

	&__inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	&__save {
		height: 48px;
		border-radius: 20px;
		background: var(--primary);
		display: flex;
		align-items: center;
		justify-content: center;

		&--disabled {
			opacity: 0.5;
			pointer-events: none;
		}
	}

	&__save-text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}

	&__safe {
		height: constant(safe-area-inset-bottom);
		height: env(safe-area-inset-bottom);
	}
}
</style>
