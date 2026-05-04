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
					<text class="compare-card__label">预估工钱</text>
					<text class="compare-card__value compare-card__value--green">¥ {{ estimatedTotal.toFixed(0) }}</text>
				</view>
				<view class="compare-card__row compare-card__row--input">
					<text class="compare-card__label">实发工钱</text>
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

			<!-- 明细列表（按工作分组） -->
			<view class="detail-section" v-if="monthRecords.length > 0">
				<text class="detail-section__title">本月记录</text>
				<view
					v-for="(group, gidx) in projectGroups"
					:key="gidx"
					class="project-group"
				>
					<view class="project-group__header">
						<view class="project-group__color" :style="{ background: group.color }"></view>
						<text class="project-group__name">{{ group.name }}</text>
						<text class="project-group__rate">{{ group.rateSummary }}</text>
						<view class="project-group__settle-toggle" @tap="handleSettlementToggle(group)">
							<text class="project-group__settle-icon">{{ group.allSettled ? '✅' : '⏳' }}</text>
						</view>
					</view>
					<view class="project-group__settle-stats" v-if="group.settledQty || group.unsettledQty">
						<text class="project-group__settle-stat" v-if="group.settledQty">✅ 已结算 {{ group.settledQty }}</text>
						<text class="project-group__settle-stat unsettled" v-if="group.unsettledQty">⏳ 未结算 {{ group.unsettledQty }}</text>
					</view>
					<view class="detail-section__list">
						<view
							v-for="rec in group.records"
							:key="rec.id"
							class="detail-item"
						>
							<view class="detail-item__left">
								<text class="detail-item__date">{{ shortDate(rec.date) }}</text>
								<text class="detail-item__mode">{{ modeLabel(rec.pay_mode) }}</text>
							</view>
							<view class="detail-item__mid">
								<text class="detail-item__time">{{ recordDetailStr(rec) }}</text>
								<text class="detail-item__formula">{{ recordFormulaStr(rec) }}</text>
							</view>
							<text class="detail-item__pay">¥{{ (rec.net_pay || rec.pay || 0).toFixed(0) }}</text>
						</view>
					</view>
					<view class="project-group__footer">
						<text class="project-group__subtotal">小计：{{ group.subtotalQty }} · ¥{{ group.subtotalPay.toFixed(0) }}</text>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-wrap" v-else>
				<text class="empty-wrap__icon">&#x1F4CB;</text>
				<text class="empty-wrap__text">本月没有记工记录</text>
			</view>

			<view class="unsettled-bar" v-if="unsettledSum > 0">
				<text class="unsettled-bar__label">未结算合计</text>
				<text class="unsettled-bar__amount">¥{{ unsettledSum.toFixed(0) }}</text>
			</view>

			<view class="page-recon__spacer"></view>
		</view>

		<!-- 底部操作 -->
		<view class="bottom-bar">
			<view class="bottom-bar__inner">
				<view class="bottom-bar__unsettled" v-if="unsettledSum > 0">
					<text class="bottom-bar__unsettled-label">未结算合计</text>
					<text class="bottom-bar__unsettled-amount">¥ {{ unsettledSum.toFixed(0) }}</text>
				</view>
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
import { useWorkStore } from '@/stores/workStore'
import { useProjectStore } from '../../stores/projectStore'

