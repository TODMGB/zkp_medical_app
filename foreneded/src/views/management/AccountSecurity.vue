<template>
  <div class="account-security-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1 class="page-title">账户与安全</h1>
    </div>
    
    <!-- 安全概览 -->
    <div class="security-overview">
      <div class="security-score">
        <div class="score-circle">
          <div class="score-number">{{ securityScore }}</div>
          <div class="score-label">安全评分</div>
        </div>
        <div class="score-desc">
          <h3>账户安全状态</h3>
          <p>{{ getSecurityStatus() }}</p>
        </div>
      </div>
    </div>
    
    <!-- 安全设置 -->
    <div class="security-settings">
      <div class="settings-section">
        <h2 class="section-title">登录安全</h2>
        
        <div class="setting-item" @click="changePassword">
          <div class="setting-icon">🔑</div>
          <div class="setting-content">
            <h3 class="setting-title">修改登录密码</h3>
            <p class="setting-desc">定期更新密码保护账户安全</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item" @click="changePin">
          <div class="setting-icon">🔐</div>
          <div class="setting-content">
            <h3 class="setting-title">修改保护PIN码</h3>
            <p class="setting-desc">更改日常使用的PIN码</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
      
      <div class="settings-section">
        <h2 class="section-title">守护人管理</h2>
        
        <div class="setting-item" @click="manageGuardians">
          <div class="setting-icon">👥</div>
          <div class="setting-content">
            <h3 class="setting-title">管理守护人</h3>
            <p class="setting-desc">查看、添加或移除守护人</p>
          </div>
          <div class="guardian-count">{{ guardianCount }}</div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item" @click="testRecovery">
          <div class="setting-icon">🔄</div>
          <div class="setting-content">
            <h3 class="setting-title">测试恢复流程</h3>
            <p class="setting-desc">验证账户恢复功能是否正常</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
      
      <div class="settings-section">
        <h2 class="section-title">设备管理</h2>
        
        <div class="setting-item" @click="deviceMigration">
          <div class="setting-icon">📱</div>
          <div class="setting-content">
            <h3 class="setting-title">账户迁移</h3>
            <p class="setting-desc">更换设备时迁移账户数据</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item" @click="viewDevices">
          <div class="setting-icon">💻</div>
          <div class="setting-content">
            <h3 class="setting-title">登录设备</h3>
            <p class="setting-desc">查看所有登录过的设备</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
      
      <div class="settings-section">
        <h2 class="section-title">数据安全</h2>
        
        <div class="setting-item" @click="exportData">
          <div class="setting-icon">📤</div>
          <div class="setting-content">
            <h3 class="setting-title">导出健康数据</h3>
            <p class="setting-desc">备份您的健康数据</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        
        <div class="setting-item danger" @click="deleteAccount">
          <div class="setting-icon">🗑️</div>
          <div class="setting-content">
            <h3 class="setting-title">删除账户</h3>
            <p class="setting-desc">永久删除账户和所有数据</p>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>
    </div>
    
    <!-- 安全提示 -->
    <div class="security-tips">
      <div class="tips-header">
        <h3 class="tips-title">🔒 安全提示</h3>
      </div>
      <ul class="tips-list">
        <li>定期更新密码，建议每3个月更换一次</li>
        <li>不要将PIN码告诉他人，包括家人</li>
        <li>确保至少设置2位守护人，以提高账户安全性</li>
        <li>在公共设备上使用后，记得退出登录</li>
        <li>如发现异常登录，立即修改密码</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const securityScore = ref(85)
const guardianCount = ref(2)

const getSecurityStatus = () => {
  if (securityScore.value >= 80) {
    return '您的账户安全状况良好'
  } else if (securityScore.value >= 60) {
    return '建议完善安全设置'
  } else {
    return '需要加强账户安全'
  }
}

const goBack = () => {
  router.back()
}

const changePassword = () => {
  // 跳转到修改密码页面
  console.log('修改登录密码')
}

const changePin = () => {
  // 跳转到修改PIN码页面
  console.log('修改保护PIN码')
}

const manageGuardians = () => {
  router.push('/family-circle')
}

const testRecovery = () => {
  // 测试恢复流程
  console.log('测试恢复流程')
}

const deviceMigration = () => {
  // 账户迁移
  console.log('账户迁移')
}

const viewDevices = () => {
  // 查看登录设备
  console.log('查看登录设备')
}

const exportData = () => {
  // 导出健康数据
  console.log('导出健康数据')
}

const deleteAccount = () => {
  // 删除账户
  console.log('删除账户')
}
</script>

<style scoped>
.account-security-page {
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

.security-overview {
  padding: 20px;
}


.security-score {
  background: white;
  color: #2d3748;
  border-radius: 12px;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #ebf4ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #4299e1;
}

.score-number {
  font-size: 1.8rem;
  font-weight: bold;
}

.score-label {
  font-size: 0.8rem;
  opacity: 0.9;
}

.score-desc h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.score-desc p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.security-settings {
  padding: 0 20px;
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

.setting-item.danger {
  border-left: 4px solid #e53e3e;
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

.guardian-count {
  background-color: #4299e1;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.setting-arrow {
  font-size: 1.2rem;
  color: #a0aec0;
  font-weight: 300;
}

.security-tips {
  background-color: white;
  border-radius: 12px;
  margin: 20px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.tips-header {
  margin-bottom: 15px;
}

.tips-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  color: #718096;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 8px;
}

.tips-list li:last-child {
  margin-bottom: 0;
}
</style>
