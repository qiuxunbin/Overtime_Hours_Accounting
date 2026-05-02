<template>
	<view class="toast" :class="['toast--' + type, { 'toast--visible': visible }]">
		<view class="toast__content">
			<text class="toast__message">{{ message }}</text>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		message: { type: String, default: '' },
		type: { type: String, default: 'success' },
		duration: { type: Number, default: 2500 }
	},
	data() {
		return {
			visible: false,
			timer: null
		}
	},
	methods: {
		show(msg, type) {
			if (msg) this.message = msg
			if (type) this.type = type
			clearTimeout(this.timer)
			this.visible = true
			this.timer = setTimeout(() => { this.visible = false }, this.duration)
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
	transition: opacity 0.25s ease;
	pointer-events: none;

	&--visible {
		opacity: 1;
	}

	&__content {
		padding: 10px 14px;
		border-radius: 6px;
		font-size: 13px;
		line-height: 18px;
	}

	// type variants
	&--success &__content {
		background: var(--primary-light);
		color: var(--primary);
	}
	&--warning &__content {
		background: var(--accent-light);
		color: #8A6F3E;
	}
	&--error &__content {
		background: var(--error-light);
		color: var(--error);
	}
	&--info &__content {
		background: var(--info-light);
		color: var(--info);
	}
	// default dark style (legacy)
	&__content {
		background: var(--surface-card);
		color: var(--text-primary);
		box-shadow: var(--shadow-md);
	}
	&--success &__content {
		background: var(--primary-light);
		color: var(--primary);
		box-shadow: none;
	}
	&--warning &__content {
		background: var(--accent-light);
		color: #8A6F3E;
		box-shadow: none;
	}
	&--error &__content {
		background: var(--error-light);
		color: var(--error);
		box-shadow: none;
	}
	&--info &__content {
		background: var(--info-light);
		color: var(--info);
		box-shadow: none;
	}
}
</style>
