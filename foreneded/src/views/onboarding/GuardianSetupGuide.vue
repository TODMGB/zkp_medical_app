<template>
  <div class="guardian-guide-page">
    <div class="header">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: '100%' }"></div>
      </div>
      <h1 class="page-title">设置守护人</h1>
    </div>
    
    <div class="content">
      <div class="guide-section">
        <div class="icon">👨‍👩‍👧‍👦</div>
        <h2 class="title">什么是守护人？</h2>
        <p class="description">
          守护人是您信任的家人或朋友，他们可以帮助您恢复账户访问权限。
          当您忘记密码或丢失设备时，守护人可以协助您重新获得健康数据。
        </p>
      </div>
      
      <div class="benefits-section">
        <h3 class="benefits-title">守护人的作用</h3>
        <div class="benefit-item">
          <div class="benefit-icon">🔒</div>
          <div class="benefit-text">
            <strong>账户恢复</strong>
            <p>当您忘记密码时，守护人可以帮助您重新设置</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">📱</div>
          <div class="benefit-text">
            <strong>设备迁移</strong>
            <p>更换手机时，守护人可以协助数据迁移</p>
          </div>
        </div>
        <div class="benefit-item">
          <div class="benefit-icon">💝</div>
          <div class="benefit-text">
            <strong>健康关怀</strong>
            <p>家人可以查看您的健康状态，给予及时关怀</p>
          </div>
        </div>
      </div>
      
      <div class="recommendation-section">
        <div class="recommendation-box">
          <div class="recommendation-icon">💡</div>
          <h4>建议设置</h4>
          <p>建议选择2-3位您最信任的家人作为守护人，确保账户安全。</p>
        </div>
      </div>
      
      <div class="actions">
        <button class="setup-btn" @click="handleSetup">
          立即添加守护人
        </button>
        <button class="later-btn" @click="handleLater">
          稍后提醒我
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const handleSetup = () => {
  // 跳转到家庭圈页面开始添加守护人
  router.push('/family-circle')
}

const handleLater = () => {
  // 跳过守护人设置，直接进入首页
  router.push('/home')
}
</script>

<style scoped>
.guardian-guide-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #e2e8f0;
  border-radius: 2px;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background-color: #4299e1;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  text-align: center;
}

.content {
  flex: 1;
  padding: 30px 20px;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.guide-section {
  text-align: center;
  margin-bottom: 40px;
}

.icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 15px 0;
}

.description {
  color: #718096;
  line-height: 1.6;
  margin: 0;
  font-size: 1rem;
}

.benefits-section {
  margin-bottom: 30px;
}

.benefits-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 20px 0;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.benefit-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.benefit-text strong {
  display: block;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 5px;
}

.benefit-text p {
  color: #718096;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.recommendation-section {
  margin-bottom: 40px;
}

.recommendation-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.recommendation-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.recommendation-box h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.recommendation-box p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
  line-height: 1.4;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.setup-btn {
  background-color: #4299e1;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.setup-btn:hover {
  background-color: #3182ce;
}

.later-btn {
  background-color: transparent;
  color: #718096;
  border: 1px solid #e2e8f0;
  padding: 14px;
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.later-btn:hover {
  background-color: #f7fafc;
  color: #4a5568;
}
</style>
