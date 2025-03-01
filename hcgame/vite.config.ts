import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000, // 设置固定端口
    open: true, // 自动打开浏览器
    host: true,  // 允许局域网访问
  },
  base: './', // 设置为相对路径，方便部署
  build: {
    target: 'esnext', // Cloudflare Workers support modern JS features
    outDir: 'dist', // Make sure output directory matches Wrangler config
    minify: true,
    ssrManifest: false,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Recommended for Cloudflare Workers
      }
    }
  }
})
