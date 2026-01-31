<template>
  <div class="home-page">
    <!-- 顶部问候区域 -->
    <div class="header">
      <div class="greeting">
        <div class="greeting-top">
          <h1 class="greeting-text">{{ greetingMessage }}，{{ userName }}</h1>
          <span class="user-role-badge" :class="userRole">{{ roleText }}</span>
        </div>
        <p class="date-text">{{ currentDate }}</p>
      </div>
      <div class="header-actions">
        <!-- 开发者入口 -->
        <button v-if="isDevelopment" class="dev-btn" @click="goToTestCenter" title="测试中心">
          <FlaskConical class="icon" />
        </button>
        
        <!-- 消息通知图标 -->
        <div class="notification-bell" @click="goToNotifications">
          <Bell class="bell-icon" />
          <div v-if="unreadCount > 0" class="badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </div>
          <div v-if="!isBackendOnline" class="offline-indicator" title="离线模式">
            <Wifi class="offline-icon" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 老人端：用药管理区域 -->
    <div v-if="isElderly" class="medication-section">
      <!-- Tab 切换 -->
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'today' }"
          @click="activeTab = 'today'"
        >
          <CheckCircle2 class="tab-icon" />
          <span class="tab-text">今日用药任务</span>
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'plans' }"
          @click="activeTab = 'plans'"
        >
          <Pill class="tab-icon" />
          <span class="tab-text">我的用药计划</span>
      </div>
    </div>

      <!-- 今日用药任务视图 -->
      <div v-show="activeTab === 'today'" class="tab-content">
        <!-- 任务统计 -->
      <div class="task-stats">
        <div class="stat-item">
          <span class="stat-number">{{ completedTasks }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ totalTasks }}</span>
          <span class="stat-label">总任务</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ remainingTasks }}</span>
          <span class="stat-label">待完成</span>
        </div>
      </div>
      
        <!-- 今日用药任务列表 -->
        <div class="section-header">
          <h2 class="section-title">今日用药</h2>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="todayTasks.length === 0" class="empty-state">
          <ClipboardList class="empty-icon" />
          <p class="empty-text">今日暂无用药任务</p>
          <button class="view-plans-btn" @click="activeTab = 'plans'">查看用药计划</button>
        </div>

        <div v-else class="tasks-list">
        <div
          v-for="task in todayTasks"
          :key="task.id"
          class="task-card"
            :class="{ completed: task.status === 'completed', error: task.error }"
        >
          <div class="task-time">{{ task.time }}</div>
          <div class="task-info">
            <h3 class="task-medication">{{ task.medication }}</h3>
            <p class="task-dosage">{{ task.dosage }}</p>
              <p v-if="task.instructions" class="task-instructions">
                <ClipboardList class="instruction-icon" />
                {{ task.instructions }}
              </p>
          </div>
          <div class="task-action">
            <button
                v-if="task.status === 'pending' && !task.error"
                @click="handleCheckIn(task)"
                class="checkin-btn"
                :class="{ disabled: !task.isTimeReached }"
                :disabled="task.checking || !task.isTimeReached"
                :title="!task.isTimeReached ? `${task.time} 后可打卡` : '点击打卡'"
              >
                {{ task.checking ? '打卡中...' : (task.isTimeReached ? '打卡' : '未到时间') }}
            </button>
              <div v-else-if="task.status === 'completed'" class="status-icon completed">
                ✓ 已完成
              </div>
              <div v-else-if="task.error" class="status-icon error">
                ⚠ 需在线
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的用药计划视图 -->
      <div v-show="activeTab === 'plans'" class="tab-content">
        <div class="section-header">
          <h2 class="section-title">用药计划列表</h2>
          <button class="refresh-btn" @click="loadPlans" title="刷新">
            <RefreshCw class="icon-small" />
          </button>
            </div>

        <div v-if="loadingPlans" class="loading-state">
          <div class="spinner"></div>
          <p>加载计划中...</p>
        </div>

        <div v-else-if="medicationPlans.length === 0" class="empty-state">
          <Pill class="empty-icon" />
          <p class="empty-text">暂无用药计划</p>
          <p class="empty-hint">等待医生为您创建用药计划</p>
        </div>

        <div v-else class="plans-list">
          <div
            v-for="plan in medicationPlans"
            :key="plan.plan_id"
            class="plan-card"
            @click="goToPlanDetail(plan.plan_id)"
          >
            <div class="plan-header">
              <Pill class="plan-icon" />
              <div class="plan-info">
                <h3 class="plan-title">用药计划 #{{ plan.plan_id.slice(-6) }}</h3>
                <p class="plan-doctor">医生: {{ shortAddress(plan.doctor_address) }}</p>
            </div>
              <div class="plan-status" :class="plan.status">
                {{ plan.status === 'active' ? '进行中' : '已结束' }}
              </div>
            </div>
            <div class="plan-footer">
              <span class="plan-date">{{ formatDate(plan.created_at) }}</span>
              <span class="plan-arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 医生/家属专属区域 -->
    <div v-else-if="isDoctor || isGuardian" class="role-specific-section">
      <div class="section-header">
        <h2 class="section-title">
          <component :is="isDoctor ? Stethoscope : Users" class="title-icon" />
          {{ isDoctor ? '患者管理' : '老人管理' }}
        </h2>
      </div>
      
      <!-- 医生专属：用药计划管理 -->
      <div v-if="isDoctor" class="quick-action-cards">
        <div class="action-card medication-card" @click="goToMedicationPlans">
          <Pill class="card-icon" />
          <div class="card-content">
            <h3 class="card-title">用药计划</h3>
            <p class="card-desc">创建和管理患者用药计划</p>
          </div>
          <div class="card-arrow">→</div>
        </div>
      </div>
      
      <div class="quick-patients" @click="goToMyPatients">
        <div class="patients-card">
          <div class="patients-icon-wrapper">
            <component :is="isDoctor ? Stethoscope : Users" class="patients-icon" />
            <div class="icon-glow"></div>
          </div>
          <div class="patients-content">
            <h3 class="patients-title">我的{{ isDoctor ? '患者' : '家人' }}</h3>
            <p class="patients-desc">查看和管理{{ isDoctor ? '患者信息' : '老人健康状况' }}</p>
            <button class="view-all-btn">
              <span>立即查看</span>
              <span class="btn-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 快捷操作区域 -->
    <div class="quick-actions">
      <button class="action-btn" @click="goToScanner">
        <Camera class="action-icon" />
        <span>扫码</span>
      </button>
      <button class="action-btn" @click="goToMigration">
        <Smartphone class="action-icon" />
        <span>迁移</span>
      </button>
      <button class="action-btn" @click="goToSettings">
        <Settings class="action-icon" />
        <span>设置</span>
      </button>
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/service/auth'
import { aaService } from '@/service/accountAbstraction'
import { notificationService } from '@/service/notification'
import { unreadCount, notificationBadgeService } from '@/service/notificationBadge'
import { medicationPlanStorageService } from '@/service/medicationPlanStorage'
import { checkinStorageService } from '@/service/checkinStorage'
import { medicationService } from '@/service/medication'
import { secureExchangeService } from '@/service/secureExchange'
import { medicationReminderScheduler } from '@/service/medicationReminderScheduler'
import { zkpService } from '@/service/zkp'
import { uiService } from '@/service/ui'
import type { MedicationPlan } from '@/service/medication'
import BottomNav from '@/components/BottomNav.vue'
import { API_GATEWAY_URL } from '@/config/api.config'
import { 
  FlaskConical, 
  Bell, 
  Wifi, 
  CheckCircle2, 
  Pill, 
  RefreshCw, 
  ClipboardList, 
  Stethoscope, 
  Users, 
  Camera, 
  Smartphone, 
  Settings 
} from 'lucide-vue-next'

