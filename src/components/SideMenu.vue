<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useSidebarStore } from '@/stores/sidebar'

const router = useRouter()
const route = useRoute()
const sidebarStore = useSidebarStore()

const menuGroups = [
  {
    label: '第一阶段 · 基础',
    icon: 'Grid',
    items: [
      { path: '/demo/01', label: '01 几何体展示' },
      { path: '/demo/02', label: '02 材质与纹理' },
      { path: '/demo/03', label: '03 灯光系统' },
      { path: '/demo/04', label: '04 相机控制' },
      { path: '/demo/05', label: '05 动画基础' },
    ],
  },
  {
    label: '第二阶段 · 进阶',
    icon: 'DataLine',
    items: [
      { path: '/demo/06', label: '06 模型加载' },
      { path: '/demo/07', label: '07 铁路轨道生成' },
      { path: '/demo/08', label: '08 火车沿轨道运动' },
      { path: '/demo/09', label: '09 场景环境' },
      { path: '/demo/10', label: '10 粒子系统' },
    ],
  },
  {
    label: '第三阶段 · 交互',
    icon: 'Pointer',
    items: [
      { path: '/demo/11', label: '11 射线拾取' },
      { path: '/demo/12', label: '12 模型高亮描边' },
      { path: '/demo/13', label: '13 信息卡片弹窗' },
      { path: '/demo/14', label: '14 动态标签' },
      { path: '/demo/15', label: '15 调试面板' },
    ],
  },
  {
    label: '第四阶段 · 综合',
    icon: 'Monitor',
    items: [
      { path: '/demo/16', label: '16 火车站场景' },
      { path: '/demo/17', label: '17 服务器机柜交互' },
      { path: '/demo/18', label: '18 路网巡游' },
      { path: '/demo/19', label: '19 数据可视化叠加' },
      { path: '/demo/20', label: '20 综合教培场景' },
    ],
  },
]

function navigate(path: string) {
  sidebarStore.setActive(path.replace('/', ''))
  router.push(path)
}

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: sidebarStore.collapsed }">
    <div class="sidebar-logo">
      <span class="logo-icon">🚄</span>
      <span class="logo-text" v-show="!sidebarStore.collapsed">铁路3D教培</span>
    </div>

    <div class="menu-scroll">
      <div v-for="group in menuGroups" :key="group.label" class="menu-group">
        <div class="group-label" v-show="!sidebarStore.collapsed">
          <el-icon><component :is="group.icon" /></el-icon>
          <span>{{ group.label }}</span>
        </div>
        <div class="group-divider" v-show="sidebarStore.collapsed" />
        <div
          v-for="item in group.items"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
          :title="sidebarStore.collapsed ? item.label : ''"
        >
          <span class="item-dot" />
          <span class="item-label" v-show="!sidebarStore.collapsed">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 220px;
  background: var(--color-sidebar-bg);
  border-right: 1px solid rgba(0, 229, 255, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0, 229, 255, 0.12);
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.logo-text {
  color: var(--color-accent);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.menu-scroll::-webkit-scrollbar {
  width: 3px;
}

.menu-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 229, 255, 0.2);
  border-radius: 2px;
}

.menu-group {
  margin-bottom: 4px;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px 4px;
  color: rgba(0, 229, 255, 0.5);
  font-size: 11px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.group-divider {
  height: 1px;
  background: rgba(0, 229, 255, 0.1);
  margin: 6px 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  white-space: nowrap;
}

.menu-item:hover {
  background: rgba(0, 229, 255, 0.06);
}

.menu-item.active {
  background: rgba(0, 229, 255, 0.1);
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent);
}

.item-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 229, 255, 0.3);
  flex-shrink: 0;
  transition: all 0.2s;
}

.menu-item.active .item-dot {
  background: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent);
}

.item-label {
  color: rgba(224, 247, 250, 0.7);
  font-size: 13px;
  transition: color 0.2s;
}

.menu-item.active .item-label,
.menu-item:hover .item-label {
  color: var(--color-text-primary);
}
</style>
