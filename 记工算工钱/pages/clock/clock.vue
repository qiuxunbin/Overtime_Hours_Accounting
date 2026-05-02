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
				<switch class="alarm-card__switch" :checked="onDutyEnabled" color="#1B8A5A" @change="onDutyToggle" />
			</view>

			<!-- 下班提醒 -->
			<view class="alarm-card">
				<view class="alarm-card__left">
					<text class="alarm-card__icon">&#x1F319;</text>
					<view class="alarm-card__info">
						<text class="alarm-card__label">下班提醒</text>
						<text class="alarm-card__time" v-if="!offDutyEnabled" style="color: var(--text-muted);">未开启</text>
		<picker mode="time" :value="offDutyTime" @change="offDutyTimeChange" v-else>
							<text class="alarm-card__time">{{ offDutyTime }}</text>
						</picker>
					</view>
				</view>
				<switch class="alarm-card__switch" :checked="offDutyEnabled" color="#1B8A5A" @change="offDutyToggle" />
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

			<!-- 通知权限 -->
			<view class="notify-card">
				<view class="notify-card__left">
					<text class="notify-card__icon">&#x1F514;</text>
					<view class="notify-card__info">
						<text class="notify-card__title">消息通知权限</text>
						<text class="notify-card__desc">{{ notifyDesc }}</text>
					</view>
				</view>
				<view class="notify-card__btn" :class="{ 'notify-card__btn--done': subscribed }" @tap="requestNotification">
					<text>{{ subscribed ? '已授权' : '去授权' }}</text>
				</view>
			</view>

			<!-- 底部提示 -->
			<text class="page-clock__footer">{{ footerText }}</text>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'

const CLOCK_KEY = 'clock_settings'
const NOTIFY_SUB_KEY = 'notify_subscribed'

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
			repeatDays: settings.repeatDays || [1, 2, 3, 4, 5],
			subscribed: !!uni.getStorageSync(NOTIFY_SUB_KEY)
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
		},
		notifyDesc() {
			// #ifdef MP-WEIXIN
			return this.subscribed ? '已授权微信服务通知' : '需要授权后才能收到考勤提醒'
			// #endif
			// #ifdef APP-PLUS
			return this.subscribed ? '已开启本地通知' : '需要开启通知权限才能收到提醒'
			// #endif
			// #ifndef APP-PLUS || MP-WEIXIN
			return '当前平台暂不支持消息推送'
			// #endif
		},
		footerText() {
			// #ifdef MP-WEIXIN
			return '开启后将在设定时间通过微信服务通知提醒你'
			// #endif
			// #ifdef APP-PLUS
			return '开启后将在设定时间通过本地通知提醒你'
			// #endif
			// #ifndef APP-PLUS || MP-WEIXIN
			return '开启后将在设定时间提醒你'
			// #endif
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
		},
		requestNotification() {
			// #ifdef MP-WEIXIN
			// 订阅消息：需在微信公众平台配置模板，替换为实际模板ID
			// 路径：微信公众平台 → 功能 → 订阅消息 → 选用模板 → 复制模板ID
			const tmplIds = [
				// 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // 上班提醒模板ID
				// 'yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy', // 下班提醒模板ID
			]
			if (tmplIds.length === 0 || tmplIds[0].startsWith('x')) {
				uni.showModal({
					title: '提示',
					content: '请先在微信公众平台配置订阅消息模板，然后在代码中填入模板ID。\n\n路径：微信公众平台 → 功能 → 订阅消息 → 选用模板',
					showCancel: false,
					confirmText: '知道了'
				})
				return
			}
			uni.requestSubscribeMessage({
				tmplIds,
				success: (res) => {
					const accepted = tmplIds.some(id => res[id] === 'accept')
					if (accepted) {
						this.subscribed = true
						uni.setStorageSync(NOTIFY_SUB_KEY, true)
						uni.showToast({ title: '授权成功', icon: 'success' })
					} else {
						uni.showToast({ title: '已取消授权', icon: 'none' })
					}
				},
				fail: (err) => {
					console.log('[notify] 订阅失败:', JSON.stringify(err))
					uni.showToast({ title: '授权失败，请在设置中手动开启', icon: 'none' })
				}
			})
			// #endif

			// #ifdef APP-PLUS
			if (this.subscribed) {
				uni.showToast({ title: '已开启通知权限', icon: 'none' })
				return
			}
			// App 端使用本地通知，首次保存设置时即视为授权
			this.subscribed = true
			uni.setStorageSync(NOTIFY_SUB_KEY, true)
			uni.showToast({ title: '已开启考勤提醒', icon: 'success' })
			// #endif
		}
	}
}
</script>

<style lang="scss" scoped>
.page-clock {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 16px;
		display: flex;
		flex-direction: column;
	}

	&__footer {
		text-align: center;
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 20px;
	}
}

.alarm-card {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
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
		color: var(--text-muted);
	}

	&__time {
		font-size: 40px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.1;
	}

	&__switch {
		transform: scale(0.9);
		transform-origin: right center;
	}
}

.settings-group {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	overflow: hidden;
	margin-bottom: 12px;
}

.settings-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px;
	border-bottom: 1px solid var(--border);

	&--last {
		border-bottom: none;
	}

	&__label {
		font-size: 15px;
		color: var(--text-primary);
	}

	&__right {
		display: flex;
		align-items: center;
	}

	&__value {
		font-size: 14px;
		color: var(--text-muted);
		margin-right: 4px;
	}

	&__arrow {
		font-size: 20px;
		color: var(--text-muted);
		line-height: 1;
	}
}

/* 通知权限卡片 */
.notify-card {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	padding: 16px;
	display: flex;
	align-items: center;
	justify-content: space-between;

	&__left {
		display: flex;
		align-items: center;
		flex: 1;
	}

	&__icon {
		font-size: 28px;
		margin-right: 12px;
	}

	&__info {
		display: flex;
		flex-direction: column;
	}

	&__title {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
	}

	&__desc {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	&__btn {
		padding: 8px 16px;
		border-radius: 16px;
		background: var(--primary-light);
		color: var(--primary);
		font-size: 13px;
		font-weight: 500;

		&--done {
			background: var(--surface-hover);
			color: var(--text-muted);
		}
	}
}
</style>
