<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, type EqInfo } from '@/demos/demo11-raycasting'

const container = ref<HTMLElement>()
const hovered = ref<EqInfo | null>(null)
const selected = ref<EqInfo | null>(null)

const statusLabel = { normal: '正常', warning: '告警', alert: '异常' }
const statusColor = { normal: '#69f0ae', warning: '#ffca28', alert: '#ff5252' }

onMounted(() => { if (container.value) init(container.value, v => (hovered.value = v), v => (selected.value = v)) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />

    <!-- Hover tooltip -->
    <transition name="fade">
      <div v-if="hovered" class="hover-tip">
        <span class="dot" :style="{ background: statusColor[hovered.status] }" />
        {{ hovered.name }}
      </div>
    </transition>

    <!-- Right info panel -->
    <div class="info-panel">
      <div class="panel-title">射线拾取</div>
      <div class="panel-desc">Raycaster.intersectObjects — 鼠标悬停高亮，点击显示设备详情。</div>

      <div class="tech-list">
        <div class="tech-item"><code>Raycaster.setFromCamera</code><span>鼠标 NDC 坐标转射线</span></div>
        <div class="tech-item"><code>intersectObjects(objs, true)</code><span>递归检测 Group 内所有子 Mesh</span></div>
        <div class="tech-item"><code>emissive / emissiveIntensity</code><span>悬停/选中状态的青色发光</span></div>
        <div class="tech-item"><code>hits[0].point / distance</code><span>交点坐标与射线距离</span></div>
      </div>

      <div v-if="selected" class="selected-card">
        <div class="sc-header">
          <span class="sc-name">{{ selected.name }}</span>
          <span class="sc-status" :style="{ color: statusColor[selected.status] }">
            ● {{ statusLabel[selected.status] }}
          </span>
        </div>
        <div class="sc-cat">{{ selected.cat }}</div>
        <div class="sc-divider" />
        <div class="sc-params">
          <div v-for="(v, k) in selected.params" :key="k" class="sc-row">
            <span class="sc-key">{{ k }}</span>
            <span class="sc-val">{{ v }}</span>
          </div>
          <div v-if="selected.hitPoint" class="sc-row">
            <span class="sc-key">交点坐标</span>
            <span class="sc-val">
              ({{ selected.hitPoint.x.toFixed(2) }}, {{ selected.hitPoint.y.toFixed(2) }}, {{ selected.hitPoint.z.toFixed(2) }})
            </span>
          </div>
          <div v-if="selected.distance" class="sc-row">
            <span class="sc-key">射线距离</span>
            <span class="sc-val">{{ selected.distance }} m</span>
          </div>
        </div>
      </div>
      <div v-else class="hint">点击场景中任意设备查看详情</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }

.hover-tip {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: rgba(4,10,22,0.9); border: 1px solid rgba(0,229,255,0.3);
  border-radius: 20px; padding: 6px 14px; color: var(--color-text-primary);
  font-size: 12px; display: flex; align-items: center; gap: 7px;
  pointer-events: none; backdrop-filter: blur(6px);
}
.dot { width: 7px; height: 7px; border-radius: 50%; }

.info-panel {
  position: absolute; top: 16px; right: 16px; width: 270px;
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }

.tech-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.tech-item { display: flex; flex-direction: column; gap: 2px; padding: 5px 7px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.2); }
.tech-item code { color: var(--color-accent); font-size: 10px; }
.tech-item span { color: rgba(128,203,196,0.65); font-size: 10px; }

.selected-card { background: rgba(0,229,255,0.05); border: 1px solid rgba(0,229,255,0.3); border-radius: 6px; padding: 10px; }
.sc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; gap:6px; }
.sc-name { color: var(--color-text-primary); font-size: 12px; font-weight: 700; }
.sc-status { font-size: 10px; font-weight: 600; white-space: nowrap; }
.sc-cat { color: var(--color-text-secondary); font-size: 10px; margin-bottom: 8px; }
.sc-divider { height: 1px; background: rgba(0,229,255,0.15); margin-bottom: 8px; }
.sc-params { display: flex; flex-direction: column; gap: 4px; }
.sc-row { display: flex; justify-content: space-between; gap: 6px; }
.sc-key { color: rgba(128,203,196,0.55); font-size: 10px; white-space: nowrap; }
.sc-val { color: #e0f7fa; font-size: 10px; font-weight: 600; font-family: monospace; text-align: right; }
.hint { color: rgba(0,229,255,0.3); font-size: 11px; text-align: center; padding: 10px 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
