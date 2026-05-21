<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, setSpeed, setCameraFollow } from '@/demos/demo08-train'

const container = ref<HTMLElement>()
const speed = ref(1.0)
const cameraFollow = ref(false)

function onSpeedChange(v: number) { setSpeed(v) }
function onFollowChange(v: boolean) { setCameraFollow(v) }

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => { setCameraFollow(false); dispose() })
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">火车沿轨道运动</div>
      <div class="panel-desc">闭合椭圆轨道，列车实时对齐切线方向，车轮同步旋转。</div>

      <div class="ctrl-section">
        <div class="ctrl-label">车速倍率：{{ speed.toFixed(1) }}×</div>
        <el-slider v-model="speed" :min="0.1" :max="4" :step="0.1" @input="onSpeedChange(speed)" />
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">跟随摄像机</div>
        <el-switch v-model="cameraFollow" @change="onFollowChange(cameraFollow)"
          active-text="跟随列车" inactive-text="自由视角" />
      </div>

      <div class="tech-list">
        <div class="tech-item">
          <span class="tech-name">curve.getPointAt(t)</span>
          <span class="tech-desc">按弧长均匀采样位置，避免速度不均匀</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">Matrix4.makeBasis</span>
          <span class="tech-desc">right/up/forward 三轴构建朝向矩阵</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">quaternion.slerp</span>
          <span class="tech-desc">球面线性插值平滑旋转，避免抖动</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">SpotLight headlight</span>
          <span class="tech-desc">车头探照灯实时跟随，照向前方轨道</span>
        </div>
        <div class="tech-item">
          <span class="tech-name">camera.lerp</span>
          <span class="tech-desc">相机跟随时插值位置，平滑跟拍</span>
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
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 6px; }
:deep(.el-slider__runway) { background: rgba(0,229,255,0.15); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-slider__button) { border-color: var(--color-accent); }
.tech-list { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(0,229,255,0.1); padding-top: 12px; }
.tech-item { padding: 6px 8px; background: rgba(0,229,255,0.04); border-radius: 4px; border-left: 2px solid rgba(0,229,255,0.25); }
.tech-name { display: block; color: var(--color-text-primary); font-size: 11px; font-weight: 600; margin-bottom: 2px; font-family: monospace; }
.tech-desc { color: rgba(128,203,196,0.7); font-size: 10px; line-height: 1.4; }
</style>
