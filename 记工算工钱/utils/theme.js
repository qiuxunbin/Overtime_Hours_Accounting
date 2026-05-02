import { reactive } from 'vue'

export const themeState = reactive({
	isDark: false
})

export function toggleTheme() {
	themeState.isDark = !themeState.isDark
	uni.setStorageSync('theme', themeState.isDark ? 'dark' : 'light')
	applyThemeClass()
}

export function applyThemeClass() {
	// #ifdef APP-PLUS || H5
	if (typeof document !== 'undefined') {
		const cls = document.documentElement.classList
		if (themeState.isDark) cls.add('dark-mode')
		else cls.remove('dark-mode')
	}
	// #endif
	// #ifdef MP-WEIXIN
	uni.setNavigationBarColor({
		frontColor: themeState.isDark ? '#ffffff' : '#000000',
		backgroundColor: themeState.isDark ? '#1A1C1E' : '#F8F6F2'
	})
	// #endif
}
