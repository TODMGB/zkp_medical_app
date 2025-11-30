<template>
  <div class="history-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">用药记录</h1>
      <div class="header-actions">
        <button class="view-toggle" @click="toggleView">
          <component :is="currentView === 'calendar' ? List : Calendar" class="icon-small" />
          {{ currentView === 'calendar' ? '列表' : '日历' }}
        </button>
      </div>
    </div>
    
    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <CheckCircle2 class="stat-icon" />
        <div class="stat-value">{{ weeklyStats.completed }}</div>
        <div class="stat-label">本周完成</div>
      </div>
      <div class="stat-card">
        <Activity class="stat-icon" />
        <div class="stat-value">{{ weeklyStats.total }}</div>
        <div class="stat-label">总任务</div>
      </div>
      <div class="stat-card">
        <TrendingUp class="stat-icon" />
        <div class="stat-value">{{ adherenceRate }}%</div>
        <div class="stat-label">依从率</div>
      </div>
    </div>
    
    <!-- 日历视图 -->
    <div v-if="currentView === 'calendar'" class="calendar-section">
      <div class="calendar-header">
        <button class="month-nav" @click="previousMonth">
          <ChevronLeft class="icon" />
        </button>
        <h3 class="month-title">{{ currentMonth }}</h3>
        <button class="month-nav" @click="nextMonth">
          <ChevronRight class="icon" />
        </button>
      </div>
      
      <div class="calendar-grid">
        <div class="calendar-day" v-for="day in calendarDays" :key="day.date">
          <div class="day-number">{{ day.day }}</div>
          <div
            v-if="day.medicationData"
            class="medication-indicator"
            :class="day.medicationData.status"
            @click="selectDate(day.date)"
          ></div>
        </div>
      </div>
      
      <!-- 选中日期的详细信息 -->
      <div v-if="selectedDate" class="selected-date-details">
        <h4 class="selected-date-title">
          <Calendar class="title-icon" />
          {{ selectedDate }}
        </h4>
        <div class="medication-list">
          <div
            v-for="medication in selectedDateMedications"
            :key="medication.id"
            class="medication-item"
            :class="medication.status"
            @click="viewMedicationDetail(medication)"
          >
            <div class="medication-time">
              <Clock class="time-icon" />
              {{ medication.time }}
            </div>
            <div class="medication-info">
              <div class="medication-name">{{ medication.name }}</div>
              <div class="medication-dosage">{{ medication.dosage }}</div>
            </div>
            <div class="medication-status">
              <CheckCircle2 v-if="medication.status === 'completed'" class="status-icon success" />
              <XCircle v-else-if="medication.status === 'missed'" class="status-icon error" />
              <MinusCircle v-else class="status-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 列表视图 -->
    <div v-else class="list-section">
      <div class="list-filters">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="filter-btn"
          :class="{ active: selectedFilter === filter.value }"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div class="medication-timeline">
        <div
          v-for="day in filteredHistory"
          :key="day.date"
          class="timeline-day"
        >
          <div class="day-header">
            <span class="day-date">{{ day.date }}</span>
            <span class="day-summary">
              <CheckCircle2 class="summary-icon" />
              {{ day.completed }}/{{ day.total }}
            </span>
          </div>
          <div class="day-medications">
            <div
              v-for="medication in day.medications"
              :key="medication.id"
              class="timeline-medication"
              :class="medication.status"
              @click="viewMedicationDetail(medication)"
            >
              <div class="timeline-time">
                <Clock class="time-icon" />
                {{ medication.time }}
              </div>
              <div class="timeline-content">
                <div class="timeline-name">{{ medication.name }}</div>
                <div class="timeline-dosage">{{ medication.dosage }}</div>
              </div>
              <div class="timeline-status">
                <CheckCircle2 v-if="medication.status === 'completed'" class="status-icon success" />
                <XCircle v-else-if="medication.status === 'missed'" class="status-icon error" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import { useRouter } from 'vue-router'
import { checkinStorageService, type CheckInRecord } from '@/service/checkinStorage'
import { 
  ArrowLeft, 
  List, 
  Calendar, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  XCircle, 
  MinusCircle 
} from 'lucide-vue-next'

