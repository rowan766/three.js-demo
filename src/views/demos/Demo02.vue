<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo02-material'

const container = ref<HTMLElement>()

const materials = [
  { name: 'MeshBasicMaterial', desc: '不受光照，始终显示固有色', tag: '基础' },
  { name: 'MeshLambertMaterial', desc: '漫反射，只计算漫射光，性能好', tag: '光照' },
  { name: 'MeshPhongMaterial', desc: 'Phong 模型，支持高光 specular', tag: '光照' },
  { name: 'MeshStandardMaterial', desc: 'PBR，metalness + roughness', tag: 'PBR' },
  { name: 'MeshPhysicalMaterial', desc: 'PBR 扩展，clearcoat / transmission', tag: 'PBR' },
  { name: 'MeshToonMaterial', desc: '卡通分级着色，赛璐珞风格', tag: '特效' },
  { name: 'MeshNormalMaterial', desc: '法线方向 → RGB 颜色可视化', tag: '调试' },
  { name: 'MeshDepthMaterial', desc: '深度值 → 灰度可视化', tag: '调试' },
]

const tagColor: Record<string, string> = {
  基础: '#78909c', 光照: '#00b4d8', PBR: '#00e5ff', 特效: '#f472b6', 调试: '#fbbf24',
}

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">材质与纹理</div>
      <div class="panel-desc">8 种内置材质球对比。底面为 CanvasTexture 棋盘格纹理。</div>
      <div class="mat-list">
        <div v-for="m in materials" :key="m.name" class="mat-item">
          <div class="mat-header">
            <span class="mat-name">{{ m.name }}</span>
            <span class="mat-tag" :style="{ color: tagColor[m.tag], borderColor: tagColor[m.tag] }">{{ m.tag }}</span>
          </div>
          <span class="mat-desc">{{ m.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 270px;
  background: rgba(6, 12, 24, 0.9); border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.08);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }
.mat-list { display: flex; flex-direction: column; gap: 5px; }
.mat-item {
  padding: 6px 8px; background: rgba(0, 229, 255, 0.04); border-radius: 4px;
  border-left: 2px solid rgba(0, 229, 255, 0.25);
}
.mat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
.mat-name { color: var(--color-text-primary); font-size: 11px; font-weight: 600; }
.mat-tag { font-size: 10px; border: 1px solid; border-radius: 3px; padding: 0 4px; }
.mat-desc { color: rgba(128, 203, 196, 0.7); font-size: 10px; }
</style>
