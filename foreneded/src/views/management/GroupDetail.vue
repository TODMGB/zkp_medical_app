<template>
  <div class="group-detail-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">{{ groupInfo?.group_name || '群组详情' }}</h1>
      <button class="add-btn" @click="inviteToGroup">+</button>
    </div>
    
    <!-- 群组信息卡片 -->
    <div class="group-info-card">
      <div class="group-icon-large">
        {{ getGroupIcon(groupInfo?.group_type) }}
      </div>
      <div class="group-details">
        <h2 class="group-name">{{ groupInfo?.group_name }}</h2>
        <p class="group-type">{{ getGroupTypeText(groupInfo?.group_type) }}</p>
        <p class="group-desc">{{ groupInfo?.description || '暂无描述' }}</p>
        <button v-if="!isGroupOwner" class="sync-btn" @click="requestSync" :disabled="syncing">
          {{ syncing ? '同步请求中...' : '请求同步' }}
        </button>
        <div class="group-stats">
          <span class="stat-badge">
            <span class="stat-icon">👥</span>
            <span>{{ members.length }} 成员</span>
          </span>
          <span class="stat-badge">
            <span class="stat-icon">📋</span>
            <span>{{ getGroupPermissions(groupInfo?.group_type) }}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="members-section">
      <div class="section-header">
        <h3 class="section-title">共享打卡统计</h3>
        <button class="refresh-btn" @click="refreshSharedData" :disabled="isLoading">刷新</button>
      </div>

      <div v-if="sharedStats.length === 0 && !isLoading" class="empty-state">
        <p>暂无共享统计</p>
        <p class="empty-hint">可以点击“请求同步”获取历史统计</p>
      </div>

      <div class="members-list">
        <div
          v-for="s in sharedStats"
          :key="`${s.group_id}_${s.week_key}`"
          class="member-card"
        >
          <div class="member-avatar">
            <div class="avatar-icon">📊</div>
          </div>
          <div class="member-info">
            <h4 class="member-name">周：{{ s.week_key }}</h4>
            <p v-if="s.start_date" class="member-role">周期：{{ s.start_date }} 至 {{ s.end_date || '-' }}</p>
            <p class="member-address-sub">总打卡：{{ s.stats?.totalCount ?? '-' }} 次</p>
            <p class="member-role">覆盖天数：{{ s.stats?.daysCovered ?? '-' }} / 7</p>
            <p class="member-role">完成率：{{ s.stats?.completionRate ?? '-' }}%</p>
            <p class="member-status accepted">已接收</p>
          </div>
        </div>
      </div>
    </div>

    <div class="members-section">
      <div class="section-header">
        <h3 class="section-title">共享用药计划</h3>
      </div>

      <div v-if="sharedPlans.length === 0 && !isLoading" class="empty-state">
        <p>暂无共享计划</p>
        <p class="empty-hint">计划拥有者分享后会出现在这里</p>
      </div>

      <div class="members-list">
        <div
          v-for="p in sharedPlans"
          :key="`${p.group_id}_${p.plan_id}`"
          class="member-card"
          @click="openSharedPlan(p)"
        >
          <div class="member-avatar">
            <div class="avatar-icon">📄</div>
          </div>
          <div class="member-info">
            <h4 class="member-name">计划ID：{{ p.plan_id }}</h4>
            <p class="member-address-sub">密钥版本：{{ p.key_version || '-' }}</p>
            <p v-if="p.plan_summary?.start_date" class="member-role">
              周期：{{ p.plan_summary.start_date }} 至 {{ p.plan_summary.end_date || '长期' }}
            </p>
            <p class="member-status accepted">已接收</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage && !isLoading" class="error-banner">
      {{ errorMessage }}
    </div>
    
    <!-- 成员列表 -->
    <div class="members-section">
      <div class="section-header">
        <h3 class="section-title">群组成员</h3>
        <div class="header-actions">
          <button v-if="isGroupOwner" class="refresh-btn" @click="openAddMemberModal" :disabled="isLoading || addingMember">
            {{ addingMember ? '添加中...' : '添加成员' }}
          </button>
        </div>
      </div>
      
      <div v-if="members.length === 0 && !isLoading" class="empty-state">
        <p>还没有成员</p>
        <p class="empty-hint">点击右上角 + 邀请成员</p>
      </div>
      
      <div class="members-list">
        <div
          v-for="member in members"
          :key="member.id"
          class="member-card"
        >
          <div class="member-avatar">
            <div class="avatar-icon">👤</div>
          </div>
          <div class="member-info">
            <h4 class="member-name">{{ getMemberDisplayName(member.viewer_address) }}</h4>
            <p class="member-address-sub">{{ formatAddress(member.viewer_address) }}</p>
            <p v-if="memberRemarks[member.viewer_address]" class="member-remark">
              📝 {{ memberRemarks[member.viewer_address] }}
            </p>
            <p class="member-role">{{ getRoleText(member) }}</p>
            <p class="member-status" :class="member.status">
              {{ getStatusText(member.status) }}
            </p>
          </div>
          <div class="member-actions">
            <button 
              class="remark-btn" 
              @click="showRemarkModal(member)"
              :title="memberRemarks[member.viewer_address] ? '编辑备注' : '添加备注'"
            >
              {{ memberRemarks[member.viewer_address] ? '✏️' : '📝' }}
            </button>
            <div class="status-indicator" :class="member.status"></div>
            <button 
              v-if="member.status === 'accepted'"
              class="action-menu-btn" 
              @click="showMemberActions(member)"
            >
              ⋮
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 从好友选择添加成员 -->
    <div v-if="showAddMemberModal" class="modal-overlay modal-center" @click="closeAddMemberModal">
      <div class="friend-picker-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">从好友中添加</h3>
          <button class="close-btn" @click="closeAddMemberModal">×</button>
        </div>

        <div class="modal-content">
          <div class="friend-picker-actions">
            <input
              v-model="friendSearch"
              type="text"
              class="friend-search-input"
              placeholder="搜索姓名/备注/地址"
            />
            <button class="refresh-btn" @click="loadFriendCandidates" :disabled="friendsLoading || addingMember">
              {{ friendsLoading ? '加载中...' : '刷新' }}
            </button>
          </div>

          <div v-if="friendsLoading" class="empty-state">
            <p>加载好友列表中...</p>
          </div>

          <div v-else-if="filteredFriendCandidates.length === 0" class="empty-state">
            <p>暂无可添加的好友</p>
            <p class="empty-hint">提示：已在群里的好友不会显示</p>
          </div>

          <div v-else class="friend-list">
            <div
              v-for="f in filteredFriendCandidates"
              :key="f.address"
              class="friend-item"
              :class="{ selected: isFriendSelected(f.address) }"
              @click="toggleFriendSelection(f.address)"
            >
              <input
                class="friend-select-checkbox"
                type="checkbox"
                :checked="isFriendSelected(f.address)"
                @click.stop="toggleFriendSelection(f.address)"
              />
              <div class="friend-avatar">{{ getFriendRoleIcon(f.address) }}</div>
              <div class="friend-info">
                <div class="friend-name">{{ getMemberDisplayName(f.address) }}</div>
                <div class="friend-address">{{ formatAddress(f.address) }}</div>
                <div v-if="getFriendRoleLabels(f.address).length > 0" class="friend-tags">
                  <span v-for="roleLabel in getFriendRoleLabels(f.address)" :key="roleLabel" class="friend-tag">
                    {{ roleLabel }}
                  </span>
                </div>
              </div>
              <button class="friend-add-btn" :disabled="addingMember" @click.stop="addMemberToGroup(f.address)">
                {{ addingMember ? '添加中...' : '添加' }}
              </button>
            </div>
          </div>

          <div class="friend-picker-footer">
            <button class="friend-footer-btn" @click="selectAllFilteredFriends" :disabled="friendsLoading || addingMember">
              全选
            </button>
            <button class="friend-footer-btn" @click="clearFriendSelection" :disabled="friendsLoading || addingMember || selectedFriendCount === 0">
              清空
            </button>
            <div class="friend-footer-spacer"></div>
            <button class="friend-footer-btn" @click="addMemberByPrompt" :disabled="addingMember">
              手动输入地址
            </button>
            <button class="friend-add-selected-btn" @click="addSelectedFriends" :disabled="addingMember || selectedFriendCount === 0">
              添加所选 ({{ selectedFriendCount }})
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 成员操作菜单 -->
    <div v-if="selectedMember" class="modal-overlay" @click="closeMemberActions">
      <div class="action-sheet" @click.stop>
        <div class="action-header">
          <h3>管理成员</h3>
          <button class="close-btn" @click="closeMemberActions">×</button>
        </div>
        <div class="action-list">
          <button 
            v-if="selectedMember.status === 'accepted'"
            class="action-item suspend" 
            @click="suspendMember"
          >
            <span class="action-icon">⏸️</span>
            <span>暂停访问</span>
          </button>
          <button 
            class="action-item revoke" 
            @click="revokeMember"
          >
            <span class="action-icon">🚫</span>
            <span>撤销授权</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 成员备注弹窗 -->
    <div v-if="showRemarkEditor" class="modal-overlay" @click="closeRemarkModal">
      <div class="remark-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">设置备注</h3>
          <button class="close-btn" @click="closeRemarkModal">×</button>
        </div>
        <div class="modal-content">
          <div class="member-preview">
            <div class="preview-avatar">👤</div>
            <div class="preview-address">{{ formatAddress(remarkTarget?.viewer_address || '') }}</div>
          </div>
          <input
            v-model="remarkInput"
            type="text"
            placeholder="例如：儿子、女儿、主治医生等"
            class="remark-input"
            maxlength="20"
            @keyup.enter="saveRemark"
          />
          <div class="quick-remarks">
            <button 
              v-for="quickRemark in quickRemarkOptions" 
              :key="quickRemark"
              class="quick-remark-btn"
              @click="remarkInput = quickRemark"
            >
              {{ quickRemark }}
            </button>
          </div>
          <div class="button-group">
            <button 
              v-if="memberRemarks[remarkTarget?.viewer_address || '']"
              class="delete-remark-btn" 
              @click="deleteRemark"
            >
              删除备注
            </button>
            <button class="save-remark-btn" @click="saveRemark" :disabled="!remarkInput.trim()">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { relationService } from '@/service/relation'
