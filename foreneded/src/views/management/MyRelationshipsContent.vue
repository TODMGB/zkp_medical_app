<template>
  <div class="my-relationships-content">
    <div v-if="userInfoRequestCount > 0" class="user-info-requests-banner" @click="goToUserInfoRequests">
      <span>有 {{ userInfoRequestCount }} 条信息交换请求</span>
      <span class="user-info-requests-banner-action">去处理</span>
    </div>
    <!-- 加载状态 -->
    <div v-if="isLoading && friendRelationships.length === 0 && !hasFriendRequests" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage && !isLoading" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span>{{ errorMessage }}</span>
    </div>
    
    <!-- 空状态 -->
    <div v-if="!isLoading && friendRelationships.length === 0 && !hasFriendRequests && !errorMessage" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3 class="empty-title">暂无好友</h3>
      <p class="empty-desc">{{ emptyMessage }}</p>
    </div>
    
    <!-- 关系列表 / 好友申请 -->
    <div v-if="friendRelationships.length > 0 || hasFriendRequests" class="relationships-container">
      <!-- 好友申请 -->
      <div class="friend-requests-section">
        <div class="friend-requests-header">
          <h3 class="friend-requests-title">好友申请</h3>
          <button class="friend-requests-refresh" @click="loadFriendRequests" :disabled="friendRequestsLoading || isLoading || isHandlingFriendRequest">
            {{ friendRequestsLoading ? '加载中...' : '刷新' }}
          </button>
        </div>

        <div class="friend-requests-tabs">
          <button
            class="friend-requests-tab"
            :class="{ active: friendRequestTab === 'incoming' }"
            @click="friendRequestTab = 'incoming'"
          >
            收到 ({{ incomingFriendRequests.length }})
          </button>
          <button
            class="friend-requests-tab"
            :class="{ active: friendRequestTab === 'outgoing' }"
            @click="friendRequestTab = 'outgoing'"
          >
            发出 ({{ outgoingFriendRequests.length }})
          </button>
        </div>

        <div v-if="friendRequestsError" class="friend-requests-error">
          {{ friendRequestsError }}
        </div>

        <div v-if="friendRequestsLoading" class="friend-requests-loading">
          加载好友申请中...
        </div>

        <div v-else-if="displayedFriendRequests.length === 0" class="friend-requests-empty">
          暂无{{ friendRequestTab === 'incoming' ? '收到的' : '发出的' }}好友申请
        </div>

        <div v-else class="friend-requests-list">
          <div v-for="fr in displayedFriendRequests" :key="fr.id" class="friend-request-card">
            <div class="friend-request-avatar">
              {{ getMemberRoleIcon(getFriendRequestOtherAddress(fr)) }}
            </div>
            <div class="friend-request-main">
              <div class="friend-request-title-row">
                <div class="friend-request-name">
                  {{ getMemberDisplayName(getFriendRequestOtherAddress(fr)) }}
                </div>
                <div class="friend-request-time">{{ formatDate(fr.created_at) }}</div>
              </div>
              <div class="friend-request-address">
                {{ formatAddress(getFriendRequestOtherAddress(fr)) }}
              </div>
              <div v-if="getMemberRoleLabels(getFriendRequestOtherAddress(fr)).length > 0" class="friend-request-tags">
                <span
                  v-for="roleLabel in getMemberRoleLabels(getFriendRequestOtherAddress(fr))"
                  :key="roleLabel"
                  class="friend-request-tag"
                >
                  {{ roleLabel }}
                </span>
              </div>
              <div v-if="fr.message" class="friend-request-message">
                {{ fr.message }}
              </div>
            </div>

            <div class="friend-request-actions">
              <template v-if="friendRequestTab === 'incoming'">
                <button
                  class="friend-request-btn primary"
                  @click="acceptFriendRequestLocal(fr.id)"
                  :disabled="isHandlingFriendRequest"
                >
                  同意
                </button>
                <button
                  class="friend-request-btn danger"
                  @click="rejectFriendRequestLocal(fr.id)"
                  :disabled="isHandlingFriendRequest"
                >
                  拒绝
                </button>
              </template>
              <template v-else>
                <button
                  class="friend-request-btn"
                  @click="cancelFriendRequestLocal(fr.id)"
                  :disabled="isHandlingFriendRequest"
                >
                  撤回
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <template v-if="friendRelationships.length > 0">
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
          <select v-model="filterStatus" class="filter-select">
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="suspended">已暂停</option>
            <option value="revoked">已撤销</option>
          </select>
          
          <select v-model="filterGroupType" class="filter-select">
            <option value="all">全部类型</option>
            <option value="FAMILY_PRIMARY">家人</option>
            <option value="PRIMARY_DOCTOR">主治医生</option>
            <option value="HEALTHCARE_TEAM">医护团队</option>
            <option value="EMERGENCY_CONTACT">紧急联系人</option>
            <option value="THERAPIST">康复师</option>
            <option value="CUSTOM">自定义</option>
          </select>
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
            <div class="card-icon">
              {{ getMemberRoleIcon(getOtherPartyAddress(relationship)) }}
            </div>
            
            <!-- 中间信息 -->
            <div class="card-content">
              <div class="card-header">
                <!-- 显示对方的姓名（如果有）或地址 -->
                <h3 class="member-name">{{ getMemberDisplayName(getOtherPartyAddress(relationship)) }}</h3>
                <span v-if="remarks[getOtherPartyAddress(relationship)]" class="remark-badge">
                  📝 {{ remarks[getOtherPartyAddress(relationship)] }}
                </span>
              </div>
              <div class="member-address-sub">
                {{ formatAddress(getOtherPartyAddress(relationship)) }}
              </div>

              <div v-if="!memberInfos[getOtherPartyAddress(relationship)]" class="member-missing-info">
                <button class="request-info-btn" @click.stop="requestPeerInfoLocal(getOtherPartyAddress(relationship))">
                  询问信息
                </button>
              </div>
              
              <div class="card-meta">
                <span class="group-badge" :class="`type-${relationship.group_type}`">
                  {{ relationship.access_group_name }}
                </span>
                <span class="status-badge" :class="`status-${relationship.status}`">
                  {{ getStatusText(relationship.status) }}
                </span>
                <span class="role-badge" :class="isAsViewer(relationship) ? 'role-viewer' : 'role-owner'">
                  {{ isAsViewer(relationship) ? '我是访问者' : '我是数据拥有者' }}
                </span>
              </div>
              
              <div class="card-footer">
                <span class="date-info">
                  加入时间: {{ formatDate(relationship.joined_at) }}
                </span>
                <span v-if="relationship.last_accessed_at" class="date-info">
                  最后访问: {{ formatDate(relationship.last_accessed_at) }}
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
            <div class="card-arrow">
              →
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { 
  relationService, 
  type MyRelationshipsResponse,
  type RelationshipAsViewer,
  type RelationshipAsOwner,
  type FriendRequest
} from '@/service/relation'
import { authService } from '@/service/auth'
import { memberRemarkService } from '@/service/memberRemark'
import { memberInfoService, type MemberInfo } from '@/service/memberInfo'
import { uiService } from '@/service/ui'
import { UserRoleUtils } from '@/utils/userRoles'
import { Preferences } from '@capacitor/preferences'

