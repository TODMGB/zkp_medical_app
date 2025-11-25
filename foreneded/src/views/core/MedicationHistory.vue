<template>
  <div class="history-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">用药记录</h1>
      <div class="header-actions">
        <button class="view-toggle" @click="toggleView">
          {{ currentView === 'calendar' ? '列表' : '日历' }}
        </button>
      </div>
    </div>
    
    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">{{ weeklyStats.completed }}</div>
        <div class="stat-label">本周完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ weeklyStats.total }}</div>
        <div class="stat-label">总任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ adherenceRate }}%</div>
        <div class="stat-label">依从率</div>
      </div>
    </div>
    
    <!-- 日历视图 -->
    <div v-if="currentView === 'calendar'" class="calendar-section">
      <div class="calendar-header">
        <button class="month-nav" @click="previousMonth">‹</button>
        <h3 class="month-title">{{ currentMonth }}</h3>
        <button class="month-nav" @click="nextMonth">›</button>
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
        <h4 class="selected-date-title">{{ selectedDate }}</h4>
        <div class="medication-list">
          <div
            v-for="medication in selectedDateMedications"
            :key="medication.id"
            class="medication-item"
            :class="medication.status"
            @click="viewMedicationDetail(medication)"
          >
            <div class="medication-time">{{ medication.time }}</div>
            <div class="medication-info">
              <div class="medication-name">{{ medication.name }}</div>
              <div class="medication-dosage">{{ medication.dosage }}</div>
            </div>
            <div class="medication-status">
              <span v-if="medication.status === 'completed'">✓</span>
              <span v-else-if="medication.status === 'missed'">✗</span>
              <span v-else>-</span>
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
            <span class="day-summary">{{ day.completed }}/{{ day.total }} 完成</span>
          </div>
          <div class="day-medications">
            <div
              v-for="medication in day.medications"
              :key="medication.id"
              class="timeline-medication"
              :class="medication.status"
              @click="viewMedicationDetail(medication)"
            >
              <div class="timeline-time">{{ medication.time }}</div>
              <div class="timeline-content">
                <div class="timeline-name">{{ medication.name }}</div>
                <div class="timeline-dosage">{{ medication.dosage }}</div>
              </div>
              <div class="timeline-status">
                <span v-if="medication.status === 'completed'">✓</span>
                <span v-else-if="medication.status === 'missed'">✗</span>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 1.5rem;
  color: white;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-4px);
}

.page-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.view-toggle {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.view-toggle:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.stats-overview {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  gap: 15px;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px 16px;
  text-align: center;
  flex: 1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 600;
}

.calendar-section {
  padding: 20px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 0 8px;
}

.month-nav {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  font-size: 1.5rem;
  color: white;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.3s;
  font-weight: bold;
}

.month-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.month-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.calendar-day {
  aspect-ratio: 1;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
}

.calendar-day:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 100%);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: rgba(102, 126, 234, 0.3);
}

.day-number {
  font-size: 0.95rem;
  color: #2d3748;
  font-weight: 600;
}

.medication-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.medication-indicator.completed {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  animation: pulse 2s infinite;
}

.medication-indicator.missed {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.selected-date-details {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.selected-date-title {
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 20px 0;
}

.medication-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.medication-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.medication-item:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  transform: translateX(8px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.3);
}

.medication-time {
  font-size: 0.95rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  min-width: 60px;
}

.medication-info {
  flex: 1;
}

.medication-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.medication-dosage {
  font-size: 0.9rem;
  color: #718096;
  font-weight: 500;
}

.medication-status {
  font-size: 1.2rem;
  font-weight: bold;
}

.medication-item.completed .medication-status {
  color: #48bb78;
}

.medication-item.missed .medication-status {
  color: #f56565;
}

.list-section {
  padding: 20px;
}

.list-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
}

.filter-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid transparent;
  padding: 10px 20px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: white;
  flex: 1;
}

.filter-btn.active {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  color: #667eea;
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.filter-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.3);
}

.medication-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-day {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
}

.timeline-day:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.day-date {
  font-weight: 700;
  font-size: 1.05rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.day-summary {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 600;
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
}

.day-medications {
  padding: 8px 0;
}

.timeline-medication {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
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
  width: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.timeline-medication:hover::before {
  opacity: 1;
}

.timeline-medication:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  transform: translateX(8px);
}

.timeline-medication:last-child {
  border-bottom: none;
}

.timeline-time {
  font-size: 0.95rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  min-width: 60px;
}

.timeline-content {
  flex: 1;
}

.timeline-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.timeline-dosage {
  font-size: 0.9rem;
  color: #718096;
  font-weight: 500;
}

.timeline-status {
  font-size: 1.4rem;
  font-weight: bold;
}

.timeline-medication.completed .timeline-status {
  color: #48bb78;
  filter: drop-shadow(0 2px 4px rgba(72, 187, 120, 0.3));
}

.timeline-medication.missed .timeline-status {
  color: #f56565;
  filter: drop-shadow(0 2px 4px rgba(245, 101, 101, 0.3));
}
</style>
