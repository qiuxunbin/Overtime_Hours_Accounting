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

<style lang="scss" scoped>
.record-item { display: flex; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--border); cursor: pointer;
	&--last { border-bottom: none; }
	&--sel { background: rgba(184, 92, 74, 0.06); }
	&__check { margin-right: 8px; flex-shrink: 0; }
	&__checkbox { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #FFFFFF;
		&--on { background: #B85C4A; border-color: #B85C4A; }
	}
	&__icon { width: 34px; height: 34px; border-radius: 17px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 10px;
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
	&__mode { font-size: 10px; color: var(--primary); background: var(--primary-light); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px; }
	&__settle { font-size: 10px; padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;
		&--pending { color: #E5A100; background: #FFF8E6; }
		&--done { color: var(--primary); background: #E6FFF0; }
	}
	&__qty { font-size: 15px; font-weight: 600; color: var(--primary); display: block; }
	&__pay { font-size: 12px; color: var(--text-muted); display: block; margin-top: 1px; }
}
</style>