import { getPayFormula } from '@/utils/calculator'

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
			const store = useWorkStore()
			return store.records
				.filter(r => r.date && r.date.startsWith(this.monthPrefix))
				.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
		},
		projectGroups() {
			const pStore = useProjectStore()
			const projMap = new Map()
			pStore.projects.forEach(p => projMap.set(p._id, p))
			const groups = {}
			this.monthRecords.forEach(r => {
				const key = r.project_id || '__none__'
				if (!groups[key]) groups[key] = {
					name: key === '__none__' ? '无工作' : (projMap.get(key)?.name || '未知工作'),
					color: key === '__none__' ? '#9C9C9C' : (projMap.get(key)?.color || '#9C9C9C'),
					payMode: r.pay_mode || 'hourly',
					rateSummary: '',
					subtotalPay: 0,
					subtotalHours: 0,
					subtotalDays: 0,
					subtotalQty: 0,
					isHourly: true,
					records: [],
					settledCount: 0,
					unsettledCount: 0,
					settledQty: '',
					unsettledQty: ''
				}
				const g = groups[key]
				g.records.push(r)
				g.subtotalPay += r.net_pay || r.pay || 0
				g.subtotalHours += r.duration || 0
				g.subtotalDays += r.days || 0
				g.subtotalQty += r.quantity || 0
				if (r.pay_mode && r.pay_mode !== 'hourly') g.isHourly = false
					if (r.settled) g.settledCount = (g.settledCount || 0) + 1
					else g.unsettledCount = (g.unsettledCount || 0) + 1
			})
			// Compute rate summary and final qty display per group
			Object.values(groups).forEach(g => {
				const mode = g.records[0]?.pay_mode || 'hourly'
				const proj = g.records[0]?.project_id ? projMap.get(g.records[0].project_id) : null
				if (mode === 'daily') {
					g.rateSummary = '日薪 ¥' + (proj?.daily_rate || g.records[0]?.daily_rate || 0)
					g.subtotalQty = g.subtotalDays + '天'
					const sd = g.records.filter(r => r.settled).reduce((s,r) => s+(r.days||0), 0)
					const ud = g.records.filter(r => !r.settled).reduce((s,r) => s+(r.days||0), 0)
					g.settledQty = sd > 0 ? sd + '天' : ''
					g.unsettledQty = ud > 0 ? ud + '天' : ''
				} else if (mode === 'piece') {
					g.rateSummary = '计件 ¥' + (proj?.piece_rate || g.records[0]?.piece_rate || 0) + '/' + (proj?.piece_unit || g.records[0]?.piece_unit || '件')
					g.subtotalQty = g.subtotalQty + (proj?.piece_unit || g.records[0]?.piece_unit || '件')
					const sq = g.records.filter(r => r.settled).reduce((s,r) => s+(r.quantity||0), 0)
					const uq = g.records.filter(r => !r.settled).reduce((s,r) => s+(r.quantity||0), 0)
					const pu = proj?.piece_unit || g.records[0]?.piece_unit || '件'
					g.settledQty = sq > 0 ? sq + pu : ''
					g.unsettledQty = uq > 0 ? uq + pu : ''
				} else {
					g.rateSummary = '时薪 ¥' + (proj?.weekday_rate || 0) + '/h'
					g.subtotalQty = g.subtotalHours + 'h'
					const sh = g.records.filter(r => r.settled).reduce((s,r) => s+(r.duration||0), 0)
					const uh = g.records.filter(r => !r.settled).reduce((s,r) => s+(r.duration||0), 0)
					g.settledQty = sh > 0 ? sh + 'h' : ''
					g.unsettledQty = uh > 0 ? uh + 'h' : ''
				}
			})
			Object.values(groups).forEach(g => { g.allSettled = g.records.length > 0 && g.records.every(r => r.settled) })
			return Object.values(groups)
		},
		estimatedTotal() {
			return this.monthRecords.reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
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
		},
		totalDays() {
			return this.monthRecords.reduce((s, r) => s + (r.days || 0), 0)
		},
		totalQuantity() {
			return this.monthRecords.reduce((s, r) => s + (r.quantity || 0), 0)
		},
		unsettledSum() {
			return this.monthRecords
				.filter(r => !r.settled)
				.reduce((s, r) => s + (r.net_pay || r.pay || 0), 0)
		}
	},
	onShow() {
		const store = useWorkStore()
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
		modeLabel(mode) {
			const m = { hourly: '时薪', daily: '日薪', piece: '计件' }
			return m[mode] || '时薪'
		},
		recordDetailStr(rec) {
			if (rec.pay_mode === 'daily') return (rec.days || 1) + '天'
			if (rec.pay_mode === 'piece') return (rec.quantity || 0) + (rec.piece_unit || '件')
			return (rec.start_time || '') + '-' + (rec.end_time || '')
		},
		recordFormulaStr(rec) {
			const pStore = useProjectStore()
			const project = rec.project_id ? pStore.getProjectById(rec.project_id) : null
			return getPayFormula(rec, project)
		},
		typeLabel(type) {
			const m = { weekday: '平日', weekend: '周末', holiday: '节假日' }
			return m[type] || '平日'
		},
		async handleSettlementToggle(group) {
			const allSettled = group.records.every(r => r.settled)
			const newSettled = !allSettled
			uni.showActionSheet({
				itemList: [newSettled ? '全部标记已结算' : '全部标记未结算'],
				success: async (res) => {
					if (res.tapIndex === 0) {
						const store = useWorkStore()
						for (const rec of group.records) {
							await store.updateRecord(rec.id || rec._id, { settled: newSettled })
						}
						uni.showToast({ title: newSettled ? '已标记结算' : '已取消结算', icon: 'success' })
						store.loadRecords()
					}
				}
			})
		},
		handleCopy() {
			const list = this.monthRecords
			if (list.length === 0) {
			uni.showToast({ title: '本月无记录', icon: 'none' })
			return
			}
			let text = this.monthLabel + ' 记工对账\n'
			text += '─'.repeat(20) + '\n'
			text += '预估工钱：¥' + this.estimatedTotal.toFixed(0) + '\n'
			if (this.actualPay > 0) {
			text += '实发工钱：¥' + parseFloat(this.actualPay).toFixed(0) + '\n'
			text += '差额：' + this.diffDisplay + '\n'
			}
			text += '─'.repeat(20) + '\n'
			list.forEach(r => {
				const detail = this.recordDetailStr(r)
				const formula = this.recordFormulaStr(r)
				text += this.shortDate(r.date) + ' ' + this.modeLabel(r.pay_mode) + ' ' + detail + ' ' + formula + '\n'
			})
			text += '─'.repeat(20) + '\n'
			const _h = this.monthRecords.reduce((s,r) => s + (r.duration || 0), 0)
			const _d = this.monthRecords.reduce((s,r) => s + (r.days || 0), 0)
			const _q = this.monthRecords.reduce((s,r) => s + (r.quantity || 0), 0)
			let totalStr = '合计：¥' + this.estimatedTotal.toFixed(0)
			if (_h > 0) totalStr += '，' + _h + '小时'
			if (_d > 0) totalStr += '，' + _d + '天'
			if (_q > 0) totalStr += '，' + _q + '件'
			text += totalStr
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
			// Build CSV with BOM for Excel compat — 15 columns matching import COLUMN_MAP
			const header = '﻿日期,工作,计薪方式,类型,开始时间,结束时间,时长,天数,件数,单价,工钱,备注,是否结算,补贴,扣款'
			let csv = header + '\n'
			list.forEach(r => {
			const subsidies = r.subsidies ? ((r.subsidies.night_shift || 0) + (r.subsidies.meal || 0) + (r.subsidies.transport || 0)) : 0
			const deduction = r.deduction ? (r.deduction.amount || 0) : 0
			const settledStr = r.settled ? '已结算' : '未结算'
			const durationStr = r.pay_mode === 'hourly' ? (r.duration || 0) + 'h' : ''
			const daysStr = r.pay_mode === 'daily' ? (r.days || 1) : ''
			const qtyStr = r.pay_mode === 'piece' ? (r.quantity || 0) : ''
			let rate = r.rate || 0
			if (r.pay_mode === 'daily') rate = r.daily_rate || 0
			if (r.pay_mode === 'piece') rate = r.piece_rate || 0
			const remark = (r.remark || '').replace(/,/g, ';')
			const row = [
				r.date,
				r.project_name || '',
				this.modeLabel(r.pay_mode),
				this.typeLabel(r.day_type || r.overtime_type),
				r.start_time || '',
				r.end_time || '',
				durationStr,
				daysStr,
				qtyStr,
				rate,
				r.net_pay || r.pay || 0,
				remark,
				settledStr,
				subsidies,
				deduction
				].join(',')
			csv += row + '\n'
			})

			// WeChat: save file and share
			// #ifdef MP-WEIXIN
			try {
			const fileName = '记工对账_' + this.viewYear + '-' + String(this.viewMonth).padStart(2, '0') + '.csv'
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
			const bg = '#F8F6F2'
			const cardBg = '#FFFFFF'
			const green = '#1B8A5A'
			const red = '#B85C4A'
			const textMain = '#1E1E1E'
			const textSub = '#5C5C5C'
			const textLight = '#9C9C9C'
			const border = '#E8E4DC'
			const px = 16

			ctx.setFillStyle(bg)
			ctx.fillRect(0, 0, w, h)

			const titleY = 28
			ctx.setFillStyle(textMain)
			ctx.setFontSize(18)
			ctx.setTextAlign('center')
			ctx.fillText(this.monthLabel + ' 记工对账', w / 2, titleY)

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
			ctx.fillText('预估工钱', cardX + cardPad, rowY + 5)

			ctx.setFillStyle(green)
			ctx.setFontSize(18)
			ctx.setTextAlign('right')
			ctx.fillText('¥ ' + this.estimatedTotal.toFixed(0), cardX + cardW - cardPad, rowY + 5)

			rowY += 24
			ctx.setFillStyle(textSub)
			ctx.setFontSize(13)
			ctx.setTextAlign('left')
			ctx.fillText('实发工钱', cardX + cardPad, rowY + 5)

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
			ctx.setFillStyle('#9C9C9C')
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
			ctx.fillText(this.typeLabel(r.day_type || r.overtime_type), leftX + 48, itemY + 5)

			ctx.setFillStyle(textMain)
			ctx.setFontSize(12)
				const _detail = this.recordDetailStr(r)
				ctx.fillText(_detail, leftX + 90, itemY + 2)

			ctx.setFillStyle('#9C9C9C')
			ctx.setFontSize(10)
				const _formula = this.recordFormulaStr(r)
				ctx.fillText(_formula, leftX + 90, itemY + 16)

			ctx.setFillStyle(green)
			ctx.setFontSize(14)
			ctx.setTextAlign('right')
			ctx.fillText('¥' + (r.net_pay || r.pay || 0).toFixed(0), cardX + cardW - 12, itemY + 8)

			if (i < itemCount - 1) {
			ctx.setStrokeStyle('#E8E4DC')
			ctx.setLineWidth(0.5)
			ctx.beginPath()
			ctx.moveTo(leftX, itemY + 28)
			ctx.lineTo(cardX + cardW - 12, itemY + 28)
			ctx.stroke()
			}
			itemY += 44
			})

			const totalHours = list.reduce((s, r) => s + (r.duration || 0), 0)
			const totalDays = list.reduce((s, r) => s + (r.days || 0), 0)
			const totalQty = list.reduce((s, r) => s + (r.quantity || 0), 0)
			const parts = []
			if (totalHours > 0) parts.push(`${totalHours.toFixed(1)}小时`)
			if (totalDays > 0) parts.push(`${totalDays}天`)
			if (totalQty > 0) parts.push(`${totalQty}件`)
			const summaryText = parts.join(" ") || "0小时"
			const listCardBottom = listCardTop + listCardH
			const bottomY = listCardBottom + 18
			ctx.setFillStyle(textLight)
			ctx.setFontSize(12)
			ctx.setTextAlign('center')
			ctx.fillText('合计：' + summaryText + ' · ¥' + this.estimatedTotal.toFixed(0), w / 2, bottomY + 4)

			ctx.setFillStyle('#9C9C9C')
			ctx.setFontSize(10)
			ctx.fillText('记工算工钱', w / 2, bottomY + 20)

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
	background: var(--surface);

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
		color: var(--text-primary);
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
		color: var(--text-muted);
	}
}

