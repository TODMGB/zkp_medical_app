<template>
  <div class="test-center">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">测试中心</h1>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <!-- 开发环境提示 -->
      <div class="dev-notice">
        <div class="notice-icon-wrapper">
          <FlaskConical class="notice-icon" />
        </div>
        <div class="notice-content">
          <h3>开发测试环境</h3>
          <p>此页面包含所有开发和测试功能，仅在开发环境中使用</p>
        </div>
      </div>

      <!-- 核心功能测试 -->
      <div class="test-section">
        <h2 class="section-title">
          <Wrench class="section-icon" />
          核心功能测试
        </h2>
        
        <div class="test-grid">
          <div class="test-card" @click="goToZkpTest">
            <div class="card-icon-wrapper">
              <ShieldCheck class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">零知识证明</h3>
              <p class="card-desc">测试ZKP生成和验证功能</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToWallet">
            <div class="card-icon-wrapper">
              <Wallet class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">钱包管理</h3>
              <p class="card-desc">以太坊钱包创建和管理</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToAccountAbstraction">
            <div class="card-icon-wrapper">
              <Blocks class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">账户抽象</h3>
              <p class="card-desc">ERC-4337智能合约账户</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToWeeklySummary">
            <div class="card-icon-wrapper">
              <ClipboardList class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">周打卡汇总</h3>
              <p class="card-desc">测试周度打卡和证明生成</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="testMedicationDecryption">
            <div class="card-icon-wrapper">
              <Lock class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">医药信息解密</h3>
              <p class="card-desc">测试加密医药计划的解密</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>
        </div>
      </div>

      <!-- 迁移功能测试 -->
      <div class="test-section">
        <h2 class="section-title">
          <Smartphone class="section-icon" />
          迁移功能测试
        </h2>
        
        <div class="test-grid">
          <div class="test-card" @click="goToMigrationTest">
            <div class="card-icon-wrapper">
              <TestTube2 class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">迁移功能测试</h3>
              <p class="card-desc">测试账户迁移的各项功能</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToOldDeviceMigration">
            <div class="card-icon-wrapper">
              <Upload class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">旧设备迁移</h3>
              <p class="card-desc">模拟旧设备发起迁移</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToNewDeviceImport">
            <div class="card-icon-wrapper">
              <Download class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">新设备导入</h3>
              <p class="card-desc">模拟新设备导入账户</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>
        </div>
      </div>

      <!-- 用户流程测试 -->
      <div class="test-section">
        <h2 class="section-title">
          <User class="section-icon" />
          用户流程测试
        </h2>
        
        <div class="test-grid">
          <div class="test-card" @click="goToSplash">
            <div class="card-icon-wrapper">
              <Home class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">欢迎页面</h3>
              <p class="card-desc">应用启动和用户引导</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToAccountChoice">
            <div class="card-icon-wrapper">
              <Zap class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">账户选择</h3>
              <p class="card-desc">新用户账户类型选择</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToSignup">
            <div class="card-icon-wrapper">
              <Sparkles class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">用户注册</h3>
              <p class="card-desc">身份验证和账户创建</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>

          <div class="test-card" @click="goToRegistrationFlowTest">
            <div class="card-icon-wrapper">
              <RefreshCw class="card-icon" />
            </div>
            <div class="card-content">
              <h3 class="card-title">注册流程测试</h3>
              <p class="card-desc">完整注册流程的自动化测试</p>
            </div>
            <ChevronRight class="card-arrow" />
          </div>
        </div>
      </div>

      <!-- 工具和状态 -->
      <div class="test-section">
        <h2 class="section-title">
          <PenTool class="section-icon" />
          开发工具
        </h2>
        
        <div class="tools-grid">
          <div class="tool-card" @click="clearAllData">
            <div class="tool-icon-wrapper">
              <Trash2 class="tool-icon" />
            </div>
            <div class="tool-content">
              <h4 class="tool-title">清除所有数据</h4>
              <p class="tool-desc">重置应用到初始状态</p>
            </div>
          </div>

          <div class="tool-card" @click="showCacheManager">
            <div class="tool-icon-wrapper">
              <Package class="tool-icon" />
            </div>
            <div class="tool-content">
              <h4 class="tool-title">缓存管理</h4>
              <p class="tool-desc">细粒度清除各类缓存</p>
            </div>
          </div>

          <div class="tool-card" @click="toggleRegistrationStatus">
            <div class="tool-icon-wrapper">
              <RefreshCw class="tool-icon" />
            </div>
            <div class="tool-content">
              <h4 class="tool-title">切换注册状态</h4>
              <p class="tool-desc">模拟已注册/未注册状态</p>
            </div>
          </div>

          <div class="tool-card" @click="showSystemInfo">
            <div class="tool-icon-wrapper">
              <Info class="tool-icon" />
            </div>
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
import { medicationPlanStorageService } from '@/service/medicationPlanStorage';
import { medicationService } from '@/service/medication';
import { authService } from '@/service/auth';
import { secureExchangeService } from '@/service/secureExchange';
import { uiService } from '@/service/ui';
import { 
  ArrowLeft, 
  FlaskConical, 
  Wrench, 
  ShieldCheck, 
  Wallet, 
  Blocks, 
  ClipboardList, 
  Smartphone, 
  TestTube2, 
  Upload, 
  Download, 
  User, 
  Home, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  PenTool, 
  Trash2, 
  Package, 
  Info,
  ChevronRight,
  Lock
} from 'lucide-vue-next';

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

