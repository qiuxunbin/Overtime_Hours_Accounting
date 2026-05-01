import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '../utils/constants'

export const useUserStore = defineStore('user', {
	state: () => ({
		isLoggedIn: false,
		uid: '',
		nickname: '',
		avatar: '',
		phone: ''
	}),

	actions: {
		/**
		 * 从本地存储加载用户信息
		 */
		loadUser() {
			try {
				const data = uni.getStorageSync(STORAGE_KEYS.USER_INFO)
				if (data) {
					const parsed = JSON.parse(data)
					Object.assign(this, parsed)
				}
			} catch (e) {
				// 未登录
			}
		},

		/**
		 * 保存用户信息到本地
		 */
		saveUser() {
			uni.setStorageSync(STORAGE_KEYS.USER_INFO, JSON.stringify(this.$state))
		},

		/**
		 * 设置用户信息（登录后调用）
		 * @param {Object} userInfo
		 */
		setUser(userInfo) {
			Object.assign(this, { isLoggedIn: true, ...userInfo })
			this.saveUser()
		},

		/**
		 * 退出登录
		 */
		logout() {
			this.isLoggedIn = false
			this.uid = ''
			this.nickname = ''
			this.avatar = ''
			this.phone = ''
			uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
		}
	}
})