import { memberRemarkService } from '@/service/memberRemark'
import { memberInfoService, type MemberInfo } from '@/service/memberInfo'
import { sharedMedicationPlanStorageService } from '@/service/sharedMedicationPlanStorage'
import { sharedCheckinStatsStorageService } from '@/service/sharedCheckinStatsStorage'
import { uiService } from '@/service/ui'
import { UserRoleUtils } from '@/utils/userRoles'

const router = useRouter()
const route = useRoute()

const isLoading = ref(false)
const errorMessage = ref('')
const groupInfo = ref<any>(null)
const members = ref<any[]>([])
const sharedPlans = ref<any[]>([])
const sharedStats = ref<any[]>([])
const isGroupOwner = ref(false)
const syncing = ref(false)
const selectedMember = ref<any>(null)

const addingMember = ref(false)

const showAddMemberModal = ref(false)
const friendsLoading = ref(false)
const friendSearch = ref('')
const friendCandidates = ref<{ address: string }[]>([])
const selectedFriendAddresses = ref<string[]>([])

// 备注相关状态
const showRemarkEditor = ref(false)
const remarkTarget = ref<any>(null)
const remarkInput = ref('')
const memberRemarks = ref<Record<string, string>>({})
const memberInfos = ref<Record<string, MemberInfo>>({})
const quickRemarkOptions = ['儿子', '女儿', '父亲', '母亲', '主治医生', '护士', '康复师']

