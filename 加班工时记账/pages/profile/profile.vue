<template>
	<view class="page-profile">
		<NavBar title="我的" />

		<view class="page-profile__content">
			<!-- 个人信息 -->
			<view class="profile-header">
				<view class="profile-header__avatar">
					<text class="profile-header__avatar-text">&#x1F464;</text>
				</view>
				<view class="profile-header__info">
					<text class="profile-header__name">加班人</text>
					<text class="profile-header__desc">记录每一笔加班</text>
				</view>
			</view>

			<!-- App端登录入口 -->
			<!-- #ifdef APP-PLUS -->
			<view class="profile-menu" v-if="!isLoggedIn">
				<view class="cell-item" @tap="goLogin">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F512;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">登录 / 注册</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
			</view>
			<!-- #endif -->

			<!-- 功能菜单 -->
			<view class="profile-menu" v-if="isLoggedIn || !isApp">
				<view class="cell-item" @tap="goSalary">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4B0;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">薪资设置</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item" @tap="goClock">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x23F0;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">考勤提醒</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item" @tap="handleExport">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4E4;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">导出数据</text></view>
					<view class="cell-item__right"><text class="cell-item__desc">备份全部记录</text><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item cell-item--last" @tap="showImport = true">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4E5;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">导入数据</text></view>
					<view class="cell-item__right"><text class="cell-item__desc">恢复备份</text><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
			</view>

			<view class="profile-menu">
				<view class="cell-item" @tap="goFeedback">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x1F4AC;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">意见反馈</text></view>
					<view class="cell-item__right"><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
				<view class="cell-item cell-item--last" @tap="showAbout">
					<view class="cell-item__icon"><text class="cell-item__icon-text">&#x2139;</text></view>
					<view class="cell-item__content"><text class="cell-item__label">关于</text></view>
					<view class="cell-item__right"><text class="cell-item__value">v1.0.0</text><text class="cell-item__arrow">&#x203A;</text></view>
				</view>
			</view>

			<text class="page-profile__tip">数据存储在云数据库。导出备份可复制 JSON 保存到备忘录。导入时粘贴 JSON 恢复。</text>
		</view>

		<!-- 导入弹窗 -->
		<view class="import-mask" v-if="showImport" @tap="showImport = false">
			<view class="import-panel" @tap.stop>
				<text class="import-panel__title">导入数据</text>
				<text class="import-panel__desc">粘贴之前导出的 JSON 备份数据</text>
				<textarea
					class="import-panel__textarea"
					v-model="importText"
					placeholder="在此粘贴 JSON 数据..."
					placeholder-style="color: #CCCCCC; font-size: 13px;"
				/>
				<view class="import-panel__btns">
					<view class="import-panel__btn import-panel__btn--cancel" @tap="showImport = false">
						<text>取消</text>
					</view>
					<view class="import-panel__btn import-panel__btn--confirm" @tap="handleImport">
						<text>{{ importing ? '导入中...' : '确认导入' }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'
import { useSalaryStore } from '../../stores/salaryStore'
import { useUserStore } from '../../stores/userStore'

export default {
	components: { NavBar },
	data() {
		return {
			showImport: false,
			importText: '',
			importing: false
		}
	},
	computed: {
		isLoggedIn() {
			return useUserStore().isLoggedIn
		},
		isApp() {
			// #ifdef APP-PLUS
			return true
			// #endif
			// #ifndef APP-PLUS
			return false
			// #endif
		}
	},
	methods: {
		goLogin() {
			uni.navigateTo({ url: '/pages/login/login' })
		},
		goSalary() {
			uni.navigateTo({ url: '/pages/salary/salary' })
		},
		goClock() {
			uni.navigateTo({ url: '/pages/clock/clock' })
		},
		async handleExport() {
			uni.showLoading({ title: '导出中...' })

			try {
				const result = await uniCloud.callFunction({
					name: 'data-backup',
					data: { action: 'export' }
				})

				uni.hideLoading()

				if (result.result && result.result.code === 0) {
					const backup = result.result.data
					const jsonStr = JSON.stringify(backup, null, 2)

					uni.showActionSheet({
						itemList: ['复制 JSON 到剪贴板', '生成可读文本分享'],
						success: (actionRes) => {
							if (actionRes.tapIndex === 0) {
								uni.setClipboardData({
									data: jsonStr,
									success: () => {
										uni.showToast({ title: 'JSON 已复制到剪贴板', icon: 'success' })
									}
								})
							} else if (actionRes.tapIndex === 1) {
								const records = backup.data['overtime-record'] || []
								const totalHours = records.reduce((s, r) => s + (r.duration || 0), 0)
								const summary = `加班工时记账 - 数据备份\n记录数：${records.length} 条\n总工时：${totalHours} 小时\n导出时间：${new Date().toLocaleString()}\n\n--- 以下是 JSON 数据 ---\n${jsonStr}`
								uni.setClipboardData({
									data: summary,
									success: () => {
										uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
									}
								})
							}
						}
					})
				} else {
					uni.showToast({ title: result.result?.message || '导出失败', icon: 'none' })
				}
			} catch (e) {
				uni.hideLoading()
				uni.showToast({ title: '网络错误，请重试', icon: 'none' })
			}
		},
		async handleImport() {
			if (this.importing) return
			if (!this.importText.trim()) {
				uni.showToast({ title: '请粘贴 JSON 数据', icon: 'none' })
				return
			}

			let backup
			try {
				backup = JSON.parse(this.importText.trim())
			} catch (e) {
				uni.showToast({ title: 'JSON 格式错误', icon: 'none' })
				return
			}

			if (!backup.data || typeof backup.data !== 'object') {
				uni.showToast({ title: '无效的备份数据', icon: 'none' })
				return
			}

			const recordCount = backup.data['overtime-record']
				? (Array.isArray(backup.data['overtime-record']) ? backup.data['overtime-record'].length : '?')
				: 0

			uni.showModal({
				title: '确认导入',
				content: `将从备份恢复 ${recordCount} 条加班记录。\n云端现有数据将被覆盖，是否继续？`,
				confirmText: '确认导入',
				confirmColor: '#BA1A1A',
				success: async (res) => {
					if (!res.confirm) return

					this.importing = true
					uni.showLoading({ title: '导入中...' })

					try {
						const result = await uniCloud.callFunction({
							name: 'data-backup',
							data: {
								action: 'import',
								data: backup,
								overwrite: true
							}
						})

						uni.hideLoading()

						if (result.result && result.result.code === 0) {
							const overtimeStore = useOvertimeStore()
							await overtimeStore.loadRecords()
							const salaryStore = useSalaryStore()
							await salaryStore.loadConfig()

							uni.showToast({ title: '导入成功', icon: 'success' })
							this.showImport = false
							this.importText = ''
						} else {
							uni.showToast({ title: result.result?.message || '导入失败', icon: 'none' })
						}
					} catch (e) {
						uni.hideLoading()
						uni.showToast({ title: '网络错误，请重试', icon: 'none' })
					}
					this.importing = false
				}
			})
		},
		goFeedback() {
			uni.navigateTo({ url: '/pages/feedback/feedback' })
		},
		showAbout() {
			uni.showModal({
				title: '加班工时记账',
				content: '记录加班、自动算钱、月结对账。\n让每一分钟加班都算数。\n\nv1.0.0',
				showCancel: false,
				confirmText: '知道了'
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-profile {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

	&__content {
		padding: 16px 0 80px;
	}

	&__tip {
		font-size: 12px;
		color: #CCCCCC;
		text-align: center;
		display: block;
		padding: 0 32px;
		line-height: 18px;
	}
}

.profile-header {
	display: flex;
	align-items: center;
	padding: 20px 20px;
	background: #FFFFFF;
	margin: 0 16px 16px;
	border-radius: 12px;

	&__avatar {
		width: 56px;
		height: 56px;
		border-radius: 28px;
		background: #F2F2F2;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 16px;
	}

	&__avatar-text {
		font-size: 28px;
	}

	&__info {
		flex: 1;
	}

	&__name {
		font-size: 18px;
		font-weight: 600;
		color: #1A1C1C;
		display: block;
	}

	&__desc {
		font-size: 13px;
		color: #999999;
		margin-top: 2px;
		display: block;
	}
}

.cell-item {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	background: #FFFFFF;
	border-bottom: 1px solid #F3F3F3;

	&--last {
		border-bottom: none;
	}

	&__icon {
		width: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 12px;
	}

	&__icon-text {
		font-size: 18px;
	}

	&__content {
		flex: 1;
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
		font-size: 13px;
		color: #999999;
		margin-right: 4px;
	}

	&__desc {
		font-size: 12px;
		color: #BBBBBB;
		margin-right: 4px;
	}

	&__arrow {
		font-size: 18px;
		color: #CCCCCC;
	}
}

.profile-menu {
	background: #FFFFFF;
	border-radius: 12px;
	margin: 0 16px 16px;
	overflow: hidden;
}

.import-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 200;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.import-panel {
	width: 100%;
	background: #FFFFFF;
	border-radius: 20px 20px 0 0;
	padding: 28px 24px 32px;

	&__title {
		font-size: 20px;
		font-weight: 700;
		color: #1A1C1C;
		display: block;
	}

	&__desc {
		font-size: 13px;
		color: #999999;
		display: block;
		margin-top: 6px;
	}

	&__textarea {
		width: 100%;
		height: 140px;
		background: #F7F7F7;
		border-radius: 8px;
		padding: 12px;
		font-size: 13px;
		color: #1A1C1C;
		margin-top: 16px;
		line-height: 20px;
		box-sizing: border-box;
	}

	&__btns {
		display: flex;
		margin-top: 20px;
	}

	&__btn {
		flex: 1;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 6px;
		font-size: 15px;

		&--cancel {
			background: #F5F5F5;
			color: #666666;
		}

		&--confirm {
			background: #07C160;
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}
</style>