const isLoading = ref(false)
const errorMessage = ref('')
const relationshipsData = ref<MyRelationshipsResponse | null>(null)
const remarks = ref<Record<string, string>>({})
const memberInfos = ref<Record<string, MemberInfo>>({})
const currentUserAddress = ref('')

const friendRequestsLoading = ref(false)
const friendRequestsError = ref('')
const incomingFriendRequests = ref<FriendRequest[]>([])
const outgoingFriendRequests = ref<FriendRequest[]>([])
const friendRequestTab = ref<'incoming' | 'outgoing'>('incoming')
const isHandlingFriendRequest = ref(false)

// 筛选条件
const filterStatus = ref('all')
const filterGroupType = ref('all')

// 空状态提示
const emptyMessage = ref('还没有好友，点击右上角扫码添加')

// 合并所有关系用于显示
const allRelationships = computed(() => {
  if (!relationshipsData.value) return []
  return [
    ...(relationshipsData.value.asViewer || []),
    ...(relationshipsData.value.asOwner || [])
  ]
})

const friendRelationships = computed(() => {
  const list = allRelationships.value
    .filter((r: any) => String(r?.access_group_name || '') === '好友')
    .filter((r: any) => {
      const status = String(r?.status || '')
      return status === 'active' || status === 'accepted'
    })

  const seen = new Set<string>()
  const uniq: any[] = []
  for (const r of list) {
    const other = getOtherPartyAddress(r)
    const key = String(other || '').toLowerCase()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    uniq.push(r)
  }
  return uniq
})

