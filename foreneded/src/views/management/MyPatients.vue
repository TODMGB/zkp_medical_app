<template>
  <div class="my-patients-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">{{ pageTitle }}</h1>
      <button class="refresh-btn" @click="loadRelationships" :disabled="isLoading">
        <RefreshCw class="icon" :class="{ 'spin': isLoading }" />
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading && relationships.length === 0" class="loading-container">
      <Loader2 class="spinner" />
      <p>加载中...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage && !isLoading" class="error-banner">
      <AlertTriangle class="error-icon" />
      <span>{{ errorMessage }}</span>
    </div>
    
    <!-- 空状态 -->
    <div v-if="!isLoading && relationships.length === 0 && !errorMessage" class="empty-state">
      <Inbox class="empty-icon" />
      <h3 class="empty-title">暂无关系</h3>
      <p class="empty-desc">{{ emptyMessage }}</p>
    </div>
    
    <!-- 关系列表 -->
    <div v-if="relationships.length > 0" class="relationships-container">
      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ activeCount }}</div>
          <div class="stat-label">活跃</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ suspendedCount }}</div>
          <div class="stat-label">暂停</div>
        </div>
      </div>
      
      <!-- 筛选器 -->
      <div class="filter-section">
        <div class="select-wrapper">
          <select v-model="filterStatus" class="filter-select">
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="suspended">已暂停</option>
            <option value="revoked">已撤销</option>
          </select>
          <ChevronDown class="select-arrow" />
        </div>
        
        <div class="select-wrapper">
          <select v-model="filterGroupType" class="filter-select">
            <option value="all">全部类型</option>
            <option value="FAMILY_PRIMARY">家人</option>
            <option value="PRIMARY_DOCTOR">主治医生</option>
            <option value="HEALTHCARE_TEAM">医护团队</option>
            <option value="EMERGENCY_CONTACT">紧急联系人</option>
            <option value="THERAPIST">康复师</option>
            <option value="CUSTOM">自定义</option>
          </select>
          <ChevronDown class="select-arrow" />
        </div>
      </div>
      
      <!-- 关系卡片列表 -->
      <div class="relationships-list">
        <div
          v-for="relationship in filteredRelationships"
          :key="relationship.id"
          class="relationship-card"
          :class="{ 'inactive': relationship.status !== 'active' }"
          @click="viewRelationshipDetail(relationship)"
        >
          <!-- 左侧图标 -->
          <div class="card-icon-wrapper" :class="getGroupColorClass(relationship.group_type)">
            <component :is="getGroupIcon(relationship.group_type)" class="card-icon" />
          </div>
          
          <!-- 中间信息 -->
          <div class="card-content">
            <div class="card-header">
              <h3 class="owner-name">
                {{ getMemberDisplayName(getOwnerAddress(relationship)) }}
              </h3>
              <span v-if="remarks[getOwnerAddress(relationship)]" class="remark-badge">
                <FileText class="icon-mini" /> {{ remarks[getOwnerAddress(relationship)] }}
              </span>
            </div>
            <div class="owner-address-sub">
              {{ formatAddress(getOwnerAddress(relationship)) }}
            </div>
            
            <div class="card-meta">
              <span class="group-badge" :class="`type-${relationship.group_type}`">
                {{ relationship.access_group_name }}
              </span>
              <span class="status-badge" :class="`status-${relationship.status}`">
                {{ getStatusText(relationship.status) }}
              </span>
            </div>
            
            <div class="card-footer">
              <span class="date-info">
                加入: {{ formatDate(relationship.joined_at) }}
              </span>
              <span v-if="relationship.last_accessed_at" class="date-info">
                访问: {{ formatDate(relationship.last_accessed_at) }}
              </span>
            </div>
            
            <!-- 权限标签 -->
            <div v-if="relationship.permissions" class="permissions-tags">
              <span 
                v-for="(value, key) in relationship.permissions" 
                :key="key"
                v-show="value"
                class="permission-tag"
              >
                {{ getPermissionLabel(key) }}
              </span>
            </div>
          </div>
          
          <!-- 右侧箭头 -->
          <ChevronRight class="card-arrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { 
  relationService, 
  type MyRelationshipsResponse,
  type RelationshipAsViewer 
} from '@/service/relation'
import { authService } from '@/service/auth'
import { memberRemarkService } from '@/service/memberRemark'
import { memberInfoService, type MemberInfo } from '@/service/memberInfo'
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  AlertTriangle, 
  Inbox, 
  ChevronDown, 
  FileText, 
  ChevronRight,
  Users,
  Stethoscope,
  Hospital,
  Siren,
  Activity,
  ClipboardList,
  User
} from 'lucide-vue-next'

