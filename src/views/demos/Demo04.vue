<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setCameraMode, setFov, toggleTour } from '@/demos/demo04-camera'

const container = ref<HTMLElement>()
const cameraMode = ref<'perspective' | 'ortho'>('perspective')
const fov = ref(60)
const touring = ref(false)

function switchCamera(mode: 'perspective' | 'ortho') {
  cameraMode.value = mode
  setCameraMode(mode)
}

function onFovChange(v: number) {
  setFov(v)
}

function onTourToggle(v: boolean) {
  toggleTour(v)
}

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => { toggleTour(false); dispose() })
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">相机控制</div>
      <div class="panel-desc">透视/正交相机切换，FOV 调节，自动巡游路点插值。</div>

      <div class="ctrl-section">
        <div class="ctrl-label">相机类型</div>
        <el-radio-group v-model="cameraMode" size="small" @change="switchCamera(cameraMode)">
          <el-radio-button value="perspective">透视 Perspective</el-radio-button>
          <el-radio-button value="ortho">正交 Orthographic</el-radio-button>
        </el-radio-group>
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">视角 FOV: {{ fov }}°</div>
        <el-slider v-model="fov" :min="20" :max="120" :step="1" @input="onFovChange(fov)" />
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">自动巡游</div>
        <el-switch v-model="touring" @change="onTourToggle(touring)" active-text="开启" inactive-text="关闭" />
        <div class="tip">巡游时关闭 OrbitControls，沿5个路点循环插值</div>
      </div>

      <div class="feature-list">
        <div class="feature-item">OrbitControls — 旋转/缩放/平移</div>
        <div class="feature-item">CameraHelper — 视锥线框可视化</div>
        <div class="feature-item">position.lerpVectors — 路径插值</div>
        <div class="feature-item">lookAt(0,0,0) — 始终对准原点</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 280px;
  background: rgba(6, 12, 24, 0.9); border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.08);
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.ctrl-section { margin-bottom: 16px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 6px; }
:deep(.el-radio-button__inner) {
  background: transparent; border-color: rgba(0, 229, 255, 0.25); color: var(--color-text-secondary); font-size: 11px;
}
:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: rgba(0, 229, 255, 0.15); border-color: var(--color-accent); color: var(--color-accent);
}
:deep(.el-slider__runway) { background: rgba(0, 229, 255, 0.15); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-slider__button) { border-color: var(--color-accent); }
.tip { color: rgba(0, 229, 255, 0.4); font-size: 10px; margin-top: 6px; line-height: 1.4; }
.feature-list { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 12px; }
.feature-item { color: rgba(128, 203, 196, 0.7); font-size: 11px; padding-left: 8px; border-left: 2px solid rgba(0,229,255,0.2); }
</style>