.compare-card {
	background: var(--surface-card);
	border: 1px solid var(--border);
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
		color: var(--text-secondary);
	}

	&__value {
		font-size: 20px;
		font-weight: 700;
		color: var(--text-primary);

		&--green {
			color: var(--primary);
		}

		&--red {
			color: var(--error);
		}
	}

	&__input-wrap {
		display: flex;
		align-items: baseline;
		border-bottom: 2px solid var(--primary);
		padding-bottom: 4px;
	}

	&__prefix {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary);
		margin-right: 6px;
	}

	&__input {
		width: 120px;
		text-align: right;
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
		background: transparent;
		border: none;
	}

	&__divider {
		height: 1px;
		background: #E8E4DC;
		margin: 8px 0;
	}

	&__hint {
		font-size: 13px;
		color: var(--text-muted);
	}
}

.detail-section {
	margin-bottom: 20px;

	&__title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
		margin-bottom: 10px;
	}

	&__list {
		background: var(--surface-card);
		border-radius: 12px;
		border: 1px solid var(--border);
		overflow: hidden;
	}
}

.detail-item {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	border-bottom: 1px solid var(--border);

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
		color: var(--text-primary);
		display: block;
	}

	&__type {
		font-size: 11px;
		color: var(--text-muted);
		display: block;
		margin-top: 2px;
	}

	&__mid {
		flex: 1;
		margin-left: 12px;
	}

	&__time {
		font-size: 14px;
		color: var(--text-primary);
		display: block;
	}

	&__formula {
		font-size: 11px;
		color: var(--text-muted);
		display: block;
		margin-top: 2px;
	}

	&__pay {
		font-size: 16px;
		font-weight: 600;
		color: var(--primary);
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
		color: var(--text-muted);
		display: block;
		margin-top: 10px;
	}
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: var(--surface-card);
	border-top: 1px solid var(--border);
	z-index: 100;

	&__inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 12px 16px;
	}

	&__btn {
		height: 48px;
		border-radius: 20px;
		background: var(--primary);
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
		color: var(--primary);
	}

	&__btn--outline {
		background: var(--surface-card);
		border: 1px solid #1B8A5A;
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

/* 工作分组 */
.project-group {
	margin-bottom: 20px;
}
.project-group__header {
	display: flex;
	align-items: center;
	padding: 0 0 10px;
}
.project-group__color {
	width: 10px;
	height: 10px;
	border-radius: 2px;
	margin-right: 8px;
}
.project-group__name {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
	flex: 1;
}
.project-group__rate {
	font-size: 12px;
	color: var(--text-muted);
}
.project-group__footer {
	padding: 10px 16px;
	background: var(--surface);
	border-radius: 0 0 12px 12px;
	border: 1px solid var(--border);
	border-top: none;
}
.project-group__subtotal {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-secondary);
}
.project-group__settle-toggle {
	padding: 2px 6px;
	margin-left: 8px;
}
.project-group__settle-icon {
	font-size: 16px;
}
.project-group__settle-stats {
	display: flex;
	gap: 12px;
	padding: 0 0 10px 18px;
}
.project-group__settle-stat {
	font-size: 12px;
	color: var(--text-secondary);
}
.project-group__settle-stat.unsettled {
	color: var(--error);
}

.unsettled-bar {
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 16px; background: #FFF8E6;
	border-radius: 12px; border: 1px solid #E5A100; margin-top: 12px;

	&__label { font-size: 14px; color: #B8860B; }
	&__amount { font-size: 18px; font-weight: 700; color: #B8860B; }
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
		border-radius: 20px;
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
			background: var(--primary);
			color: #FFFFFF;
			font-weight: 600;
		}
	}
}
</style>
