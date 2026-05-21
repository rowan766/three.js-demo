<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo01-geometry'

const container = ref<HTMLElement>()

const info = [
  { name: 'BoxGeometry', desc: '立方体，6面体，Three.js 最基础几何体' },
  { name: 'SphereGeometry', desc: '球体，通过经纬分段数控制平滑度' },
  { name: 'CylinderGeometry', desc: '圆柱体，可设置顶底半径、高度、分段' },
  { name: 'TorusGeometry', desc: '圆环，通过管道半径和环半径定义形态' },
  { name: 'ConeGeometry', desc: '圆锥体，底面半径 + 高度' },
  { name: 'TorusKnotGeometry', desc: '扭结圆环，数学拓扑曲面展示' },
]

onMounted(() => {
  if (container.value) init(container.value)
})
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">几何体展示</div>
      <div class="panel-desc">Three.js 内置标准几何体，MeshStandardMaterial + 金属质感</div>
      <div class="geo-list">
        <div v-for="item in info" :key="item.name" class="geo-item">
          <span class="geo-name">{{ item.name }}</span>
          <span class="geo-desc">{{ item.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.info-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 260px;
  background: rgba(6, 12, 24, 0.88);
  border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px;
  padding: 16px;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.08);
}

.panel-title {
  color: var(--color-accent);
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.panel-desc {
  color: var(--color-text-secondary);
  font-size: 11px;
  margin-bottom: 12px;
  line-height: 1.5;
}

.geo-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.geo-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: rgba(0, 229, 255, 0.04);
  border-radius: 4px;
  border-left: 2px solid rgba(0, 229, 255, 0.3);
}

.geo-name {
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
}

.geo-desc {
  color: rgba(128, 203, 196, 0.7);
  font-size: 11px;
}
</style>