const router = useRouter()

// 用户信息
const userName = ref('用户')
const userRole = ref<'elderly' | 'doctor'>('elderly')
const userRoles = ref<string[]>([])

// 角色判断
const isElderly = computed(() => userRoles.value.includes('elderly'))
const isDoctor = computed(() => userRoles.value.includes('doctor'))
const isGuardian = computed(() => userRoles.value.includes('guardian'))

// 开发环境检测
const isDevelopment = ref(import.meta.env.DEV)
const isBackendOnline = ref(false)

// Tab 状态
const activeTab = ref<'today' | 'plans'>('today')

// 加载状态
const loading = ref(false)
const loadingPlans = ref(false)

// 用药计划列表
const medicationPlans = ref<MedicationPlan[]>([])

// 任务统计
const completedTasks = ref(0)
const totalTasks = ref(0)
const remainingTasks = computed(() => totalTasks.value - completedTasks.value)

// 角色相关
const roleText = computed(() => {
  if (userRoles.value.includes('elderly')) return '老人'
  if (userRoles.value.includes('doctor')) return '医生'
  if (userRoles.value.includes('guardian')) return '家属'
  return '用户'
})

// 问候语
const greetingMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

// 今日用药任务
const todayTasks = ref<any[]>([])

const currentDate = ref('')

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

const getCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const date = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[now.getDay()]
  
  currentDate.value = `${year}年${month}月${date}日 ${weekday}`
}

// 打卡处理函数
const handleCheckIn = async (task: any) => {
  try {
    task.checking = true
    console.log('🔐 开始打卡:', task.medication)
    
    // 1. 获取用户信息
    const user = await authService.getUserInfo()
    const wallet = await aaService.getEOAWallet()
    
    if (!user || !wallet) {
      throw new Error('无法获取用户信息')
    }
    
    // 2. 生成 ZKP 证明（包含 calldata）
    console.log('  生成ZKP证明...')
    const userIdSalt = zkpService.generateSalt()
    const medicationSalt = zkpService.generateSalt()
    
    const zkpResult = await zkpService.generateMedicalProof({
      userId: user.smart_account,
      medicationCode: task.medicationCode,
      userIdSalt,
      medicationSalt,
    })
    
    console.log('  ✅ ZKP证明生成成功')
    console.log('  Calldata:', zkpResult.calldata)
    
    // 3. 直接保存到本地存储（不需要前端验证）
    // 验证会在后端进行，如周总结、奖励发放等场景
    console.log('  保存打卡记录到本地...')
    
    // 创建打卡记录（已包含ZKP证明）
    const checkinRecord: any = {
      id: `checkin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      user_address: user.smart_account,
      medication_code: task.medicationCode,
      medication_name: task.medication,
      dosage: task.dosage,
      plan_id: task.planId, // 关联计划ID
      timestamp: Date.now(), // 毫秒时间戳（数字类型）
      
      // ZKP 相关数据
      user_id_salt: userIdSalt,
      medication_salt: medicationSalt,
      user_id_commitment: zkpResult.userIdCommitment,
      medication_commitment: zkpResult.medicationCommitment,
      checkin_commitment: zkpResult.checkinCommitment,
      zkp_proof: zkpResult.proof, // 匹配 CheckInRecord 类型
      zkp_public_signals: zkpResult.publicSignals, // 匹配 CheckInRecord 类型
      
      // 验证状态（等待后端验证）
      verified: false,
      synced: false, // 是否已同步到后端
    }
    
    await checkinStorageService.saveCheckInRecord(checkinRecord)
    console.log('  ✅ 打卡记录已保存到本地')
    
    // 4. 刷新任务列表（从本地存储重新加载，确保状态一致）
    await loadTodayTasks()
    
    // 显示成功提示
    uiService.toast(`✅ ${task.medication} 打卡成功！`, { type: 'success' })
    
  } catch (error: any) {
    console.error('❌ 打卡失败:', error)
    uiService.toast(`打卡失败: ${error.message}`, { type: 'error' })
  } finally {
    task.checking = false
  }
}

// 加载今日用药任务（从本地打卡记录和用药计划中生成）
const loadTodayTasks = async () => {
  try {
    loading.value = true
    console.log('🔍 === 开始加载今日用药任务 ===')
    
    // 1. 获取今天的打卡记录
    const allRecords = await checkinStorageService.getAllRecords()
    const today = new Date().toDateString()
    console.log(`📋 打卡记录数量: ${allRecords.length}`)
    console.log(`📅 今天日期: ${today}`)
    
    // 2. 获取活跃的用药计划
    const plans = await medicationPlanStorageService.getActivePlans()
    console.log(`💊 活跃用药计划数量: ${plans.length}`)
    if (plans.length === 0) {
      console.warn('⚠️ 没有找到活跃的用药计划！')
      todayTasks.value = []
      totalTasks.value = 0
      completedTasks.value = 0
      loading.value = false
      return
    }
    
    // 3. 解密计划并提取药物信息
    const tasks: any[] = []
    const wallet = await aaService.getEOAWallet()
    
    if (!wallet) {
      console.warn('⚠️ 无法获取钱包，跳过解密')
      loading.value = false
      return
    }
    console.log('✅ 钱包已获取')
    
    for (const plan of plans) {
      try {
        console.log(`\n📦 处理计划: ${plan.plan_id}`)
        console.log(`  - 医生地址: ${plan.doctor_address}`)
        
        // 获取医生公钥
        const doctorPublicKey = await secureExchangeService.getRecipientPublicKey(
          plan.doctor_address
        )
        console.log(`  ✅ 获取医生公钥成功`)
        
        // 解密计划数据
        const planData = await medicationService.decryptPlanData(
          plan.encrypted_plan_data,
          wallet.privateKey,
          doctorPublicKey
        )
        
        console.log('  ✅ 解密成功:', planData)
        
        // 提取药物列表和提醒
        const medications = planData.medications || []
        const reminders = planData.reminders || []
        
        console.log(`  - 药物数量: ${medications.length}`)
        console.log(`  - 提醒数量: ${reminders.length}`)
        
        // 为每个提醒创建任务
        for (const reminder of reminders) {
          // 查找对应的药物信息
          const med = medications.find(m => m.medication_code === reminder.medication_code)
          
          if (med) {
            // 提取时间（格式：08:00:00 -> 08:00）
            const time = reminder.reminder_time.slice(0, 5)
            const taskId = `${plan.plan_id}_${med.medication_code}_${time}`
            
            // 检查是否已打卡（根据药物代码、计划ID和今日）
            // 注意：打卡记录会包含 plan_id 字段
            const isCompleted = allRecords.some(record => {
              const recordDate = new Date(record.timestamp).toDateString()
              const recordHasValidPlanId = record.plan_id === plan.plan_id || !record.plan_id // 兼容旧记录
              return (
                recordDate === today &&
                record.medication_code === med.medication_code &&
                recordHasValidPlanId
              )
            })
            
            // 检查是否到达打卡时间
            const now = new Date()
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
            const isTimeReached = currentTime >= time
            
            console.log(`    ➕ 添加任务: ${med.medication_name} at ${time} (${isCompleted ? '已完成' : '待完成'})`)
            
            tasks.push({
              id: taskId,
              time: time,
              medication: med.medication_name || med.medication_code,
              dosage: med.dosage || '按医嘱',
              instructions: med.instructions || planData.notes || '',
              planId: plan.plan_id,
              medicationCode: med.medication_code,
              status: isCompleted ? 'completed' : 'pending',
              isTimeReached: isTimeReached, // 是否到达打卡时间
            })
          } else {
            console.warn(`    ⚠️ 未找到药物代码 ${reminder.medication_code} 对应的药物信息`)
          }
        }
      } catch (error: any) {
        console.error(`  ❌ 解密计划失败 ${plan.plan_id}:`, error.message)
        console.error(`  错误详情:`, error)
        // 如果解密失败，显示简化信息
        tasks.push({
          id: plan.plan_id,
          time: '00:00',
          medication: `计划 #${plan.plan_id.slice(-6)}`,
          dosage: '需要在线查看',
          instructions: '请先在线同步以解密计划详情',
          planId: plan.plan_id,
          status: 'pending',
          error: true
        })
      }
    }
    
    // 4. 按时间排序
    tasks.sort((a, b) => {
      if (a.time < b.time) return -1
      if (a.time > b.time) return 1
      return 0
    })
    
    todayTasks.value = tasks
    totalTasks.value = tasks.length
    completedTasks.value = tasks.filter(t => t.status === 'completed').length

    await medicationReminderScheduler.scheduleTasks(tasks)
    
    console.log(`\n✅ === 今日任务加载完成 ===`)
    console.log(`📊 统计: 总任务 ${tasks.length} 个，已完成 ${completedTasks.value} 个，待完成 ${tasks.length - completedTasks.value} 个`)
    console.log(`📝 任务列表:`, tasks)
  } catch (error) {
    console.error('❌ 加载今日任务失败:', error)
  } finally {
    loading.value = false
  }
}

