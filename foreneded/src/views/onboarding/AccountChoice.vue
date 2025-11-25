<template>
  <div class="account-choice-page">
    <!-- 顶部导航 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <span class="arrow">←</span>
      </button>
    </div>
    
    <!-- 主要内容 -->
    <div class="content">
      <div class="title-section">
        <div class="icon-container">
          <div class="icon">👤</div>
        </div>
        <h1 class="title">选择账户类型</h1>
        <p class="subtitle">请选择您要创建的账户类型</p>
      </div>
      
      <!-- 选项卡片 -->
      <div class="options">
        <!-- 创建新账户 -->
        <div class="option-card" @click="createNewAccount">
          <div class="card-icon">✨</div>
          <div class="card-content">
            <h3 class="card-title">创建新账户</h3>
            <p class="card-description">
              首次使用健康守护，通过身份验证创建新的账户
            </p>
            <div class="card-features">
              <span class="feature">• 身份验证</span>
              <span class="feature">• 设置PIN码</span>
              <span class="feature">• 生物识别</span>
            </div>
          </div>
          <div class="card-arrow">→</div>
        </div>
        
        <!-- 导入已有账户 -->
        <div class="option-card" @click="importExistingAccount">
          <div class="card-icon">📱</div>
          <div class="card-content">
            <h3 class="card-title">导入已有账户</h3>
            <p class="card-description">
              从其他设备迁移您的健康数据和账户信息
            </p>
            <div class="card-features">
              <span class="feature">• 扫描二维码</span>
              <span class="feature">• 输入确认码</span>
              <span class="feature">• 数据同步</span>
            </div>
          </div>
          <div class="card-arrow">→</div>
        </div>
      </div>
      
      <!-- 底部提示 -->
      <div class="footer-hint">
        <p class="hint-text">
          <span class="hint-icon">🔒</span>
          所有数据都经过端到端加密保护
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.back();
};

// 创建新账户
const createNewAccount = () => {
  router.push('/signup');
};

// 导入已有账户
const importExistingAccount = () => {
  router.push('/import-account');
};
</script>

<style scoped>
.account-choice-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

/* 顶部导航 */
.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.back-btn:active {
  transform: scale(0.95);
}

.arrow {
  color: white;
  font-size: 1.5rem;
  line-height: 1;
}

/* 主要内容 */
.content {
  flex: 1;
  background: white;
  border-radius: 32px 32px 0 0;
  padding: 40px 24px 30px;
  margin-top: auto;
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 标题部分 */
.title-section {
  text-align: center;
  margin-bottom: 40px;
}

.icon-container {
  margin-bottom: 24px;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  font-size: 2.5rem;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 12px 0;
}

.subtitle {
  font-size: 1rem;
  color: #718096;
  margin: 0;
  font-weight: 400;
}

/* 选项卡片 */
.options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.option-card {
  background: white;
  border: 2px solid #f7fafc;
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: flex-start;
  gap: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.option-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.15);
}

.option-card:active {
  transform: translateY(-2px);
}

.card-icon {
  font-size: 2rem;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.card-description {
  font-size: 0.95rem;
  color: #718096;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.card-features {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature {
  font-size: 0.85rem;
  color: #667eea;
  font-weight: 500;
}

.card-arrow {
  color: #667eea;
  font-size: 1.5rem;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
  align-self: center;
}

.option-card:hover .card-arrow {
  transform: translateX(4px);
}

/* 底部提示 */
.footer-hint {
  text-align: center;
  margin-top: auto;
}

.hint-text {
  color: #a0aec0;
  font-size: 0.9rem;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.hint-icon {
  font-size: 1rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .content {
    padding: 32px 20px 24px;
  }
  
  .title {
    font-size: 1.75rem;
  }
  
  .icon {
    width: 70px;
    height: 70px;
    font-size: 2rem;
  }
  
  .option-card {
    padding: 20px;
    gap: 16px;
    flex-direction: column;
    text-align: center;
  }
  
  .card-icon {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
    align-self: center;
  }
  
  .card-arrow {
    align-self: center;
    margin-top: 8px;
  }
  
  .card-features {
    align-items: center;
  }
}
</style>