const router = useRouter()

const currentView = ref<'calendar' | 'list'>('calendar')
const selectedDate = ref('')
const selectedFilter = ref('all')
const allRecords = ref<CheckInRecord[]>([])
const loading = ref(false)

// 当前显示的月份
const currentMonthDate = ref(new Date())

const weeklyStats = ref({
  completed: 0,
  total: 0,
  missed: 0
})

const adherenceRate = computed(() => {
  if (weeklyStats.value.total === 0) return 0
  return Math.round((weeklyStats.value.completed / weeklyStats.value.total) * 100)
})

// 当前月份标题
const currentMonth = computed(() => {
  const year = currentMonthDate.value.getFullYear()
  const month = currentMonthDate.value.getMonth() + 1
  return `${year}年${month}月`
})

const calendarDays = ref<CalendarDay[]>([])

const filters = [
  { label: '全部', value: 'all' },
  { label: '已完成', value: 'completed' },
  { label: '已漏服', value: 'missed' }
]

interface Medication {
  id: string
  time: string
  name: string
  dosage: string
  status: string
  medication_code: string
  timestamp: number
}

interface MedicationDay {
  date: string
  medications: Medication[]
  completed?: number
  total?: number
}

interface CalendarDay {
  day: number
  date: string
  medicationData: { status: string; count: number } | null
}

const selectedDateMedications = ref<Medication[]>([])