// 更新任务的时间状态（用于定时器）
const updateTaskTimeStatus = () => {
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  // 更新所有待完成任务的时间状态
  todayTasks.value.forEach(task => {
    if (task.status === 'pending' && !task.error) {
      const isTimeReached = currentTime >= task.time
      if (task.isTimeReached !== isTimeReached) {
        task.isTimeReached = isTimeReached
        console.log(`⏰ 任务 ${task.medication} (${task.time}) 时间状态更新:`, isTimeReached ? '可以打卡' : '未到时间')
      }
    }
  })
}

// 加载用药计划
const loadPlans = async () => {
  try {
    loadingPlans.value = true
    const plans = await medicationPlanStorageService.getAllPlans()
    medicationPlans.value = plans
    console.log(`✅ 用药计划加载完成: ${plans.length} 个计划`)
  } catch (error) {
    console.error('❌ 加载用药计划失败:', error)
  } finally {
    loadingPlans.value = false
  }
}

// 页面跳转
const goToScanner = () => {
  router.push('/qr-scanner')
}

const goToSettings = () => {
  router.push('/settings')
}

const goToNotifications = () => {
  router.push('/notifications')
}

const goToMyPatients = () => {
  router.push('/my-patients')
}

const goToMedicationPlans = () => {
  router.push('/doctor/medication-plans')
}