const openSharedPlan = (p: any) => {
  if (!p?.group_id || !p?.plan_id) return
  router.push(`/shared-plan/${p.group_id}/${p.plan_id}`)
}

const refreshSharedData = async () => {
  try {
    const [plans, stats] = await Promise.all([
      sharedMedicationPlanStorageService.getSharedPlansByGroup(groupId.value).catch(() => []),
      sharedCheckinStatsStorageService.getSharedStatsByGroup(groupId.value).catch(() => []),
    ])
    sharedPlans.value = plans || []
    sharedStats.value = stats || []
  } catch (e) {
    console.warn('刷新共享数据失败（不影响页面）:', e)
  }
}

const requestSync = async () => {
  try {
    if (!groupInfo.value?.owner_address) {
      uiService.toast('群组 owner_address 缺失，无法请求同步', { type: 'error' })
      return
    }

    const { aaService } = await import('@/service/accountAbstraction')
    const wallet = aaService.getEOAWallet()
    if (!wallet) {
      uiService.toast('无法获取钱包', { type: 'error' })
      return
    }

    const weeksBackInput = await uiService.prompt({
      title: '请求同步',
      message: '同步最近多少周的打卡统计？',
      defaultValue: '8',
      placeholder: '1-52',
      confirmText: '发送请求',
      cancelText: '取消',
    })
    if (!weeksBackInput) {
      return
    }

    const parsed = weeksBackInput ? Number.parseInt(weeksBackInput, 10) : 8
    const safeParsed = Number.isFinite(parsed) ? parsed : 8
    const weeksBack = Math.max(1, Math.min(52, safeParsed))

    syncing.value = true
    const { syncService } = await import('@/service/syncService')
    const messageId = await syncService.requestSyncToOwner(wallet, groupInfo.value.owner_address, groupId.value, {
      weeksBack,
      includePlans: true,
      includeStats: true,
    })

    await refreshSharedData()

    uiService.toast(`同步请求已发送，消息ID: ${messageId}`, { type: 'success', durationMs: 2600 })
  } catch (error: any) {
    console.error('请求同步失败:', error)
    uiService.toast('请求同步失败: ' + (error.message || '未知错误'), { type: 'error' })
  } finally {
    syncing.value = false
  }
}

// 获取群组ID - 可能是数字或字符串
const groupId = ref<number | string>(
  isNaN(Number(route.params.groupId)) 
    ? route.params.groupId as string 
    : Number(route.params.groupId)
)

// 加载群组信息和成员
const loadGroupDetail = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 1. 确保用户已登录后端（自动尝试指纹登录）
    console.log('检查后端登录状态...');
    const { authService } = await import('@/service/auth');
    
    try {
      await authService.ensureBackendLoginWithBiometric();
      console.log('✅ 后端登录状态正常');
    } catch (loginError: any) {
      console.error('❌ 后端登录失败:', loginError);
      errorMessage.value = '登录失败: ' + loginError.message;
      // 登录失败时直接返回，不继续执行
      return;
    }
    
    // 2. 获取群组信息
    // 优先从路由state获取，如果没有则从API获取
    if (history.state && history.state.group) {
      console.log('从路由state获取群组信息:', history.state.group);
      groupInfo.value = history.state.group
    } else {
      console.log('路由state中无群组信息，从API获取...');
      console.log('当前 groupId:', groupId.value);
      console.log('groupId 类型:', typeof groupId.value);
      
      // 从访问组列表中查找
      const groups = await relationService.getAccessGroupsStats()
      console.log('获取到的群组数量:', groups.length);
      console.log('所有群组ID列表:', groups.map(g => ({ id: g.id, name: g.group_name, type: typeof g.id })));
      
      const foundGroup = groups.find(g => g.id === groupId.value)
      if (foundGroup) {
        console.log('✅ 找到群组信息:', foundGroup);
        groupInfo.value = foundGroup
      } else {
        console.error('❌ 未找到匹配的群组');
        console.error('要查找的 groupId:', groupId.value);
        console.error('可用的群组列表:', groups.map(g => g.id));
        throw new Error('未找到该访问组')
      }
    }
    
    // 3. 加载成员列表
    const memberList = await relationService.getGroupMembers(groupId.value)
    console.log('群组成员:', memberList)
    members.value = memberList || []

    await refreshSharedData()

    try {
      const { authService } = await import('@/service/auth')
      const userInfo = await authService.getUserInfo()
      const mySmart = userInfo?.smart_account?.toLowerCase() || ''
      const ownerSmart = String(groupInfo.value?.owner_address || '').toLowerCase()
      isGroupOwner.value = !!mySmart && !!ownerSmart && mySmart === ownerSmart
    } catch (e) {
      isGroupOwner.value = false
    }
    
    // 4. 加载成员备注
    await loadMemberRemarks()
    
    // 5. 加载成员信息（姓名等）
    await loadMemberInfos()
  } catch (error: any) {
    console.error('加载群组详情失败:', error)
    errorMessage.value = '加载失败: ' + (error.message || '未知错误')
  } finally {
    isLoading.value = false
  }
}

