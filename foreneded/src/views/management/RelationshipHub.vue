<template>
  <div class="relationship-hub">
    <!-- Tab切换 -->
    <div class="tabs-container">
      <div class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'circle' }"
          @click="switchTab('circle')"
        >
          <span class="tab-icon">👨‍👩‍👧‍👦</span>
          <span>我的家庭圈</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'relationships' }"
          @click="switchTab('relationships')"
        >
          <span class="tab-icon">👥</span>
          <span>{{ relationshipTabLabel }}</span>
        </button>
      </div>
    </div>

    <!-- Tab内容 -->
    <div class="tab-content">
      <!-- 家庭圈Tab -->
      <div v-show="activeTab === 'circle'" class="tab-pane">
        <FamilyCircleContent />
      </div>

      <!-- 关系Tab -->
      <div v-show="activeTab === 'relationships'" class="tab-pane">
        <MyRelationshipsContent />
      </div>
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { authService } from '@/service/auth'
import BottomNav from '@/components/BottomNav.vue'
import FamilyCircleContent from './FamilyCircleContent.vue'
import MyRelationshipsContent from './MyRelationshipsContent.vue'

const activeTab = ref<'circle' | 'relationships'>('circle')

// 关系tab标签
const relationshipTabLabel = computed(() => {
  // 这里可以根据用户角色动态显示
  return '我的关系'
})

const switchTab = (tab: 'circle' | 'relationships') => {
  activeTab.value = tab
}
</script>

<style scoped>
.relationship-hub {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 70px; /* 为底部导航栏留空间 */
}

.tabs-container {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tabs {
  display: flex;
  max-width: 100%;
}

.tab-btn {
  flex: 1;
  padding: 16px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: #718096;
  position: relative;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #667eea;
}


.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #667eea;
  border-radius: 3px 3px 0 0;
}

.tab-icon {
  font-size: 1.2rem;
}

.tab-content {
  min-height: calc(100vh - 130px);
}

.tab-pane {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

