<template>
	<view class="page-records">
		<NavBar title="记录明细" :showBack="true" />

		<view class="page-records__content">
			<!-- 月份切换 -->
			<view class="month-nav">
				<view class="month-nav__btn" @tap="prevMonth">
					<text class="month-nav__icon">&#x2039;</text>
				</view>
				<text class="month-nav__title">{{ monthLabel }}</text>
				<view class="month-nav__btn" @tap="nextMonth">
					<text class="month-nav__icon">&#x203A;</text>
				</view>
			</view>

			<!-- 筛选栏 + 管理模式 -->
			<view class="filter-bar">
				<view class="filter-chip" @tap="onProjectFilter">
					<text class="filter-chip__text" :style="{ color: projectFilter ? '#1B8A5A' : '#9C9C9C' }">{{ projectFilterName || '所有工作' }}</text>
					<text class="filter-chip__arrow">›</text>
				</view>
				<template v-if="!selectMode">
					<view class="filter-chip" :class="{ 'filter-chip--active': settleFilter === 'all' }" @tap="settleFilter = 'all'">
						<text class="filter-chip__text">全部</text>
					</view>
					<view class="filter-chip" :class="{ 'filter-chip--active': settleFilter === 'unsettled' }" @tap="settleFilter = 'unsettled'">
						<text class="filter-chip__text">未结算</text>
					</view>
					<view class="filter-chip" :class="{ 'filter-chip--active': settleFilter === 'settled' }" @tap="settleFilter = 'settled'">
						<text class="filter-chip__text">已结算</text>
					</view>
				</template>
				<view class="filter-bar__spacer" v-if="!selectMode"></view>
				<view class="filter-chip filter-chip--manage" :class="{ 'filter-chip--active': selectMode }" @tap="toggleSelectMode">
					<text class="filter-chip__text">{{ selectMode ? '取消' : '管理' }}</text>
				</view>
			</view>

			<!-- 记录列表 -->
			<view class="record-list" v-if="filteredRecords.length > 0">
				<view
					v-for="(rec, idx) in filteredRecords"
					:key="rec.id || rec._id"
					class="record-item"
					:class="{
						'record-item--last': idx === filteredRecords.length - 1,
						'record-item--sel': selectMode && selectedMap[rec.id || rec._id]
					}"
					@tap="onItemTap(rec)"
				>
					<view class="record-item__check" v-if="selectMode">
						<view class="record-item__checkbox" :class="{ 'record-item__checkbox--on': selectedMap[rec.id || rec._id] }">
							<text v-if="selectedMap[rec.id || rec._id]">✓</text>
						</view>
					</view>
					<view class="record-item__icon" :class="iconClass(rec.day_type || rec.overtime_type)">
						<text class="record-item__icon-text">{{ typeLabel(rec.day_type || rec.overtime_type) }}</text>
					</view>
					<view class="record-item__info">
						<text class="record-item__date">{{ rec.date }}</text>
						<text class="record-item__project" v-if="rec.project_name">{{ rec.project_name }}</text>
					</view>
					<view class="record-item__right">
						<text class="record-item__mode">{{ modeLabel(rec.pay_mode) }}</text>
						<text class="record-item__settle" :class="rec.settled ? 'record-item__settle--done' : 'record-item__settle--pending'">{{ rec.settled ? '已结' : '未结' }}</text>
						<text class="record-item__qty">{{ qtyStr(rec) }}</text>
						<text class="record-item__pay" v-if="rec.net_pay || rec.pay">¥{{ (rec.net_pay || rec.pay).toFixed(0) }}</text>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-else>
				<text class="empty-wrap__icon">&#x1F4C4;</text>
				<text class="empty-wrap__text">{{ emptyText }}</text>
				<text class="empty-wrap__hint">切换到有记工的月份或调整筛选条件</text>
			</view>

			<view class="page-records__spacer"></view>
		</view>

		<!-- 批量删除底栏 -->
		<view class="batch-bar" v-if="selectMode && selectedCount > 0">
			<view class="batch-bar__inner">
				<view class="batch-bar__btn batch-bar__btn--del" @tap="batchDelete">
					<text class="batch-bar__btn-text">删除已选 ({{ selectedCount }})</text>
				</view>
			</view>
			<view class="batch-bar__safe"></view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '../../stores/projectStore'

