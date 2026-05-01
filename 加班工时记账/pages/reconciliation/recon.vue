<template>
	<view class="page-recon">
		<NavBar title="对账" :showBack="true" />

		<view class="page-recon__content">
			<!-- 月份切换 -->
			<view class="month-nav">
				<view class="month-nav__btn" @tap="prevMonth">
					<text class="month-nav__icon">&#x2039;</text>
				</view>
				<text class="month-nav__title">{{ monthLabel }}</text>
				<view class="month-nav__btn" @tap="nextMonth">
					<text class="month-nav__icon">&#x203A;</text>
				</view>
			</view>

			<!-- 对账卡片 -->
			<view class="compare-card">
				<view class="compare-card__row">
					<text class="compare-card__label">预估加班费</text>
					<text class="compare-card__value compare-card__value--green">¥ {{ estimatedTotal.toFixed(0) }}</text>
				</view>
				<view class="compare-card__row compare-card__row--input">
					<text class="compare-card__label">实发加班费</text>
					<view class="compare-card__input-wrap">
						<text class="compare-card__prefix">¥</text>
						<input
							class="compare-card__input"
							type="digit"
							v-model="actualPay"
							placeholder="填工资条上的数"
							@input="onActualInput"
						/>
					</view>
				</view>
				<view class="compare-card__divider"></view>
				<view class="compare-card__row" v-if="actualPay > 0">
					<text class="compare-card__label">差额</text>
					<text class="compare-card__value" :class="diffClass">{{ diffDisplay }}</text>
				</view>
				<view class="compare-card__row compare-card__row--hint" v-else>
					<text class="compare-card__hint">填写实发金额后自动计算差额</text>
				</view>
			</view>

			<!-- 明细列表 -->
			<view class="detail-section" v-if="monthRecords.length > 0">
				<text class="detail-section__title">本月记录</text>
				<view class="detail-section__list">
					<view
						v-for="rec in monthRecords"
						:key="rec.id"
						class="detail-item"
					>
						<view class="detail-item__left">
							<text class="detail-item__date">{{ shortDate(rec.date) }}</text>
							<text class="detail-item__type">{{ typeLabel(rec.overtime_type) }}</text>
						</view>
						<view class="detail-item__mid">
							<text class="detail-item__time">{{ rec.start_time }}-{{ rec.end_time }}</text>
							<text class="detail-item__formula">{{ rec.duration }}h × ¥{{ rec.rate }}/h</text>
						</view>
						<text class="detail-item__pay">¥{{ (rec.pay || 0).toFixed(0) }}</text>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-else>
				<text class="empty-wrap__icon">&#x1F4CB;</text>
				<text class="empty-wrap__text">本月没有加班记录</text>
			</view>

			<view class="page-recon__spacer"></view>
		</view>

		<!-- 底部操作 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__btn" @tap="handleCopy">
					<text class="bottom-bar__btn-text">复制本月数据</text>
				</view>
				<view class="bottom-bar__btn bottom-bar__btn--outline" @tap="handleExportCSV">
					<text class="bottom-bar__btn-text2">导出 CSV</text>
				</view>
				<view class="bottom-bar__btn bottom-bar__btn--outline" @tap="handleExport">
					<text class="bottom-bar__btn-text2">{{ drawing ? '生成中...' : '生成长图' }}</text>
				</view>
			</view>
			<view class="bottom-bar__safe"></view>
		</view>

		<!-- 隐藏 canvas 用于绘制长图 -->
		<canvas
			canvas-id="shareCanvas"
			class="share-canvas"
			:style="canvasStyle"
		></canvas>

		<!-- 长图预览弹窗 -->
		<view class="preview-mask" v-if="showPreview" @tap="showPreview = false">
			<view class="preview-mask__content" @tap.stop>
				<text class="preview-mask__title">长图预览</text>
				<image
					class="preview-mask__img"
					:src="previewImage"
					mode="widthFix"
				></image>
				<view class="preview-mask__btns">
					<view class="preview-mask__btn preview-mask__btn--cancel" @tap="showPreview = false">
						<text>取消</text>
					</view>
					<view class="preview-mask__btn preview-mask__btn--save" @tap="saveImage">
						<text>保存到相册</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import NavBar from '../../components/NavBar.vue'
import { useOvertimeStore } from '../../stores/overtimeStore'

function pad(n) { return String(n).padStart(2, '0') }

const CANVAS_WIDTH = 345

