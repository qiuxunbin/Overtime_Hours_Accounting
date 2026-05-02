<template>
	<view class="page-projects">
		<NavBar title="项目管理" :showBack="true" />

		<view class="page-projects__content">
			<!-- 项目列表 -->
			<view class="project-list" v-if="store.activeProjects.length > 0">
				<view
					v-for="project in store.activeProjects"
					:key="project._id"
					class="project-card"
					@tap="editProject(project)"
				>
					<view class="project-card__bar" :style="{ background: project.color || '#1B8A5A' }"></view>
					<view class="project-card__info">
						<text class="project-card__name">{{ project.name }}</text>
						<text class="project-card__rate">{{ rateSummary(project) }}</text>
						<text class="project-card__stats" v-if="projectStats(project)">{{ projectStats(project) }}</text>
					</view>
					<view class="project-card__delete" @tap.stop="confirmDelete(project)">
						<text class="project-card__delete-icon">🗑</text>
					</view>
					<text class="project-card__arrow">›</text>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-if="store.activeProjects.length === 0">
				<text class="empty-wrap__icon">&#x1F3E0;</text>
				<text class="empty-wrap__text">还没有项目</text>
				<text class="empty-wrap__hint">创建项目后可以按项目统计加班收入</text>
			</view>

			<!-- 已归档项目 -->
			<view class="archived-section" v-if="store.archivedProjects.length > 0">
				<text class="archived-section__title">已归档</text>
				<view
					v-for="project in store.archivedProjects"
					:key="project._id"
					class="project-card project-card--archived"
					@tap="editProject(project)"
				>
					<view class="project-card__bar" :style="{ background: project.color || '#1B8A5A' }"></view>
					<view class="project-card__info">
						<text class="project-card__name">{{ project.name }}</text>
						<text class="project-card__rate">{{ rateSummary(project) }}</text>
						<text class="project-card__stats" v-if="projectStats(project)">{{ projectStats(project) }}</text>
					</view>
					<view class="project-card__delete" @tap.stop="confirmDelete(project)">
						<text class="project-card__delete-icon">🗑</text>
					</view>
					<text class="project-card__arrow">›</text>
				</view>
			</view>

			<!-- 新建按钮（内联） -->
			<view class="create-btn" @tap="createProject">
				<text class="create-btn__text">+ 新建项目</text>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useSalaryStore } from '../../stores/salaryStore'
import { useWorkStore } from '@/stores/workStore'

export default {
	components: { NavBar },
	data() {
		return {
			store: useProjectStore()
		}
	},
	onShow() {
		this.store.loadProjects()
		const oStore = useWorkStore()
		oStore.loadRecords()
	},
	methods: {
		rateSummary(project) {
			const mode = project.pay_mode || "hourly"
			const icons = { hourly: "⏱", daily: "📅", piece: "📦" }
			const icon = icons[mode] || "⏱"
			if (mode === "daily") {
				return icon + " 日薪 ¥" + (project.daily_rate || 0)
			}
			if (mode === "piece") {
				return icon + " 计件 ¥" + (project.piece_rate || 0) + "/" + (project.piece_unit || "件")
			}
			const salaryStore = useSalaryStore()
			const wd = project.weekday_rate || salaryStore.weekdayRate
			const we = project.weekend_rate || salaryStore.weekendRate
			const hd = project.holiday_rate || salaryStore.holidayRate
			return icon + " 平¥" + wd + " 周¥" + we + " 节¥" + hd
		},
		projectStats(project) {
			if (!project._id) return ""
			const oStore = useWorkStore()
			const records = oStore.records.filter(r => r.project_id === project._id)
			const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
			const totalPay = records.reduce((s, r) => s + (r.pay || 0), 0)
			const totalDays = records.reduce((s, r) => s + (r.days || 0), 0)
			const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0)
			if (totalPay === 0) return ""
			const mode = project.pay_mode || "hourly"
			if (mode === "daily") return "共" + totalDays + "天 · ¥" + totalPay.toFixed(0)
			if (mode === "piece") return "共" + totalQty + (project.piece_unit || "件") + " · ¥" + totalPay.toFixed(0)
			return "共" + totalHours + "h · ¥" + totalPay.toFixed(0)
		},
		editProject(project) {
			uni.navigateTo({ url: `/pages/project-edit/project-edit?id=${project._id}` })
		},
		createProject() {
			uni.navigateTo({ url: '/pages/project-edit/project-edit' })
		},
		confirmDelete(project) {
			uni.showModal({
				title: '确认删除',
				content: `删除项目「${project.name}」不会删除加班记录，但记录将不再关联该项目。`,
				confirmText: '删除',
				confirmColor: '#B85C4A',
				success: (res) => {
					if (res.confirm) {
						this.store.deleteProject(project._id)
						uni.showToast({ title: '已删除', icon: 'success' })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-projects {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 0 16px 100px;
		max-width: 640px;
		margin: 0 auto;
	}
}

.project-list {
	margin-top: 16px;
}

.project-card {
	display: flex;
	align-items: center;
	padding: 12px 14px;
	background: var(--surface);
	border-radius: 8px;
	border: 1px solid var(--border);
	margin-bottom: 8px;
	cursor: pointer;

	&--archived {
		opacity: 0.6;
	}

	&__bar {
		width: 4px;
		height: 36px;
		border-radius: 2px;
		margin-right: 10px;
		flex-shrink: 0;
	}

	&__info {
		flex: 1;
	}

	&__name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		display: block;
	}

	&__rate {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}

	&__stats {
		font-size: 11px;
		color: var(--primary);
		margin-top: 1px;
		display: block;
	}

	&__delete {
		padding: 4px; margin-right: 4px;
	}
	&__delete-icon {
		font-size: 14px; opacity: 0.5;
	}

	&__arrow {
		font-size: 16px;
		color: var(--text-muted);
		margin-left: 8px;
	}
}

.empty-wrap {
	text-align: center;
	padding: 80px 0;

	&__icon { font-size: 48px; }

	&__text {
		font-size: 16px;
		color: var(--text-muted);
		display: block;
		margin-top: 12px;
	}

	&__hint {
		font-size: 13px;
		color: var(--text-muted);
		display: block;
		margin-top: 6px;
	}
}

.archived-section {
	margin-top: 24px;

	&__title {
		font-size: 14px;
		color: var(--text-muted);
		margin-bottom: 10px;
		display: block;
	}
}

.create-btn {
	display: block;
	text-align: center;
	padding: 12px;
	margin-top: 16px;
	border-radius: 20px;
	background: var(--primary);
	color: #FFFFFF;
	font-weight: 600;
	font-size: 14px;
	cursor: pointer;

	&__text {
		color: #FFFFFF;
	}
}
</style>
