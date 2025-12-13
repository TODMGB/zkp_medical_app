<template>
  <div class="cache-manager">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <ArrowLeft class="icon" />
      </button>
      <h1 class="page-title">缓存管理</h1>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <!-- 操作按钮 -->
      <div class="action-bar">
        <button class="btn btn-primary" @click="refreshCache">
          <RefreshCw class="btn-icon" />
          刷新缓存
        </button>
        <button class="btn btn-danger" @click="clearAllCache">
          <Trash2 class="btn-icon" />
          清除所有
        </button>
      </div>

      <!-- 缓存统计 -->
      <div class="stats-section">
        <h2 class="section-title">缓存统计</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">总缓存项数</div>
            <div class="stat-value">{{ totalCacheItems }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总缓存大小</div>
            <div class="stat-value">{{ formatSize(totalCacheSize) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">最后更新</div>
            <div class="stat-value">{{ lastUpdateTime }}</div>
          </div>
        </div>
      </div>

      <!-- 缓存分类 -->
      <div class="cache-sections">
        <!-- 认证缓存 -->
        <div class="cache-category">
          <div class="category-header" @click="toggleCategory('auth')">
            <ChevronDown 
              class="toggle-icon" 
              :style="{ transform: expandedCategories.auth ? 'rotate(0deg)' : 'rotate(-90deg)' }"
            />
            <h3 class="category-title">认证信息</h3>
            <span class="item-count">{{ getItemCount('auth') }}</span>
          </div>
          <div v-if="expandedCategories.auth" class="category-content">
            <div v-for="item in cacheItems.auth" :key="item.key" class="cache-item">
              <div class="item-header">
                <span class="item-key">{{ item.key }}</span>
                <span class="item-size">{{ formatSize(item.size) }}</span>
              </div>
              <div class="item-value">{{ formatValue(item.value) }}</div>
              <div class="item-actions">
                <button class="action-btn copy-btn" @click="copyToClipboard(item.value)">
                  <Copy class="action-icon" />
                  复制
                </button>
                <button class="action-btn delete-btn" @click="deleteItem(item.key)">
                  <Trash2 class="action-icon" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 钱包缓存 -->
        <div class="cache-category">
          <div class="category-header" @click="toggleCategory('wallet')">
            <ChevronDown 
              class="toggle-icon" 
              :style="{ transform: expandedCategories.wallet ? 'rotate(0deg)' : 'rotate(-90deg)' }"
            />
            <h3 class="category-title">钱包信息</h3>
            <span class="item-count">{{ getItemCount('wallet') }}</span>
          </div>
          <div v-if="expandedCategories.wallet" class="category-content">
            <div v-for="item in cacheItems.wallet" :key="item.key" class="cache-item">
              <div class="item-header">
                <span class="item-key">{{ item.key }}</span>
                <span class="item-size">{{ formatSize(item.size) }}</span>
              </div>
              <div class="item-value">{{ formatValue(item.value) }}</div>
              <div class="item-actions">
                <button class="action-btn copy-btn" @click="copyToClipboard(item.value)">
                  <Copy class="action-icon" />
                  复制
                </button>
                <button class="action-btn delete-btn" @click="deleteItem(item.key)">
                  <Trash2 class="action-icon" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 打卡缓存 -->
        <div class="cache-category">
          <div class="category-header" @click="toggleCategory('checkin')">
            <ChevronDown 
              class="toggle-icon" 
              :style="{ transform: expandedCategories.checkin ? 'rotate(0deg)' : 'rotate(-90deg)' }"
            />
            <h3 class="category-title">打卡记录</h3>
            <span class="item-count">{{ getItemCount('checkin') }}</span>
          </div>
          <div v-if="expandedCategories.checkin" class="category-content">
            <div v-for="item in cacheItems.checkin" :key="item.key" class="cache-item">
              <div class="item-header">
                <span class="item-key">{{ item.key }}</span>
                <span class="item-size">{{ formatSize(item.size) }}</span>
              </div>
              <div class="item-value">{{ formatValue(item.value) }}</div>
              <div class="item-actions">
                <button class="action-btn copy-btn" @click="copyToClipboard(item.value)">
                  <Copy class="action-icon" />
                  复制
                </button>
                <button class="action-btn delete-btn" @click="deleteItem(item.key)">
                  <Trash2 class="action-icon" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 其他缓存 -->
        <div class="cache-category">
          <div class="category-header" @click="toggleCategory('other')">
            <ChevronDown 
              class="toggle-icon" 
              :style="{ transform: expandedCategories.other ? 'rotate(0deg)' : 'rotate(-90deg)' }"
            />
            <h3 class="category-title">其他数据</h3>
            <span class="item-count">{{ getItemCount('other') }}</span>
          </div>
          <div v-if="expandedCategories.other" class="category-content">
            <div v-for="item in cacheItems.other" :key="item.key" class="cache-item">
              <div class="item-header">
                <span class="item-key">{{ item.key }}</span>
                <span class="item-size">{{ formatSize(item.size) }}</span>
              </div>
              <div class="item-value">{{ formatValue(item.value) }}</div>
              <div class="item-actions">
                <button class="action-btn copy-btn" @click="copyToClipboard(item.value)">
                  <Copy class="action-icon" />
                  复制
                </button>
                <button class="action-btn delete-btn" @click="deleteItem(item.key)">
                  <Trash2 class="action-icon" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { ArrowLeft, RefreshCw, Trash2, Copy, ChevronDown } from 'lucide-vue-next'

const router = useRouter()

interface CacheItem {
  key: string
  value: any
  size: number
}

const cacheItems = ref<Record<string, CacheItem[]>>({
  auth: [],
  wallet: [],
  checkin: [],
  other: []
})

const expandedCategories = ref({
  auth: true,
  wallet: false,
  checkin: false,
  other: false
})

const totalCacheItems = computed(() => {
  return Object.values(cacheItems.value).reduce((sum, items) => sum + items.length, 0)
})

const totalCacheSize = computed(() => {
  return Object.values(cacheItems.value).reduce((sum, items) => {
    return sum + items.reduce((itemSum, item) => itemSum + item.size, 0)
  }, 0)
})

const lastUpdateTime = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN')
})

const goBack = () => {
  router.back()
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const formatValue = (value: any): string => {
  if (typeof value === 'string') {
    if (value.length > 100) {
      return value.substring(0, 100) + '...'
    }
    return value
  }
  try {
    const str = JSON.stringify(value, null, 2)
    if (str.length > 200) {
      return str.substring(0, 200) + '...'
    }
    return str
  } catch {
    return String(value)
  }
}

const copyToClipboard = async (value: any) => {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    await navigator.clipboard.writeText(text)
    console.log('✅ 已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const toggleCategory = (category: string) => {
  expandedCategories.value[category as keyof typeof expandedCategories.value] = 
    !expandedCategories.value[category as keyof typeof expandedCategories.value]
}

const getItemCount = (category: string): number => {
  return cacheItems.value[category]?.length || 0
}

const categorizeKey = (key: string): string => {
  if (key.includes('jwt') || key.includes('user_info') || key.includes('auth')) {
    return 'auth'
  } else if (key.includes('wallet') || key.includes('account') || key.includes('eoa') || key.includes('private')) {
    return 'wallet'
  } else if (key.includes('checkin') || key.includes('medication') || key.includes('weekly')) {
    return 'checkin'
  }
  return 'other'
}

const loadCache = async () => {
  try {
    const { keys } = await Preferences.keys()
    
    // 重置缓存
    cacheItems.value = {
      auth: [],
      wallet: [],
      checkin: [],
      other: []
    }

    // 加载所有缓存项
    for (const key of keys) {
      const { value } = await Preferences.get({ key })
      const category = categorizeKey(key)
      const size = value ? new Blob([value]).size : 0

      cacheItems.value[category].push({
        key,
        value,
        size
      })
    }

    console.log('✅ 缓存加载完成')
  } catch (error) {
    console.error('加载缓存失败:', error)
  }
}

const deleteItem = async (key: string) => {
  try {
    await Preferences.remove({ key })
    await loadCache()
    console.log(`✅ 已删除: ${key}`)
  } catch (error) {
    console.error('删除失败:', error)
  }
}

const clearAllCache = async () => {
  if (!confirm('确定要清除所有缓存吗？此操作无法撤销。')) {
    return
  }

  try {
    await Preferences.clear()
    await loadCache()
    console.log('✅ 所有缓存已清除')
  } catch (error) {
    console.error('清除缓存失败:', error)
  }
}

const refreshCache = async () => {
  await loadCache()
  console.log('✅ 缓存已刷新')
}

onMounted(() => {
  loadCache()
})
</script>

<style scoped>
.cache-manager {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
}

.back-btn:hover {
  color: #1f2937;
  background: #f3f4f6;
  border-radius: 8px;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.stats-section {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.cache-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cache-category {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.category-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s ease;
}

.category-header:hover {
  background: #f3f4f6;
}

.toggle-icon {
  width: 20px;
  height: 20px;
  color: #6b7280;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.category-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.item-count {
  background: #e5e7eb;
  color: #4b5563;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cache-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-key {
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f2937;
  word-break: break-all;
}

.item-size {
  font-size: 0.75rem;
  color: #9ca3af;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  margin-left: 8px;
}

.item-value {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  font-family: monospace;
  font-size: 0.8rem;
  color: #4b5563;
  margin-bottom: 8px;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-all;
  white-space: pre-wrap;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  background: white;
  color: #4b5563;
}

.copy-btn:hover {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1e40af;
}

.delete-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}

.action-icon {
  width: 14px;
  height: 14px;
}

@media (max-width: 768px) {
  .content {
    padding: 16px;
  }

  .action-bar {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .category-header {
    padding: 12px;
  }

  .category-content {
    padding: 8px;
  }

  .cache-item {
    padding: 8px;
  }
}
</style>