// 加载成员备注
const loadMemberRemarks = async () => {
  try {
    const addresses = members.value.map(m => m.viewer_address)
    if (addresses.length > 0) {
      memberRemarks.value = await memberRemarkService.getBatchRemarks(addresses)
      console.log('已加载成员备注:', memberRemarks.value)
    }
  } catch (error) {
    console.error('加载备注失败:', error)
  }
}

// 加载成员信息
const loadMemberInfos = async () => {
  try {
    console.log('📝 [群组详情] 开始加载成员信息...')
    console.log('  成员数量:', members.value.length)
    
    for (const member of members.value) {
      const viewerAddress = member.viewer_address
      console.log(`  查询成员信息 - viewer_address: ${viewerAddress}`)
      
      // 尝试用 viewer_address 查询
      let memberInfo = await memberInfoService.getMemberInfo(viewerAddress)
      
      // 如果没找到，尝试用 owner_address 查询（如果是作为数据拥有者的情况）
      if (!memberInfo && member.owner_address) {
        console.log(`  尝试用 owner_address 查询: ${member.owner_address}`)
        memberInfo = await memberInfoService.getMemberInfo(member.owner_address)
      }
      
      if (memberInfo) {
        memberInfos.value[viewerAddress] = memberInfo
        console.log(`  ✅ 找到成员信息: ${memberInfo.username} (${memberInfo.smart_account})`)
      } else {
        console.log(`  ⚠️ 未找到成员信息 (viewer_address: ${viewerAddress})`)
        console.log(`  💡 提示: 对方可能还未发送信息，或信息交换正在进行中`)
      }
    }
    
    console.log('📊 [群组详情] 成员信息加载完成:')
    console.log('  已找到:', Object.keys(memberInfos.value).length, '个成员信息')
    console.log('  成员信息详情:', memberInfos.value)
  } catch (error) {
    console.error('❌ [群组详情] 加载成员信息失败:', error)
  }
}

// 获取群组图标
const getGroupIcon = (groupType: string) => {
  const icons: Record<string, string> = {
    'FAMILY': '👨‍👩‍👧‍👦',
    'PRIMARY_DOCTOR': '👨‍⚕️',
    'FAMILY_DOCTOR': '🏥',
    'SPECIALIST': '🔬',
    'HOSPITAL': '🏨',
    'CUSTOM': '📋'
  }
  return icons[groupType] || '📁'
}

// 获取群组类型文本
const getGroupTypeText = (groupType: string) => {
  const texts: Record<string, string> = {
    'FAMILY': '家人群组',
    'PRIMARY_DOCTOR': '主治医生',
    'FAMILY_DOCTOR': '家庭医生',
    'SPECIALIST': '专科医生',
    'HOSPITAL': '医院',
    'CUSTOM': '自定义群组'
  }
  return texts[groupType] || '未知类型'
}

// 获取群组权限描述
const getGroupPermissions = (groupType: string) => {
  const permissions: Record<string, string> = {
    'FAMILY': '基础数据',
    'PRIMARY_DOCTOR': '完整数据',
    'FAMILY_DOCTOR': '医疗数据',
    'SPECIALIST': '专科数据',
    'HOSPITAL': '住院数据',
    'CUSTOM': '自定义权限'
  }
  return permissions[groupType] || '自定义'
}