const goToMigration = () => {
  router.push('/account-migration')
}

const goToTestCenter = () => {
  router.push('/test-center')
}

const goToPlanDetail = (planId: string) => {
  router.push(`/medication/plan/${planId}`)
}

// 缩短地址显示
const shortAddress = (address: string) => {
  if (!address) return '未设置'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const userInfo = await authService.getUserInfo()
    if (userInfo) {
      userName.value = userInfo.username || '用户'
      userRoles.value = userInfo.roles || []
      if (userInfo.roles && userInfo.roles.length > 0) {
        userRole.value = userInfo.roles[0] as 'elderly' | 'doctor'
      }
    }
    
    isBackendOnline.value = await aaService.isBackendLoggedIn()
    
    console.log('用户信息加载完成:', {
      userName: userName.value,
      roles: userRoles.value,
      isOnline: isBackendOnline.value
    })
  } catch (error) {
    console.error('加载用户信息失败:', error)
    userName.value = '用户'
    userRole.value = 'elderly'
  }
}

// 定时器ID
let timeCheckInterval: any = null

onMounted(async () => {
  getCurrentDate()
  await loadUserInfo()
  
  // 老人端加载数据
  if (isElderly.value) {
    await loadPlans()
    await loadTodayTasks()
    
    // 启动定时器，每分钟检查一次时间，更新按钮状态
    timeCheckInterval = setInterval(() => {
      updateTaskTimeStatus()
    }, 60000) // 每分钟检查一次
  }
  
  // 连接WebSocket以实时接收通知
  try {
    console.log('启动通知服务...')
    await notificationService.connect()
    console.log('✅ 通知服务已启动')
  } catch (error) {
    console.error('启动通知服务失败:', error)
  }
  
  // 启动通知红点服务
  try {
    notificationBadgeService.startPolling()
    notificationBadgeService.listenForNewNotifications()
    console.log('✅ 通知红点服务已启动')
  } catch (error) {
    console.error('启动通知红点服务失败:', error)
  }
})

onBeforeUnmount(() => {
  notificationBadgeService.stopPolling()
  
  // 清理定时器
  if (timeCheckInterval) {
    clearInterval(timeCheckInterval)
    timeCheckInterval = null
  }
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.home-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 90px;
  width: 100%;
  overflow-x: hidden;
}

.header {
  background: #667eea;
  color: white;
  padding: 24px 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-radius: 0 0 30px 30px;
  box-shadow: 0 10px 30px -10px rgba(102, 126, 234, 0.5);
  margin-bottom: -20px;
  position: relative;
  z-index: 10;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dev-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.greeting {
  flex: 1;
  min-width: 0;
}

.greeting-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.greeting-text {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  color: white;
}

.date-text {
  font-size: 1rem;
  opacity: 0.95;
  margin: 0;
  color: rgba(255, 255, 255, 0.95);
}

.user-role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  color: white;
}

.notification-bell {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.notification-bell:hover {
  transform: scale(1.05);
  background-color: rgba(255,255,255,0.35);
}

.bell-icon {
  width: 28px;
  height: 28px;
  color: white;
}

.notification-bell .badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 20px;
  height: 20px;
  background: #e53e3e;
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(229, 62, 62, 0.4);
}

.offline-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  background-color: #fc8181;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.offline-icon {
  width: 14px;
  height: 14px;
  color: white;
}

/* Tab 切换 */
.medication-section {
  padding: 16px;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
  background: white;
  padding: 6px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  background: transparent;
  color: #4b5563;
  font-weight: 500;
}

