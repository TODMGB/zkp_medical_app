<!-- src/App.vue -->
<template>
  <div id="app">
    <!-- 路由匹配的组件将在这里渲染 -->
    <router-view></router-view>
    
    <!-- 退出提示 Toast -->
    <transition name="toast-fade">
      <div v-if="showExitToast" class="exit-toast">
        再按一次退出应用
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const router = useRouter()
const route = useRoute()
const showExitToast = ref(false)
let lastBackPress = 0
let backButtonListener: any = null
let listenerRetryTimer: ReturnType<typeof setTimeout> | null = null
const LISTENER_RETRY_INTERVAL = 5000

// 定义哪些路由是"退出点"（在这些页面按返回键需要确认退出）
const exitRoutes = ['/splash', '/home', '/login']

onMounted(async () => {
  // 只在Android平台上监听返回键
  if (Capacitor.getPlatform() === 'android') {
    setupBackButtonHandler()
  }
  
  // 初始化本地通知服务
  await initLocalNotification()
  
  // 启动消息监听服务
  await startMessageListener()
})

onUnmounted(async () => {
  // 清理监听器
  if (backButtonListener) {
    backButtonListener.remove()
  }
  
  clearMessageListenerRetry()
  // 停止消息监听
  await stopMessageListener()
})

/**
 * 初始化本地通知服务
 */
async function initLocalNotification() {
  try {
    const { localNotificationService } = await import('@/service/localNotification')
    
    // 创建通知渠道（Android 8.0+）
    await localNotificationService.createChannels()
    
    // 请求通知权限
    const hasPermission = await localNotificationService.requestPermission()
    if (hasPermission) {
      console.log('✅ 本地通知服务已初始化')
      
      // 注册通知点击监听器
      localNotificationService.registerClickListener((notification) => {
        console.log('通知被点击:', notification)
        // 可以在这里跳转到对应页面
        router.push('/notifications')
      })
    } else {
      console.warn('⚠️ 通知权限未授予')
    }
  } catch (error) {
    console.error('初始化本地通知失败:', error)
  }
}

/**
 * 启动消息监听服务
 */
async function startMessageListener(force = false) {
  try {
    const { authService } = await import('@/service/auth')
    const isLoggedIn = await authService.isLoggedIn()
    
    if (!isLoggedIn) {
      console.log('用户未登录，跳过消息监听启动')
      scheduleMessageListenerRetry()
      return
    }
    
    // 获取钱包
    const { aaService } = await import('@/service/accountAbstraction')
    const wallet = await aaService.getEOAWallet()
    
    if (!wallet) {
      console.warn('无法获取钱包，稍后重试消息监听启动')
      scheduleMessageListenerRetry()
      return
    }
    
    // 启动消息监听
    const { messageListenerService } = await import('@/service/messageListener')
    if (messageListenerService.isActive() && !force) {
      clearMessageListenerRetry()
      return
    }
    await messageListenerService.startListening(wallet)
    clearMessageListenerRetry()
    console.log('✅ 消息监听服务已启动')
  } catch (error) {
    console.error('启动消息监听失败:', error)
    scheduleMessageListenerRetry()
  }
}

/**
 * 停止消息监听服务
 */
async function stopMessageListener() {
  try {
    const { messageListenerService } = await import('@/service/messageListener')
    messageListenerService.stopListening()
  } catch (error) {
    console.error('停止消息监听失败:', error)
  }
}

function scheduleMessageListenerRetry() {
  if (listenerRetryTimer) {
    return
  }
  listenerRetryTimer = setInterval(() => {
    startMessageListener(true)
  }, LISTENER_RETRY_INTERVAL)
}

function clearMessageListenerRetry() {
  if (listenerRetryTimer) {
    clearInterval(listenerRetryTimer)
    listenerRetryTimer = null
  }
}

async function setupBackButtonHandler() {
  backButtonListener = await CapacitorApp.addListener('backButton', (event: { canGoBack: boolean }) => {
    const currentPath = route.path
    const { canGoBack } = event
    
    console.log('返回键按下:', currentPath, 'canGoBack:', canGoBack)
    
    // 检查是否在退出点路由
    const isExitRoute = exitRoutes.includes(currentPath)
    
    if (isExitRoute) {
      // 在退出点，需要连续两次按返回键才退出
      handleExitConfirmation()
    } else if (canGoBack) {
      // 有历史记录，返回上一页
      router.back()
    } else {
      // 没有历史记录，但不在退出点，跳转到首页
      router.push('/home')
    }
  })
}

function handleExitConfirmation() {
  const currentTime = Date.now()
  const timeDiff = currentTime - lastBackPress
  
  if (timeDiff < 2000) {
    // 2秒内连续按两次，退出应用
    CapacitorApp.exitApp()
  } else {
    // 第一次按，显示提示
    lastBackPress = currentTime
    showExitToast.value = true
    
    // 2秒后隐藏提示
    setTimeout(() => {
      showExitToast.value = false
    }, 2000)
  }
}
</script>

<style>
/* 全局基础样式 */
* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f5f7fa;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  font-size: var(--font-size, 16px);
}

/* 全局字体大小变量 */
:root {
  --font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a202c;
    color: #e2e8f0;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 简单的淡入淡出动画（备用） */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 通用按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background-color: #4299e1;
  color: white;
}

.btn-primary:hover {
  background-color: #3182ce;
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background-color: #cbd5e0;
}

/* 通用输入框样式 */
.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #4299e1;
}

.input::placeholder {
  color: #a0aec0;
}

/* 通用卡片样式 */
.card {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* 退出提示 Toast */
.exit-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  white-space: nowrap;
}

/* Toast 动画 */
.toast-fade-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-fade-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}

/* 暗色模式下的Toast */
@media (prefers-color-scheme: dark) {
  .exit-toast {
    background: rgba(255, 255, 255, 0.9);
    color: #1a202c;
  }
}
</style>