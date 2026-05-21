<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { init, dispose, setCameraMode, toggleLayer } from '@/demos/demo20-comprehensive'

const container = ref<HTMLElement>()
const cameraMode = ref<'overview' | 'follow' | 'station'>('overview')
const layers = reactive({ train: true, equipment: true, labels: true, dataBars: true })

function onCameraMode(m: 'overview' | 'follow' | 'station') {
  cameraMode.value = m
  setCameraMode(m)
}

function onLayerToggle(key: keyof typeof layers) {
  toggleLayer(key, layers[key])
}

const features = [
  { label: 'Sky 大气散射', color: '#00e5ff' },
  { label: '站台 + 雨棚', color: '#69f0ae' },
  { label: '闭环轨道 + 列车', color: '#ffca28' },
  { label: '四元数平滑朝向', color: '#ff8a65' },
  { label: '设备拾取 + Outline', color: '#ce93d8' },
  { label: 'CSS2D 设备弹窗', color: '#4fc3f7' },
  { label: '4 路数据柱状图', color: '#f48fb1' },
  { label: '摄像机跟随模式', color: '#aed581' },
]

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">综合教培场景</div>
      <div class="panel-desc">Phase 1-3 全部技术要点融合：环境、轨道、交互、后处理、数据可视化。</div>

      <!-- Camera mode -->
      <div class="ctrl-section">
        <div class="ctrl-label">摄像机模式</div>
        <div class="cam-btns">
          <button :class="['cam-btn', cameraMode === 'overview' && 'active']" @click="onCameraMode('overview')">
            <span class="cam-icon">&#9956;</span>全景
          </button>
          <button :class="['cam-btn', cameraMode === 'follow' && 'active']" @click="onCameraMode('follow')">
            <span class="cam-icon">&#9654;</span>跟随
          </button>
          <button :class="['cam-btn', cameraMode === 'station' && 'active']" @click="onCameraMode('station')">
            <span class="cam-icon">&#9634;</span>站台
          </button>
        </div>
      </div>

      <!-- Layer toggles -->
      <div class="ctrl-section">
        <div class="ctrl-label">图层显示</div>
        <div class="layer-row">
          <span class="layer-name">列车动画</span>
          <el-switch v-model="layers.train" size="small" @change="onLayerToggle('train')" />
        </div>
        <div class="layer-row">
          <span class="layer-name">设备模型</span>
          <el-switch v-model="layers.equipment" size="small" @change="onLayerToggle('equipment')" />
        </div>
        <div class="layer-row">
          <span class="layer-name">CSS2D 标签</span>
          <el-switch v-model="layers.labels" size="small" @change="onLayerToggle('labels')" />
        </div>
        <div class="layer-row">
          <span class="layer-name">数据柱状图</span>
          <el-switch v-model="layers.dataBars" size="small" @change="onLayerToggle('dataBars')" />
        </div>
      </div>

      <!-- Feature tags -->
      <div class="feature-grid">
        <div v-for="f in features" :key="f.label" class="feat-tag" :style="{ borderColor: f.color + '55', color: f.color }">
          {{ f.label }}
        </div>
      </div>

      <div class="tip">点击设备打开参数弹窗 · 跟随模式下列车引导镜头</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 248px;
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.ctrl-section { margin-bottom: 14px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 7px; }
.cam-btns { display: flex; gap: 6px; }
.cam-btn {
  flex: 1; padding: 7px 4px; font-size: 11px; cursor: pointer;
  background: rgba(0,229,255,0.04); border: 1px solid rgba(0,229,255,0.18);
  color: var(--color-text-secondary); border-radius: 5px; transition: all .2s;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
}
.cam-btn:hover { border-color: rgba(0,229,255,0.45); color: var(--color-accent); }
.cam-btn.active { background: rgba(0,229,255,0.14); border-color: var(--color-accent); color: var(--color-accent); }
.cam-icon { font-size: 14px; }
.layer-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.layer-name { color: var(--color-text-secondary); font-size: 11px; }
.feature-grid { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.feat-tag { font-size: 10px; padding: 3px 7px; border: 1px solid; border-radius: 3px; }
.tip { color: rgba(0,229,255,0.35); font-size: 10px; text-align: center; line-height: 1.4; }
</style>
