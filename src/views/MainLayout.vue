<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useSidebarStore } from '@/stores/sidebar'
import { useRouter } from 'vue-router'
import SideMenu from '@/components/SideMenu.vue'
import TopBar from '@/components/TopBar.vue'

const userStore = useUserStore()
const sidebarStore = useSidebarStore()
const router = useRouter()

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <SideMenu />
    <div class="layout-right" :class="{ collapsed: sidebarStore.collapsed }">
      <TopBar @logout="handleLogout" />
      <main class="layout-content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: var(--color-bg-dark);
  overflow: hidden;
}

.layout-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 220px;
  transition: margin-left 0.3s;
  overflow: hidden;
}

.layout-right.collapsed {
  margin-left: 64px;
}

.layout-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
