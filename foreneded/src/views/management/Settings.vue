<template>
  <div class="settings-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">设置</h1>
    </div>
    
    <!-- 设置选项 -->
    <div class="settings-content">
      <!-- 显示设置 -->
      <div class="settings-section">
        <h2 class="section-title">显示设置</h2>
        
        <div class="setting-item">
          <div class="setting-icon">🔤</div>
          <div class="setting-content">
            <h3 class="setting-title">字体大小</h3>
            <p class="setting-desc">调整App内的字体大小</p>
          </div>
          <div class="setting-control">
            <select v-model="selectedFontSize" class="font-select" @change="updateFontSize">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
              <option value="extra-large">特大</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-icon">🌙</div>
          <div class="setting-content">
            <h3 class="setting-title">深色模式</h3>
            <p class="setting-desc">切换到深色主题</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="darkMode" @change="toggleDarkMode">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- 通知设置 -->
      <div class="settings-section">
        <h2 class="section-title">通知设置</h2>
        
        <div class="setting-item">
          <div class="setting-icon">⏰</div>
          <div class="setting-content">
            <h3 class="setting-title">用药提醒</h3>
            <p class="setting-desc">按时提醒您服药</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="medicationReminder" @change="updateMedicationReminder">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-icon">💝</div>
          <div class="setting-content">
            <h3 class="setting-title">家人关怀提醒</h3>
            <p class="setting-desc">接收家人的关心消息</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="familyReminder" @change="updateFamilyReminder">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-icon">🔔</div>
          <div class="setting-content">
            <h3 class="setting-title">系统通知</h3>
            <p class="setting-desc">接收系统重要通知</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="systemNotification" @change="updateSystemNotification">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- 数据设置 -->
      <div class="settings-section">
        <h2 class="section-title">数据设置</h2>
        
        <div class="setting-item" @click="clearCache">
          <div class="setting-icon">🗑️</div>
          <div class="setting-content">
            <h3 class="setting-title">清理缓存</h3>
            <p class="setting-desc">清理临时文件和缓存数据</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item" @click="exportData">
          <div class="setting-icon">📤</div>
          <div class="setting-content">
            <h3 class="setting-title">导出数据</h3>
            <p class="setting-desc">备份您的健康数据</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
      
      <!-- 区块链与账户 -->
      <div class="settings-section">
        <h2 class="section-title">区块链与账户</h2>
        
        
        <div class="setting-item" @click="goToAccountMigration">
          <div class="setting-icon">📱</div>
          <div class="setting-content">
            <h3 class="setting-title">账户迁移</h3>
            <p class="setting-desc">将账户迁移到新设备</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item danger-item" @click="resetAllAccounts">
          <div class="setting-icon">🗑️</div>
          <div class="setting-content">
            <h3 class="setting-title danger-text">重置所有账户</h3>
            <p class="setting-desc">删除所有钱包和账户数据（不可恢复）</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
      
      <!-- 开发测试 -->
      <div class="settings-section">
        <h2 class="section-title">开发测试</h2>
        
        <div class="setting-item" @click="goToTestCenter">
          <div class="setting-icon">🧪</div>
          <div class="setting-content">
            <h3 class="setting-title">测试中心</h3>
            <p class="setting-desc">开发和测试功能集合</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
      
      <!-- 应用设置 -->
      <div class="settings-section">
        <h2 class="section-title">应用设置</h2>
        
        <div class="setting-item" @click="checkUpdate">
          <div class="setting-icon">🔄</div>
          <div class="setting-content">
            <h3 class="setting-title">检查更新</h3>
            <p class="setting-desc">检查是否有新版本</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item" @click="resetSettings">
          <div class="setting-icon">⚙️</div>
          <div class="setting-content">
            <h3 class="setting-title">恢复默认设置</h3>
            <p class="setting-desc">将所有设置恢复为默认值</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { RPC_CONFIG, API_CONFIG } from '../../config/api.config'
import { biometricService } from '../../service/biometric'

const router = useRouter()

// 设置状态
const selectedFontSize = ref('medium')
const darkMode = ref(false)
const medicationReminder = ref(true)
const familyReminder = ref(true)
const systemNotification = ref(true)

const goBack = () => {
  router.back()
}


const goToAccountMigration = () => {
  router.push('/account-migration')
}

const goToTestCenter = () => {
  router.push('/test-center')
}


const resetAllAccounts = async () => {
  // 二次确认
  if (!confirm('⚠️ 警告：此操作将删除所有账户数据，包括：\n\n• 钱包私钥\n• 账户抽象数据\n• 指纹加密的密码\n• 交易历史\n\n此操作不可恢复！确定要继续吗？')) {
    return
  }
  
  // 三次确认
  if (!confirm('请再次确认：您确定要删除所有账户数据吗？\n\n删除后将无法恢复！')) {
    return
  }
  
  try {
    console.log('开始重置所有账户...')
    
    // 1. 删除钱包数据（wallet.ts中使用的key）
    await Preferences.remove({ key: 'my_secure_eth_wallet' })
    console.log('✅ 钱包数据已删除')
    
    // 2. 删除账户抽象数据（accountAbstraction.ts中使用的key）
    await Preferences.remove({ key: 'eoa_private_key' })
    await Preferences.remove({ key: 'abstract_account_address' })
    console.log('✅ 账户抽象数据已删除')
    
    // 3. 删除交易历史
    await Preferences.remove({ key: 'transaction_history' })
    console.log('✅ 交易历史已删除')
    
    // 4. 删除指纹加密的凭据
    try {
      await biometricService.deleteCredentials()
      console.log('✅ 指纹加密凭据已删除')
    } catch (error) {
      console.log('⚠️ 没有指纹凭据需要删除')
    }
    
    // 5. 清除其他可能的存储数据
    const allKeys = await Preferences.keys()
    console.log('存储中的所有键:', allKeys.keys)
    
    alert('✅ 所有账户数据已成功删除！\n\n您现在可以重新创建账户。')
    
    // 可选：刷新页面或跳转到首页
    if (confirm('是否返回首页？')) {
      router.push('/')
    }
    
  } catch (error: any) {
    console.error('重置账户失败:', error)
    alert('❌ 重置失败: ' + error.message)
  }
}