const hasFriendRequests = computed(() => {
  return incomingFriendRequests.value.length > 0 || outgoingFriendRequests.value.length > 0
})

const displayedFriendRequests = computed(() => {
  return friendRequestTab.value === 'incoming'
    ? incomingFriendRequests.value
    : outgoingFriendRequests.value
})

// 统计信息
const totalCount = computed(() => relationshipsData.value?.summary?.total || 0)
const activeCount = computed(() => {
  return allRelationships.value.filter(r => r.status === 'active').length
})
const suspendedCount = computed(() => {
  return allRelationships.value.filter(r => r.status === 'suspended').length
})

// 筛选后的关系列表
const filteredRelationships = computed(() => {
  return friendRelationships.value
})

// 获取对方的地址（根据relationship_type判断）
const getOtherPartyAddress = (relationship: RelationshipAsViewer | RelationshipAsOwner) => {
  if (relationship.relationship_type === 'as_viewer') {
    // 我是访问者，显示数据拥有者的地址
    return (relationship as RelationshipAsViewer).data_owner_address
  } else {
    // 我是数据拥有者，显示访问者的地址
    return (relationship as RelationshipAsOwner).visitor_address
  }
}

// 判断关系类型
const isAsViewer = (relationship: RelationshipAsViewer | RelationshipAsOwner) => {
  return relationship.relationship_type === 'as_viewer'
}

const getFriendRequestOtherAddress = (fr: FriendRequest) => {
  return friendRequestTab.value === 'incoming'
    ? fr.requester_address
    : fr.recipient_address
}

const getMemberRoleIcon = (address: string) => {
  const info = memberInfos.value[address]
  const role = info?.roles?.[0] || ''
  return UserRoleUtils.getRoleIcon(role)
}

const getMemberRoleLabels = (address: string) => {
  const info = memberInfos.value[address]
  const roles = info?.roles || []
  return roles.slice(0, 3).map(r => UserRoleUtils.getRoleDisplayName(r))
}

const USER_INFO_REQUESTS_KEY = 'user_info_requests'
const userInfoRequestCount = ref(0)

const refreshUserInfoRequestCount = async () => {
  try {
    const { value } = await Preferences.get({ key: USER_INFO_REQUESTS_KEY })
    const parsed = value ? JSON.parse(value) : []
    userInfoRequestCount.value = Array.isArray(parsed) ? parsed.length : 0
  } catch (e) {
    userInfoRequestCount.value = 0
  }
}

const goToUserInfoRequests = () => {
  router.push({ name: 'UserInfoRequests' })
}

const requestPeerInfoLocal = async (peerAddress: string) => {
  try {
    const peer = String(peerAddress || '').trim()
    if (!peer) return
    await relationService.requestPeerInfo(peer)
    uiService.toast('已发送信息请求', { type: 'success' })
  } catch (error: any) {
    console.error('请求对方信息失败:', error)
    uiService.toast(error.message || '请求失败', { type: 'error' })
  }
}

