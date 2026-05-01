<template>
	<view class="summary-card">
		<view class="summary-card__header">
			<text class="summary-card__title">{{ title }}</text>
			<text v-if="subtitle" class="summary-card__subtitle">{{ subtitle }}</text>
		</view>
		<view class="summary-card__body">
			<view class="summary-card__item">
				<text class="summary-card__item-label">总工时</text>
				<text class="summary-card__item-value summary-card__item-value--primary">
					{{ totalHours }}<text class="summary-card__item-unit">h</text>
				</text>
			</view>
			<view class="summary-card__divider"></view>
			<view class="summary-card__item">
				<text class="summary-card__item-label">预估薪资</text>
				<text class="summary-card__item-value">
					¥{{ estimatedPay }}
				</text>
			</view>
			<view class="summary-card__divider"></view>
			<view class="summary-card__item">
				<text class="summary-card__item-label">工作天数</text>
				<text class="summary-card__item-value">
					{{ workDays }}<text class="summary-card__item-unit">天</text>
				</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		title: {
			type: String,
			default: '月度概览'
		},
		subtitle: {
			type: String,
			default: ''
		},
		totalHours: {
			type: Number,
			default: 0
		},
		estimatedPay: {
			type: Number,
			default: 0
		},
		workDays: {
			type: Number,
			default: 0
		}
	}
}
</script>

<style lang="scss" scoped>
.summary-card {
	background: #FFFFFF;
	border-radius: 12px;
	padding: 20px 16px;
	margin: 0 16px;

	&__header {
		margin-bottom: 16px;
	}

	&__title {
		font-size: 20px;
		font-weight: 600;
		color: #1A1C1C;
		line-height: 28px;
	}

	&__subtitle {
		font-size: 13px;
		color: #999999;
		margin-top: 4px;
		display: block;
	}

	&__body {
		display: flex;
		align-items: center;
		justify-content: space-around;
	}

	&__item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&__item-label {
		font-size: 13px;
		color: #999999;
		line-height: 18px;
	}

	&__item-value {
		font-size: 24px;
		font-weight: 700;
		color: #1A1C1C;
		line-height: 32px;

		&--primary {
			color: #07C160;
		}
	}

	&__item-unit {
		font-size: 14px;
		font-weight: 400;
		color: #999999;
		margin-left: 2px;
	}

	&__divider {
		width: 1px;
		height: 40px;
		background: #EEEEEE;
	}
}
</style>
