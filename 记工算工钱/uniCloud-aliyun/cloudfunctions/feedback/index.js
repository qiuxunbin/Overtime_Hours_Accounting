'use strict'

const db = uniCloud.database()

/**
 * 意见反馈服务
 *
 * 动作：
 *   submit - 提交反馈
 *   list   - 查询用户的历史反馈
 *   detail - 查看单条反馈详情
 */
exports.main = async (event, context) => {
	const uid = context.UNIID_USER?._id
	if (!uid) {
		return { code: 401, message: '请先登录' }
	}

	const { action } = event

	switch (action) {
		case 'submit':
			return await submitFeedback(uid, event)
		case 'list':
			return await listFeedback(uid, event)
		case 'detail':
			return await getDetail(uid, event)
		default:
			return { code: 400, message: '未知动作，支持: submit / list / detail' }
	}
}

/**
 * 提交反馈
 */
async function submitFeedback(uid, { title, content, images }) {
	if (!title || !title.trim()) {
		return { code: 400, message: '请输入反馈标题' }
	}
	if (!content || !content.trim()) {
		return { code: 400, message: '请输入反馈内容' }
	}

	const collection = db.collection('feedback')

	const { id } = await collection.add({
		user_id: uid,
		title: title.trim(),
		content: content.trim(),
		images: images || [],
		status: 'pending',
		created_at: Date.now()
	})

	return {
		code: 0,
		message: '反馈提交成功',
		data: { id }
	}
}

/**
 * 查询用户反馈列表
 */
async function listFeedback(uid, { skip = 0, limit = 50 }) {
	const collection = db.collection('feedback')

	const { data } = await collection
		.where({ user_id: uid })
		.orderBy('created_at', 'desc')
		.skip(skip)
		.limit(Math.min(limit, 100))
		.get()

	return {
		code: 0,
		data: data.map(item => ({
			id: item._id,
			title: item.title,
			content: item.content,
			status: item.status,
			created_at: item.created_at
		}))
	}
}

/**
 * 查看单条反馈
 */
async function getDetail(uid, { feedbackId }) {
	if (!feedbackId) {
		return { code: 400, message: '请提供 feedbackId' }
	}

	const collection = db.collection('feedback')
	const { data } = await collection
		.where({ _id: feedbackId, user_id: uid })
		.limit(1)
		.get()

	if (data.length === 0) {
		return { code: 404, message: '反馈不存在' }
	}

	return {
		code: 0,
		data: data[0]
	}
}
