<template>
  <div class="splash-screen">
    <!-- 背景渐变 -->
    <div class="background-gradient"></div>
    
    <!-- 动画内容 -->
    <div class="content" :class="{ 'show': isVisible }">
      <!-- Logo 图标 -->
      <div class="logo-container">
        <div class="logo-circle">
          <Pill class="icon" />
        </div>
        <div class="logo-glow"></div>
      </div>
      
      <!-- 欢迎文字 -->
      <h1 class="welcome-title">
        <span class="title-line">欢迎使用</span>
        <span class="title-line highlight">健康守护</span>
      </h1>
      
      <p class="welcome-subtitle">
        让科技守护您的健康
      </p>
      
      <!-- 开始按钮 -->
      <button 
        class="start-button" 
        @click="handleStart"
        :class="{ 'pulse': buttonPulse }"
      >
        <span class="button-text">开始我的服药记录</span>
        <ArrowRight class="button-arrow" />
      </button>
      
      <!-- 底部提示 -->
      <div class="bottom-hint">
        <p class="hint-text">安全 · 隐私 · 可靠</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { aaService } from '../../service/accountAbstraction';
import { Pill, ArrowRight } from 'lucide-vue-next';

const router = useRouter();
const isVisible = ref(false);
const buttonPulse = ref(false);

onMounted(async () => {
  // 延迟显示动画
  setTimeout(() => {
    isVisible.value = true;
  }, 100);
  
  // 按钮脉冲动画
  setTimeout(() => {
    buttonPulse.value = true;
  }, 1500);
  
  // 检查是否已注册
  const isRegistered = await aaService.isRegistered();
  
  // 如果已注册，3秒后自动跳转到登录页
  if (isRegistered) {
    setTimeout(() => {
      router.replace('/login');
    }, 3000);
  }
});

const handleStart = async () => {
  const isRegistered = await aaService.isRegistered();
  
  if (isRegistered) {
    // 已注册，跳转到登录页
    router.push('/login');
  } else {
    // 未注册，跳转到账户选择页面
    router.push('/account-choice');
  }
};
</script>

<style scoped>
.splash-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* 背景渐变 */
.background-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #667eea;
  animation: gradientShift 10s ease infinite;
}

@keyframes gradientShift {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 内容容器 */
.content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px 30px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.content.show {
  opacity: 1;
  transform: translateY(0);
}

/* Logo 容器 */
.logo-container {
  position: relative;
  display: inline-block;
  margin-bottom: 50px;
}

.logo-circle {
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.5);
  animation: float 3s ease-in-out infinite;
}

.icon {
  width: 64px;
  height: 64px;
  color: white;
  animation: iconPulse 2s ease-in-out infinite;
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 70%
  );
  border-radius: 50%;
  animation: glow 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes glow {
  0%, 100% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* 欢迎标题 */
.welcome-title {
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin: 0 0 20px 0;
  line-height: 1.2;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title-line {
  display: block;
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.title-line:nth-child(1) {
  animation-delay: 0.3s;
}

.title-line:nth-child(2) {
  animation-delay: 0.5s;
}

.title-line.highlight {
  color: white;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 副标题 */
.welcome-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 60px 0;
  font-weight: 400;
  letter-spacing: 0.5px;
  animation: fadeIn 1s ease backwards;
  animation-delay: 0.7s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 开始按钮 */
.start-button {
  background: rgba(255, 255, 255, 0.95);
  color: var(--primary-600);
  border: none;
  padding: 18px 40px;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: 0.9s;
  position: relative;
  overflow: hidden;
}

.start-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: transparent;
  transition: left 0.5s;
}

.start-button:hover::before {
  left: 100%;
}

.start-button:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 
    0 15px 50px rgba(0, 0, 0, 0.25),
    0 5px 15px rgba(0, 0, 0, 0.15);
}

.start-button:active {
  transform: translateY(0) scale(0.98);
}

.start-button.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.2),
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.2),
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 0 0 10px rgba(255, 255, 255, 0);
  }
}

.button-text {
  flex: 1;
}

.button-arrow {
  width: 20px;
  height: 20px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.start-button:hover .button-arrow {
  transform: translateX(4px);
}

/* 底部提示 */
.bottom-hint {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  animation: fadeIn 1s ease backwards;
  animation-delay: 1.1s;
}

.hint-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin: 0;
  letter-spacing: 2px;
  font-weight: 300;
}

/* 响应式 */
@media (max-width: 768px) {
  .welcome-title {
    font-size: 2.2rem;
  }
  
  .logo-circle {
    width: 100px;
    height: 100px;
  }
  
  .icon {
    width: 48px;
    height: 48px;
  }
  
  .start-button {
    padding: 16px 35px;
    font-size: 1rem;
  }
}
</style>