const loadFriendRequests = async () => {
  try {
    friendRequestsLoading.value = true
    friendRequestsError.value = ''

    const [incoming, outgoing] = await Promise.all([
      relationService.getIncomingFriendRequests('pending').catch(() => []),
      relationService.getOutgoingFriendRequests('pending').catch(() => []),
    ])

    incomingFriendRequests.value = incoming || []
    outgoingFriendRequests.value = outgoing || []

    const addrs = Array.from(
      new Set(
        [...incomingFriendRequests.value.map(r => r.requester_address), ...outgoingFriendRequests.value.map(r => r.recipient_address)]
          .filter(Boolean)
          .map(a => String(a))
      )
    )

    if (addrs.length > 0) {
      try {
        const remarkMap = await memberRemarkService.getBatchRemarks(addrs)
        remarks.value = { ...remarks.value, ...(remarkMap || {}) }
      } catch (e) {
        console.warn('加载好友申请备注失败（不影响显示）:', e)
      }

      for (const addr of addrs) {
        if (memberInfos.value[addr]) continue
        try {
          const info = await memberInfoService.getMemberInfo(addr)
          if (info) {
            memberInfos.value[info.smart_account] = info
            memberInfos.value[addr] = info
            if (info.eoa_address) memberInfos.value[info.eoa_address] = info
          }
        } catch (e) {
          console.warn('加载好友申请成员信息失败（不影响显示）:', e)
        }
      }
    }
  } catch (error: any) {
    console.error('加载好友申请失败:', error)
    friendRequestsError.value = error.message || '加载好友申请失败'
  } finally {
    friendRequestsLoading.value = false
  }
}

const acceptFriendRequestLocal = async (friendRequestId: number | string) => {
  try {
    isHandlingFriendRequest.value = true
    await relationService.acceptFriendRequest(friendRequestId)
    uiService.toast('已同意好友申请', { type: 'success' })
    await loadRelationships()
  } catch (error: any) {
    console.error('同意好友申请失败:', error)
    uiService.toast(error.message || '同意失败', { type: 'error' })
  } finally {
    isHandlingFriendRequest.value = false
  }
}

const rejectFriendRequestLocal = async (friendRequestId: number | string) => {
  try {
    isHandlingFriendRequest.value = true
    await relationService.rejectFriendRequest(friendRequestId)
    uiService.toast('已拒绝好友申请', { type: 'success' })
    await loadFriendRequests()
  } catch (error: any) {
    console.error('拒绝好友申请失败:', error)
    uiService.toast(error.message || '拒绝失败', { type: 'error' })
  } finally {
    isHandlingFriendRequest.value = false
  }
}

const cancelFriendRequestLocal = async (friendRequestId: number | string) => {
  const ok = await uiService.confirm('确定要撤回该好友申请吗？', {
    title: '撤回好友申请',
    confirmText: '撤回',
    cancelText: '取消',
  })
  if (!ok) return

  try {
    isHandlingFriendRequest.value = true
    await relationService.cancelFriendRequest(friendRequestId)
    uiService.toast('已撤回好友申请', { type: 'success' })
    await loadFriendRequests()
  } catch (error: any) {
    console.error('撤回好友申请失败:', error)
    uiService.toast(error.message || '撤回失败', { type: 'error' })
  } finally {
    isHandlingFriendRequest.value = false
  }
}

