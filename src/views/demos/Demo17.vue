<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo17-cabinet'

const container = ref<HTMLElement>()

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">服务器机柜交互</div>
      <div class="panel-desc">3 组机柜 × 8U × 3 盘位，点击磁盘弹出/收回并显示详细参数。</div>

      <div class="interact-guide">
        <div class="guide-title">操作说明</div>
        <div class="guide-item">
          <span class="guide-icon click-icon">&#9654;</span>
          <span>点击磁盘 — 弹出/收回，弹出时显示参数弹窗</span>
        </div>
        <div class="guide-item">
          <span class="guide-icon">&#9762;</span>
          <span>悬停磁盘 — 轮廓高亮预览</span>
        </div>
        <div class="guide-item">
          <span class="guide-icon">&#9881;</span>
          <span>拖拽旋转 — OrbitControls 查看机柜</span>
        </div>
      </div>

      <div class="legend-title">磁盘状态指示灯</div>
      <div class="legend-list">
        <div class="legend-item">
          <span class="led green" />
          正常运行 (健康度 &gt; 70%)
        </div>
        <div class="legend-item">
          <span class="led orange" />
          性能降级 (健康度 40–70%)
        </div>
        <div class="legend-item">
          <span class="led red" />
          故障/预警 (健康度 &lt; 40%)
        </div>
        <div class="legend-item">
          <span class="led blue" />
          活跃读写 (IOPS 持续闪烁)
        </div>
      </div>

      <div class="stat-fields">
        <div class="field-title">弹窗字段说明</div>
        <div class="field-row"><span class="field-key">Model</span><span class="field-val">磁盘型号</span></div>
        <div class="field-row"><span class="field-key">Cap</span><span class="field-val">容量 (GB)</span></div>
        <div class="field-row"><span class="field-key">Health</span><span class="field-val">健康度 %</span></div>
        <div class="field-row"><span class="field-key">Temp</span><span class="field-val">温度 °C</span></div>
        <div class="field-row"><span class="field-key">IOPS</span><span class="field-val">每秒 IO 次数</span></div>
        <div class="field-row"><span class="field-key">R/W</span><span class="field-val">读写速率 MB/s</span></div>
      </div>

      <div class="tip">OutlinePass 高亮已选中磁盘</div>
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
.interact-guide { background: rgba(0,229,255,0.04); border: 1px solid rgba(0,229,255,0.12); border-radius: 5px; padding: 10px; margin-bottom: 14px; }
.guide-title { color: var(--color-accent); font-size: 11px; font-weight: 700; margin-bottom: 8px; }
.guide-item { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 6px; line-height: 1.4; }
.guide-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; color: var(--color-accent); }
.legend-title { color: var(--color-text-secondary); font-size: 11px; font-weight: 700; margin-bottom: 8px; }
.legend-list { margin-bottom: 14px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 6px; }
.led { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.led.green { background: #69f0ae; box-shadow: 0 0 5px #69f0ae; }
.led.orange { background: #ffca28; box-shadow: 0 0 5px #ffca28; }
.led.red { background: #ff5252; box-shadow: 0 0 5px #ff5252; }
.led.blue { background: #00e5ff; box-shadow: 0 0 5px #00e5ff; }
.stat-fields { margin-bottom: 10px; }
.field-title { color: var(--color-text-secondary); font-size: 11px; font-weight: 700; margin-bottom: 8px; }
.field-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid rgba(0,229,255,0.06); }
.field-key { color: var(--color-accent); font-size: 10px; font-family: monospace; font-weight: 700; }
.field-val { color: var(--color-text-secondary); font-size: 10px; }
.tip { color: rgba(0,229,255,0.35); font-size: 10px; text-align: center; margin-top: 8px; }
</style>
