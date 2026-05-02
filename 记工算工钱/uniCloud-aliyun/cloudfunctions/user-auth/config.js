// ========== 云函数配置 ==========
module.exports = {
	passwordSecret: [{ type: 'hmac-sha256', version: 1 }],
	tokenSecret: 'overtime-app-jwt-secret-change-in-production',
	tokenExpiresIn: 604800,
	tokenExpiresThreshold: 86400,
	weixin: {
		appid: 'wxed059ca24650f6c3',
		appsecret: 'b86f314d2c3c0b75f495888e8b5be07e'
	}
}