function pad(n) { return String(n).padStart(2, '0') }

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		return {
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			projectFilter: null,
			settleFilter: 'all',
			selectMode: false,
			selectedMap: {}
		}
	},
	computed: {
		monthLabel() {
			return `${this.viewYear}年${this.viewMonth}月`
		},
		monthPrefix() {
			return `${this.viewYear}-${pad(this.viewMonth)}`
		},
		allRecords() {
			return useWorkStore().records || []
		},
		monthRecords() {
			return this.allRecords.filter(r => r.date && r.date.startsWith(this.monthPrefix))
		},
		filteredRecords() {
			let list = this.monthRecords
			if (this.settleFilter === 'unsettled') list = list.filter(r => !r.settled)
			else if (this.settleFilter === 'settled') list = list.filter(r => r.settled)
			if (this.projectFilter) list = list.filter(r => r.project_id === this.projectFilter)
			return list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || 0) - (a.created_at || 0))
		},
		projectFilterName() {
			if (!this.projectFilter) return ''
			const pStore = useProjectStore()
			const proj = pStore.getProjectById(this.projectFilter)
			return proj ? proj.name : ''
		},
		emptyText() {
			if (this.settleFilter !== 'all' || this.projectFilter) return '当前筛选条件下无记录'
			return '本月没有记工记录'
		},
		selectedCount() {
			return Object.keys(this.selectedMap).length
		},
	},
	onShow() {
		if (this.selectMode) return
		const store = useWorkStore()
		store.loadRecords()
	},
	methods: {
		prevMonth() {
			if (this.viewMonth === 1) { this.viewYear--; this.viewMonth = 12 }
			else { this.viewMonth-- }
		},
		nextMonth() {
			if (this.viewMonth === 12) { this.viewYear++; this.viewMonth = 1 }
			else { this.viewMonth++ }
		},
		typeLabel(type) {
			const m = { weekday: '平', weekend: '休', holiday: '节' }
			return m[type] || '平'
		},
		iconClass(type) {
			return type === 'weekend' ? 'record-item__icon--weekend' : type === 'holiday' ? 'record-item__icon--holiday' : 'record-item__icon--weekday'
		},
		modeLabel(mode) {
			const m = { hourly: '时薪', daily: '日薪', piece: '计件' }
			return m[mode] || '时薪'
		},
		qtyStr(rec) {
			if (rec.pay_mode === 'daily') return (rec.days || 1) + '天'
			if (rec.pay_mode === 'piece') return (rec.quantity || 0) + (rec.piece_unit || '件')
			return (rec.duration || 0) + 'h'
		},
		goEdit(id) {
			uni.navigateTo({ url: '/pages/record/record?id=' + id })
		},
		onItemTap(rec) {
			if (this.selectMode) {
				const id = rec.id || rec._id
				const next = { ...this.selectedMap }
					if (next[id]) { delete next[id] } else { next[id] = true }
					this.selectedMap = next
			} else {
				this.goEdit(rec.id || rec._id)
			}
		},
		toggleSelectMode() {
			this.selectMode = !this.selectMode
			if (!this.selectMode) this.selectedMap = {}
		},
		batchDelete() {
			if (this.selectedCount === 0) return
			uni.showModal({
				title: '确认删除',
				content: `将删除 ${this.selectedCount} 条记录，删除后无法恢复`,
				confirmText: '删除',
				confirmColor: '#B85C4A',
				success: (res) => {
					if (res.confirm) {
						const store = useWorkStore()
						const ids = Object.keys(this.selectedMap)
						for (const id of ids) {
							store.deleteRecord(id)
						}
						this.selectedMap = {}
						this.selectMode = false
						uni.showToast({ title: `已删除 ${ids.length} 条`, icon: 'success' })
					}
				}
			})
		},
		onProjectFilter() {
			const pStore = useProjectStore()
			pStore.loadProjects()
			const items = [
				{ text: '所有工作', value: null },
				...pStore.activeProjects.map(p => ({ text: p.name, value: p._id }))
			]
			setTimeout(() => {
				uni.showActionSheet({
					itemList: items.map(i => i.text),
					success: (res) => {
						this.projectFilter = items[res.tapIndex].value
					}
				})
			}, 100)
		}
	}
}
</script>