// 格式化地址
const formatAddress = (address: string) => {
  if (!address) return '未知地址'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 获取成员显示名称（优先显示姓名，然后备注，最后地址）
const getMemberDisplayName = (address: string) => {
  const memberInfo = memberInfos.value[address]
  if (memberInfo?.username) {
    return memberInfo.username
  }
  if (memberRemarks.value[address]) {
    return memberRemarks.value[address]
  }
  return formatAddress(address)
}

const getFriendRoleIcon = (address: string) => {
  const info = memberInfos.value[address]
  const role = info?.roles?.[0] || ''
  return UserRoleUtils.getRoleIcon(role)
}

const getFriendRoleLabels = (address: string) => {
  const info = memberInfos.value[address]
  const roles = info?.roles || []
  return roles.slice(0, 3).map(r => UserRoleUtils.getRoleDisplayName(r))
}

const isFriendSelected = (address: string) => {
  const norm = String(address || '').toLowerCase()
  return selectedFriendAddresses.value.some(a => String(a || '').toLowerCase() === norm)
}

const toggleFriendSelection = (address: string) => {
  const norm = String(address || '').toLowerCase()
  if (!norm) return
  if (isFriendSelected(address)) {
    selectedFriendAddresses.value = selectedFriendAddresses.value.filter(a => String(a || '').toLowerCase() !== norm)
  } else {
    selectedFriendAddresses.value = [...selectedFriendAddresses.value, address]
  }
}

const clearFriendSelection = () => {
  selectedFriendAddresses.value = []
}

const selectAllFilteredFriends = () => {
  const addrs = filteredFriendCandidates.value.map(f => f.address).filter(Boolean)
  selectedFriendAddresses.value = Array.from(new Set(addrs.map(a => String(a))))
}

const selectedFriendCount = computed(() => selectedFriendAddresses.value.length)

// 获取角色文本
const getRoleText = (member: any) => {
  // TODO: 从用户信息服务获取真实角色
  if (groupInfo.value?.group_type === 'FAMILY') {
    return '家属'
  } else if (groupInfo.value?.group_type?.includes('DOCTOR') || groupInfo.value?.group_type === 'HOSPITAL') {
    return '医护人员'
  }
  return '成员'
}

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'accepted': return '已加入'
    case 'pending': return '待确认'
    case 'suspended': return '已暂停'
    case 'rejected': return '已拒绝'
    default: return '未知状态'
  }
}

const inviteToGroup = () => {
  if (!groupInfo.value) {
    uiService.toast('群组信息未加载，请稍后重试', { type: 'warning' })
    return
  }

  router.push({
    name: 'Invitation',
    query: {
      groupId: groupId.value,
      groupName: groupInfo.value.group_name,
      groupType: groupInfo.value.group_type,
    }
  })
}

const extractAddressFromInput = (value: string): string | null => {
  const addressRegex = /(0x[a-fA-F0-9]{40})/
  const match = String(value || '').trim().match(addressRegex)
  return match?.[1] || null
}

const addMemberByAddress = async (address: string): Promise<boolean> => {
  if (!isGroupOwner.value) {
    uiService.toast('只有群主可以添加成员', { type: 'warning' })
    return false
  }

  if (!address) {
    uiService.toast('地址格式不正确', { type: 'error' })
    return false
  }

  try {
    addingMember.value = true
    await relationService.addGroupMember(groupId.value, address)
    uiService.toast('成员已添加', { type: 'success' })

    try {
      const { aaService } = await import('@/service/accountAbstraction')
      const wallet = aaService.getEOAWallet()
      if (!wallet) {
        throw new Error('无法获取钱包')
      }

      const { accessGroupKeyService } = await import('@/service/accessGroupKeyService')
      const result = await accessGroupKeyService.shareGroupKeyToMembers(wallet, groupId.value, [address])
      uiService.toast(`已发送组密钥(v${result.keyVersion})给新成员`, { type: 'success', durationMs: 2400 })
    } catch (shareError: any) {
      console.error('发送组密钥失败:', shareError)
      uiService.toast('成员已添加，但发送组密钥失败，请稍后重试', { type: 'warning', durationMs: 2600 })
    }

    await loadGroupDetail()
    return true
  } catch (error: any) {
    console.error('添加成员失败:', error)
    uiService.toast('添加失败: ' + (error.message || '未知错误'), { type: 'error' })
    return false
  } finally {
    addingMember.value = false
  }
}

const loadFriendCandidates = async () => {
  try {
    friendsLoading.value = true

    const myRelationships = await relationService.getMyRelationships()
    const friends = (myRelationships.asOwner || [])
      .filter(r => r.access_group_name === '好友')
      .filter(r => r.status === 'active' || r.status === 'accepted')
      .map(r => r.visitor_address)
      .filter(addr => !!addr)

    const existingMembers = new Set(
      (members.value || [])
        .map(m => String(m?.viewer_address || '').toLowerCase())
        .filter(v => !!v)
    )

    const uniq: string[] = []
    const seen = new Set<string>()
    for (const addr of friends) {
      const norm = String(addr).toLowerCase()
      if (!norm) continue
      if (existingMembers.has(norm)) continue
      if (seen.has(norm)) continue
      seen.add(norm)
      uniq.push(addr)
    }

    if (uniq.length > 0) {
      try {
        const remarkMap = await memberRemarkService.getBatchRemarks(uniq)
        memberRemarks.value = { ...memberRemarks.value, ...(remarkMap || {}) }
      } catch (e) {
        console.warn('加载好友备注失败（不影响添加）:', e)
      }

      for (const addr of uniq) {
        if (memberInfos.value[addr]) continue
        try {
          const info = await memberInfoService.getMemberInfo(addr)
          if (info) {
            memberInfos.value[info.smart_account] = info
            memberInfos.value[addr] = info
            if (info.eoa_address) {
              memberInfos.value[info.eoa_address] = info
            }
          }
        } catch (e) {
          console.warn('加载好友信息失败（不影响添加）:', e)
        }
      }
    }

    friendCandidates.value = uniq.map(address => ({ address }))
  } catch (error: any) {
    console.error('加载好友列表失败:', error)
    uiService.toast('加载好友列表失败: ' + (error.message || '未知错误'), { type: 'warning' })
    friendCandidates.value = []
  } finally {
    friendsLoading.value = false
  }
}

