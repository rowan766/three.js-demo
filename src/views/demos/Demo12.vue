<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { init, dispose, setOutlineParam, clearSelection, getSelectedNames, outlineParams } from '@/demos/demo12-outline'

const container = ref<HTMLElement>()
const params = reactive({ ...outlineParams })
const selected = ref<string[]>([])

// Poll selection every 200ms
let pollId: number
function startPoll() { pollId = window.setInterval(() => { selected.value = getSelectedNames() }, 200) }

function apply(key: keyof typeof outlineParams, v: number | string) {
  setOutlineParam(key, v)
}

onMounted(() => { if (container.value) { init(container.value); startPoll() } })
onUnmounted(() => { clearInterval(pollId); clearSelection(); dispose() })
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">模型高亮描边</div>
      <div class="panel-desc">EffectComposer + OutlinePass，点击选中，Shift+点击多选。</div>

      <div class="ctrl-section">
        <div class="ctrl-label">描边强度: {{ params.edgeStrength }}</div>
        <el-slider v-model="params.edgeStrength" :min="0.5" :max="8" :step="0.5"
          @input="apply('edgeStrength', params.edgeStrength)" />
      </div>
      <div class="ctrl-section">
        <div class="ctrl-label">发光强度: {{ params.edgeGlow }}</div>
        <el-slider v-model="params.edgeGlow" :min="0" :max="3" :step="0.1"
          @input="apply('edgeGlow', params.edgeGlow)" />
      </div>
      <div class="ctrl-section">
        <div class="ctrl-label">描边厚度: {{ params.edgeThickness }}</div>
        <el-slider v-model="params.edgeThickness" :min="0.5" :max="6" :step="0.5"
          @input="apply('edgeThickness', params.edgeThickness)" />
      </div>
      <div class="ctrl-section">
        <div class="ctrl-label">描边颜色（可见面）</div>
        <input type="color" v-model="params.visibleEdgeColor" class="color-input"
          @input="apply('visibleEdgeColor', params.visibleEdgeColor)" />
      </div>

      <el-button size="small" class="clear-btn" @click="clearSelection(); selected = []">清除选择</el-button>

      <div class="divider" />
      <div class="sel-title">已选对象 ({{ selected.length }})</div>
      <div v-if="selected.length === 0" class="hint">点击场景对象进行选择</div>
      <div v-for="(name, i) in selected" :key="i" class="sel-item">
        <span class="sel-icon">◈</span> {{ name }}
      </div>

      <div class="pipe-list">
        <div class="pipe-title">渲染管线</div>
        <div class="pipe-item">RenderPass → 渲染场景</div>
        <div class="pipe-item">OutlinePass → 描边后处理</div>
        <div class="pipe-item">ShaderPass(FXAA) → 抗锯齿</div>
        <div class="pipe-item">OutputPass → 色彩空间输出</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 265px;
  background: rgba(6,12,24,0.92); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }
.ctrl-section { margin-bottom: 12px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 5px; }
:deep(.el-slider__runway) { background: rgba(0,229,255,0.15); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-slider__button) { border-color: var(--color-accent); }
.color-input { width: 100%; height: 28px; border: 1px solid rgba(0,229,255,0.3); border-radius: 4px; background: transparent; cursor: pointer; padding: 2px; }
.clear-btn { width: 100%; margin-bottom: 10px; background: rgba(0,229,255,0.08) !important; border-color: rgba(0,229,255,0.3) !important; color: var(--color-accent) !important; }
.divider { height: 1px; background: rgba(0,229,255,0.12); margin: 8px 0; }
.sel-title { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 6px; }
.hint { color: rgba(0,229,255,0.3); font-size: 11px; }
.sel-item { color: var(--color-text-primary); font-size: 11px; padding: 3px 0; display: flex; align-items: center; gap: 5px; }
.sel-icon { color: var(--color-accent); }
.pipe-list { margin-top: 14px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 10px; }
.pipe-title { color: var(--color-text-secondary); font-size: 10px; margin-bottom: 6px; letter-spacing: 0.5px; }
.pipe-item { color: rgba(128,203,196,0.7); font-size: 10px; padding: 3px 0 3px 8px; border-left: 2px solid rgba(0,229,255,0.2); margin-bottom: 3px; }
</style>