const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')
const relationshipsData = ref<MyRelationshipsResponse | null>(null)
const relationships = ref<RelationshipAsViewer[]>([]) // 只显示作为访问者的关系
const remarks = ref<Record<string, string>>({})
const memberInfos = ref<Record<string, MemberInfo>>({})

// 筛选条件
const filterStatus = ref('all')
const filterGroupType = ref('all')

// 页面标题
const pageTitle = ref('我的关系')

// 更新页面标题
const updatePageTitle = async () => {
  const userInfo = await authService.getUserInfo()
  if (userInfo?.roles?.includes('doctor')) {
    pageTitle.value = '我的患者'
  } else if (userInfo?.roles?.includes('family')) {
    pageTitle.value = '我的家人'
  }
}

// 空状态提示
const emptyMessage = ref('暂无关系记录')

// 更新空状态提示
const updateEmptyMessage = async () => {
  const userInfo = await authService.getUserInfo()
  if (userInfo?.roles?.includes('doctor')) {
    emptyMessage.value = '您还没有患者，等待患者邀请您加入访问组'
  } else if (userInfo?.roles?.includes('family')) {
    emptyMessage.value = '您还没有关联的家人，扫描家人的邀请码加入'
  }
}

// 统计信息
const totalCount = computed(() => relationships.value.length)
const activeCount = computed(() => relationships.value.filter(r => r.status === 'active').length)
const suspendedCount = computed(() => relationships.value.filter(r => r.status === 'suspended').length)

// 筛选后的关系列表
const filteredRelationships = computed(() => {
  return relationships.value.filter(r => {
    const statusMatch = filterStatus.value === 'all' || r.status === filterStatus.value
    const typeMatch = filterGroupType.value === 'all' || r.group_type === filterGroupType.value
    return statusMatch && typeMatch
  })
})

