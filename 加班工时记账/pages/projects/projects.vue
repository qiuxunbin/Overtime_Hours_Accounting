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
					<view class="project-card__color" :style="{ background: project.color || '#07C160' }"></view>
					<view class="project-card__info">
						<text class="project-card__name">{{ project.name }}</text>
						<text class="project-card__rate">{{ rateSummary(project) }}</text>
					</view>
					<view class="project-card__action" @tap.stop="confirmDelete(project)">
						<text class="project-card__delete">删除</text>
					</view>
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
					<view class="project-card__color" :style="{ background: project.color || '#07C160' }"></view>
					<view class="project-card__info">
						<text class="project-card__name">{{ project.name }}</text>
						<text class="project-card__rate">{{ rateSummary(project) }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部新建按钮 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__save" @tap="createProject">
					<text class="bottom-bar__save-text">+ 新建项目</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useSalaryStore } from '../../stores/salaryStore'

export default {
	components: { NavBar },
	data() {
		return {
			store: null
		}
	},
	onShow() {
		this.store = useProjectStore()
		this.store.loadProjects()
	},
	methods: {
		rateSummary(project) {
			const salaryStore = useSalaryStore()
			const wd = project.weekday_rate || salaryStore.weekdayRate
			const we = project.weekend_rate || salaryStore.weekendRate
			const hd = project.holiday_rate || salaryStore.holidayRate
			return `平日 ¥${wd} · 周末 ¥${we} · 假日 ¥${hd}`
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
				confirmColor: '#BA1A1A',
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
	background: #F7F7F7;

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
	padding: 14px 16px;
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	margin-bottom: 10px;

	&--archived {
		opacity: 0.6;
	}

	&__color {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		margin-right: 12px;
		flex-shrink: 0;
	}

	&__info {
		flex: 1;
	}

	&__name {
		font-size: 16px;
		font-weight: 500;
		color: #1A1C1C;
		display: block;
	}

	&__rate {
		font-size: 12px;
		color: #999999;
		margin-top: 2px;
		display: block;
	}

	&__action {
		margin-left: 8px;
	}

	&__delete {
		font-size: 13px;
		color: #BA1A1A;
		padding: 4px 8px;
	}
}

.empty-wrap {
	text-align: center;
	padding: 80px 0;

	&__icon {
		font-size: 48px;
	}

	&__text {
		font-size: 16px;
		color: #999999;
		display: block;
		margin-top: 12px;
	}

	&__hint {
		font-size: 13px;
		color: #CCCCCC;
		display: block;
		margin-top: 6px;
	}
}

.archived-section {
	margin-top: 24px;

	&__title {
		font-size: 14px;
		color: #999999;
		margin-bottom: 10px;
		display: block;
	}
}

/* 底部 */
.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #FFFFFF;
	border-top: 1px solid #E5E5E5;
	z-index: 100;

	&__inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	&__save {
		height: 48px;
		border-radius: 10px;
		background: #07C160;
		display: flex;
		align-items: center;
		justify-content: center;
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
