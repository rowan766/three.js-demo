<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setTourMode, focusStation } from '@/demos/demo18-network'

const container = ref<HTMLElement>()
const tourOn = ref(false)

const stations = [
  { name: '铁路枢纽站', color: '#00e5ff' },
  { name: '北方货运站', color: '#69f0ae' },
  { name: '东部客运站', color: '#69f0ae' },
  { name: '南方综合站', color: '#69f0ae' },
  { name: '西部工业站', color: '#ffca28' },
  { name: '东北联络站', color: '#ff8a65' },
]

const routes = [
  { from: '枢纽', to: '北方', color: '#00b4d8' },
  { from: '枢纽', to: '东部', color: '#69f0ae' },
  { from: '枢纽', to: '南方', color: '#ff8a65' },
  { from: '枢纽', to: '西部', color: '#ffca28' },
  { from: '北方', to: '东北', color: '#ce93d8' },
  { from: '东部', to: '东北', color: '#f48fb1' },
]

function onTourToggle(v: boolean) {
  setTourMode(v)
}

function onFocus(idx: number) {
  if (tourOn.value) { tourOn.value = false; setTourMode(false) }
  focusStation(idx)
}

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">路网巡游</div>
      <div class="panel-desc">6 站 × 6 条路线，CatmullRomCurve3 路径 + 彩色列车实时运行。</div>

      <div class="ctrl-section">
        <div class="toggle-row">
          <span class="ctrl-label">自动巡游模式</span>
          <el-switch v-model="tourOn" @change="onTourToggle(tourOn)" />
        </div>
        <div class="hint">开启后镜头自动游历各路线视角</div>
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">定位到站点</div>
        <div class="station-btns">
          <button
            v-for="(s, i) in stations"
            :key="i"
            class="station-btn"
            :style="{ borderColor: s.color + '66', color: s.color }"
            @click="onFocus(i)"
          >{{ s.name }}</button>
        </div>
      </div>

      <div class="route-legend">
        <div class="legend-title">路线图例</div>
        <div v-for="(r, i) in routes" :key="i" class="route-item">
          <span class="route-line" :style="{ background: r.color }" />
          <span class="route-label">{{ r.from }} → {{ r.to }}</span>
        </div>
      </div>

      <div class="tech-list">
        <div class="tech-item">CatmullRomCurve3 曲线路径</div>
        <div class="tech-item">TubeGeometry 管道轨道</div>
        <div class="tech-item">LineBasicMaterial 发光叠加层</div>
        <div class="tech-item">CSS2DObject 站名标牌</div>
      </div>
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
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 5px; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.hint { color: rgba(0,229,255,0.35); font-size: 10px; }
.station-btns { display: flex; flex-direction: column; gap: 5px; }
.station-btn {
  width: 100%; padding: 5px 8px; font-size: 11px; cursor: pointer; text-align: left;
  background: rgba(0,229,255,0.03); border: 1px solid; border-radius: 4px; transition: all .2s;
}
.station-btn:hover { background: rgba(0,229,255,0.08); }
.route-legend { margin-bottom: 14px; }
.legend-title { color: var(--color-text-secondary); font-size: 11px; font-weight: 700; margin-bottom: 7px; }
.route-item { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.route-line { width: 20px; height: 2px; flex-shrink: 0; border-radius: 1px; }
.route-label { color: var(--color-text-secondary); font-size: 11px; }
.tech-list { border-top: 1px solid rgba(0,229,255,0.1); padding-top: 10px; }
.tech-item { color: rgba(0,229,255,0.4); font-size: 10px; margin-bottom: 4px; }
.tech-item::before { content: '· '; }
</style>
