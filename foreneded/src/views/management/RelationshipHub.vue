<template>
  <div class="relationship-hub">
    <!-- Tab切换 -->
    <div class="header">
      <h1 class="page-title">{{ activeTab === 'relationships' ? '好友' : '群组' }}</h1>
      <div class="header-actions">
        <button v-if="activeTab === 'relationships'" class="icon-btn" @click="goToScan">
          <QrCode class="icon" />
        </button>
        <button class="toggle-btn" @click="toggleTab">
          {{ activeTab === 'relationships' ? '群组' : '好友' }}
        </button>
      </div>
    </div>

    <!-- Tab内容 -->
    <div class="content">
      <!-- 家庭圈Tab -->
      <FamilyCircleContent v-if="activeTab === 'circle'" />
      <!-- 关系Tab -->
      <MyRelationshipsContent v-else />
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import FamilyCircleContent from './FamilyCircleContent.vue'
import MyRelationshipsContent from './MyRelationshipsContent.vue'
import { QrCode } from 'lucide-vue-next'

const router = useRouter()

const activeTab = ref<'circle' | 'relationships'>('relationships')

const toggleTab = () => {
  activeTab.value = activeTab.value === 'relationships' ? 'circle' : 'relationships'
}

const goToScan = () => {
  router.push({
    name: 'QRScanner',
    query: { mode: 'friend' }
  })
}
</script>

<style scoped>
.relationship-hub {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 70px; /* 为底部导航栏留空间 */
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon {
  width: 20px;
  height: 20px;
  color: #334155;
}

.toggle-btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: none;
  background: #667eea;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.content {
  min-height: calc(100vh - 130px);
}
</style>