<style lang="scss" scoped>
.page-records {
	padding-top: 56px; min-height: 100vh; background: var(--surface);
	&__content { padding: 0 16px 100px; max-width: 640px; margin: 0 auto; }
	&__spacer { height: 60px; }
}

.month-nav {
	display: flex; align-items: center; justify-content: space-between; padding: 16px 0;
	&__title { font-size: 17px; font-weight: 600; color: var(--text-primary); }
	&__btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
	&__icon { font-size: 22px; color: var(--text-muted); }
}

/* 筛选栏 */
.filter-bar {
	display: flex; gap: 8px; margin-bottom: 12px; align-items: center;
}
.filter-bar__spacer { flex: 1; }
.filter-chip {
	padding: 4px 10px; border-radius: 20px; background: var(--surface-hover);
	display: flex; align-items: center;
}
.filter-chip--active { background: rgba(27, 138, 90, 0.1); }
.filter-chip--active .filter-chip__text { color: var(--primary); }
.filter-chip--manage { background: transparent; border: 1px solid var(--border); }
.filter-chip--manage.filter-chip--active { background: #B85C4A; border-color: #B85C4A; }
.filter-chip--manage.filter-chip--active .filter-chip__text { color: #FFFFFF; }
.filter-chip__text { font-size: 12px; color: var(--text-muted); }
.filter-chip__arrow { font-size: 12px; color: var(--text-muted); margin-left: 2px; }

/* 记录列表 */
.record-list {
	background: var(--surface-card); border-radius: 12px; border: 1px solid var(--border); overflow: hidden;
}
.record-item {
	display: flex; align-items: center; padding: 12px 14px;
	border-bottom: 1px solid var(--border); cursor: pointer;
	&--last { border-bottom: none; }
	&--sel { background: rgba(184, 92, 74, 0.06); }
	&__check { margin-right: 8px; flex-shrink: 0; }
	&__checkbox {
		width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border);
		display: flex; align-items: center; justify-content: center; font-size: 11px; color: #FFFFFF;
		&--on { background: #B85C4A; border-color: #B85C4A; }
	}
	&__icon {
		width: 34px; height: 34px; border-radius: 17px;
		display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 10px;
		&--weekday { background: rgba(27, 138, 90, 0.12); }
		&--weekend { background: rgba(0, 100, 149, 0.12); }
		&--holiday { background: rgba(162, 61, 51, 0.12); }
	}
	&__icon-text { font-size: 11px; font-weight: 600; color: var(--primary); }
	&__icon--weekend &__icon-text { color: #006495; }
	&__icon--holiday &__icon-text { color: #A23D33; }
	&__info { flex: 1; }
	&__date { font-size: 14px; font-weight: 500; color: var(--text-primary); display: block; }
	&__project { font-size: 11px; color: var(--primary); margin-top: 2px; display: block; }
	&__right { text-align: right; min-width: 80px; }
	&__mode {
		font-size: 10px; color: var(--primary); background: var(--primary-light);
		padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;
	}
	&__settle {
		font-size: 10px; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;
		&--pending { color: #E5A100; background: #FFF8E6; }
		&--done { color: var(--primary); background: #E6FFF0; }
	}
	&__qty { font-size: 15px; font-weight: 600; color: var(--primary); display: block; }
	&__pay { font-size: 12px; color: var(--text-muted); display: block; margin-top: 1px; }
}

/* 空状态 */
.empty-wrap { text-align: center; padding: 80px 0;
	&__icon { font-size: 48px; }
	&__text { font-size: 16px; color: var(--text-muted); display: block; margin-top: 12px; }
	&__hint { font-size: 13px; color: var(--text-muted); display: block; margin-top: 6px; }
}

/* 批量删除底栏 */
.batch-bar {
	position: fixed; bottom: 0; left: 0; right: 0;
	background: var(--surface-card); border-top: 1px solid var(--border); z-index: 100;
	&__inner { max-width: 640px; margin: 0 auto; padding: 12px 16px; }
	&__btn {
		height: 48px; border-radius: 20px; display: flex; align-items: center; justify-content: center;
		&--del { background: #B85C4A; }
	}
	&__btn-text { font-size: 17px; font-weight: 600; color: #FFFFFF; }
	&__safe { height: constant(safe-area-inset-bottom); height: env(safe-area-inset-bottom); }
}
</style>
