<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { init, dispose, applyConfig, rebuildObjects, setStatsPanel, config, type RendererInfo } from '@/demos/demo15-debug'

const container = ref<HTMLElement>()
const info = reactive<RendererInfo>({ fps: 0, ms: 0, calls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0, memory: 0 })
const localConfig = reactive({ ...config })
const objCount = ref(config.objectCount)
const statsMode = ref<0 | 1 | 2>(0)

function onInfo(i: RendererInfo) { Object.assign(info, i) }

function applyLocalConfig() {
  Object.assign(config, localConfig)
  applyConfig()
}

function onCountChange(v: number) {
  localConfig.objectCount = v
  config.objectCount = v
  rebuildObjects()
}

function onStatsMode(v: 0 | 1 | 2) {
  statsMode.value = v
  setStatsPanel(v)
}

onMounted(() => { if (container.value) init(container.value, onInfo) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">调试面板</div>
      <div class="panel-desc">Stats.js + renderer.info 实时监控渲染性能与场景参数。</div>

      <!-- Live metrics -->
      <div class="metrics-grid">
        <div class="metric-item highlight">
          <div class="metric-val">{{ info.fps }}</div>
          <div class="metric-key">FPS</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">{{ info.ms }}</div>
          <div class="metric-key">MS/帧</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">{{ info.calls }}</div>
          <div class="metric-key">Draw Calls</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">{{ info.triangles.toLocaleString() }}</div>
          <div class="metric-key">三角面</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">{{ info.geometries }}</div>
          <div class="metric-key">Geometries</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">{{ info.memory || '—' }}</div>
          <div class="metric-key">MB 内存</div>
        </div>
      </div>

      <!-- Stats panel mode -->
      <div class="ctrl-section">
        <div class="ctrl-label">Stats 面板模式</div>
        <el-radio-group v-model="statsMode" size="small" @change="onStatsMode(statsMode)">
          <el-radio-button :value="0">FPS</el-radio-button>
          <el-radio-button :value="1">MS</el-radio-button>
          <el-radio-button :value="2">MB</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Object count -->
      <div class="ctrl-section">
        <div class="ctrl-label">场景对象数: {{ objCount }}</div>
        <el-slider v-model="objCount" :min="10" :max="500" :step="10" @change="onCountChange(objCount)" />
      </div>

      <!-- Toggles -->
      <div class="toggle-row">
        <span class="ctrl-label">线框模式</span>
        <el-switch v-model="localConfig.wireframe" @change="applyLocalConfig()" />
      </div>
      <div class="toggle-row">
        <span class="ctrl-label">场景雾</span>
        <el-switch v-model="localConfig.fog" @change="applyLocalConfig()" />
      </div>
      <div class="toggle-row">
        <span class="ctrl-label">自动旋转</span>
        <el-switch v-model="localConfig.autoRotate" @change="applyLocalConfig()" />
      </div>

      <div class="tip">Stats.js 面板显示在画面左上角</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 260px;
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-bottom: 14px; }
.metric-item { background: rgba(0,229,255,0.04); border: 1px solid rgba(0,229,255,0.15); border-radius: 5px; padding: 6px 4px; text-align: center; }
.metric-item.highlight { border-color: rgba(0,229,255,0.4); background: rgba(0,229,255,0.08); }
.metric-val { color: var(--color-accent); font-size: 16px; font-weight: 700; font-family: monospace; line-height: 1.2; }
.metric-item.highlight .metric-val { font-size: 20px; }
.metric-key { color: rgba(128,203,196,0.55); font-size: 9px; margin-top: 2px; }
.ctrl-section { margin-bottom: 12px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 5px; }
:deep(.el-radio-button__inner) { background: transparent; border-color: rgba(0,229,255,0.25); color: var(--color-text-secondary); font-size: 11px; }
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background: rgba(0,229,255,0.15); border-color: var(--color-accent); color: var(--color-accent); box-shadow: none; }
:deep(.el-slider__runway) { background: rgba(0,229,255,0.15); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-slider__button) { border-color: var(--color-accent); }
.toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.tip { color: rgba(0,229,255,0.35); font-size: 10px; margin-top: 6px; text-align: center; }
</style>
