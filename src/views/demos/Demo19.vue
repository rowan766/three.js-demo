<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo19-dataviz'

const container = ref<HTMLElement>()

const sensors = reactive([
  { name: '速度监测 A1', channel: '速度 km/h', color: '#00e5ff', value: 0.78 },
  { name: '温度传感 B1', channel: '温度 °C', color: '#ff7043', value: 0.45 },
  { name: '振动检测 C1', channel: '振动 mm/s', color: '#ffca28', value: 0.20 },
  { name: '轴重计量 D1', channel: '轴重 t', color: '#69f0ae', value: 0.62 },
  { name: '电压监测 E1', channel: '电压 kV', color: '#ce93d8', value: 0.88 },
  { name: '流量计 F1', channel: '流量 L/min', color: '#4fc3f7', value: 0.33 },
])

function pct(v: number) { return (v * 100).toFixed(1) + '%' }

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">数据可视化叠加</div>
      <div class="panel-desc">6 路传感器沿轨道布置，实时数据驱动 3D 柱状图 + Canvas 折线图。</div>

      <div class="sensor-list">
        <div class="sensor-title">传感器通道</div>
        <div v-for="s in sensors" :key="s.name" class="sensor-row">
          <div class="sensor-head">
            <span class="sensor-dot" :style="{ background: s.color, boxShadow: `0 0 5px ${s.color}` }" />
            <span class="sensor-name" :style="{ color: s.color }">{{ s.name }}</span>
          </div>
          <div class="sensor-bar-wrap">
            <div class="sensor-bar-bg">
              <div class="sensor-bar-fill" :style="{ width: pct(s.value), background: s.color }" />
            </div>
            <span class="sensor-val">{{ pct(s.value) }}</span>
          </div>
          <div class="sensor-channel">{{ s.channel }}</div>
        </div>
      </div>

      <div class="viz-desc">
        <div class="desc-title">技术要点</div>
        <div class="desc-item">
          <span class="desc-dot" />
          <span>BoxGeometry 柱体高度实时插值动画</span>
        </div>
        <div class="desc-item">
          <span class="desc-dot" />
          <span>CanvasTexture 每 4 帧刷新折线图</span>
        </div>
        <div class="desc-item">
          <span class="desc-dot" />
          <span>TorusGeometry 顶部发光环跟随柱高</span>
        </div>
        <div class="desc-item">
          <span class="desc-dot" />
          <span>HSL 色相随数值变化 (低→高: 绿→红)</span>
        </div>
        <div class="desc-item">
          <span class="desc-dot" />
          <span>CSS2DObject 通道名称标签</span>
        </div>
      </div>

      <div class="tip">柱体颜色与高度实时反映传感器读数</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 250px;
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.sensor-list { margin-bottom: 14px; }
.sensor-title { color: var(--color-text-secondary); font-size: 11px; font-weight: 700; margin-bottom: 8px; }
.sensor-row { margin-bottom: 9px; }
.sensor-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.sensor-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.sensor-name { font-size: 11px; font-weight: 700; }
.sensor-bar-wrap { display: flex; align-items: center; gap: 7px; }
.sensor-bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.sensor-bar-fill { height: 100%; border-radius: 2px; transition: width .4s; }
.sensor-val { color: rgba(200,220,230,0.7); font-size: 10px; font-family: monospace; width: 38px; text-align: right; flex-shrink: 0; }
.sensor-channel { color: rgba(0,229,255,0.3); font-size: 9px; margin-top: 1px; }
.viz-desc { border-top: 1px solid rgba(0,229,255,0.1); padding-top: 10px; margin-bottom: 10px; }
.desc-title { color: var(--color-text-secondary); font-size: 11px; font-weight: 700; margin-bottom: 7px; }
.desc-item { display: flex; align-items: flex-start; gap: 7px; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 5px; line-height: 1.4; }
.desc-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--color-accent); flex-shrink: 0; margin-top: 4px; }
.tip { color: rgba(0,229,255,0.35); font-size: 10px; text-align: center; }
</style>
