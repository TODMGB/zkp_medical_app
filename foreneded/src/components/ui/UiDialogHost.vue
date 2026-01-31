<template>
  <teleport to="body">
    <transition name="dialog-fade">
      <div v-if="dialog.open" class="overlay" @click.self="uiService.dialogCancel()">
        <div class="dialog" role="dialog" aria-modal="true">
          <div v-if="dialog.title" class="title">{{ dialog.title }}</div>
          <div v-if="dialog.message" class="message">{{ dialog.message }}</div>

          <input
            v-if="dialog.mode === 'prompt'"
            :value="dialog.input"
            @input="uiService.setDialogInput(($event.target as HTMLInputElement).value)"
            class="input"
            :placeholder="dialog.placeholder"
            @keydown.enter.prevent="uiService.dialogConfirm()"
          />

          <div class="actions">
            <button
              v-if="dialog.mode !== 'alert'"
              class="btn secondary"
              @click="uiService.dialogCancel()"
            >
              {{ dialog.cancelText || '取消' }}
            </button>
            <button class="btn primary" @click="uiService.dialogConfirm()">
              {{ dialog.confirmText || '确定' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { uiService } from '@/service/ui';

const dialog = computed(() => uiService.state.dialog);
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  padding: 18px;
}

.dialog {
  width: min(520px, 100%);
  background: #ffffff;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
}

.title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.message {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  white-space: pre-wrap;
}

.input {
  margin-top: 12px;
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 12px;
  font-size: 14px;
  outline: none;
}

.input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
}

.actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 12px 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.btn.secondary {
  background: #f1f5f9;
  color: #0f172a;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
