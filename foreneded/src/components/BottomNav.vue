<template>
  <div class="bottom-nav">
    <router-link to="/home" class="nav-item" :class="{ active: currentRoute === 'home' }">
      <div class="nav-icon">🏠</div>
      <span>首页</span>
    </router-link>
    <!-- 只有老人（elderly）角色才显示"记录"和"周汇总" -->
    <router-link 
      v-if="isElderly" 
      to="/medication-history" 
      class="nav-item" 
      :class="{ active: currentRoute === 'medication-history' }"
    >
      <div class="nav-icon">📊</div>
      <span>记录</span>
    </router-link>
    <router-link 
      v-if="isElderly" 
      to="/weekly-summary" 
      class="nav-item" 
      :class="{ active: currentRoute === 'weekly-summary' }"
    >
      <div class="nav-icon">📋</div>
      <span>周汇总</span>
    </router-link>
    <router-link to="/relationships" class="nav-item" :class="{ active: currentRoute === 'relationships' }">
      <div class="nav-icon">👥</div>
      <span>关系</span>
    </router-link>
    <router-link to="/profile" class="nav-item" :class="{ active: currentRoute === 'profile' }">
      <div class="nav-icon-wrapper">
        <div class="nav-icon">👤</div>
        <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </div>
      <span>我的</span>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { unreadCount, notificationBadgeService } from '@/service/notificationBadge'
import { authService } from '@/service/auth'

const route = useRoute()
const isElderly = ref(false)

const currentRoute = computed(() => {
  const path = route.path
  if (path.startsWith('/home')) return 'home'
  if (path.startsWith('/medication-history')) return 'medication-history'
  if (path.startsWith('/weekly-summary')) return 'weekly-summary'
  if (path.startsWith('/relationships')) return 'relationships'
  if (path.startsWith('/profile')) return 'profile'
  return ''
})

// 检查用户角色
const checkUserRole = async () => {
  try {
    const userInfo = await authService.getUserInfo()
    if (userInfo?.roles) {
      isElderly.value = userInfo.roles.includes('elderly')
      console.log('底部导航栏 - 用户角色:', userInfo.roles, '是否老人:', isElderly.value)
    }
  } catch (error) {
    console.error('获取用户角色失败:', error)
  }
}

onMounted(async () => {
  // 检查用户角色
  await checkUserRole()
  
  // 启动未读消息轮询（如果还没启动）
  notificationBadgeService.startPolling()
  // 监听新通知
  notificationBadgeService.listenForNewNotifications()
})
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: #718096;
  flex: 1;
  padding: 4px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.nav-item.active {
  color: #667eea;
}

.nav-item:hover {
  color: #667eea;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-icon-wrapper {
  position: relative;
  display: inline-block;
}

.nav-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: 0 2px 6px rgba(229, 62, 62, 0.4);
  border: 2px solid white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.nav-item span {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}
</style>

