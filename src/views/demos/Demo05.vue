<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose } from '@/demos/demo05-animation'

const container = ref<HTMLElement>()

const animations = [
  { name: '单摆运动', tech: 'Math.sin(t)', desc: '正弦函数驱动旋转角，模拟物理单摆' },
  { name: '车轮旋转', tech: 'rotation.z -= δ', desc: '每帧累加旋转量，uniform angular velocity' },
  { name: '火车位移', tech: 'position.x = lerp(t)', desc: '线性插值沿 X 轴循环移动' },
  { name: 'AnimationMixer', tech: 'KeyframeTrack', desc: 'Three.js 内置动画系统，关键帧驱动缩放脉冲' },
  { name: '缓动对比', tech: 'Easing Functions', desc: 'linear / easeInOut / elasticOut / bounceOut 四种缓动沿 Z 轴对比' },
]

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">动画基础</div>
      <div class="panel-desc">5 种动画驱动方式，使用 requestAnimationFrame + clock.getDelta() 帧率无关更新。</div>
      <div class="anim-list">
        <div v-for="a in animations" :key="a.name" class="anim-item">
          <div class="anim-header">
            <span class="anim-name">{{ a.name }}</span>
            <code class="anim-tech">{{ a.tech }}</code>
          </div>
          <span class="anim-desc">{{ a.desc }}</span>
        </div>
      </div>
      <div class="tip">右下角 4 个小方块演示 4 种缓动函数（Z轴方向运动）</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 270px;
  background: rgba(6, 12, 24, 0.9); border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.08);
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }
.anim-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
.anim-item {
  padding: 7px 8px; background: rgba(0, 229, 255, 0.04); border-radius: 4px;
  border-left: 2px solid rgba(0, 229, 255, 0.25);
}
.anim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.anim-name { color: var(--color-text-primary); font-size: 12px; font-weight: 600; }
.anim-tech {
  background: rgba(0,229,255,0.1); color: var(--color-accent);
  font-size: 10px; padding: 1px 5px; border-radius: 3px; font-family: monospace;
}
.anim-desc { color: rgba(128, 203, 196, 0.7); font-size: 11px; }
.tip {
  color: rgba(0, 229, 255, 0.4); font-size: 10px; padding-top: 10px;
  border-top: 1px solid rgba(0, 229, 255, 0.1); line-height: 1.4;
}
</style>
