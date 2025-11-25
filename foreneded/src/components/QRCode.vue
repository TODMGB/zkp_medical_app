<template>
  <div class="qrcode-wrapper">
    <canvas ref="qrcodeCanvas"></canvas>
    <p v-if="error" class="error-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = defineProps<{
  value: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
}>();

const size = props.size || 200;
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null);
const error = ref('');

// 使用qrcode库生成真实的二维码
const generateQRCode = async (text: string) => {
  if (!qrcodeCanvas.value || !text) return;
  
  error.value = '';
  
  try {
    await QRCode.toCanvas(qrcodeCanvas.value, text, {
      width: size,
      margin: 2,
      color: {
        dark: props.darkColor || '#000000',
        light: props.lightColor || '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // 高容错率
    });
  } catch (err: any) {
    console.error('生成二维码失败:', err);
    error.value = '生成二维码失败';
  }
};

watch(() => props.value, (newValue) => {
  generateQRCode(newValue);
}, { immediate: true });

onMounted(() => {
  generateQRCode(props.value);
});
</script>

<style scoped>
.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 8px;
}

canvas {
  border-radius: 4px;
  display: block;
}

.error-text {
  color: #e53e3e;
  font-size: 0.85rem;
  margin: 8px 0 0 0;
  text-align: center;
}
</style>
