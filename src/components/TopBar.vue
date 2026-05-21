<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSidebarStore } from '@/stores/sidebar'
import { useUserStore } from '@/stores/user'

const emit = defineEmits<{ (e: 'logout'): void }>()
const route = useRoute()
const sidebarStore = useSidebarStore()
const userStore = useUserStore()

const title = computed(() => (route.meta.title as string) || '铁路教培3D Demo')

function handleCommand(cmd: string) {
  if (cmd === 'logout') emit('logout')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <el-button
        class="collapse-btn"
        :icon="sidebarStore.collapsed ? 'Expand' : 'Fold'"
        text
        @click="sidebarStore.toggle()"
      />
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="topbar-right">
      <span class="system-name">铁路教培系统 · Three.js Demo</span>
      <el-divider direction="vertical" />
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="28" class="avatar">{{ userStore.username.charAt(0).toUpperCase() }}</el-avatar>
          <span>{{ userStore.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout" icon="SwitchButton">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 56px;
  background: var(--color-topbar-bg);
  border-bottom: 1px solid rgba(0, 229, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  color: var(--color-text-secondary) !important;
  font-size: 18px;
}
.collapse-btn:hover {
  color: var(--color-accent) !important;
}

:deep(.el-breadcrumb__inner) {
  color: rgba(224, 247, 250, 0.5) !important;
}
:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--color-text-primary) !important;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-name {
  color: rgba(0, 229, 255, 0.5);
  font-size: 12px;
  letter-spacing: 1px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.user-info:hover {
  color: var(--color-accent);
}

.avatar {
  background: linear-gradient(135deg, #00b4d8, #00e5ff);
  color: #0a0e1a;
  font-weight: 700;
  font-size: 13px;
}
</style>