// 医药信息解密测试
const testMedicationDecryption = async () => {
  try {
    console.log('🔐 开始医药信息解密测试...');
    
    // 1. 获取所有保存的用药计划
    const allPlans = await medicationPlanStorageService.getAllPlans();
    
    if (allPlans.length === 0) {
      uiService.toast('❌ 没有找到保存的用药计划，请先接收一个用药计划', { type: 'warning' });
      return;
    }
    
    console.log(`📋 找到 ${allPlans.length} 个用药计划`);
    
    // 2. 获取第一个计划的详细信息
    const fullPlan = allPlans[0];
    
    if (!fullPlan) {
      uiService.toast('❌ 无法获取用药计划详情', { type: 'error' });
      return;
    }
    
    console.log('📝 计划信息:', fullPlan);
    
    // 3. 检查是否有加密数据
    if (!fullPlan.encrypted_plan_data) {
      uiService.toast('❌ 计划中没有加密数据', { type: 'error' });
      return;
    }
    
    console.log('🔒 加密数据长度:', fullPlan.encrypted_plan_data.length, '字符');
    
    // 4. 获取用户钱包和医生公钥
    const userInfo = await authService.getUserInfo();
    if (!userInfo) {
      uiService.toast('❌ 无法获取用户信息', { type: 'error' });
      return;
    }
    
    const wallet = await aaService.getEOAWallet();
    if (!wallet) {
      uiService.toast('❌ 无法获取钱包', { type: 'error' });
      return;
    }
    
    console.log('👤 用户地址:', userInfo.smart_account);
    console.log('👨‍⚕️ 医生地址:', fullPlan.doctor_address);
    
    // 5. 获取医生的公钥
    console.log('🔑 获取医生公钥...');
    const doctorPublicKey = await secureExchangeService.getRecipientPublicKey(
      fullPlan.doctor_address
    );
    console.log('  ✅ 医生公钥获取成功');
    
    // 6. 解密计划数据
    console.log('🔓 开始解密...');
    const decryptedPlan = await medicationService.decryptPlanData(
      fullPlan.encrypted_plan_data,
      wallet.privateKey,
      doctorPublicKey
    );
    
    console.log('✅ 解密成功！');
    console.log('📋 解密后的计划数据:', decryptedPlan);
    
    // 6. 显示解密结果
    const resultMessage = `
✅ 医药信息解密成功！

📋 计划信息：
• 计划名称: ${decryptedPlan.plan_name}
• 诊断: ${decryptedPlan.diagnosis}
• 开始日期: ${decryptedPlan.start_date}
• 结束日期: ${decryptedPlan.end_date}

💊 药物数量: ${decryptedPlan.medications.length} 种
⏰ 提醒数量: ${decryptedPlan.reminders.length} 个

📝 医嘱备注: ${decryptedPlan.notes || '无'}

🔐 加密状态: 已成功解密
    `.trim();
    
    await uiService.alert(resultMessage, { title: '解密结果', confirmText: '我知道了' });
    
    // 7. 打印详细信息到控制台
    console.log('=== 完整解密数据 ===');
    console.log('计划名称:', decryptedPlan.plan_name);
    console.log('诊断:', decryptedPlan.diagnosis);
    console.log('药物列表:', decryptedPlan.medications);
    console.log('提醒列表:', decryptedPlan.reminders);
    console.log('医嘱备注:', decryptedPlan.notes);
    
  } catch (error) {
    console.error('❌ 解密失败:', error);
    uiService.toast(`❌ 解密失败: ${error instanceof Error ? error.message : String(error)}`, { type: 'error' });
  }
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
  const ok = await uiService.confirm('⚠️ 确定要清除所有数据吗？这将重置应用到初始状态，不可恢复！', {
    title: '危险操作',
    confirmText: '清除',
    cancelText: '取消',
  })
  if (!ok) return;

  try {
    // 清除所有本地存储
    await Preferences.clear();
    
    uiService.toast('✅ 所有数据已清除，应用已重置到初始状态', { type: 'success' });
    
    // 刷新状态
    await checkStatus();
    
    // 跳转到欢迎页面
    router.push('/splash');
  } catch (error) {
    console.error('清除数据失败:', error);
    uiService.toast('❌ 清除数据失败', { type: 'error' });
  }
};

