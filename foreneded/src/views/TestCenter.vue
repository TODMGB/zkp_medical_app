<template>
  <div class="test-center">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <span class="arrow">←</span>
      </button>
      <h1 class="page-title">测试中心</h1>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <!-- 开发环境提示 -->
      <div class="dev-notice">
        <div class="notice-icon">🧪</div>
        <div class="notice-content">
          <h3>开发测试环境</h3>
          <p>此页面包含所有开发和测试功能，仅在开发环境中使用</p>
        </div>
      </div>

      <!-- 核心功能测试 -->
      <div class="test-section">
        <h2 class="section-title">
          <span class="section-icon">🔧</span>
          核心功能测试
        </h2>
        
        <div class="test-grid">
          <div class="test-card" @click="goToZkpTest">
            <div class="card-icon">🔐</div>
            <div class="card-content">
              <h3 class="card-title">零知识证明</h3>
              <p class="card-desc">测试ZKP生成和验证功能</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToWallet">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3 class="card-title">钱包管理</h3>
              <p class="card-desc">以太坊钱包创建和管理</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToAccountAbstraction">
            <div class="card-icon">🏗️</div>
            <div class="card-content">
              <h3 class="card-title">账户抽象</h3>
              <p class="card-desc">ERC-4337智能合约账户</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToWeeklySummary">
            <div class="card-icon">📋</div>
            <div class="card-content">
              <h3 class="card-title">周打卡汇总</h3>
              <p class="card-desc">测试周度打卡和证明生成</p>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>

      <!-- 迁移功能测试 -->
      <div class="test-section">
        <h2 class="section-title">
          <span class="section-icon">📱</span>
          迁移功能测试
        </h2>
        
        <div class="test-grid">
          <div class="test-card" @click="goToMigrationTest">
            <div class="card-icon">🧪</div>
            <div class="card-content">
              <h3 class="card-title">迁移功能测试</h3>
              <p class="card-desc">测试账户迁移的各项功能</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToOldDeviceMigration">
            <div class="card-icon">📤</div>
            <div class="card-content">
              <h3 class="card-title">旧设备迁移</h3>
              <p class="card-desc">模拟旧设备发起迁移</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToNewDeviceImport">
            <div class="card-icon">📥</div>
            <div class="card-content">
              <h3 class="card-title">新设备导入</h3>
              <p class="card-desc">模拟新设备导入账户</p>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>

      <!-- 用户流程测试 -->
      <div class="test-section">
        <h2 class="section-title">
          <span class="section-icon">👤</span>
          用户流程测试
        </h2>
        
        <div class="test-grid">
          <div class="test-card" @click="goToSplash">
            <div class="card-icon">🏠</div>
            <div class="card-content">
              <h3 class="card-title">欢迎页面</h3>
              <p class="card-desc">应用启动和用户引导</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToAccountChoice">
            <div class="card-icon">⚡</div>
            <div class="card-content">
              <h3 class="card-title">账户选择</h3>
              <p class="card-desc">新用户账户类型选择</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToSignup">
            <div class="card-icon">✨</div>
            <div class="card-content">
              <h3 class="card-title">用户注册</h3>
              <p class="card-desc">身份验证和账户创建</p>
            </div>
            <div class="card-arrow">→</div>
          </div>

          <div class="test-card" @click="goToRegistrationFlowTest">
            <div class="card-icon">🔄</div>
            <div class="card-content">
              <h3 class="card-title">注册流程测试</h3>
              <p class="card-desc">完整注册流程的自动化测试</p>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>
      </div>

      <!-- 工具和状态 -->
      <div class="test-section">
        <h2 class="section-title">
          <span class="section-icon">🛠️</span>
          开发工具
        </h2>
        
        <div class="tools-grid">
          <div class="tool-card" @click="clearAllData">
            <div class="tool-icon">🗑️</div>
            <div class="tool-content">
              <h4 class="tool-title">清除所有数据</h4>
              <p class="tool-desc">重置应用到初始状态</p>
            </div>
          </div>

          <div class="tool-card" @click="showCacheManager">
            <div class="tool-icon">📦</div>
            <div class="tool-content">
              <h4 class="tool-title">缓存管理</h4>
              <p class="tool-desc">细粒度清除各类缓存</p>
            </div>
          </div>

          <div class="tool-card" @click="toggleRegistrationStatus">
            <div class="tool-icon">🔄</div>
            <div class="tool-content">
              <h4 class="tool-title">切换注册状态</h4>
              <p class="tool-desc">模拟已注册/未注册状态</p>
            </div>
          </div>

          <div class="tool-card" @click="showSystemInfo">
            <div class="tool-icon">ℹ️</div>
            <div class="tool-content">
              <h4 class="tool-title">系统信息</h4>
              <p class="tool-desc">查看设备和应用信息</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="status-section">
        <h3 class="status-title">当前状态</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">注册状态</span>
            <span class="status-value" :class="{ 'registered': isRegistered }">
              {{ isRegistered ? '已注册' : '未注册' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">当前路由</span>
            <span class="status-value">{{ currentRoute }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">设备ID</span>
            <span class="status-value">{{ deviceId }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { aaService } from '@/service/accountAbstraction';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { CLEAR_GROUPS, KEY_CATEGORIES } from '@/config/storage.config';

const router = useRouter();
const route = useRoute();

// 响应式数据
const isRegistered = ref(false);
const deviceId = ref('');

const currentRoute = computed(() => route.path);

// 返回上一页
const goBack = () => {
  router.back();
};

// 核心功能测试
const goToZkpTest = () => {
  router.push('/dev');
};

const goToWallet = () => {
  router.push('/dev/wallet');
};

const goToAccountAbstraction = () => {
  router.push('/dev/aa');
};

const goToWeeklySummary = () => {
  router.push('/weekly-summary');
};

// 迁移功能测试
const goToMigrationTest = () => {
  router.push('/test-migration');
};

const goToOldDeviceMigration = () => {
  router.push('/account-migration');
};

const goToNewDeviceImport = () => {
  router.push('/import-account');
};

// 用户流程测试
const goToSplash = () => {
  router.push('/splash');
};

const goToAccountChoice = () => {
  router.push('/account-choice');
};

const goToSignup = () => {
  router.push('/signup');
};

const goToRegistrationFlowTest = () => {
  router.push('/test-registration-flow');
};

// 开发工具
const clearAllData = async () => {
  if (!confirm('⚠️ 确定要清除所有数据吗？这将重置应用到初始状态，不可恢复！')) {
    return;
  }

  try {
    // 清除所有本地存储
    await Preferences.clear();
    
    alert('✅ 所有数据已清除，应用已重置到初始状态');
    
    // 刷新状态
    await checkStatus();
    
    // 跳转到欢迎页面
    router.push('/splash');
  } catch (error) {
    console.error('清除数据失败:', error);
    alert('❌ 清除数据失败');
  }
};

const showCacheManager = async () => {
  const categories = Object.entries(CLEAR_GROUPS).map(([key, value]) => ({
    name: key,
    label: KEY_CATEGORIES[key as keyof typeof KEY_CATEGORIES] || key,
    count: value.length
  }));

  const categoryList = categories
    .map(cat => `${cat.name} (${cat.count}): ${cat.label}`)
    .join('\n');

  const selected = prompt(
    `选择要清除的缓存类别：\n\n${categoryList}\n\n请输入类别名称（如：AUTH, WALLET, CHECKIN等）或 ALL 清除所有`,
    'CHECKIN'
  );

  if (!selected) return;

  try {
    if (selected.toUpperCase() === 'ALL') {
      await Preferences.clear();
      alert('✅ 已清除所有缓存');
    } else {
      const groupKey = selected.toUpperCase() as keyof typeof CLEAR_GROUPS;
      const keysToRemove = CLEAR_GROUPS[groupKey];

      if (!keysToRemove) {
        alert('❌ 无效的类别名称');
        return;
      }

      for (const key of keysToRemove) {
        await Preferences.remove({ key });
      }

      alert(`✅ 已清除 ${groupKey} 类别的 ${keysToRemove.length} 个缓存项`);
    }

    await checkStatus();
  } catch (error) {
    console.error('清除缓存失败:', error);
    alert('❌ 清除缓存失败');
  }
};

const toggleRegistrationStatus = async () => {
  try {
    if (isRegistered.value) {
      // 清除注册状态
      await Preferences.remove({ key: 'accountInfo' });
      await Preferences.remove({ key: 'userInfo' });
      await Preferences.remove({ key: 'biometric' });
      alert('✅ 已切换到未注册状态');
    } else {
      // 设置为已注册状态
      await Preferences.set({
        key: 'accountInfo',
        value: JSON.stringify({
          address: '0x1234567890abcdef',
          ownerAddress: '0xabcdef1234567890',
          isDeployed: true
        })
      });
      
      await Preferences.set({
        key: 'userInfo',
        value: JSON.stringify({
          username: '测试用户', // 使用 UserInfo 接口的字段名
          phoneNumber: '13800138000'
        })
      });
      
      alert('✅ 已切换到已注册状态');
    }
    
    await checkStatus();
  } catch (error) {
    console.error('切换注册状态失败:', error);
    alert('❌ 切换状态失败');
  }
};

const showSystemInfo = async () => {
  try {
    const deviceInfo = await Device.getInfo();
    const deviceIdInfo = await Device.getId();
    
    const info = `
设备信息：
• 平台: ${deviceInfo.platform}
• 操作系统: ${deviceInfo.operatingSystem}
• 版本: ${deviceInfo.osVersion}
• 设备ID: ${deviceIdInfo.identifier}
• 制造商: ${deviceInfo.manufacturer}
• 型号: ${deviceInfo.model}
• 是否虚拟设备: ${deviceInfo.isVirtual ? '是' : '否'}

应用信息：
• 当前路由: ${route.path}
• 注册状态: ${isRegistered.value ? '已注册' : '未注册'}
    `.trim();
    
    alert(info);
  } catch (error) {
    console.error('获取系统信息失败:', error);
    alert('❌ 获取系统信息失败');
  }
};

// 检查状态
const checkStatus = async () => {
  try {
    isRegistered.value = await aaService.isRegistered();
    const deviceInfo = await Device.getId();
    deviceId.value = deviceInfo.identifier.slice(0, 8) + '...';
  } catch (error) {
    console.error('检查状态失败:', error);
  }
};

// 组件挂载
onMounted(() => {
  checkStatus();
});
</script>

<style scoped>
.test-center {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.arrow {
  color: white;
  font-size: 1.5rem;
  line-height: 1;
}

.page-title {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

/* 主要内容 */
.content {
  flex: 1;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  margin-top: auto;
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 开发环境提示 */
.dev-notice {
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.notice-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.notice-content h3 {
  margin: 0 0 4px 0;
  color: #2d3436;
  font-size: 1.1rem;
  font-weight: 600;
}

.notice-content p {
  margin: 0;
  color: #636e72;
  font-size: 0.9rem;
  line-height: 1.4;
}

/* 测试区域 */
.test-section {
  margin-bottom: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  color: #2d3436;
  font-size: 1.2rem;
  font-weight: 600;
}

.section-icon {
  font-size: 1.3rem;
}

/* 测试卡片网格 */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.test-card {
  background: white;
  border: 2px solid #f1f3f4;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.test-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.card-icon {
  font-size: 1.8rem;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-title {
  margin: 0 0 4px 0;
  color: #2d3436;
  font-size: 1rem;
  font-weight: 600;
}

.card-desc {
  margin: 0;
  color: #636e72;
  font-size: 0.85rem;
  line-height: 1.4;
}

.card-arrow {
  color: #667eea;
  font-size: 1.2rem;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}

.test-card:hover .card-arrow {
  transform: translateX(4px);
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.tool-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-card:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.tool-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tool-content {
  flex: 1;
}

.tool-title {
  margin: 0 0 2px 0;
  color: #495057;
  font-size: 0.9rem;
  font-weight: 600;
}

.tool-desc {
  margin: 0;
  color: #6c757d;
  font-size: 0.8rem;
}

/* 状态区域 */
.status-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}

.status-title {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 1rem;
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.status-label {
  color: #6c757d;
  font-size: 0.85rem;
}

.status-value {
  color: #495057;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: monospace;
}

.status-value.registered {
  color: #28a745;
}

/* 响应式 */
@media (max-width: 768px) {
  .content {
    padding: 20px 16px;
  }
  
  .test-grid {
    grid-template-columns: 1fr;
  }
  
  .tools-grid {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .test-card {
    padding: 16px;
  }
  
  .card-icon {
    width: 45px;
    height: 45px;
    font-size: 1.5rem;
  }
}
</style>
