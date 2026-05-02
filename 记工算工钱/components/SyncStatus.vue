<template>
	<view class="sync-status" @tap="handleTap">
		<text v-if="status === 'syncing'" class="sync-status__icon sync-status__icon--syncing">↻</text>
		<text v-else-if="status === 'synced'" class="sync-status__icon sync-status__icon--synced">✓</text>
		<text v-else-if="status === 'offline'" class="sync-status__icon sync-status__icon--offline">☁</text>
		<text v-else-if="status === 'error'" class="sync-status__icon sync-status__icon--error">⚠</text>
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
			if (this.status === 'error') store.flushSyncQueue()
			else if (this.status === 'offline') store.pullFromCloud()
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

		&--synced { color: var(--primary); }
		&--syncing { color: var(--primary); animation: spin 1s linear infinite; }
		&--offline { color: var(--text-muted); }
		&--error { color: #E5A100; }
	}
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