.tab.active {
  background: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.tab-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.tab-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 任务统计 */
.task-stats {
  display: flex;
  justify-content: space-around;
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-item .stat-label {
  display: block;
  font-size: 0.9rem;
  color: #4b5563;
  font-weight: 500;
}

.st.action-icon {
  width: 28px;
  height: 28px;
  color: #667eea;
  margin-bottom: 6px;
  flex-shrink: 0;
}

/* 区块标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}


.title-icon {
  width: 24px;
  height: 24px;
  color: #667eea;
}

.history-btn, .refresh-btn {
  background: #667eea;
  color: white;
  border: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.history-btn:hover, .refresh-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
}

/* 加载和空状态 */
.loading-state, .empty-state {
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #cbd5e0;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.1rem;
  color: #718096;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 0.9rem;
  color: #a0aec0;
  margin: 0 0 20px 0;
}

.view-plans-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.view-plans-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
}

/* 任务列表 */
.tasks-list, .plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.task-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #cbd5e0;
  transition: background 0.3s;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
}

.task-card.completed {
  background: #f0fff4;
  border-color: #c6f6d5;
}

.task-card.completed::before {
  background: #48bb78;
}

.task-card.error {
  background: #fff5f5;
  border-color: #fed7d7;
}

.task-card.error::before {
  background: #f56565;
}
.task-time {
  font-size: 1rem;
  font-weight: 600;
  color: #667eea;
  min-width: 50px;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-medication {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.task-dosage {
  font-size: 0.85rem;
  color: #718096;
  margin: 0 0 4px 0;
}

.task-instructions {
  font-size: 0.85rem;
  color: #718096;
  margin-top: 8px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: #f7fafc;
  padding: 8px 12px;
  border-radius: 8px;
  line-height: 1.4;
}

.instruction-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 3px;
  color: #a0aec0;
}

.task-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkin-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.4);
}

.checkin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 8px -1px rgba(102, 126, 234, 0.5);
}

.checkin-btn:active:not(:disabled) {
  transform: scale(0.95);
}

/* 未到时间的禁用状态 */
.checkin-btn.disabled,
.checkin-btn:disabled {
  background: #cbd5e1;
  color: #2d3748;
  cursor: not-allowed;
  opacity: 0.8;
  box-shadow: 0 2px 4px rgba(148, 163, 184, 0.2);
  transform: none !important;
  font-weight: 600;
}

.status-icon {
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-icon.completed {
  background: #10b981;
  color: white;
}

.status-icon.error {
  background: #ef4444;
  color: white;
}

/* 用药计划卡片 */
.plan-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #667eea;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.plan-icon {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.plan-info {
  flex: 1;
}

.plan-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.plan-doctor {
  font-size: 0.85rem;
  color: #718096;
  margin: 0;
  font-family: 'Courier New', monospace;
}

.plan-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.plan-status.active {
  background-color: #c6f6d5;
  color: #2f855a;
}

.plan-status.inactive {
  background-color: #e2e8f0;
  color: #718096;
}

.plan-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.plan-date {
  font-size: 0.85rem;
  color: #a0aec0;
}

.plan-arrow {
  color: #667eea;
  font-size: 1.2rem;
}

/* 角色专属区域（医生/家属）*/
.role-specific-section {
  padding: 20px;
}

.quick-action-cards {
  margin-bottom: 20px;
}

.action-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.action-card.medication-card {
  background: #f0f9ff;
  border-color: rgba(56, 189, 248, 0.2);
}

.action-card.medication-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.2);
}

.action-card .card-icon {
  width: 48px;
  height: 48px;
  background: #fef3c7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #92400e;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);
}

.action-card .card-content {
  flex: 1;
}

.action-card .card-title {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0c4a6e;
}

.action-card .card-desc {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.action-card .card-arrow {
  font-size: 1.5rem;
  color: #0ea5e9;
  flex-shrink: 0;
  transition: transform 0.3s;
}

.action-card:hover .card-arrow {
  transform: translateX(4px);
}

.quick-patients {
  background: #ffffff;
  border-radius: 24px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.quick-patients:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
}

.patients-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.patients-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.patients-icon {
  width: 48px;
  height: 48px;
  color: white;
  z-index: 1;
}

.icon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #667eea;
  opacity: 0.2;
  filter: blur(20px);
}

.patients-content {
  flex: 1;
}

.patients-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.patients-desc {
  font-size: 0.95rem;
  color: #718096;
  margin: 0 0 16px 0;
}

.view-all-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.view-all-btn:hover {
  transform: translateX(4px);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
}

.btn-arrow {
  font-size: 1.2rem;
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  justify-content: flex-start;
  padding: 16px;
  gap: 10px;
}

.action-btn {
  background-color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex: 1;
  min-width: 70px;
  max-width: 90px;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-icon {
  font-size: 1.3rem;
}

.action-btn span {
  font-size: 0.85rem;
  color: #4a5568;
  font-weight: 500;
}
</style>
