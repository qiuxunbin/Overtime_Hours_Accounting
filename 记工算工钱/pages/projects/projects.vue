<template>
	<view class="page-projects">
		<NavBar title="工作" :showBack="true" />

		<view class="page-projects__content">
				<view class="section-label">工作列表</view>
			<!-- 工作列表 -->
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
					<view class="project-card__delete" @tap.stop="confirmArchive(project)">
						<text class="project-card__delete-icon">📁</text>
					</view>
					<text class="project-card__edit-icon">✎</text><text class="project-card__arrow">›</text>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-if="store.activeProjects.length === 0">
				<text class="empty-wrap__icon">&#x1F3E0;</text>
				<text class="empty-wrap__text">还没有工作</text>
				<text class="empty-wrap__hint">创建工作后可以按工作统计记工收入</text>
			</view>

			<!-- 已归档工作 -->
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
					<view class="project-card__delete" @tap.stop="confirmUnarchive(project)">
						<text class="project-card__delete-icon">🗑</text>
					</view>
					<text class="project-card__arrow">›</text>
				</view>
			</view>

			<!-- 新建按钮（内联） -->
			<view class="create-btn" @tap="createProject">
				<text class="create-btn__text">+ 新建工作</text>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useWorkStore } from '@/stores/workStore'

export default {
	components: { NavBar },
	data() {
		return {
			store: useProjectStore(),
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
				const wd = project.daily_weekday_rate || project.daily_rate || 0;
				const we = project.daily_weekend_rate || 0;
				const hd = project.daily_holiday_rate || 0;
				return icon + " 日薪 平¥" + wd + " 周¥" + we + " 节¥" + hd
			}
			if (mode === "piece") {
				const wd = project.piece_weekday_rate || project.piece_rate || 0;
				const we = project.piece_weekend_rate || 0;
				const hd = project.piece_holiday_rate || 0;
				return icon + " 计件 平¥" + wd + " 周¥" + we + " 节¥" + hd + "/" + (project.piece_unit || "件")
			}
			const wd = project.weekday_rate || 0
			const we = project.weekend_rate || 0
			const hd = project.holiday_rate || 0
			return icon + " 平¥" + wd + " 周¥" + we + " 节¥" + hd
		},
		projectStats(project) {
			if (!project._id) return ""
			const oStore = useWorkStore()
			const records = oStore.records.filter(r => r.project_id === project._id)
			const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
			const totalPay = records.reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
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
		confirmArchive(project) {
			uni.showModal({
				title: '归档工作',
				content: `归档「${project.name}」后将从工作列表隐藏，记工记录不受影响，可随时取消归档。`,
				confirmText: '归档',
				confirmColor: '#1B8A5A',
				success: (res) => {
					if (res.confirm) {
						this.store.updateProject(project._id, { is_archived: true })
					}
				}
			})
		},
		confirmUnarchive(project) {
			uni.showModal({
				title: '取消归档',
				content: `将「${project.name}」移回工作列表。`,
				confirmText: '移回',
				confirmColor: '#1B8A5A',
				success: (res) => {
					if (res.confirm) {
						this.store.updateProject(project._id, { is_archived: false })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-projects {

.section-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
		display: block;
		margin-top: 24px;
		margin-bottom: 8px;
	}


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
		font-size: 16px;
		font-weight: 500;
		color: var(--text-primary);
		display: block;
	}

	&__rate {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 2px;
		display: block;
	}

	&__stats {
		font-size: 12px;
		color: var(--primary);
		margin-top: 1px;
		display: block;
	}

	&__delete {
		padding: 6px 8px; margin-right: 2px;
	}
	&__delete-icon {
		font-size: 20px;
	}

	&__edit-icon {
		font-size: 17px;
		color: var(--text-secondary);
		margin-left: 8px;
	}
	&__arrow {
		font-size: 18px;
		color: var(--text-muted);
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
