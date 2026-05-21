<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setParticleType } from '@/demos/demo10-particles'

const container = ref<HTMLElement>()
type ParticleType = 'rain' | 'sparks' | 'snow' | 'galaxy'
const activeType = ref<ParticleType>('rain')

const types: { key: ParticleType; label: string; icon: string; desc: string }[] = [
  { key: 'rain', label: '雨', icon: '🌧', desc: '6000粒子降雨，带侧风飘移' },
  { key: 'sparks', label: '火花', icon: '✨', desc: '800粒子，重力 + 颜色过渡' },
  { key: 'snow', label: '雪', icon: '❄', desc: '3000粒子，正弦漂移雪落' },
  { key: 'galaxy', label: '星系', icon: '🌌', desc: '8000粒子三臂旋涡星系' },
]

function select(type: ParticleType) {
  activeType.value = type
  setParticleType(type)
}

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">粒子系统</div>
      <div class="panel-desc">BufferGeometry + Points + 逐帧更新 position attribute 实现高性能粒子。</div>

      <div class="type-grid">
        <div v-for="t in types" :key="t.key"
          class="type-card" :class="{ active: activeType === t.key }"
          @click="select(t.key)">
          <span class="type-icon">{{ t.icon }}</span>
          <span class="type-label">{{ t.label }}</span>
          <span class="type-desc">{{ t.desc }}</span>
        </div>
      </div>

      <div class="tech-list">
        <div class="tech-item"><span class="tech-name">BufferAttribute</span><span class="tech-desc">Float32Array 直接操作顶点，避免 GC</span></div>
        <div class="tech-item"><span class="tech-name">needsUpdate = true</span><span class="tech-desc">每帧标记 position attribute 更新</span></div>
        <div class="tech-item"><span class="tech-name">vertexColors</span><span class="tech-desc">每粒子独立颜色（火花橙→黄→白过渡）</span></div>
        <div class="tech-item"><span class="tech-name">depthWrite: false</span><span class="tech-desc">关闭深度写入，解决粒子透明叠加排序</span></div>
        <div class="tech-item"><span class="tech-name">生命周期复位</span><span class="tech-desc">超出范围时原地重置，零 GC 开销</span></div>
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
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }

.type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; }
.type-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; border: 1px solid rgba(0,229,255,0.15); border-radius: 6px;
  cursor: pointer; transition: all 0.2s; text-align: center;
}
.type-card:hover { border-color: rgba(0,229,255,0.4); background: rgba(0,229,255,0.04); }
.type-card.active { border-color: var(--color-accent); background: rgba(0,229,255,0.1); box-shadow: 0 0 10px rgba(0,229,255,0.15); }
.type-icon { font-size: 22px; }
.type-label { color: var(--color-text-primary); font-size: 13px; font-weight: 600; }
.type-desc { color: rgba(128,203,196,0.6); font-size: 10px; line-height: 1.3; }

.tech-list { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 12px; }
.tech-item { padding: 5px 8px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.25); }
.tech-name { display: block; color: var(--color-text-primary); font-size: 11px; font-weight: 600; margin-bottom: 2px; font-family: monospace; }
.tech-desc { color: rgba(128,203,196,0.7); font-size: 10px; }
</style>