// 加载关系列表
const loadRelationships = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 1. 确保已登录
    console.log('检查后端登录状态...')
    await authService.ensureBackendLoginWithBiometric()
    console.log('✅ 后端登录状态正常')
    
    // 2. 获取关系列表（新版结构化数据）
    const data = await relationService.getMyRelationships()
    relationshipsData.value = data
    
    // 只显示"我作为访问者"的关系（医生/家属查看患者/老人）
    relationships.value = data.asViewer || []
    console.log('📊 加载关系数据:')
    console.log('  - 作为访问者:', data.asViewer?.length || 0, '（显示这些）')
    console.log('  - 作为数据拥有者:', data.asOwner?.length || 0, '（不显示）')
    
    // 打印所有已存储的成员信息（调试）
    await memberInfoService.debugPrintAllMembers()
    
    // 3. 加载备注（针对数据拥有者的地址）
    if (relationships.value.length > 0) {
      const addresses = relationships.value.map(r => r.data_owner_address)
      remarks.value = await memberRemarkService.getBatchRemarks(addresses)
      console.log('已加载备注:', remarks.value)
      
      // 4. 加载成员信息（姓名等）
      console.log('📝 开始加载成员信息...')
      for (const relationship of relationships.value) {
        const ownerAddress = relationship.data_owner_address
        console.log(`  查询地址: ${ownerAddress}`)
        
        const memberInfo = await memberInfoService.getMemberInfo(ownerAddress)
        if (memberInfo) {
          memberInfos.value[ownerAddress] = memberInfo
          console.log(`  ✅ 找到成员信息: ${memberInfo.username}`)
        } else {
          console.log(`  ⚠️ 未找到成员信息`)
          console.log(`  💡 提示: 对方可能还未发送信息，或信息交换正在进行中`)
        }
      }
      console.log('📊 成员信息加载完成，共找到:', Object.keys(memberInfos.value).length, '个')
      
      // 5. 检查是否有未交换信息的关系
      const missingInfoCount = relationships.value.length - Object.keys(memberInfos.value).length
      if (missingInfoCount > 0) {
        console.warn(`⚠️ 有 ${missingInfoCount} 个关系还未获取到信息`)
        console.warn('💡 可能原因:')
        console.warn('   1. 对方还未上线接收和回复信息')
        console.warn('   2. 信息正在后台交换中（请稍等30秒）')
        console.warn('   3. 消息监听服务未启动')
        console.warn('💡 解决方法:')
        console.warn('   - 请确保双方都已登录应用')
        console.warn('   - 等待消息监听服务自动处理（30秒轮询）')
        console.warn('   - 或尝试退出重新登录')
      }
    }
  } catch (error: any) {
    console.error('加载关系列表失败:', error)
    errorMessage.value = error.message || '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

// 查看关系详情
const viewRelationshipDetail = (relationship: RelationshipAsViewer) => {
  // 可以导航到患者/老人的详细信息页面
  const memberName = getMemberDisplayName(relationship.data_owner_address)
  console.log('查看关系详情:', relationship)
  alert(`查看 ${memberName} 的详细信息\n地址: ${formatAddress(relationship.data_owner_address)}\n访问组: ${relationship.access_group_name}\n状态: ${getStatusText(relationship.status)}\n描述: ${relationship.description || '无'}`)
}

// 获取群组图标
const getGroupIcon = (groupType: string) => {
  const icons: Record<string, any> = {
    'FAMILY': Users,
    'FAMILY_PRIMARY': Users,
    'PRIMARY_DOCTOR': Stethoscope,
    'FAMILY_DOCTOR': Hospital,
    'SPECIALIST': Stethoscope,
    'HOSPITAL': Hospital,
    'HEALTHCARE_TEAM': Hospital,
    'EMERGENCY_CONTACT': Siren,
    'THERAPIST': Activity,
    'CUSTOM': ClipboardList
  }
  return icons[groupType] || User
}

// 获取群组颜色类
const getGroupColorClass = (groupType: string) => {
  const colors: Record<string, string> = {
    'FAMILY': 'blue',
    'FAMILY_PRIMARY': 'blue',
    'PRIMARY_DOCTOR': 'green',
    'FAMILY_DOCTOR': 'teal',
    'SPECIALIST': 'purple',
    'HOSPITAL': 'orange',
    'HEALTHCARE_TEAM': 'teal',
    'EMERGENCY_CONTACT': 'red',
    'THERAPIST': 'indigo',
    'CUSTOM': 'gray'
  }
  return colors[groupType] || 'gray'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'active': '活跃',
    'accepted': '已接受',
    'pending': '待处理',
    'suspended': '已暂停',
    'revoked': '已撤销'
  }
  return statusMap[status] || status
}

// 获取权限标签
const getPermissionLabel = (key: string) => {
  const labels: Record<string, string> = {
    'canView': '查看',
    'canViewMedication': '用药',
    'canViewAppointments': '预约',
    'canViewDiagnosis': '诊断',
    'canViewPrescription': '处方',
    'canViewMedicalHistory': '病历',
    'canViewTestResults': '检查',
    'canViewBasicInfo': '基本信息',
    'canViewVitalSigns': '生命体征',
    'canViewAllergies': '过敏史',
    'canViewEmergencyInfo': '紧急信息',
    'canViewProgress': '康复进度',
    'canViewTreatmentPlan': '治疗方案',
    'emergency': '紧急访问',
    'receiveAlerts': '接收提醒',
    'receiveEmergencyAlerts': '紧急通知'
  }
  return labels[key] || key
}