const updateFontSize = () => {
  // 更新字体大小
  document.documentElement.style.setProperty('--font-size', getFontSizeValue(selectedFontSize.value))
  localStorage.setItem('fontSize', selectedFontSize.value)
  console.log('字体大小已更新:', selectedFontSize.value)
}

const getFontSizeValue = (size: string) => {
  switch (size) {
    case 'small': return '14px'
    case 'medium': return '16px'
    case 'large': return '18px'
    case 'extra-large': return '20px'
    default: return '16px'
  }
}

const toggleDarkMode = () => {
  // 切换深色模式
  document.body.classList.toggle('dark-mode', darkMode.value)
  localStorage.setItem('darkMode', darkMode.value.toString())
  console.log('深色模式:', darkMode.value ? '开启' : '关闭')
}

const updateMedicationReminder = () => {
  localStorage.setItem('medicationReminder', medicationReminder.value.toString())
  console.log('用药提醒:', medicationReminder.value ? '开启' : '关闭')
}

const updateFamilyReminder = () => {
  localStorage.setItem('familyReminder', familyReminder.value.toString())
  console.log('家人关怀提醒:', familyReminder.value ? '开启' : '关闭')
}

const updateSystemNotification = () => {
  localStorage.setItem('systemNotification', systemNotification.value.toString())
  console.log('系统通知:', systemNotification.value ? '开启' : '关闭')
}

const clearCache = () => {
  // 清理缓存
  console.log('清理缓存')
  alert('缓存清理完成')
}

const exportData = () => {
  // 导出数据
  console.log('导出数据')
  alert('数据导出功能开发中')
}

const checkUpdate = () => {
  // 检查更新
  console.log('检查更新')
  alert('已是最新版本')
}

const resetSettings = () => {
  // 重置设置
  if (confirm('确定要恢复默认设置吗？')) {
    selectedFontSize.value = 'medium'
    darkMode.value = false
    medicationReminder.value = true
    familyReminder.value = true
    systemNotification.value = true
    
    // 重置所有设置
    localStorage.clear()
    updateFontSize()
    toggleDarkMode()
    updateMedicationReminder()
    updateFamilyReminder()
    updateSystemNotification()
    
    alert('设置已恢复为默认值')
  }
}

onMounted(() => {
  // 加载保存的设置
  const savedFontSize = localStorage.getItem('fontSize')
  const savedDarkMode = localStorage.getItem('darkMode')
  const savedMedicationReminder = localStorage.getItem('medicationReminder')
  const savedFamilyReminder = localStorage.getItem('familyReminder')
  const savedSystemNotification = localStorage.getItem('systemNotification')
  
  if (savedFontSize) selectedFontSize.value = savedFontSize
  if (savedDarkMode) darkMode.value = savedDarkMode === 'true'
  if (savedMedicationReminder) medicationReminder.value = savedMedicationReminder === 'true'
  if (savedFamilyReminder) familyReminder.value = savedFamilyReminder === 'true'
  if (savedSystemNotification) systemNotification.value = savedSystemNotification === 'true'
  
  // 应用设置
  updateFontSize()
  toggleDarkMode()
})
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #4299e1;
  cursor: pointer;
  padding: 8px;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.settings-content {
  padding: 20px;
}

.settings-section {
  margin-bottom: 25px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 15px 0;
  padding-left: 5px;
}

.setting-item {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.setting-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.setting-icon {
  font-size: 1.3rem;
  width: 30px;
  text-align: center;
}

.setting-content {
  flex: 1;
}

.setting-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 5px 0;
}

.setting-desc {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
}

.setting-control {
  display: flex;
  align-items: center;
}

.font-select {
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.9rem;
  color: #4a5568;
  cursor: pointer;
}

.font-select:focus {
  outline: none;
  border-color: #4299e1;
}

.setting-value {
  font-size: 0.9rem;
  color: #718096;
  font-weight: 500;
}

.setting-arrow {
  font-size: 1.2rem;
  color: #a0aec0;
  font-weight: 300;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

input:checked + .slider {
  background-color: #4299e1;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* 深色模式样式 */
:global(.dark-mode) {
  background-color: #1a202c;
  color: #e2e8f0;
}

:global(.dark-mode) .settings-page {
  background-color: #1a202c;
}

:global(.dark-mode) .header,
:global(.dark-mode) .setting-item {
  background-color: #2d3748;
}

:global(.dark-mode) .page-title,
:global(.dark-mode) .section-title,
:global(.dark-mode) .setting-title {
  color: #e2e8f0;
}

:global(.dark-mode) .setting-desc {
  color: #a0aec0;
}

/* 危险操作样式 */
.danger-item {
  border: 2px solid #fed7d7;
  background-color: #fff5f5;
}

.danger-item:hover {
  border-color: #fc8181;
  background-color: #fff5f5;
}

.danger-text {
  color: #e53e3e;
}

.danger-item .setting-desc {
  color: #c53030;
}

:global(.dark-mode) .danger-item {
  border: 2px solid #742a2a;
  background-color: #2d1515;
}

:global(.dark-mode) .danger-text {
  color: #fc8181;
}

:global(.dark-mode) .danger-item .setting-desc {
  color: #feb2b2;
}
</style>