const openAddMemberModal = async () => {
  if (!isGroupOwner.value) {
    uiService.toast('只有群主可以添加成员', { type: 'warning' })
    return
  }

  showAddMemberModal.value = true
  friendSearch.value = ''
  clearFriendSelection()
  await loadFriendCandidates()
}

const closeAddMemberModal = () => {
  showAddMemberModal.value = false
  clearFriendSelection()
}

const addMembersByAddresses = async (addresses: string[]): Promise<{ success: string[]; failed: { address: string; error: any }[] }> => {
  const normalized = Array.from(
    new Set(
      (addresses || [])
        .filter(Boolean)
        .map(a => String(a).trim())
        .filter(a => !!a)
    )
  )

  if (!isGroupOwner.value) {
    uiService.toast('只有群主可以添加成员', { type: 'warning' })
    return { success: [], failed: normalized.map(a => ({ address: a, error: new Error('not_owner') })) }
  }

  if (normalized.length === 0) {
    uiService.toast('请先选择要添加的好友', { type: 'warning' })
    return { success: [], failed: [] }
  }

  const success: string[] = []
  const failed: { address: string; error: any }[] = []

  try {
    addingMember.value = true

    for (const addr of normalized) {
      try {
        await relationService.addGroupMember(groupId.value, addr)
        success.push(addr)
      } catch (e: any) {
        failed.push({ address: addr, error: e })
      }
    }

    if (success.length > 0) {
      try {
        const { aaService } = await import('@/service/accountAbstraction')
        const wallet = aaService.getEOAWallet()
        if (!wallet) {
          throw new Error('无法获取钱包')
        }
        const { accessGroupKeyService } = await import('@/service/accessGroupKeyService')
        const result = await accessGroupKeyService.shareGroupKeyToMembers(wallet, groupId.value, success)
        uiService.toast(`已发送组密钥(v${result.keyVersion})给 ${success.length} 个新成员`, { type: 'success', durationMs: 2400 })
      } catch (shareError: any) {
        console.error('批量发送组密钥失败:', shareError)
        uiService.toast('成员已添加，但批量发送组密钥失败，请稍后重试', { type: 'warning', durationMs: 2600 })
      }
    }

    const summary = `添加完成：成功 ${success.length}，失败 ${failed.length}`
    uiService.toast(summary, { type: failed.length > 0 ? 'warning' : 'success', durationMs: 2600 })

    await loadGroupDetail()
    if (showAddMemberModal.value) {
      await loadFriendCandidates()
    }
  } finally {
    addingMember.value = false
  }

  return { success, failed }
}

const addSelectedFriends = async () => {
  const { success } = await addMembersByAddresses(selectedFriendAddresses.value)
  if (success.length > 0) {
    closeAddMemberModal()
  }
}

const filteredFriendCandidates = computed(() => {
  const q = friendSearch.value.trim().toLowerCase()
  if (!q) return friendCandidates.value

  return friendCandidates.value.filter(f => {
    const addr = String(f.address || '').toLowerCase()
    const name = String(getMemberDisplayName(f.address) || '').toLowerCase()
    const remark = String(memberRemarks.value[f.address] || '').toLowerCase()
    return addr.includes(q) || name.includes(q) || remark.includes(q)
  })
})

const addMemberByPrompt = async () => {
  const input = await uiService.prompt({
    title: '添加成员',
    message: '请输入成员 Smart Account 地址',
    placeholder: '0x...',
    confirmText: '添加',
    cancelText: '取消',
  })
  if (!input) return

  const address = extractAddressFromInput(input)
  const ok = await addMemberByAddress(address || '')
  if (ok) {
    closeAddMemberModal()
  }
}

const addMemberToGroup = async (address: string) => {
  const ok = await addMemberByAddress(address)
  if (ok) {
    closeAddMemberModal()
  }
}

// 显示成员操作菜单
const showMemberActions = (member: any) => {
  selectedMember.value = member
}

// 关闭成员操作菜单
const closeMemberActions = () => {
  selectedMember.value = null
}

// 暂停成员访问
const suspendMember = async () => {
  if (!selectedMember.value) return
  
  try {
    await relationService.suspendRelationship(selectedMember.value.id)
    uiService.toast('已暂停该成员的访问权限', { type: 'success' })
    await loadGroupDetail()
    closeMemberActions()
  } catch (error: any) {
    console.error('暂停失败:', error)
    uiService.toast('操作失败: ' + (error.message || '未知错误'), { type: 'error' })
  }
}