// 将打卡记录转换为用药历史格式
const medicationHistory = computed<MedicationDay[]>(() => {
  // 按日期分组
  const groupedByDate: Record<string, CheckInRecord[]> = {}
  
  allRecords.value.forEach(record => {
    const dateKey = new Date(record.timestamp).toISOString().split('T')[0]
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = []
    }
    groupedByDate[dateKey].push(record)
  })
  
  // 转换为 MedicationDay 格式
  return Object.entries(groupedByDate)
    .map(([date, records]) => {
      const medications: Medication[] = records.map(record => ({
        id: record.id,
        time: formatTime(record.timestamp),
        name: record.medication_name,
        dosage: record.dosage,
        status: 'completed', // 所有打卡记录都是已完成
        medication_code: record.medication_code,
        timestamp: record.timestamp,
      }))
      
      return {
        date,
        medications,
        completed: medications.length,
        total: medications.length,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
})

const filteredHistory = computed(() => {
  if (selectedFilter.value === 'all') {
    return medicationHistory.value
  }
  
  return medicationHistory.value.map(day => ({
    ...day,
    medications: day.medications.filter(med => med.status === selectedFilter.value)
  })).filter(day => day.medications.length > 0)
})

const toggleView = () => {
  currentView.value = currentView.value === 'calendar' ? 'list' : 'calendar'
}

const goBack = () => {
  router.back()
}

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

/**
 * 选择日期
 */
const selectDate = (date: string) => {
  selectedDate.value = date
  const dayData = medicationHistory.value.find(d => d.date === date)
  selectedDateMedications.value = dayData ? dayData.medications : []
}

/**
 * 查看药物记录详情
 */
const viewMedicationDetail = (medication: Medication) => {
  router.push({
    name: 'RecordDetail',
    params: { id: medication.id }
  })
}

/**
 * 上一个月
 */
const previousMonth = () => {
  const newDate = new Date(currentMonthDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentMonthDate.value = newDate
  generateCalendarDays()
}

/**
 * 下一个月
 */
const nextMonth = () => {
  const newDate = new Date(currentMonthDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentMonthDate.value = newDate
  generateCalendarDays()
}

/**
 * 生成日历天数
 */
const generateCalendarDays = () => {
  const year = currentMonthDate.value.getFullYear()
  const month = currentMonthDate.value.getMonth()
  
  // 获取当月第一天和最后一天
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // 获取日历起始日期（包含上月末尾的日期）
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  // 获取日历结束日期（包含下月开头的日期）
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
  
  // 创建日期-记录映射
  const recordDateMap = new Map<string, number>()
  allRecords.value.forEach(record => {
    const dateKey = new Date(record.timestamp).toISOString().split('T')[0]
    recordDateMap.set(dateKey, (recordDateMap.get(dateKey) || 0) + 1)
  })
  
  // 生成日期数组
  const days: CalendarDay[] = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    const count = recordDateMap.get(dateKey) || 0
    
    days.push({
      day: currentDate.getDate(),
      date: dateKey,
      medicationData: count > 0 ? { status: 'completed', count } : null
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  calendarDays.value = days
}

/**
 * 加载打卡记录数据
 */
const loadRecords = async () => {
  try {
    loading.value = true
    
    // 从本地存储加载所有打卡记录
    allRecords.value = await checkinStorageService.getAllRecords()
    
    // 加载本周统计数据
    const stats = await checkinStorageService.getStats()
    weeklyStats.value = {
      completed: stats.thisWeekCount,
      total: stats.thisWeekCount, // 暂时用已完成的数量
      missed: 0 // 暂时没有漏服统计
    }
    
    // 生成日历
    generateCalendarDays()
    
    console.log(`✅ 加载用药记录: ${allRecords.value.length} 条`)
  } catch (error: any) {
    console.error('加载用药记录失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadRecords()
})
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 80px;
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

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.icon {
  width: 24px;
  height: 24px;
}

.icon-small {
  width: 18px;
  height: 18px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin: 0;
  flex: 1;
  text-align: center;
}

.view-toggle {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(5px);
}

.view-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 20px;
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s;
  border: 1px solid var(--border-color);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 28px;
  height: 28px;
  color: #667eea;
  margin: 0 auto 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #4c51bf;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #718096;
  font-weight: 500;
}

.calendar-section {
  padding: 20px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.month-nav {
  background: white;
  border: 1px solid var(--border-color);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #4a5568;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.month-nav:hover {
  background: var(--primary-50);
  border-color: var(--color-primary);
  transform: scale(1.1);
}

.month-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.calendar-day {
  aspect-ratio: 1;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.calendar-day:hover {
  background: var(--primary-50);
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.day-number {
  font-size: 14px;
  color: #2d3748;
  font-weight: 600;
}

.medication-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 4px;
}

.medication-indicator.completed {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.medication-indicator.missed {
  background: #ef4444;
}

.selected-date-details {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.selected-date-title {
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  width: 20px;
  height: 20px;
  color: #667eea;
}

.medication-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.medication-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-body);
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.medication-item:hover {
  background: var(--primary-50);
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
  border-color: var(--primary-200);
}

.medication-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  min-width: 70px;
}

.time-icon {
  width: 16px;
  height: 16px;
}

.medication-info {
  flex: 1;
}

.medication-name {
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 2px;
}

.medication-dosage {
  font-size: 13px;
  color: #718096;
}

.medication-status {
  flex-shrink: 0;
}

.status-icon {
  width: 20px;
  height: 20px;
}

.status-icon.success {
  color: #22c55e;
}

.status-icon.error {
  color: #ef4444;
}

.list-section {
  padding: 20px;
}

.list-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-btn {
  background: white;
  border: 1px solid var(--border-color);
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #718096;
  flex: 1;
}

.filter-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: var(--shadow-sm);
  transform: scale(1.02);
}

.filter-btn:hover:not(.active) {
  background: var(--primary-50);
  border-color: var(--color-primary);
}

.medication-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-day {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: all 0.3s;
}

.timeline-day:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-body);
  border-bottom: 1px solid var(--border-color);
}

.day-date {
  font-weight: 700;
  font-size: 15px;
  color: #2d3748;
}

.day-summary {
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--primary-50);
  border-radius: 10px;
}

.summary-icon {
  width: 14px;
  height: 14px;
}

.day-medications {
  padding: 0;
}

.timeline-medication {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.timeline-medication::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
  opacity: 0;
  transition: opacity 0.3s;
}

.timeline-medication:hover::before {
  opacity: 1;
}

.timeline-medication:hover {
  background: var(--bg-body);
  transform: translateX(4px);
}

.timeline-medication:last-child {
  border-bottom: none;
}

.timeline-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  min-width: 70px;
}

.timeline-content {
  flex: 1;
}

.timeline-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.timeline-dosage {
  font-size: 13px;
  color: var(--text-secondary);
}

.timeline-status {
  flex-shrink: 0;
}
</style>
