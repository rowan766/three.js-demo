<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setVisibility } from '@/demos/demo07-track'

const container = ref<HTMLElement>()
const vis = ref({ rails: true, sleepers: true, ballast: true, helpers: true })

function toggle(key: 'rails' | 'sleepers' | 'ballast' | 'helpers') {
  vis.value[key] = !vis.value[key]
  setVisibility(key, vis.value[key])
}

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">铁路轨道生成</div>
      <div class="panel-desc">CatmullRomCurve3 样条曲线 + 偏置轨道（标准轨距 1435mm）。</div>

      <div class="ctrl-section">
        <div class="ctrl-label">图层显示</div>
        <div class="toggle-list">
          <div v-for="(label, key) in { rails: '钢轨', sleepers: '枕木', ballast: '道碴', helpers: '控制点' }"
            :key="key" class="toggle-item" :class="{ active: vis[key] }" @click="toggle(key as any)">
            <span class="dot" :class="key" />
            {{ label }}
          </div>
        </div>
      </div>

      <div class="tech-list">
        <div class="tech-item">
          <span class="tech-name">CatmullRomCurve3</span>
          <span class="tech-desc">7 个控制点，带高差的 S 形曲线</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">偏置轨计算</span>
          <span class="tech-desc">getPointAt + getTangentAt → cross(tan, up) 求右向量</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">TubeGeometry</span>
          <span class="tech-desc">偏置曲线 → 圆截面管道几何体</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">枕木朝向</span>
          <span class="tech-desc">Matrix4.makeBasis 对齐枕木垂直于切线</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">阴影渲染</span>
          <span class="tech-desc">PCFSoftShadowMap，轨道投射/接受阴影</span>
        </div>
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
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.ctrl-section { margin-bottom: 14px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 8px; }
.toggle-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.toggle-item {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  border: 1px solid rgba(0,229,255,0.15); border-radius: 5px;
  cursor: pointer; color: rgba(224,247,250,0.5); font-size: 12px; transition: all 0.2s;
}
.toggle-item.active { border-color: rgba(0,229,255,0.5); color: var(--color-text-primary); background: rgba(0,229,255,0.06); }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.rails { background: #bdbdbd; }
.dot.sleepers { background: #8d6e63; }
.dot.ballast { background: #795548; }
.dot.helpers { background: #00e5ff; }
.tech-list { display: flex; flex-direction: column; gap: 6px; }
.tech-item { padding: 6px 8px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.25); }
.tech-name { display: block; color: var(--color-text-primary); font-size: 11px; font-weight: 600; margin-bottom: 2px; }
.tech-desc { color: rgba(128,203,196,0.7); font-size: 10px; line-height: 1.4; }
</style>