// 加载关系列表
const loadRelationships = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 1. 确保已登录并获取当前用户地址
    console.log('检查后端登录状态...')
    await authService.ensureBackendLoginWithBiometric()
    console.log('✅ 后端登录状态正常')
    
    // 2. 获取当前用户的Smart Account地址
    const userInfo = await authService.getUserInfo()
    if (!userInfo || !userInfo.smart_account) {
      throw new Error('无法获取当前用户地址')
    }
    currentUserAddress.value = userInfo.smart_account
    console.log('当前用户地址:', currentUserAddress.value)

    await loadFriendRequests()
    
    // 3. 获取关系列表（新版结构化数据）
    const data = await relationService.getMyRelationships()
    relationshipsData.value = data
    console.log('📊 加载关系数据:')
    console.log('  - 作为访问者:', data.asViewer?.length || 0)
    console.log('  - 作为数据拥有者:', data.asOwner?.length || 0)
    console.log('  - 总计:', data.summary?.total || 0)
    
    // 打印所有已存储的成员信息（调试）
    await memberInfoService.debugPrintAllMembers()
    
    // 4. 加载备注（针对对方的地址）
    const allRels = [...(data.asViewer || []), ...(data.asOwner || [])]
    if (allRels.length > 0) {
      const addressesToLoad = allRels.map(r => getOtherPartyAddress(r))
      remarks.value = await memberRemarkService.getBatchRemarks(addressesToLoad)
      console.log('已加载备注:', remarks.value)
      
      // 5. 加载成员信息（姓名等）
      console.log('📝 [关系页面] 开始加载成员信息...')
      console.log('  关系数量:', allRels.length)
      
      // 首先打印所有已保存的成员信息（调试用）
      console.log('🔍 [关系页面] 检查本地已保存的所有成员信息...')
      await memberInfoService.debugPrintAllMembers()
      
      for (const relationship of allRels) {
        const otherAddress = getOtherPartyAddress(relationship)
        console.log(`\n  📋 处理关系 ${relationship.id}:`)
        console.log(`    关系类型: ${relationship.relationship_type}`)
        console.log(`    对方地址: ${otherAddress}`)
        
        // 尝试查询成员信息
        const memberInfo = await memberInfoService.getMemberInfo(otherAddress)
        if (memberInfo) {
          // 使用 smart_account 作为主要 key，同时也用查询地址作为 key（方便查找）
          const smartAccountKey = memberInfo.smart_account
          memberInfos.value[smartAccountKey] = memberInfo
          memberInfos.value[otherAddress] = memberInfo  // 也存储一份，方便用关系地址查找
          if (memberInfo.eoa_address) {
            memberInfos.value[memberInfo.eoa_address] = memberInfo  // 也用 EOA 地址存储
          }
          
          console.log(`    ✅ 找到成员信息:`)
          console.log(`      姓名: ${memberInfo.username}`)
          console.log(`      Smart Account: ${memberInfo.smart_account}`)
          console.log(`      EOA Address: ${memberInfo.eoa_address}`)
          console.log(`      角色: ${memberInfo.roles?.join(', ') || 'N/A'}`)
          console.log(`      已存储到 memberInfos (key: ${smartAccountKey}, ${otherAddress}, ${memberInfo.eoa_address || 'N/A'})`)
        } else {
          console.log(`    ⚠️ 未找到成员信息`)
          console.log(`    💡 可能原因:`)
          console.log(`      1. 对方还未发送信息`)
          console.log(`      2. 信息正在后台交换中（请稍等30秒）`)
          console.log(`      3. 消息监听服务未启动`)
          console.log(`      4. 地址不匹配（查询地址: ${otherAddress}）`)
        }
      }
      
      console.log('\n📊 [关系页面] 成员信息加载完成:')
      console.log(`  已找到: ${Object.keys(memberInfos.value).length} 个成员信息`)
      console.log(`  成员信息详情:`, JSON.stringify(memberInfos.value, null, 2))
      
      // 6. 检查是否有未交换信息的关系
      const missingInfoCount = allRels.length - Object.keys(memberInfos.value).length
      if (missingInfoCount > 0) {
        console.warn(`⚠️ 有 ${missingInfoCount} 个关系还未获取到对方信息`)
        console.warn('💡 可能原因:')
        console.warn('   1. 对方还未上线接收和回复信息')
        console.warn('   2. 信息正在后台交换中（请稍等30秒）')
        console.warn('   3. 消息监听服务未启动')
        
        // 如果检测到成员信息缺失，尝试手动触发消息检查
        console.log('🔄 [关系页面] 检测到成员信息缺失，尝试手动触发消息检查...')
        try {
          const { aaService } = await import('@/service/accountAbstraction')
          const { messageListenerService } = await import('@/service/messageListener')
          const wallet = aaService.getEOAWallet()
          if (wallet) {
            await messageListenerService.checkMessagesNow(wallet)
            console.log('✅ [关系页面] 消息检查完成，重新加载成员信息...')
            // 等待一下让消息处理完成
            await new Promise(resolve => setTimeout(resolve, 1500))
            // 重新加载成员信息
            console.log('🔄 [关系页面] 重新加载成员信息...')
            for (const relationship of allRels) {
              const otherAddress = getOtherPartyAddress(relationship)
              if (!memberInfos.value[otherAddress]) {
                const memberInfo = await memberInfoService.getMemberInfo(otherAddress)
                if (memberInfo) {
                  const smartAccountKey = memberInfo.smart_account
                  memberInfos.value[smartAccountKey] = memberInfo
                  memberInfos.value[otherAddress] = memberInfo
                  if (memberInfo.eoa_address) {
                    memberInfos.value[memberInfo.eoa_address] = memberInfo
                  }
                  console.log(`  ✅ 重新加载后找到成员信息: ${memberInfo.username}`)
                }
              }
            }
            console.log('📊 [关系页面] 重新加载完成，共找到:', Object.keys(memberInfos.value).length, '个成员信息')
          } else {
            console.warn('⚠️ [关系页面] 无法获取钱包，跳过消息检查')
          }
        } catch (checkError: any) {
          console.error('❌ [关系页面] 手动触发消息检查失败:', checkError)
        }
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
const viewRelationshipDetail = async (relationship: RelationshipAsViewer | RelationshipAsOwner) => {
  const otherParty = getOtherPartyAddress(relationship)
  const role = isAsViewer(relationship) ? '数据拥有者' : '访问者'
  const memberName = getMemberDisplayName(otherParty)
  console.log('查看关系详情:', relationship)
  await uiService.alert(
    `${role}: ${memberName}\n地址: ${formatAddress(otherParty)}\n访问组: ${relationship.access_group_name}\n状态: ${getStatusText(relationship.status)}\n描述: ${relationship.description || '无'}`,
    { title: '详情', confirmText: '我知道了' }
  )
}

// 获取群组图标
const getGroupIcon = (groupType: string) => {
  const icons: Record<string, string> = {
    'FAMILY': '👨‍👩‍👧‍👦',
    'FAMILY_PRIMARY': '👨‍👩‍👧‍👦',
    'PRIMARY_DOCTOR': '👨‍⚕️',
    'FAMILY_DOCTOR': '🏥',
    'SPECIALIST': '🔬',
    'HOSPITAL': '🏨',
    'HEALTHCARE_TEAM': '🏥',
    'EMERGENCY_CONTACT': '🚨',
    'THERAPIST': '🧘',
    'CUSTOM': '📋'
  }
  return icons[groupType] || '👤'
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
const getPermissionLabel = (key: string | number) => {
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
  const k = String(key)
  return labels[k] || k
}

// 格式化地址
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

// 获取成员显示名称（优先显示姓名，然后备注，最后地址）
const getMemberDisplayName = (address: string) => {
  // 首先尝试直接用地址查找
  let memberInfo = memberInfos.value[address]
  
  // 如果没找到，尝试在所有成员信息中查找匹配的地址
  if (!memberInfo && Object.keys(memberInfos.value).length > 0) {
    // 遍历所有已加载的成员信息，查找匹配的地址
    for (const [key, info] of Object.entries(memberInfos.value)) {
      if (
        info.smart_account?.toLowerCase() === address.toLowerCase() ||
        info.eoa_address?.toLowerCase() === address.toLowerCase() ||
        key.toLowerCase() === address.toLowerCase()
      ) {
        memberInfo = info
        console.log(`✅ [显示名称] 通过地址匹配找到成员信息: ${address} -> ${info.username}`)
        break
      }
    }
  }
  
  if (memberInfo?.username) {
    return memberInfo.username
  }
  if (remarks.value[address]) {
    return remarks.value[address]
  }
  return formatAddress(address)
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

import { useRouter } from 'vue-router'
const router = useRouter()

onMounted(async () => {
  loadRelationships()
  loadFriendRequests()
  refreshUserInfoRequestCount()
  try {
    window.addEventListener('user_info_request', refreshUserInfoRequestCount as any)
  } catch (e) {
  }
})

// 页面激活时重新加载（从其他页面返回时）
onActivated(async () => {
  console.log('MyRelationshipsContent激活，重新加载关系列表')
  await loadRelationships()
})
</script>

<style scoped>
.my-relationships-content {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 15px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner {
  margin: 20px;
  padding: 15px;
  background: #fff5f5;
  border-left: 4px solid #e53e3e;
  border-radius: 8px;
  color: #c53030;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-icon {
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 10px 0;
}

.empty-desc {
  font-size: 1rem;
  color: #718096;
  margin: 0;
  line-height: 1.5;
}

.relationships-container {
  padding: 20px;
}

.stats-section,
.filter-section,
.card-meta,
.card-footer,
.permissions-tags,
.card-arrow {
  display: none;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.relationship-card {
  align-items: center;
}

.member-name {
  font-size: 16px;
  font-weight: 700;
}

.member-address-sub {
  font-size: 12px;
  color: #64748b;
}

 .friend-requests-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
 }

 .friend-requests-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
 }

 .friend-requests-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #2d3748;
 }

 .friend-requests-refresh {
  border: none;
  background: #667eea;
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
 }

 .friend-requests-refresh:disabled {
  opacity: 0.6;
 }

 .friend-requests-tabs {
  margin-top: 12px;
  display: flex;
  gap: 10px;
 }

 .friend-requests-tab {
  flex: 1;
  border: 2px solid #e2e8f0;
  background: #f7fafc;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
 }

 .friend-requests-tab.active {
  border-color: #667eea;
  background: #eef2ff;
  color: #4c51bf;
 }

 .friend-requests-error {
  margin-top: 10px;
  padding: 10px 12px;
  background: #fff5f5;
  border-left: 4px solid #e53e3e;
  border-radius: 8px;
  color: #c53030;
  font-size: 0.9rem;
 }

 .friend-requests-loading,
 .friend-requests-empty {
  margin-top: 12px;
  color: #718096;
  font-size: 0.95rem;
  text-align: center;
  padding: 18px 0;
 }

 .friend-requests-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
 }

 .friend-request-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f7fafc;
 }

 .friend-request-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
 }

 .friend-request-main {
  flex: 1;
  min-width: 0;
 }

 .friend-request-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
 }

 .friend-request-name {
  font-weight: 700;
  color: #2d3748;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
 }

 .friend-request-time {
  font-size: 0.8rem;
  color: #a0aec0;
  flex-shrink: 0;
 }

 .friend-request-address {
  margin-top: 2px;
  font-family: monospace;
  font-size: 0.8rem;
  color: #718096;
 }

 .friend-request-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
 }

 .friend-request-tag {
  padding: 3px 8px;
  border-radius: 10px;
  background: #e6fffa;
  border: 1px solid #a7f3d0;
  color: #047857;
  font-size: 0.75rem;
  font-weight: 600;
 }

 .friend-request-message {
  margin-top: 6px;
  font-size: 0.85rem;
  color: #4a5568;
  word-break: break-word;
 }

 .friend-request-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
 }

 .friend-request-btn {
  border: none;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  background: #edf2f7;
  color: #4a5568;
 }

 .friend-request-btn.primary {
  background: #48bb78;
  color: white;
 }

 .friend-request-btn.danger {
  background: #f56565;
  color: white;
 }

 .friend-request-btn:disabled {
  opacity: 0.6;
 }

