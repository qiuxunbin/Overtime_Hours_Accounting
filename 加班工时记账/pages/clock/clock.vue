<template>
	<view class="page-clock">
		<NavBar title="考勤提醒" :showBack="true" />

		<view class="page-clock__content">
			<!-- 上班提醒 -->
			<view class="alarm-card">
				<view class="alarm-card__left">
					<text class="alarm-card__icon">&#x2600;</text>
					<view class="alarm-card__info">
						<text class="alarm-card__label">上班提醒</text>
						<picker mode="time" :value="onDutyTime" @change="onDutyTimeChange">
							<text class="alarm-card__time">{{ onDutyTime }}</text>
						</picker>
					</view>
				</view>
				<switch class="alarm-card__switch" :checked="onDutyEnabled" color="#07C160" @change="onDutyToggle" />
			</view>

			<!-- 下班提醒 -->
			<view class="alarm-card">
				<view class="alarm-card__left">
					<text class="alarm-card__icon">&#x1F319;</text>
					<view class="alarm-card__info">
						<text class="alarm-card__label">下班提醒</text>
						<picker mode="time" :value="offDutyTime" @change="offDutyTimeChange">
							<text class="alarm-card__time">{{ offDutyTime }}</text>
						</picker>
					</view>
				</view>
				<switch class="alarm-card__switch" :checked="offDutyEnabled" color="#07C160" @change="offDutyToggle" />
			</view>

			<!-- 设置 -->
			<view class="settings-group">
				<view class="settings-item">
					<text class="settings-item__label">重复</text>
					<view class="settings-item__right">
						<text class="settings-item__value">{{ repeatLabel }}</text>
						<text class="settings-item__arrow">&#x203A;</text>
					</view>
				</view>
				<view class="settings-item settings-item--last">
					<text class="settings-item__label">提醒方式</text>
					<view class="settings-item__right">
						<text class="settings-item__value">模板消息</text>
						<text class="settings-item__arrow">&#x203A;</text>
					</view>
				</view>
			</view>

			<!-- 底部提示 -->
			<text class="page-clock__footer">开启后将在设定时间通过微信服务通知提醒你</text>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'

const CLOCK_KEY = 'clock_settings'

function defaultSettings() {
	return {
		onDutyEnabled: true,
		onDutyTime: '08:30',
		offDutyEnabled: false,
		offDutyTime: '18:00',
		repeatDays: [1, 2, 3, 4, 5]
	}
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export default {
	components: { NavBar },
	data() {
		const saved = uni.getStorageSync(CLOCK_KEY)
		const settings = saved || defaultSettings()
		return {
			onDutyEnabled: settings.onDutyEnabled,
			onDutyTime: settings.onDutyTime,
			offDutyEnabled: settings.offDutyEnabled,
			offDutyTime: settings.offDutyTime,
			repeatDays: settings.repeatDays || [1, 2, 3, 4, 5]
		}
	},
	computed: {
		repeatLabel() {
			if (this.repeatDays.length === 0) return '不重复'
			if (this.repeatDays.length === 7) return '每天'
			const isWeekday = this.repeatDays.length === 5 &&
				this.repeatDays.every(d => d >= 1 && d <= 5)
			if (isWeekday) return '周一至周五'
			return this.repeatDays.map(d => '周' + DAY_NAMES[d]).join('、')
		}
	},
	methods: {
		save() {
			uni.setStorageSync(CLOCK_KEY, {
				onDutyEnabled: this.onDutyEnabled,
				onDutyTime: this.onDutyTime,
				offDutyEnabled: this.offDutyEnabled,
				offDutyTime: this.offDutyTime,
				repeatDays: this.repeatDays
			})
		},
		onDutyToggle(e) {
			this.onDutyEnabled = e.detail.value
			this.save()
		},
		offDutyToggle(e) {
			this.offDutyEnabled = e.detail.value
			this.save()
		},
		onDutyTimeChange(e) {
			this.onDutyTime = e.detail.value
			this.save()
		},
		offDutyTimeChange(e) {
			this.offDutyTime = e.detail.value
			this.save()
		}
	}
}
</script>

<style lang="scss" scoped>
.page-clock {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

	&__content {
		padding: 16px;
		display: flex;
		flex-direction: column;
	}

	&__footer {
		text-align: center;
		font-size: 13px;
		color: #999999;
		margin-top: 20px;
	}
}

.alarm-card {
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	padding: 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;

	&__left {
		display: flex;
		align-items: center;
	}

	&__icon {
		font-size: 32px;
		margin-right: 16px;
	}

	&__info {
		display: flex;
		flex-direction: column;
	}

	&__label {
		font-size: 14px;
		color: #999999;
	}

	&__time {
		font-size: 40px;
		font-weight: 700;
		color: #1A1C1C;
		line-height: 1.1;
	}

	&__switch {
		transform: scale(0.9);
		transform-origin: right center;
	}
}

.settings-group {
	background: #FFFFFF;
	border-radius: 12px;
	border: 1px solid #E5E5E5;
	overflow: hidden;
	margin-bottom: 12px;
}

.settings-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	border-bottom: 1px solid #F0F0F0;

	&--last {
		border-bottom: none;
	}

	&__label {
		font-size: 15px;
		color: #1A1C1C;
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__value {
		font-size: 14px;
		color: #999999;
		margin-right: 4px;
	}

	&__arrow {
		font-size: 20px;
		color: #CCCCCC;
		line-height: 1;
	}
}
</style>
