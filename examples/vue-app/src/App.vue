<template>
  <div id="app" class="app">
    <!-- 导航栏 -->
    <nav class="navbar" v-if="!isSecureMode">
      <div class="nav-container">
        <div class="nav-brand">
          <router-link to="/" class="brand-link">
            <div class="brand-icon">🔐</div>
            <span class="brand-text">SecureFrontEnd</span>
          </router-link>
        </div>
        
        <div class="nav-menu">
          <router-link to="/" class="nav-link" exact-active-class="active">
            首页
          </router-link>
          <router-link to="/demo" class="nav-link" active-class="active">
            演示
          </router-link>
          <router-link to="/encryption" class="nav-link" active-class="active">
            加密工具
          </router-link>
          <router-link to="/about" class="nav-link" active-class="active">
            关于
          </router-link>
        </div>

        <div class="nav-actions">
          <button 
            class="theme-toggle" 
            @click="toggleTheme"
            :title="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          >
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          
          <div class="user-menu" v-if="userStore.isAuthenticated">
            <button class="user-button" @click="showUserMenu = !showUserMenu">
              <span class="user-avatar">{{ userStore.user?.username?.charAt(0).toUpperCase() }}</span>
              <span class="user-name">{{ userStore.user?.username }}</span>
            </button>
            
            <div class="user-dropdown" v-show="showUserMenu" @click="showUserMenu = false">
              <router-link to="/profile" class="dropdown-item">
                个人资料
              </router-link>
              <router-link to="/keys" class="dropdown-item">
                密钥管理
              </router-link>
              <button class="dropdown-item logout" @click="handleLogout">
                退出登录
              </button>
            </div>
          </div>
          
          <router-link 
            v-else 
            to="/login" 
            class="login-button"
          >
            登录
          </router-link>
        </div>
      </div>
    </nav>

    <!-- 主要内容区域 -->
    <main class="main-content" :class="{ 'secure-mode': isSecureMode }">
      <router-view v-slot="{ Component, route }">
        <transition 
          :name="route.meta.transition || 'fade'" 
          mode="out-in"
          appear
        >
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <!-- 全局通知 -->
    <div class="notifications" v-if="notifications.length > 0">
      <transition-group name="notification" tag="div">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          class="notification"
          :class="notification.type"
        >
          <div class="notification-content">
            <div class="notification-icon">
              {{ getNotificationIcon(notification.type) }}
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
            <button 
              class="notification-close"
              @click="removeNotification(notification.id)"
            >
              ×
            </button>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- 全局加载遮罩 -->
    <div class="global-loading" v-if="isLoading">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">{{ loadingText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import { useNotificationStore } from './stores/notification'
import { useThemeStore } from './stores/theme'

// 路由和存储
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const themeStore = useThemeStore()

// 响应式数据
const showUserMenu = ref(false)
const isLoading = ref(false)
const loadingText = ref('加载中...')

// 计算属性
const isDarkMode = computed(() => themeStore.isDarkMode)
const notifications = computed(() => notificationStore.notifications)
const isSecureMode = computed(() => route.meta?.secure === true)

// 方法
const toggleTheme = () => {
  themeStore.toggleTheme()
}

const handleLogout = async () => {
  try {
    isLoading.value = true
    loadingText.value = '正在退出...'
    
    await userStore.logout()
    notificationStore.addNotification({
      type: 'success',
      message: '已成功退出登录'
    })
    
    router.push('/')
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      message: '退出登录失败: ' + error.message
    })
  } finally {
    isLoading.value = false
  }
}

const removeNotification = (id) => {
  notificationStore.removeNotification(id)
}

const getNotificationIcon = (type) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type] || 'ℹ️'
}

// 全局点击事件处理（关闭用户菜单）
const handleGlobalClick = (event) => {
  if (!event.target.closest('.user-menu')) {
    showUserMenu.value = false
  }
}

// 键盘事件处理
const handleKeydown = (event) => {
  // ESC键关闭菜单
  if (event.key === 'Escape') {
    showUserMenu.value = false
  }
  
  // Ctrl+K 快速搜索（如果有搜索功能）
  if (event.ctrlKey && event.key === 'k') {
    event.preventDefault()
    // 触发搜索功能
  }
}

// 监听路由变化
watch(route, (newRoute) => {
  // 路由变化时关闭用户菜单
  showUserMenu.value = false
  
  // 更新页面标题
  if (newRoute.meta?.title) {
    document.title = `${newRoute.meta.title} - SecureFrontEnd`
  }
})

// 生命周期钩子
onMounted(() => {
  // 添加全局事件监听器
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleKeydown)
  
  // 初始化主题
  themeStore.initializeTheme()
  
  // 检查用户登录状态
  userStore.checkAuthStatus()
  
  // 添加页面可见性变化监听
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 页面重新可见时检查登录状态
      userStore.checkAuthStatus()
    }
  })
})

onUnmounted(() => {
  // 移除事件监听器
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('keydown', handleKeydown)
})

// 监听加载状态
watch(() => userStore.isLoading, (newValue) => {
  isLoading.value = newValue
  if (newValue) {
    loadingText.value = '正在处理...'
  }
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏样式 */
.navbar {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.nav-brand {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.2rem;
}

.brand-icon {
  font-size: 1.5rem;
  margin-right: 0.5rem;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  color: var(--primary-color);
  background: var(--primary-color-light);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.theme-toggle:hover {
  background: var(--bg-secondary);
}

.user-menu {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.user-button:hover {
  background: var(--bg-secondary);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-name {
  color: var(--text-primary);
  font-weight: 500;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--text-primary);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dropdown-item:hover {
  background: var(--bg-secondary);
}

.dropdown-item.logout {
  color: var(--error-color);
  border-top: 1px solid var(--border-color);
}

.login-button {
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.login-button:hover {
  background: var(--primary-color-dark);
  transform: translateY(-1px);
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content.secure-mode {
  padding: 0;
}

/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

/* 通知样式 */
.notifications {
  position: fixed;
  top: 80px;
  right: 1rem;
  z-index: 1000;
  max-width: 400px;
}

.notification {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.notification.success {
  border-left: 4px solid var(--success-color);
}

.notification.error {
  border-left: 4px solid var(--error-color);
}

.notification.warning {
  border-left: 4px solid var(--warning-color);
}

.notification.info {
  border-left: 4px solid var(--info-color);
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 1rem;
}

.notification-icon {
  font-size: 1.2rem;
  margin-right: 0.75rem;
}

.notification-message {
  flex: 1;
  color: var(--text-primary);
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  margin-left: 0.5rem;
}

.notification-close:hover {
  color: var(--text-primary);
}

/* 通知动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 全局加载遮罩 */
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loading-content {
  background: var(--bg-primary);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-primary);
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 0.5rem;
  }
  
  .nav-menu {
    display: none;
  }
  
  .brand-text {
    display: none;
  }
  
  .user-name {
    display: none;
  }
  
  .notifications {
    left: 0.5rem;
    right: 0.5rem;
    max-width: none;
  }
}
</style>