<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo13-css2d-popup'

const container = ref<HTMLElement>()

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">信息卡片弹窗</div>
      <div class="panel-desc">CSS2DRenderer 叠加 HTML 弹窗于 3D 场景，OutlinePass 青色描边选中设备。</div>

      <div class="guide">
        <div class="guide-item">
          <el-icon><CursorFilled /></el-icon>
          <span>点击设备立方体弹出信息卡片</span>
        </div>
        <div class="guide-item">
          <el-icon><Select /></el-icon>
          <span>再次点击同一对象关闭弹窗</span>
        </div>
        <div class="guide-item">
          <el-icon><Grid /></el-icon>
          <span>点击空白区域关闭所有弹窗</span>
        </div>
      </div>

      <div class="tech-list">
        <div class="tech-item">
          <span class="tech-name">CSS2DRenderer</span>
          <span class="tech-desc">独立 DOM 渲染器叠加在 canvas 上，position: absolute</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">CSS2DObject</span>
          <span class="tech-desc">将 HTMLElement 绑定为 3D 对象，随对象移动保持屏幕对齐</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">OutlinePass</span>
          <span class="tech-desc">被选设备显示青色发光描边</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">弹窗样式</span>
          <span class="tech-desc">深色背景 + 青色边框 + 扫描动画 + 箭头指示器</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">设备数据</span>
          <span class="tech-desc">8 类铁路检测设备，含实时参数与告警状态</span>
        </div>
      </div>

      <div class="legend">
        <div class="legend-item"><span class="dot" style="background:#0d47a1" />正常设备</div>
        <div class="legend-item"><span class="dot" style="background:#e65100" />告警设备</div>
        <div class="legend-item"><span class="dot" style="background:#b71c1c" />异常设备</div>
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
.guide { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.guide-item { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 11px; }
.guide-item .el-icon { color: var(--color-accent); flex-shrink: 0; }
.tech-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.tech-item { padding: 6px 8px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.25); }
.tech-name { display: block; color: var(--color-text-primary); font-size: 11px; font-weight: 600; margin-bottom: 2px; }
.tech-desc { color: rgba(128,203,196,0.65); font-size: 10px; line-height: 1.4; }
.legend { display: flex; gap: 12px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 10px; }
.legend-item { display: flex; align-items: center; gap: 5px; color: var(--color-text-secondary); font-size: 10px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
</style>
