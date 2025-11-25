import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    nodePolyfills({
      // 我们可以在这里进行一些精细化控制
      // 例如，明确告诉它要 polyfill 'buffer' 和 'events'
      include: ['buffer', 'events', 'stream', 'util'],
      // 全局变量 polyfill
      globals: {
        Buffer: true, // --> 这会创建一个全局的 Buffer 变量
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
