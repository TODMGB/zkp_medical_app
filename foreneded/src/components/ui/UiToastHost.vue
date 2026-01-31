<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast" tag="div" class="toast-stack">
        <div
          v-for="t in uiService.state.toasts"
          :key="t.id"
          class="toast"
          :class="t.type"
          @click="uiService.dismissToast(t.id)"
        >
          <div class="toast-dot" />
          <div class="toast-message">{{ t.message }}</div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { uiService } from '@/service/ui';
</script>

<style scoped>
.toast-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 9999;
  pointer-events: none;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 0 14px;
}

.toast {
  pointer-events: auto;
  width: min(560px, calc(100vw - 28px));
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
}

.toast-message {
  font-size: 13px;
  line-height: 1.35;
}

.toast-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #93c5fd;
  flex-shrink: 0;
}

.toast.success .toast-dot {
  background: #34d399;
}

.toast.warning .toast-dot {
  background: #fbbf24;
}

.toast.error .toast-dot {
  background: #f87171;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(10px);
  opacity: 0;
}
</style>
