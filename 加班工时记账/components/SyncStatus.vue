<template>
	<view class="sync-status" @tap="handleTap">
		<!-- 同步中：旋转图标 -->
		<text v-if="status === 'syncing'" class="sync-status__icon sync-status__icon--syncing">&#x21BB;</text>
		<!-- 已同步：绿色勾 -->
		<text v-else-if="status === 'synced'" class="sync-status__icon sync-status__icon--synced">&#x2713;</text>
		<!-- 离线：灰色云 -->
		<text v-else-if="status === 'offline'" class="sync-status__icon sync-status__icon--offline">&#x2601;</text>
		<!-- 错误：黄色警告 -->
		<text v-else-if="status === 'error'" class="sync-status__icon sync-status__icon--error">&#x26A0;</text>
	</view>
</template>

<script>
import { useOvertimeStore } from '@/stores/overtimeStore'

export default {
	props: {
		compact: { type: Boolean, default: true }
	},
	computed: {
		status() {
			const store = useOvertimeStore()
			return store.syncStatus
		}
	},
	methods: {
		handleTap() {
			const store = useOvertimeStore()
			if (this.status === 'error') {
				store.flushSyncQueue()
			} else if (this.status === 'offline') {
				store.pullFromCloud()
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.sync-status {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;

	&__icon {
		font-size: 16px;
		line-height: 1;

		&--synced {
			color: #07C160;
		}

		&--syncing {
			color: #07C160;
			animation: spin 1s linear infinite;
		}

		&--offline {
			color: #CCCCCC;
		}

		&--error {
			color: #E5A100;
		}
	}
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
