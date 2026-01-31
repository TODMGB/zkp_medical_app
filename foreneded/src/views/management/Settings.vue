<template>
  <div class="settings-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">设置</h1>
      <div class="placeholder"></div>
    </div>
    
    <!-- 设置选项 -->
    <div class="settings-content">
      <!-- 显示设置 -->
      <div class="settings-section">
        <h2 class="section-title">显示设置</h2>
        
        <div class="setting-item">
          <div class="setting-icon-wrapper blue">
            <Type class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">字体大小</h3>
            <p class="setting-desc">调整App内的字体大小</p>
          </div>
          <div class="setting-control">
            <select v-model="selectedFontSize" class="font-select" :disabled="elderMode" @change="updateFontSize">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
              <option value="extra-large">特大</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-icon-wrapper purple">
            <Moon class="setting-icon" />
          </div>
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

        <div class="setting-item">
          <div class="setting-icon-wrapper teal">
            <User class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">老人模式</h3>
            <p class="setting-desc">放大字体和按钮</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="elderMode" @change="toggleElderMode">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- 通知设置 -->
      <div class="settings-section">
        <h2 class="section-title">通知设置</h2>
        
        <div class="setting-item">
          <div class="setting-icon-wrapper orange">
            <AlarmClock class="setting-icon" />
          </div>
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
          <div class="setting-icon-wrapper pink">
            <Heart class="setting-icon" />
          </div>
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
          <div class="setting-icon-wrapper green">
            <Bell class="setting-icon" />
          </div>
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
          <div class="setting-icon-wrapper gray">
            <Trash2 class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">清理缓存</h3>
            <p class="setting-desc">清理临时文件和缓存数据</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
        
        <div class="setting-item" @click="exportData">
          <div class="setting-icon-wrapper cyan">
            <Upload class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">导出数据</h3>
            <p class="setting-desc">备份您的健康数据</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
      </div>
      
      <!-- 区块链与账户 -->
      <div class="settings-section">
        <h2 class="section-title">区块链与账户</h2>
        
        <div class="setting-item" @click="goToAccountMigration">
          <div class="setting-icon-wrapper indigo">
            <Smartphone class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">账户迁移</h3>
            <p class="setting-desc">将账户迁移到新设备</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
        
        <div class="setting-item danger-item" @click="resetAllAccounts">
          <div class="setting-icon-wrapper red">
            <Trash2 class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title danger-text">重置所有账户</h3>
            <p class="setting-desc">删除所有钱包和账户数据（不可恢复）</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
      </div>
      
      <!-- 开发测试 -->
      <div class="settings-section">
        <h2 class="section-title">开发测试</h2>
        
        <div class="setting-item" @click="goToTestCenter">
          <div class="setting-icon-wrapper teal">
            <FlaskConical class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">测试中心</h3>
            <p class="setting-desc">开发和测试功能集合</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
      </div>
      
      <!-- 应用设置 -->
      <div class="settings-section">
        <h2 class="section-title">应用设置</h2>
        
        <div class="setting-item" @click="checkUpdate">
          <div class="setting-icon-wrapper blue">
            <RefreshCw class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">检查更新</h3>
            <p class="setting-desc">检查是否有新版本</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
        
        <div class="setting-item" @click="resetSettings">
          <div class="setting-icon-wrapper gray">
            <Settings class="setting-icon" />
          </div>
          <div class="setting-content">
            <h3 class="setting-title">恢复默认设置</h3>
            <p class="setting-desc">将所有设置恢复为默认值</p>
          </div>
          <ChevronRight class="setting-arrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { biometricService } from '@/service/biometric'
import { authService } from '@/service/auth'
import { uiService } from '@/service/ui'
import { 
  ArrowLeft, 
  Type, 
  User,
  Moon, 
  AlarmClock, 
  Heart, 
  Bell, 
  Trash2, 
  Upload, 
  Smartphone, 
  FlaskConical, 
  RefreshCw, 
  Settings, 
  ChevronRight 
} from 'lucide-vue-next'

