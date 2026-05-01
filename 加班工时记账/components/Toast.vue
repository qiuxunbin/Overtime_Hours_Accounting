<template>
	<view class="toast" :class="{ 'toast--visible': visible }">
		<view class="toast__content">
			<text class="toast__icon">{{ icon }}</text>
			<text class="toast__message">{{ message }}</text>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		message: {
			type: String,
			default: ''
		},
		icon: {
			type: String,
			default: '✓'
		},
		duration: {
			type: Number,
			default: 2500
		}
	},
	data() {
		return {
			visible: false,
			timer: null
		}
	},
	methods: {
		show(msg) {
			if (msg) this.message = msg
			clearTimeout(this.timer)
			this.visible = true
			this.timer = setTimeout(() => {
				this.visible = false
			}, this.duration)
		},
		hide() {
			clearTimeout(this.timer)
			this.visible = false
		}
	},
	beforeUnmount() {
		clearTimeout(this.timer)
	}
}
</script>

<style lang="scss" scoped>
.toast {
	position: fixed;
	top: 80px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 1000;
	opacity: 0;
	transition: opacity 0.3s ease;
	pointer-events: none;

	&--visible {
		opacity: 1;
	}

	&__content {
		display: flex;
		align-items: center;
		background: #323232;
		color: #FFFFFF;
		padding: 12px 24px;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		white-space: nowrap;
	}

	&__icon {
		font-size: 18px;
		color: #07C160;
	}

	&__message {
		font-size: 15px;
		line-height: 22px;
	}
}
</style>