// 撤销成员授权
const revokeMember = async () => {
  if (!selectedMember.value) return
  
  const ok = await uiService.confirm('确定要撤销该成员的授权吗？此操作不可恢复。', {
    title: '确认撤销',
    confirmText: '撤销',
    cancelText: '取消',
  })
  if (!ok) {
    return
  }
  
  try {
    await relationService.revokeRelationship(selectedMember.value.id)

    try {
      const { aaService } = await import('@/service/accountAbstraction')
      const wallet = aaService.getEOAWallet()
      if (!wallet) {
        throw new Error('无法获取钱包')
      }

      const { accessGroupKeyService } = await import('@/service/accessGroupKeyService')
      const result = await accessGroupKeyService.rotateGroupKeyAndShare(
        wallet,
        groupId.value,
        selectedMember.value.viewer_address
      )

      uiService.toast(
        `已撤销该成员的授权，已轮换组密钥(v${result.keyVersion})并发送给 ${result.sharedCount} 个成员`,
        { type: 'success', durationMs: 2800 }
      )
    } catch (rotateError: any) {
      console.error('轮换组密钥失败:', rotateError)
      await uiService.alert('已撤销该成员的授权，但密钥轮换失败，请稍后重试（否则撤权无法生效）', {
        title: '提示',
      })
    }

    await loadGroupDetail()
    closeMemberActions()
  } catch (error: any) {
    console.error('撤销失败:', error)
    uiService.toast('操作失败: ' + (error.message || '未知错误'), { type: 'error' })
  }
}

// 显示备注编辑器
const showRemarkModal = async (member: any) => {
  remarkTarget.value = member
  // 加载现有备注
  const existingRemark = await memberRemarkService.getRemark(member.viewer_address)
  remarkInput.value = existingRemark
  showRemarkEditor.value = true
}

// 关闭备注编辑器
const closeRemarkModal = () => {
  showRemarkEditor.value = false
  remarkTarget.value = null
  remarkInput.value = ''
}

// 保存备注
const saveRemark = async () => {
  if (!remarkTarget.value || !remarkInput.value.trim()) {
    return
  }
  
  try {
    await memberRemarkService.setRemark(remarkTarget.value.viewer_address, remarkInput.value.trim())
    // 更新本地显示
    memberRemarks.value[remarkTarget.value.viewer_address] = remarkInput.value.trim()
    console.log('备注已保存')
    closeRemarkModal()
  } catch (error) {
    console.error('保存备注失败:', error)
    uiService.toast('保存失败，请重试', { type: 'error' })
  }
}

// 删除备注
const deleteRemark = async () => {
  if (!remarkTarget.value) {
    return
  }
  
  const ok = await uiService.confirm('确定要删除该备注吗？', {
    title: '确认删除',
    confirmText: '删除',
    cancelText: '取消',
  })
  if (!ok) {
    return
  }
  
  try {
    await memberRemarkService.deleteRemark(remarkTarget.value.viewer_address)
    // 更新本地显示
    delete memberRemarks.value[remarkTarget.value.viewer_address]
    console.log('备注已删除')
    closeRemarkModal()
  } catch (error) {
    console.error('删除备注失败:', error)
    uiService.toast('删除失败，请重试', { type: 'error' })
  }
}

const goBack = () => {
  router.back()
}

onMounted(async () => {
  await loadGroupDetail()

  const handler = (ev: any) => {
    try {
      const payload = ev?.detail?.payload
      const gid = payload?.group_id != null ? String(payload.group_id) : ''
      if (!gid || gid !== String(groupId.value)) return

      const plansShared = payload?.plans_shared != null ? Number(payload.plans_shared) : 0
      const statsShared = payload?.stats_shared != null ? Number(payload.stats_shared) : 0
      const keyVersion = payload?.key_version != null ? Number(payload.key_version) : undefined

      refreshSharedData()
      uiService.toast(
        `同步完成：计划 ${plansShared} 条，统计 ${statsShared} 条${keyVersion != null ? `，密钥版本 v${keyVersion}` : ''}`,
        { type: 'success', durationMs: 2800 }
      )
    } catch (e) {
      console.warn('处理 sync_done 事件失败（不影响页面）:', e)
    }
  }

  ;(window as any).__syncDoneHandler = handler
  window.addEventListener('sync_done', handler as any)
})

onBeforeUnmount(() => {
  const handler = (window as any).__syncDoneHandler
  if (handler) {
    window.removeEventListener('sync_done', handler)
    ;(window as any).__syncDoneHandler = undefined
  }
})

// 页面激活时也重新加载（从其他页面返回时）
onActivated(async () => {
  console.log('页面激活，重新加载群组详情')
  await loadGroupDetail()
})
</script>

<style scoped>
.group-detail-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  flex: 1;
  text-align: center;
}