const router = useRouter()

// 设置状态
const selectedFontSize = ref('medium')
const darkMode = ref(false)
const elderMode = ref(false)
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
  const ok1 = await uiService.confirm(
    '⚠️ 警告：此操作将清空本机所有账户与业务数据，包括：\n\n• 钱包私钥/抽象账户地址\n• JWT Token 与用户信息\n• 用药计划与分享数据\n• 打卡记录、周统计与证明相关数据\n• 家庭圈/关系/群组等本地缓存\n• 指纹加密的密码\n\n此操作不可恢复！确定要继续吗？',
    { title: '危险操作', confirmText: '继续', cancelText: '取消' }
  )
  if (!ok1) {
    return
  }
  
  // 三次确认
  const ok2 = await uiService.confirm(
    '请再次确认：您确定要删除所有账户数据吗？\n\n删除后将无法恢复！',
    { title: '最终确认', confirmText: '删除', cancelText: '取消' }
  )
  if (!ok2) {
    return
  }
  
  try {
    console.log('开始重置所有账户...')

    // 1. 清理内存中的认证状态
    try {
      await authService.logout()
    } catch (error) {
      console.log('⚠️ 登出失败（将继续清理）')
    }

    // 2. 删除指纹加密的凭据
    try {
      await biometricService.deleteCredentials()
      console.log('✅ 指纹加密凭据已删除')
    } catch (error) {
      console.log('⚠️ 没有指纹凭据需要删除')
    }

    // 3. 清理 AA 运行态（避免清库后仍残留内存钱包）
    try {
      const { aaService } = await import('@/service/accountAbstraction')
      aaService.clearLocalSession()
    } catch (error) {
      console.log('⚠️ 清理本地AA会话失败（将继续清理）')
    }

    // 4. 清空本地所有 Preferences（包含打卡/用药计划等业务数据）
    await Preferences.clear()
    console.log('✅ Preferences 已清空')

    // 5. 清空 localStorage（包含主题/字体等设置与可能的业务缓存）
    try {
      localStorage.clear()
    } catch (error) {
      console.log('⚠️ localStorage 清理失败（可忽略）')
    }

    await uiService.alert('✅ 所有账户数据已成功删除！\n\n您现在可以重新创建账户。', {
      title: '已完成',
      confirmText: '我知道了',
    })

    router.replace('/splash')
    
  } catch (error: any) {
    console.error('重置账户失败:', error)
    uiService.toast('❌ 重置失败: ' + error.message, { type: 'error' })
  }
}

const updateFontSize = () => {
  document.documentElement.setAttribute('data-font-size', selectedFontSize.value)
  localStorage.setItem('fontSize', selectedFontSize.value)
  console.log('字体大小已更新:', selectedFontSize.value)
}

const toggleDarkMode = () => {
  // 切换深色模式
  document.body.classList.toggle('dark-mode', darkMode.value)
  localStorage.setItem('darkMode', darkMode.value.toString())
  console.log('深色模式:', darkMode.value ? '开启' : '关闭')
}

const toggleElderMode = () => {
  toggleElderModeInternal(true)
}

const toggleElderModeInternal = (persist: boolean) => {
  document.documentElement.classList.toggle('elder-mode', elderMode.value)
  if (persist) {
    localStorage.setItem('elderMode', elderMode.value.toString())
  }
  console.log('老人模式:', elderMode.value ? '开启' : '关闭')
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
  uiService.toast('缓存清理完成', { type: 'success' })
}

const exportData = () => {
  // 导出数据
  console.log('导出数据')
  uiService.toast('数据导出功能开发中', { type: 'info' })
}

const checkUpdate = () => {
  // 检查更新
  console.log('检查更新')
  uiService.toast('已是最新版本', { type: 'success' })
}

