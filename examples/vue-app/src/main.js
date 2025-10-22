import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// 创建Vue应用实例
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 使用Vue Router
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue应用错误:', err)
  console.error('错误信息:', info)
  
  // 可以在这里添加错误上报逻辑
  if (window.reportError) {
    window.reportError(err, info)
  }
}

// 全局警告处理
app.config.warnHandler = (msg, vm, trace) => {
  console.warn('Vue应用警告:', msg)
  console.warn('组件追踪:', trace)
}

// 全局属性
app.config.globalProperties.$appName = '安全前端资源加密存储示例'
app.config.globalProperties.$version = '1.0.0'

// 挂载应用
app.mount('#app')

// 开发环境下的调试工具
if (import.meta.env.DEV) {
  window.__VUE_APP__ = app
  console.log('Vue3应用已启动 - 开发模式')
  console.log('应用实例:', app)
  console.log('路由实例:', router)
}

// 生产环境下的性能监控
if (import.meta.env.PROD) {
  // 监控应用性能
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0]
        console.log('应用加载性能:', {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.fetchStart
        })
      }, 0)
    })
  }
}

export default app