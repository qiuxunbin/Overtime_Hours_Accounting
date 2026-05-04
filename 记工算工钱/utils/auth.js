/**
 * 统一登录检查 — 未登录弹窗引导登录
 * @returns {boolean} true=已登录可继续, false=已弹窗拦截
 */
export function requireAuth() {
	const token = uni.getStorageSync('uni_id_token')
	if (!token) return showLoginPrompt()
	const expired = uni.getStorageSync('uni_id_token_expired')
	if (expired && Date.now() > expired) return showLoginPrompt()
	return true
}

function showLoginPrompt() {
	uni.showModal({
		title: '请先登录',
		content: '记工、工作管理、薪资设置等操作需要登录后才能使用。',
		confirmText: '去登录',
		cancelText: '取消',
		success: (res) => {
			if (res.confirm) {
				uni.navigateTo({ url: '/pages/login/login' })
			}
		}
	})
	return false
}