export default {
	components: { NavBar },
	data() {
		const now = new Date()
		return {
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			actualPay: '',
			showPreview: false,
			previewImage: '',
			drawing: false,
			canvasStyle: 'width: 345px; height: 800px;'
		}
	},
	computed: {
		monthLabel() {
			return `${this.viewYear}年${this.viewMonth}月`
		},
		monthPrefix() {
			return `${this.viewYear}-${pad(this.viewMonth)}`
		},
		monthRecords() {
			const store = useOvertimeStore()
			return store.records
				.filter(r => r.date && r.date.startsWith(this.monthPrefix))
				.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
		},
		estimatedTotal() {
			return this.monthRecords.reduce((s, r) => s + (r.pay || 0), 0)
		},
		diffAmount() {
			const actual = parseFloat(this.actualPay) || 0
			if (actual <= 0) return 0
			return actual - this.estimatedTotal
		},
		diffDisplay() {
			const d = this.diffAmount
			if (d > 0) return `+¥${d.toFixed(0)}`
			if (d < 0) return `-¥${Math.abs(d).toFixed(0)}`
			return '¥0'
		},
		diffClass() {
			const d = this.diffAmount
			if (d > 0) return 'compare-card__value--green'
			if (d < 0) return 'compare-card__value--red'
			return ''
		}
	},
	onShow() {
		const store = useOvertimeStore()
		store.loadRecords()
	},
	methods: {
		onActualInput() {
			if (this.actualPay.length > 6) {
				this.actualPay = this.actualPay.slice(0, 6)
			}
		},
		prevMonth() {
			if (this.viewMonth === 1) { this.viewYear--; this.viewMonth = 12 }
			else { this.viewMonth-- }
		},
		nextMonth() {
			if (this.viewMonth === 12) { this.viewYear++; this.viewMonth = 1 }
			else { this.viewMonth++ }
		},
		shortDate(dateStr) {
			if (!dateStr) return ''
			const parts = dateStr.split('-')
			return parts.length === 3 ? `${parseInt(parts[1])}/${parseInt(parts[2])}` : dateStr
		},
		typeLabel(type) {
			const m = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return m[type] || '平日'
		},
		handleCopy() {
			const list = this.monthRecords
			if (list.length === 0) {
				uni.showToast({ title: '本月无记录', icon: 'none' })
				return
			}
			let text = this.monthLabel + ' 加班对账\n'
			text += '─'.repeat(20) + '\n'
			text += '预估加班费：¥' + this.estimatedTotal.toFixed(0) + '\n'
			if (this.actualPay > 0) {
				text += '实发加班费：¥' + parseFloat(this.actualPay).toFixed(0) + '\n'
				text += '差额：' + this.diffDisplay + '\n'
			}
			text += '─'.repeat(20) + '\n'
			list.forEach(r => {
				text += this.shortDate(r.date) + ' ' + this.typeLabel(r.overtime_type) + ' ' + r.start_time + '-' + r.end_time + ' ' + r.duration + 'h × ¥' + r.rate + '/h = ¥' + (r.pay || 0).toFixed(0) + '\n'
			})
			text += '─'.repeat(20) + '\n'
			text += '合计：' + this.monthRecords.reduce((s,r) => s + (r.duration || 0), 0) + '小时，¥' + this.estimatedTotal.toFixed(0)
			uni.setClipboardData({
				data: text,
				success: () => {
					uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
				}
			})
		},
		handleExport() {
			if (this.drawing) return
			const list = this.monthRecords
			if (list.length === 0) {
				uni.showToast({ title: '本月无记录', icon: 'none' })
				return
			}
			this.drawing = true
			this.drawCanvas(list)
		},
		handleExportCSV() {
			const list = this.monthRecords
			if (list.length === 0) {
				uni.showToast({ title: '本月无记录', icon: 'none' })
				return
			}
			// Build CSV with BOM for Excel compat
			let csv = '\uFEFF日期,类型,开始,结束,时长(h),时薪,加班费,项目,备注,补贴,扣款' + '\n'
			list.forEach(r => {
				const subsidies = r.subsidies ? ((r.subsidies.night_shift||0)+(r.subsidies.meal||0)+(r.subsidies.transport||0)) : 0
				const deduction = r.deduction ? (r.deduction.amount||0) : 0
				const row = [
					r.date,
					this.typeLabel(r.overtime_type),
					r.start_time,
					r.end_time,
					r.duration,
					r.rate,
					r.pay || 0,
					(r.project_name || ''),
					(r.remark || '').replace(/,/g, ';'),
					subsidies,
					deduction
				].join(',')
				csv += row + '\n'
			}

			// WeChat: save file and share
			// #ifdef MP-WEIXIN
			try {
				const fileName = '加班对账_' + this.viewYear + '-' + String(this.viewMonth).padStart(2, '0') + '.csv'
				const fs = wx.getFileSystemManager()
				const tempPath = wx.env.USER_DATA_PATH + '/' + fileName
				fs.writeFileSync(tempPath, csv, 'utf8')
				uni.showModal({
					title: '导出成功',
					content: 'CSV 文件已生成，可分享给微信好友',
					confirmText: '分享文件',
					cancelText: '知道了',
					success: (res) => {
						if (res.confirm) {
							wx.shareFileMessage({ filePath: tempPath, fileName: fileName })
						}
					}
				})
			} catch (e) {
				uni.setClipboardData({
					data: csv,
					success: () => uni.showToast({ title: 'CSV 已复制', icon: 'success' })
				})
			}
			// #endif
			// #ifndef MP-WEIXIN
			uni.setClipboardData({
				data: csv,
				success: () => uni.showToast({ title: 'CSV 已复制到剪贴板', icon: 'success' })
			})
			// #endif
		},
		drawCanvas(list) {
			const actual = parseFloat(this.actualPay) || 0
			const diffAmount = actual > 0 ? (actual - this.estimatedTotal) : 0
			const itemCount = list.length
			const canvasH = 136 + 84 + itemCount * 44 + 56
			const w = CANVAS_WIDTH
			const h = Math.max(canvasH, 300)

			this.canvasStyle = `width: ${w}px; height: ${h}px;`

			setTimeout(() => {
				const ctx = uni.createCanvasContext('shareCanvas', this)
				const bg = '#F7F7F7'
				const cardBg = '#FFFFFF'
				const green = '#07C160'
				const red = '#BA1A1A'
				const textMain = '#1A1C1C'
				const textSub = '#666666'
				const textLight = '#999999'
				const border = '#E5E5E5'
				const px = 16

				ctx.setFillStyle(bg)
				ctx.fillRect(0, 0, w, h)

				const titleY = 28
				ctx.setFillStyle(textMain)
				ctx.setFontSize(18)
				ctx.setTextAlign('center')
				ctx.fillText(this.monthLabel + ' 加班对账', w / 2, titleY)

				const cardX = px
				const cardW = w - px * 2
				let cardY = 48
				const cardPad = 14
				const cardRadius = 8

				this.drawRoundRect(ctx, cardX, cardY, cardW, 84, cardRadius, cardBg)
				this.drawRoundRect(ctx, cardX, cardY, cardW, 84, cardRadius, border, true)

				let rowY = cardY + cardPad + 8
				ctx.setFillStyle(textSub)
				ctx.setFontSize(13)
				ctx.setTextAlign('left')
				ctx.fillText('预估加班费', cardX + cardPad, rowY + 5)

				ctx.setFillStyle(green)
				ctx.setFontSize(18)
				ctx.setTextAlign('right')
				ctx.fillText('¥ ' + this.estimatedTotal.toFixed(0), cardX + cardW - cardPad, rowY + 5)

				rowY += 24
				ctx.setFillStyle(textSub)
				ctx.setFontSize(13)
				ctx.setTextAlign('left')
				ctx.fillText('实发加班费', cardX + cardPad, rowY + 5)

				ctx.setFillStyle(textMain)
				ctx.setFontSize(18)
				ctx.setTextAlign('right')
				ctx.fillText(actual > 0 ? ('¥ ' + actual.toFixed(0)) : '——', cardX + cardW - cardPad, rowY + 5)

				rowY += 28
				ctx.setStrokeStyle(border)
				ctx.setLineWidth(0.5)
				ctx.beginPath()
				ctx.moveTo(cardX + cardPad, rowY)
				ctx.lineTo(cardX + cardW - cardPad, rowY)
				ctx.stroke()

				rowY += 4
				if (actual > 0) {
					const diffColor = diffAmount >= 0 ? green : red
					const diffText = diffAmount > 0 ? ('+¥' + diffAmount.toFixed(0)) : (diffAmount < 0 ? ('-¥' + Math.abs(diffAmount).toFixed(0)) : '¥0')
					ctx.setFillStyle(textSub)
					ctx.setFontSize(13)
					ctx.setTextAlign('left')
					ctx.fillText('差额', cardX + cardPad, rowY + 6)

					ctx.setFillStyle(diffColor)
					ctx.setFontSize(18)
					ctx.setTextAlign('right')
					ctx.fillText(diffText, cardX + cardW - cardPad, rowY + 6)
				} else {
					ctx.setFillStyle('#CCCCCC')
					ctx.setFontSize(11)
					ctx.setTextAlign('left')
					ctx.fillText('填写实发金额后自动计算差额', cardX + cardPad, rowY + 6)
				}

				let listY = cardY + 84 + 20
				ctx.setFillStyle(textMain)
				ctx.setFontSize(15)
				ctx.setTextAlign('left')
				ctx.fillText('本月记录', cardX + 4, listY)

				const listCardTop = listY + 8
				const listCardH = itemCount * 44 + 4

				this.drawRoundRect(ctx, cardX, listCardTop, cardW, listCardH, cardRadius, cardBg)
				this.drawRoundRect(ctx, cardX, listCardTop, cardW, listCardH, cardRadius, border, true)

				let itemY = listCardTop + 12
				list.forEach((r, i) => {
					const leftX = cardX + 12
					ctx.setFillStyle(textMain)
					ctx.setFontSize(13)
					ctx.setTextAlign('left')
					ctx.fillText(this.shortDate(r.date), leftX, itemY + 5)

					ctx.setFillStyle(textLight)
					ctx.setFontSize(10)
					ctx.fillText(this.typeLabel(r.overtime_type), leftX + 48, itemY + 5)

					ctx.setFillStyle(textMain)
					ctx.setFontSize(12)
					ctx.fillText(r.start_time + '-' + r.end_time, leftX + 90, itemY + 2)

					ctx.setFillStyle('#BBBBBB')
					ctx.setFontSize(10)
					ctx.fillText(r.duration + 'h × ¥' + r.rate + '/h', leftX + 90, itemY + 16)

					ctx.setFillStyle(green)
					ctx.setFontSize(14)
					ctx.setTextAlign('right')
					ctx.fillText('¥' + (r.pay || 0).toFixed(0), cardX + cardW - 12, itemY + 8)

					if (i < itemCount - 1) {
						ctx.setStrokeStyle('#F3F3F3')
						ctx.setLineWidth(0.5)
						ctx.beginPath()
						ctx.moveTo(leftX, itemY + 28)
						ctx.lineTo(cardX + cardW - 12, itemY + 28)
						ctx.stroke()
					}
					itemY += 44
				})

				const totalHours = list.reduce((s, r) => s + (r.duration || 0), 0)
				const listCardBottom = listCardTop + listCardH
				const bottomY = listCardBottom + 18
				ctx.setFillStyle(textLight)
				ctx.setFontSize(12)
				ctx.setTextAlign('center')
				ctx.fillText('合计：' + totalHours + ' 小时 · ¥' + this.estimatedTotal.toFixed(0), w / 2, bottomY + 4)

				ctx.setFillStyle('#CCCCCC')
				ctx.setFontSize(10)
				ctx.fillText('加班工时记账', w / 2, bottomY + 20)

				ctx.draw(false, () => {
					setTimeout(() => {
						uni.canvasToTempFilePath({
							canvasId: 'shareCanvas',
							destWidth: w * 2,
							destHeight: h * 2,
							success: (res) => {
								this.previewImage = res.tempFilePath
								this.showPreview = true
								this.drawing = false
							},
							fail: () => {
								uni.showToast({ title: '生成失败，请重试', icon: 'none' })
								this.drawing = false
							}
						}, this)
					}, 300)
				})
			}, 150)
		},
		drawRoundRect(ctx, x, y, w, h, r, color, strokeOnly) {
			ctx.beginPath()
			ctx.moveTo(x + r, y)
			ctx.lineTo(x + w - r, y)
			ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
			ctx.lineTo(x + w, y + h - r)
			ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
			ctx.lineTo(x + r, y + h)
			ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
			ctx.lineTo(x, y + r)
			ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2)
			ctx.closePath()
			if (strokeOnly) {
				ctx.setStrokeStyle(color)
				ctx.setLineWidth(0.5)
				ctx.stroke()
			} else {
				ctx.setFillStyle(color)
				ctx.fill()
			}
		},
		saveImage() {
			uni.saveImageToPhotosAlbum({
				filePath: this.previewImage,
				success: () => {
					uni.showToast({ title: '已保存到相册', icon: 'success' })
					this.showPreview = false
				},
				fail: (err) => {
					if (err.errMsg.indexOf('auth deny') > -1 || err.errMsg.indexOf('authorize') > -1) {
						uni.showModal({
							title: '需要相册权限',
							content: '请在设置中允许小程序保存图片到相册',
							confirmText: '去设置',
							success: (res) => {
								if (res.confirm) {
									uni.openSetting({})
								}
							}
						})
					} else {
						uni.showToast({ title: '保存失败', icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page-recon {
	padding-top: 56px;
	min-height: 100vh;
	background: #F7F7F7;

	&__content {
		padding: 0 16px;
		max-width: 640px;
		margin: 0 auto;
	}

	&__spacer {
		height: 120px;
	}
}

.month-nav {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;

	&__title {
		font-size: 17px;
		font-weight: 600;
		color: #1A1C1C;
	}

	&__btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	&__icon {
		font-size: 22px;
		color: #999999;
	}
}

.compare-card {
	background: #FFFFFF;
	border: 1px solid #E5E5E5;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 20px;

	&__row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;

		&--input {
			padding: 12px 0;
		}

		&--hint {
			padding-top: 12px;
		}
	}

	&__label {
		font-size: 15px;
		color: #666666;
	}

	&__value {
		font-size: 20px;
		font-weight: 700;
		color: #1A1C1C;

		&--green {
			color: #07C160;
		}

		&--red {
			color: #BA1A1A;
		}
	}

	&__input-wrap {
		display: flex;
		align-items: baseline;
		border-bottom: 2px solid #07C160;
		padding-bottom: 4px;
	}

	&__prefix {
		font-size: 18px;
		font-weight: 600;
		color: #1A1C1C;
		margin-right: 6px;
	}

	&__input {
		width: 120px;
		text-align: right;
		font-size: 24px;
		font-weight: 700;
		color: #1A1C1C;
		background: transparent;
		border: none;
	}

	&__divider {
		height: 1px;
		background: #E5E5E5;
		margin: 8px 0;
	}

	&__hint {
		font-size: 13px;
		color: #CCCCCC;
	}
}

.detail-section {
	margin-bottom: 20px;

	&__title {
		font-size: 16px;
		font-weight: 600;
		color: #1A1C1C;
		display: block;
		margin-bottom: 10px;
	}

	&__list {
		background: #FFFFFF;
		border-radius: 12px;
		border: 1px solid #E5E5E5;
		overflow: hidden;
	}
}

.detail-item {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	border-bottom: 1px solid #F3F3F3;

	&:last-child {
		border-bottom: none;
	}

	&__left {
		width: 56px;
		flex-shrink: 0;
	}

	&__date {
		font-size: 14px;
		font-weight: 600;
		color: #1A1C1C;
		display: block;
	}

	&__type {
		font-size: 11px;
		color: #999999;
		display: block;
		margin-top: 2px;
	}

	&__mid {
		flex: 1;
		margin-left: 12px;
	}

	&__time {
		font-size: 14px;
		color: #1A1C1C;
		display: block;
	}

	&__formula {
		font-size: 11px;
		color: #BBBBBB;
		display: block;
		margin-top: 2px;
	}

	&__pay {
		font-size: 16px;
		font-weight: 600;
		color: #07C160;
	}
}

.empty-wrap {
	text-align: center;
	padding: 60px 0;

	&__icon {
		font-size: 40px;
	}

	&__text {
		font-size: 14px;
		color: #999999;
		display: block;
		margin-top: 10px;
	}
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #FFFFFF;
	border-top: 1px solid #E5E5E5;
	z-index: 100;

	&__inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	&__btn {
		height: 48px;
		border-radius: 10px;
		background: #07C160;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__btn-text {
		font-size: 17px;
		font-weight: 600;
		color: #FFFFFF;
	}

	&__btn-text2 {
		font-size: 15px;
		font-weight: 500;
		color: #07C160;
	}

	&__btn--outline {
		background: #FFFFFF;
		border: 1px solid #07C160;
		margin-top: 10px;
	}

	&__safe {
		height: env(safe-area-inset-bottom);
	}
}

.share-canvas {
	position: fixed;
	left: 0;
	top: 0;
	opacity: 0;
	pointer-events: none;
	z-index: -1;
}

.preview-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.75);
	z-index: 300;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;

	&__content {
		width: 100%;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	&__title {
		font-size: 16px;
		color: #FFFFFF;
		margin-bottom: 16px;
	}

	&__img {
		width: 100%;
		border-radius: 8px;
	}

	&__btns {
		display: flex;
		margin-top: 20px;
		width: 100%;
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
			background: rgba(255, 255, 255, 0.2);
			color: #FFFFFF;
			border: 1px solid rgba(255, 255, 255, 0.3);
		}

		&--save {
			background: #07C160;
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}
</style>
