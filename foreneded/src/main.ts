// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由配置
import './assets/main.css' // 引入全局样式
import './assets/scanner.css' // 引入扫描器样式
import { localNotificationService } from './service/localNotification'
import { getNotificationRoute } from './service/notification'
import { authService } from './service/auth'

const app = createApp(App)

app.use(router) // 使用路由

try {
  const savedFontSize = localStorage.getItem('fontSize') || 'medium'
  document.documentElement.setAttribute('data-font-size', savedFontSize)

  const savedDarkMode = localStorage.getItem('darkMode')
  if (savedDarkMode !== null) {
    document.body.classList.toggle('dark-mode', savedDarkMode === 'true')
  }

  const savedElderMode = localStorage.getItem('elderMode')
  if (savedElderMode !== null) {
    document.documentElement.classList.toggle('elder-mode', savedElderMode === 'true')
  }
} catch (error) {
  console.warn('Failed to apply UI settings from storage:', error)
}

try {
  const savedElderMode = localStorage.getItem('elderMode')
  if (savedElderMode === null) {
    authService
      .getUserInfo()
      .then((userInfo) => {
        if ((userInfo?.roles || []).includes('elderly')) {
          localStorage.setItem('elderMode', 'true')
          document.documentElement.classList.add('elder-mode')
        }
      })
      .catch(() => {})
  }
} catch (e) {
}

// 初始化本地通知服务
localNotificationService.createChannels().then(() => {
  console.log('✅ 通知渠道初始化完成')
})

// 请求通知权限（在用户首次使用时）
localNotificationService.checkPermission().then((granted) => {
  if (!granted) {
    console.log('ℹ️ 通知权限未授予，将在收到通知时请求权限')
  } else {
    console.log('✅ 通知权限已授予')
  }
})

// 注册通知点击监听器
localNotificationService.registerClickListener((notification) => {
  console.log('用户点击了通知:', notification)
  
  // 根据通知类型跳转到相应页面
  const extra = notification.extra
  if (extra && extra.type) {
    router.push(getNotificationRoute(String(extra.type), extra.data))
  } else {
    // 默认跳转到通知页面
    router.push('/notifications')
  }
})

app.mount('#app')