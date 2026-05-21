<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setElevation, setFogDensity, setAutoTime } from '@/demos/demo09-environment'

const container = ref<HTMLElement>()
const elevation = ref(30)
const fogDensity = ref(0.008)
const autoTime = ref(false)

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => { setAutoTime(false); dispose() })
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">场景环境</div>
      <div class="panel-desc">Three.js Sky 物理大气散射着色器 + 程序化地面纹理 + 场景搭建。</div>

      <div class="ctrl-section">
        <div class="ctrl-label">太阳仰角：{{ elevation }}°</div>
        <el-slider v-model="elevation" :min="0" :max="89" :step="1"
          @input="setElevation(elevation)" :disabled="autoTime" />
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">雾密度：{{ fogDensity.toFixed(4) }}</div>
        <el-slider v-model="fogDensity" :min="0" :max="0.05" :step="0.001"
          @input="setFogDensity(fogDensity)" />
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">自动昼夜循环</div>
        <el-switch v-model="autoTime" @change="setAutoTime(autoTime)"
          active-text="开启" inactive-text="关闭" />
      </div>

      <div class="tech-list">
        <div class="tech-item"><span class="tech-name">Sky（Preetham 模型）</span><span class="tech-desc">基于大气散射的物理天空着色器</span></div>
        <div class="tech-item"><span class="tech-name">FogExp2</span><span class="tech-desc">指数雾，远处物体自然消融</span></div>
        <div class="tech-item"><span class="tech-name">CanvasTexture</span><span class="tech-desc">程序化生成草地纹理，无外部资源依赖</span></div>
        <div class="tech-item"><span class="tech-name">ACESFilmicToneMapping</span><span class="tech-desc">电影级色调映射，保留高光细节</span></div>
        <div class="tech-item"><span class="tech-name">场景搭建</span><span class="tech-desc">站台 + 站房 + 树木 + 远景山脉</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 260px;
  background: rgba(6, 12, 24, 0.92); border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.ctrl-section { margin-bottom: 14px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 6px; }
:deep(.el-slider__runway) { background: rgba(0,229,255,0.15); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-slider__button) { border-color: var(--color-accent); }
.tech-list { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 12px; }
.tech-item { padding: 6px 8px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.25); }
.tech-name { display: block; color: var(--color-text-primary); font-size: 11px; font-weight: 600; margin-bottom: 2px; }
.tech-desc { color: rgba(128,203,196,0.7); font-size: 10px; }
</style>
