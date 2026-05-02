<template>
	<view class="page-feedback">
		<NavBar title="意见反馈" :showBack="true" />

		<view class="page-feedback__content">
			<!-- 提交表单 -->
			<view class="form-card">
				<view class="form-group">
					<text class="form-group__label">标题</text>
					<input
						class="form-group__input"
						type="text"
						placeholder="请输入反馈标题"
						placeholder-class="form-group__placeholder"
						v-model="title"
					/>
				</view>
				<view class="form-group">
					<text class="form-group__label">内容</text>
					<textarea
						class="form-group__textarea"
						placeholder="请详细描述您的意见或问题..."
						placeholder-class="form-group__placeholder"
						v-model="content"
					/>
				</view>
			</view>

			<view class="form-submit" @tap="handleSubmit">
				<text class="form-submit__text">提交反馈</text>
			</view>

			<!-- 历史反馈 -->
			<view class="history-section" v-if="feedbackList.length > 0">
				<text class="history-section__title">我的反馈</text>
				<view class="history-list">
					<view
						v-for="(item, idx) in feedbackList"
						:key="idx"
						class="history-item"
					>
						<view class="history-item__header">
							<text class="history-item__title">{{ item.title }}</text>
							<text class="history-item__time">{{ item.time }}</text>
						</view>
						<text class="history-item__content">{{ item.content }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'

const FEEDBACK_KEY = 'feedback_list'

export default {
	components: { NavBar },
	data() {
		return {
			title: '',
			content: '',
			feedbackList: []
		}
	},
	async onShow() {
		await this.loadList()
	},
	methods: {
		async loadList() {
			try {
				const result = await uniCloud.callFunction({
					name: 'feedback',
					data: { action: 'list' }
				})
				if (result.result && result.result.code === 0) {
					this.feedbackList = result.result.data.map(item => ({
						id: item.id,
						title: item.title,
						content: item.content,
						time: this.formatTime(item.created_at),
						status: item.status
					}))
					uni.setStorageSync(FEEDBACK_KEY, this.feedbackList)
					return
				}
			} catch (e) {
				// 网络异常，用本地缓存兜底
			}
			this.feedbackList = uni.getStorageSync(FEEDBACK_KEY) || []
		},
		async handleSubmit() {
			if (!this.title.trim()) {
				uni.showToast({ title: '请输入标题', icon: 'none' })
				return
			}
			if (!this.content.trim()) {
				uni.showToast({ title: '请输入内容', icon: 'none' })
				return
			}

			uni.showLoading({ title: '提交中...' })

			try {
				const result = await uniCloud.callFunction({
					name: 'feedback',
					data: {
						action: 'submit',
						title: this.title.trim(),
						content: this.content.trim()
					}
				})

				uni.hideLoading()

				if (result.result && result.result.code === 0) {
					const item = {
						id: result.result.data?.id,
						title: this.title.trim(),
						content: this.content.trim(),
						time: this.formatTime(Date.now()),
						status: 'pending'
					}
					this.feedbackList.unshift(item)
					uni.setStorageSync(FEEDBACK_KEY, this.feedbackList)
					uni.showToast({ title: '提交成功', icon: 'success' })
					this.title = ''
					this.content = ''
				} else {
					uni.showToast({ title: result.result?.message || '提交失败', icon: 'none' })
				}
			} catch (e) {
				uni.hideLoading()
				// 离线时仍可本地缓存，待网络恢复后可通过 loadList 同步
				const item = {
					title: this.title.trim(),
					content: this.content.trim(),
					time: this.formatTime(Date.now()),
					status: 'pending'
				}
				this.feedbackList.unshift(item)
				uni.setStorageSync(FEEDBACK_KEY, this.feedbackList)
				uni.showToast({ title: '已暂存本地，联网后同步', icon: 'none' })
				this.title = ''
				this.content = ''
			}
		},
		formatTime(ts) {
			const d = new Date(ts)
			const hh = String(d.getHours()).padStart(2, '0')
			const mm = String(d.getMinutes()).padStart(2, '0')
			return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${hh}:${mm}`
		}
	}
}
</script>

<style lang="scss" scoped>
.page-feedback {
	padding-top: 56px;
	min-height: 100vh;
	background: var(--surface);

	&__content {
		padding: 16px;
	}
}

.form-card {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	overflow: hidden;
}

.form-group {
	padding: 16px;
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		border-bottom: 1px solid #F0EDE6;
	}

	&__label {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 10px;
	}

	&__input {
		height: 44px;
		background: var(--surface);
		border-radius: 8px;
		padding: 0 12px;
		font-size: 15px;
		color: var(--text-primary);
	}

	&__textarea {
		height: 160px;
		background: var(--surface);
		border-radius: 8px;
		padding: 12px;
		font-size: 15px;
		color: var(--text-primary);
		line-height: 22px;
	}

	&__placeholder {
		color: var(--text-muted);
		font-size: 15px;
	}
}

.form-submit {
	margin-top: 24px;
	height: 48px;
	background: var(--primary);
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 32px;

	&__text {
		font-size: 16px;
		font-weight: 500;
		color: #FFFFFF;
	}
}

.history-section {
	&__title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
		margin-bottom: 10px;
	}
}

.history-list {
	background: var(--surface-card);
	border-radius: 12px;
	border: 1px solid var(--border);
	overflow: hidden;
}

.history-item {
	padding: 16px;
	border-bottom: 1px solid var(--border);

	&:last-child {
		border-bottom: none;
	}

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
	}

	&__title {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
	}

	&__time {
		font-size: 12px;
		color: var(--text-muted);
		flex-shrink: 0;
		margin-left: 12px;
	}

	&__content {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 21px;
		display: block;
	}
}
</style>
