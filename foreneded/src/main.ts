// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由配置
import './assets/scanner.css' // 引入扫描器样式
import { localNotificationService } from './service/localNotification'

const app = createApp(App)

app.use(router) // 使用路由

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
    const type = extra.type
    
    // 跳转逻辑
    if (type.includes('medication')) {
      router.push('/medication-history')
    } else if (type.includes('relationship')) {
      router.push('/relationships')
    } else if (type.includes('migration')) {
      router.push('/account-migration')
    } else {
      router.push('/notifications')
    }
  } else {
    // 默认跳转到通知页面
    router.push('/notifications')
  }
})

app.mount('#app')