.add-btn {
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.sync-btn {
  margin-top: 12px;
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.group-info-card {
  background: #667eea;
  margin: 20px;
  padding: 30px 20px;
  border-radius: 16px;
  color: white;
  text-align: center;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
}

.group-icon-large {
  font-size: 4rem;
  margin-bottom: 15px;
}

.group-details {
  text-align: center;
}

.group-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.group-type {
  font-size: 0.95rem;
  opacity: 0.9;
  margin: 0 0 10px 0;
}

.group-desc {
  font-size: 0.9rem;
  opacity: 0.85;
  margin: 0 0 15px 0;
}

.group-stats {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255,255,255,0.2);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.stat-icon {
  font-size: 1.1rem;
}

.loading-container {
  text-align: center;
  padding: 40px 20px;
  color: #a0aec0;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 10px;
  border: 3px solid #e2e8f0;
  border-top-color: #4299e1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  margin: 20px;
  padding: 15px;
  background-color: #fed7d7;
  border-left: 4px solid #e53e3e;
  border-radius: 8px;
  color: #c53030;
}

.members-section {
  padding: 20px;
}

.section-header {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

 .header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
 }

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.refresh-btn {
  background: none;
  border: 1px solid #e2e8f0;
  color: #4a5568;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #a0aec0;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 1rem;
}

.empty-hint {
  font-size: 0.9rem;
  color: #cbd5e0;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.member-card {
  background-color: white;
  border-radius: 12px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.member-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: #f7fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-icon {
  font-size: 1.3rem;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.member-address-sub {
  font-size: 0.8rem;
  color: #718096;
  font-family: monospace;
  margin: 0 0 6px 0;
}

.member-role {
  font-size: 0.85rem;
  color: #718096;
  margin: 0 0 4px 0;
}

.member-status {
  font-size: 0.8rem;
  font-weight: 500;
  margin: 0;
}

.member-status.accepted {
  color: #48bb78;
}

.member-status.pending {
  color: #ed8936;
}

.member-status.suspended {
  color: #e53e3e;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.accepted {
  background-color: #48bb78;
}

.status-indicator.pending {
  background-color: #ed8936;
}

.status-indicator.suspended {
  background-color: #e53e3e;
}

.action-menu-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

 .modal-overlay.modal-center {
  align-items: center;
  padding: 20px;
 }

 .friend-picker-modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
 }

 .friend-picker-actions {
  display: flex;
  gap: 10px;
  align-items: center;
 }

 .friend-search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
 }

 .friend-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 46vh;
  overflow-y: auto;
 }

 .friend-item {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
 }

 .friend-item.selected {
  border-color: #667eea;
  background: #eef2ff;
 }

 .friend-select-checkbox {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
 }

 .friend-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
 }

 .friend-info {
  flex: 1;
  min-width: 0;
 }

 .friend-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
 }

 .friend-address {
  margin-top: 2px;
  font-size: 12px;
  color: #718096;
  font-family: monospace;
 }

 .friend-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
 }

 .friend-tag {
  padding: 3px 8px;
  border-radius: 10px;
  background: #e6fffa;
  border: 1px solid #a7f3d0;
  color: #047857;
  font-size: 11px;
  font-weight: 600;
 }

 .friend-add-btn {
  border: none;
  background: #4299e1;
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
 }

 .friend-add-btn:disabled {
  opacity: 0.6;
 }

 .friend-picker-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
 }

 .friend-footer-spacer {
  flex: 1;
 }

 .friend-footer-btn {
  border: none;
  background: #edf2f7;
  color: #4a5568;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
 }

 .friend-footer-btn:disabled {
  opacity: 0.6;
 }

 .friend-add-selected-btn {
  border: none;
  background: #667eea;
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 800;
 }

 .friend-add-selected-btn:disabled {
  opacity: 0.6;
 }

.action-sheet,
.invite-type-sheet {
  background-color: white;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 600px;
  padding-bottom: 20px;
}

.action-header,
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.action-header h3,
.sheet-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px;
}

.type-options {
  padding: 10px 0;
}

.type-option-btn {
  width: 100%;
  background: none;
  border: none;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.type-option-btn:hover {
  background-color: #f7fafc;
}

.type-option-btn .type-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.type-option-btn .type-info {
  text-align: left;
  flex: 1;
}

.type-option-btn .type-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.type-option-btn .type-info p {
  font-size: 0.9rem;
  color: #718096;
  margin: 0;
}

.action-list {
  padding: 10px 0;
}

.action-item {
  width: 100%;
  background: none;
  border: none;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 1rem;
  color: #2d3748;
  transition: background-color 0.2s;
}

.action-item:hover {
  background-color: #f7fafc;
}

.action-item.suspend {
  color: #ed8936;
}

.action-item.revoke {
  color: #e53e3e;
}

.action-icon {
  font-size: 1.3rem;
}

/* 成员备注相关样式 */
.member-remark {
  font-size: 0.85rem;
  color: #4299e1;
  margin: 4px 0;
  font-weight: 500;
}

.remark-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 8px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
  margin-right: 8px;
}

.remark-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.remark-modal {
  background: white;
  border-radius: 20px;
  padding: 0;
  max-width: 420px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

.remark-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.remark-modal .modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.remark-modal .modal-content {
  padding: 20px;
}

.member-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: #f7fafc;
  border-radius: 12px;
  margin-bottom: 20px;
}

.preview-avatar {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.preview-address {
  font-size: 0.95rem;
  color: #4a5568;
  font-weight: 500;
}

.remark-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.remark-input:focus {
  outline: none;
  border-color: #4299e1;
}

.quick-remarks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 15px;
  margin-bottom: 20px;
}

.quick-remark-btn {
  padding: 8px 16px;
  background: #edf2f7;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-remark-btn:hover {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.delete-remark-btn,
.save-remark-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-remark-btn {
  background: #fff5f5;
  color: #e53e3e;
  border: 1px solid #feb2b2;
}

.delete-remark-btn:hover {
  background: #fed7d7;
}

.save-remark-btn {
  background: #4299e1;
  color: white;
}

.save-remark-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.save-remark-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

