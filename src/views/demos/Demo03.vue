<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo03-lighting'

const container = ref<HTMLElement>()

const lights = [
  { name: 'HemisphereLight', color: '#4488bb', desc: '天空/地面双色环境光，模拟天光散射' },
  { name: 'DirectionalLight', color: '#ffeedd', desc: '平行光（太阳光），支持阴影投射' },
  { name: 'PointLight ×2', color: '#00e5ff', desc: '点光源从四面八方辐射，带轨道动画' },
  { name: 'SpotLight', color: '#ffffff', desc: '聚光灯，可设置锥角 angle 和半影 penumbra' },
]

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">灯光系统</div>
      <div class="panel-desc">4 类光源演示，点光源绕场景轨道运动，SpotLight 强度脉冲变化。</div>
      <div class="light-list">
        <div v-for="l in lights" :key="l.name" class="light-item">
          <span class="light-dot" :style="{ background: l.color, boxShadow: `0 0 8px ${l.color}` }" />
          <div>
            <div class="light-name">{{ l.name }}</div>
            <div class="light-desc">{{ l.desc }}</div>
          </div>
        </div>
      </div>
      <div class="tip">Helper 线框显示光源位置与照射方向</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 260px;
  background: rgba(6, 12, 24, 0.9); border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }
.light-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.light-item { display: flex; align-items: flex-start; gap: 10px; }
.light-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
.light-name { color: var(--color-text-primary); font-size: 12px; font-weight: 600; margin-bottom: 2px; }
.light-desc { color: rgba(128, 203, 196, 0.7); font-size: 11px; line-height: 1.4; }
.tip {
  color: rgba(0, 229, 255, 0.4); font-size: 10px; padding-top: 10px;
  border-top: 1px solid rgba(0, 229, 255, 0.1);
}
</style>