const showCacheManager = () => {
  router.push('/cache-manager');
};

const toggleRegistrationStatus = async () => {
  try {
    if (isRegistered.value) {
      // 清除注册状态
      await Preferences.remove({ key: 'accountInfo' });
      await Preferences.remove({ key: 'userInfo' });
      await Preferences.remove({ key: 'biometric' });
      uiService.toast('✅ 已切换到未注册状态', { type: 'success' });
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
      
      uiService.toast('✅ 已切换到已注册状态', { type: 'success' });
    }
    
    await checkStatus();
  } catch (error) {
    console.error('切换注册状态失败:', error);
    uiService.toast('❌ 切换状态失败', { type: 'error' });
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
    
    await uiService.alert(info, { title: '系统信息', confirmText: '我知道了' });
  } catch (error) {
    console.error('获取系统信息失败:', error);
    uiService.toast('❌ 获取系统信息失败', { type: 'error' });
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
  background: var(--bg-body);
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #667eea;
  color: white;
  box-shadow: var(--shadow-md);
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
  color: white;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.page-title {
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

/* 主要内容 */
.content {
  flex: 1;
  background: var(--bg-body);
  border-radius: 24px 24px 0 0;
  padding: 24px;
  margin-top: -20px;
  background: var(--bg-body);
  position: relative;
  z-index: 10;
}

/* 开发环境提示 */
.dev-notice {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--border-radius-lg);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}

.notice-icon-wrapper {
  width: 48px;
  height: 48px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-warning);
}

.notice-icon {
  width: 24px;
  height: 24px;
}

.notice-content h3 {
  margin: 0 0 4px 0;
  color: #9a3412;
  font-size: 1rem;
  font-weight: 600;
}

.notice-content p {
  margin: 0;
  color: #c2410c;
  font-size: 0.875rem;
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
  color: var(--text-primary);
  font-size: 1.125rem;
  font-weight: 600;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

/* 测试卡片网格 */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.test-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.test-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-icon-wrapper {
  width: 48px;
  height: 48px;
  background: var(--primary-50);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.test-card:hover .card-icon-wrapper {
  background: var(--color-primary);
  color: white;
}

.card-icon {
  width: 24px;
  height: 24px;
}

.card-content {
  flex: 1;
}

.card-title {
  margin: 0 0 4px 0;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
}

.card-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

.card-arrow {
  color: var(--gray-400);
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.test-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--color-primary);
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.tool-card {
  background: var(--gray-50);
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-card:hover {
  background: var(--bg-surface);
  border-color: var(--border-color);
  box-shadow: var(--shadow-sm);
}

.tool-icon-wrapper {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border: 1px solid var(--gray-200);
}

.tool-icon {
  width: 20px;
  height: 20px;
}

.tool-content {
  flex: 1;
}

.tool-title {
  margin: 0 0 2px 0;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
}

.tool-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* 状态区域 */
.status-section {
  background: var(--gray-50);
  border-radius: var(--border-radius-lg);
  padding: 20px;
  margin-top: 24px;
  border: 1px solid var(--border-color);
}

.status-title {
  margin: 0 0 16px 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  border-bottom: 1px solid var(--gray-200);
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.status-value {
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: monospace;
}

.status-value.registered {
  color: var(--color-success);
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
}
</style>