// 获取成员显示名称
const getMemberDisplayName = (address: string) => {
  const memberInfo = memberInfos.value[address]
  if (memberInfo?.username) {
    return memberInfo.username
  }
  // 如果有备注就用备注
  if (remarks.value[address]) {
    return remarks.value[address]
  }
  // 否则用地址
  return formatAddress(address)
}

// 获取数据拥有者地址（兼容新接口）
const getOwnerAddress = (relationship: RelationshipAsViewer) => {
  return relationship.data_owner_address
}

// 格式化地址
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}分钟前`
    }
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await updatePageTitle()
  await updateEmptyMessage()
  await loadRelationships()
})

// 页面激活时重新加载（从其他页面返回时）
onActivated(async () => {
  console.log('MyPatients页面激活，重新加载关系列表')
  await loadRelationships()
})
</script>

<style scoped>
.my-patients-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;

  background: #667eea;

  color: white;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn, .refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.back-btn:hover, .refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 24px;
  height: 24px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  text-align: center;
  flex: 1;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 15px;
  color: #718096;
}

.spinner {
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  color: #667eea;
}

.error-banner {
  margin: 20px;
  padding: 15px;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  color: #b91c1c;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  width: 20px;
  height: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #718096;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #cbd5e0;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 14px;
  text-align: center;
  max-width: 300px;
}

.relationships-container {
  padding: 20px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #718096;
}

.filter-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.select-wrapper {
  position: relative;
  flex: 1;
}

.filter-select {
  width: 100%;
  padding: 10px 12px;
  padding-right: 32px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 13px;
  color: #2d3748;
  background: white;
  appearance: none;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #a0aec0;
  pointer-events: none;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.relationship-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: var(--shadow-sm);
  border: 1px solid transparent;
}

.relationship-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-100);
}

.relationship-card.inactive {
  opacity: 0.7;
  background: #f9fafb;
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-wrapper.blue { background: #e0f2fe; color: #0ea5e9; }
.card-icon-wrapper.green { background: #dcfce7; color: #22c55e; }
.card-icon-wrapper.teal { background: #ccfbf1; color: #14b8a6; }
.card-icon-wrapper.purple { background: #f3e8ff; color: #a855f7; }
.card-icon-wrapper.orange { background: #ffedd5; color: #f97316; }
.card-icon-wrapper.red { background: #fee2e2; color: #ef4444; }
.card-icon-wrapper.indigo { background: #e0e7ff; color: #6366f1; }
.card-icon-wrapper.gray { background: #f3f4f6; color: #6b7280; }

.card-icon {
  width: 28px;
  height: 28px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.owner-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.remark-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #f7fafc;
  color: #718096;
  border-radius: 6px;
  font-size: 11px;
}

.icon-mini {
  width: 10px;
  height: 10px;
}

.owner-address-sub {
  font-size: 12px;
  color: #a0aec0;
  font-family: 'Courier New', monospace;
  margin-bottom: 8px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.group-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
  background: #f7fafc;
  color: #718096;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.status-active { background: #dcfce7; color: #166534; }
.status-suspended { background: #fee2e2; color: #991b1b; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-revoked { background: #f3f4f6; color: #374151; }

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.date-info {
  font-size: 11px;
  color: #a0aec0;
}

.permissions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #f7fafc;
  border-radius: 4px;
  color: #718096;
  border: 1px solid #e2e8f0;
}

.card-arrow {
  width: 20px;
  height: 20px;
  color: #cbd5e0;
}
</style>