.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9rem;
  color: #718096;
}

.filter-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-select {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.relationship-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.relationship-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}

.relationship-card.inactive {
  opacity: 0.6;
  background: #f7fafc;
}


.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #ebf4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
  color: #667eea;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.member-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.member-address-sub {
  font-size: 0.9rem;
  color: #a0aec0;
  margin-bottom: 10px;
}

.user-info-requests-banner {
  margin: 10px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.user-info-requests-banner-action {
  font-size: 0.85rem;
  font-weight: 700;
}

.member-missing-info {
  margin: 6px 0 10px;
}

.request-info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e40af;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.request-info-btn:active {
  transform: scale(0.98);
}

.remark-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #ebf8ff;
  color: #2c5282;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.group-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.type-FAMILY_PRIMARY,
.type-FAMILY {
  background: #e6fffa;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.type-PRIMARY_DOCTOR,
.type-HEALTHCARE_TEAM {
  background: #ebf8ff;
  color: #2c5282;
  border: 1px solid #bee3f8;
}

.type-EMERGENCY_CONTACT {
  background: #fff5f5;
  color: #c53030;
  border: 1px solid #feb2b2;
}

.type-THERAPIST,
.type-CUSTOM {
  background: #faf5ff;
  color: #6b46c1;
  border: 1px solid #e9d8fd;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-active,
.status-accepted {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.status-suspended,
.status-revoked {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.role-owner {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.role-viewer {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.date-info {
  font-size: 0.85rem;
  color: #a0aec0;
}

.permissions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.permission-tag {
  padding: 3px 8px;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

.card-arrow {
  font-size: 1.5rem;
  color: #cbd5e0;
  flex-shrink: 0;
}
</style>

