<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setCameraPreset, setTimeOfDay } from '@/demos/demo16-station'

const container = ref<HTMLElement>()
const timeOfDay = ref(45)
const preset = ref<'overview' | 'platform' | 'front'>('overview')

function onPreset(p: 'overview' | 'platform' | 'front') {
  preset.value = p
  setCameraPreset(p)
}

function onTimeChange(v: number) {
  setTimeOfDay(v)
}

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">火车站场景</div>
      <div class="panel-desc">完整站场：站台、雨棚、接触网、列车停靠与开关门动画。</div>

      <div class="ctrl-section">
        <div class="ctrl-label">镜头视角</div>
        <div class="btn-group">
          <button :class="['preset-btn', preset === 'overview' && 'active']" @click="onPreset('overview')">全景俯视</button>
          <button :class="['preset-btn', preset === 'platform' && 'active']" @click="onPreset('platform')">站台视角</button>
          <button :class="['preset-btn', preset === 'front' && 'active']" @click="onPreset('front')">列车正面</button>
        </div>
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">太阳仰角: {{ timeOfDay }}°</div>
        <el-slider v-model="timeOfDay" :min="0" :max="90" :step="1" @input="onTimeChange(timeOfDay)" />
        <div class="slider-hint">
          <span>夜间</span><span>正午</span>
        </div>
      </div>

      <div class="feature-list">
        <div class="feature-item">
          <span class="feat-dot" style="background:#00e5ff" />
          Sky 大气散射光照
        </div>
        <div class="feature-item">
          <span class="feat-dot" style="background:#69f0ae" />
          列车到站/停车/离站状态机
        </div>
        <div class="feature-item">
          <span class="feat-dot" style="background:#ffca28" />
          车门开关动画
        </div>
        <div class="feature-item">
          <span class="feat-dot" style="background:#ce93d8" />
          接触网 (OHE) 悬链线
        </div>
        <div class="feature-item">
          <span class="feat-dot" style="background:#ff7043" />
          CSS2D 站名标牌
        </div>
      </div>

      <div class="tip">可用鼠标拖拽旋转场景</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 240px;
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.ctrl-section { margin-bottom: 14px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 6px; }
.btn-group { display: flex; gap: 6px; flex-wrap: wrap; }
.preset-btn {
  flex: 1; min-width: 60px; padding: 5px 6px; font-size: 11px; cursor: pointer;
  background: rgba(0,229,255,0.05); border: 1px solid rgba(0,229,255,0.2);
  color: var(--color-text-secondary); border-radius: 4px; transition: all .2s;
}
.preset-btn:hover { border-color: rgba(0,229,255,0.5); color: var(--color-accent); }
.preset-btn.active { background: rgba(0,229,255,0.15); border-color: var(--color-accent); color: var(--color-accent); }
.slider-hint { display: flex; justify-content: space-between; color: rgba(0,229,255,0.35); font-size: 9px; margin-top: 3px; }
.feature-list { margin-bottom: 10px; }
.feature-item { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 7px; }
.feat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tip { color: rgba(0,229,255,0.35); font-size: 10px; text-align: center; margin-top: 4px; }
:deep(.el-slider__runway) { background: rgba(0,229,255,0.15); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-slider__button) { border-color: var(--color-accent); }
</style>
