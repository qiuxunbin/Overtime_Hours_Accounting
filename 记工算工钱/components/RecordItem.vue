<template>
	<view class="record-item" :class="itemClasses" @tap="onTap">
		<view class="record-item__check" v-if="selectMode">
			<view class="record-item__checkbox" :class="{ 'record-item__checkbox--on': selected }">
				<text v-if="selected">✓</text>
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
</template>

<script>
export default {
	props: {
		rec: { type: Object, required: true },
		selectMode: { type: Boolean, default: false },
		selected: { type: Boolean, default: false },
		isLast: { type: Boolean, default: false }
	},
	computed: {
		itemClasses() {
			return {
				'record-item--last': this.isLast,
				'record-item--sel': this.selectMode && this.selected
			}
		}
	},
	methods: {
		onTap() {
			this.$emit('tap', this.rec)
		},
		typeLabel(type) { const m = { weekday: '平', weekend: '休', holiday: '节' }; return m[type] || '平' },
		iconClass(type) { return type === 'weekend' ? 'record-item__icon--weekend' : type === 'holiday' ? 'record-item__icon--holiday' : 'record-item__icon--weekday' },
		modeLabel(mode) { const m = { hourly: '时薪', daily: '日薪', piece: '计件' }; return m[mode] || '时薪' },
		qtyStr(rec) { if (rec.pay_mode === 'daily') return (rec.days || 1) + '天'; if (rec.pay_mode === 'piece') return (rec.quantity || 0) + (rec.piece_unit || '件'); return (rec.duration || 0) + 'h' },
	}
}
</script>