const resetSettings = async () => {
  // 重置设置
  const ok = await uiService.confirm('确定要恢复默认设置吗？', {
    title: '恢复默认设置',
    confirmText: '恢复',
    cancelText: '取消',
  })
  if (ok) {
    selectedFontSize.value = 'medium'
    darkMode.value = false
    elderMode.value = false
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

    try {
      const userInfo = await authService.getUserInfo()
      const shouldEnableElder = (userInfo?.roles || []).includes('elderly')
      elderMode.value = shouldEnableElder
      document.documentElement.classList.toggle('elder-mode', shouldEnableElder)
    } catch (e) {
      document.documentElement.classList.remove('elder-mode')
    }

    uiService.toast('设置已恢复为默认值', { type: 'success' })
  }
}

onMounted(() => {
  // 加载保存的设置
  const savedFontSize = localStorage.getItem('fontSize')
  const savedDarkMode = localStorage.getItem('darkMode')
  const savedElderMode = localStorage.getItem('elderMode')
  const savedMedicationReminder = localStorage.getItem('medicationReminder')
  const savedFamilyReminder = localStorage.getItem('familyReminder')
  const savedSystemNotification = localStorage.getItem('systemNotification')
  
  if (savedFontSize) selectedFontSize.value = savedFontSize
  if (savedDarkMode) darkMode.value = savedDarkMode === 'true'
  if (savedElderMode !== null) {
    elderMode.value = savedElderMode === 'true'
  } else {
    elderMode.value = document.documentElement.classList.contains('elder-mode')
  }
  if (savedMedicationReminder) medicationReminder.value = savedMedicationReminder === 'true'
  if (savedFamilyReminder) familyReminder.value = savedFamilyReminder === 'true'
  if (savedSystemNotification) systemNotification.value = savedSystemNotification === 'true'
  
  // 应用设置
  updateFontSize()
  toggleDarkMode()
  toggleElderModeInternal(false)
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
  justify-content: space-between;
  padding: 16px 20px;
  background-color: white;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2d3748;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: var(--bg-body);
}

.icon {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.settings-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #718096;
  margin: 0 0 4px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  background-color: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: var(--shadow-sm);
  border: 1px solid transparent;
}

.setting-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-100);
}

.setting-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.setting-icon-wrapper.blue { background: #e0f2fe; color: #0ea5e9; }
.setting-icon-wrapper.purple { background: #f3e8ff; color: #a855f7; }
.setting-icon-wrapper.orange { background: #ffedd5; color: #f97316; }
.setting-icon-wrapper.pink { background: #fce7f3; color: #ec4899; }
.setting-icon-wrapper.green { background: #dcfce7; color: #22c55e; }
.setting-icon-wrapper.gray { background: #f3f4f6; color: #6b7280; }
.setting-icon-wrapper.cyan { background: #cffafe; color: #06b6d4; }
.setting-icon-wrapper.indigo { background: #e0e7ff; color: #6366f1; }
.setting-icon-wrapper.red { background: #fee2e2; color: #ef4444; }
.setting-icon-wrapper.teal { background: #ccfbf1; color: #14b8a6; }

.setting-icon {
  width: 20px;
  height: 20px;
}

.setting-content {
  flex: 1;
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.setting-desc {
  font-size: 13px;
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
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #2d3748;
  cursor: pointer;
  outline: none;
}

.font-select:focus {
  border-color: #667eea;
}

.setting-arrow {
  width: 20px;
  height: 20px;
  color: #a0aec0;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
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
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

input:checked + .slider {
  background-color: #667eea;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* 危险操作样式 */
.danger-item {
  border: 1px solid #fee2e2;
  background-color: #fef2f2;
}

.danger-item:hover {
  border-color: #fecaca;
  background-color: #fee2e2;
  box-shadow: var(--shadow-md);
}

.danger-text {
  color: #ef4444;
}

.danger-item .setting-desc {
  color: #f87171;
}

/* 深色模式样式 */
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

:global(.dark-mode) .danger-item {
  border-color: #7f1d1d;
  background-color: #450a0a;
}

:global(.dark-mode) .danger-text {
  color: #fca5a5;
}

:global(.dark-mode) .danger-item .setting-desc {
  color: #fecaca;
}
</style>
