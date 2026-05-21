<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo14-labels'

const container = ref<HTMLElement>()

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">动态标签</div>
      <div class="panel-desc">CSS2DRenderer 标签跟随 3D 对象，温度/气压数值实时刷新，状态样式动态切换。</div>

      <div class="status-list">
        <div class="status-item normal"><span class="dot" />正常货车 — 青色边框</div>
        <div class="status-item warning"><span class="dot" />告警货车 — 橙色边框闪烁</div>
        <div class="status-item alert"><span class="dot" />异常货车 — 红色边框脉冲 + 标题闪烁</div>
      </div>

      <div class="tech-list">
        <div class="tech-item">
          <span class="tech-name">CSS2DObject.position</span>
          <span class="tech-desc">在对象本地坐标系中偏移标签位置</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">labelRenderer.render()</span>
          <span class="tech-desc">每帧与 WebGL 渲染器同步调用，保持位置对齐</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">DOM 直接更新</span>
          <span class="tech-desc">querySelector 查找 live-val 节点更新数值，避免重建 DOM</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">CSS Animation</span>
          <span class="tech-desc">@keyframes blink/pulse-border 驱动告警状态动画</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">transform: translate</span>
          <span class="tech-desc">标签向上偏移避免遮挡 3D 对象本体</span>
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
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.status-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.status-item { display: flex; align-items: center; gap: 7px; font-size: 11px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-item.normal { color: rgba(0,229,255,0.7); }
.status-item.normal .dot { background: #00e5ff; }
.status-item.warning { color: rgba(255,152,0,0.8); }
.status-item.warning .dot { background: #ff9800; }
.status-item.alert { color: rgba(255,82,82,0.8); }
.status-item.alert .dot { background: #ff5252; }
.tech-list { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 12px; }
.tech-item { padding: 6px 8px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.25); }
.tech-name { display: block; color: var(--color-text-primary); font-size: 11px; font-weight: 600; margin-bottom: 2px; font-family: monospace; }
.tech-desc { color: rgba(128,203,196,0.65); font-size: 10px; line-height: 1.4; }
</style>
