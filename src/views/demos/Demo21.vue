<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, retractAll, ejectRow } from '@/demos/demo21-slots'

const container = ref<HTMLElement>()

const rows = [
  { label: '第 1 行', desc: '继电器 / 信号处理' },
  { label: '第 2 行', desc: '通信接口 / 电源管理' },
  { label: '第 3 行', desc: 'IO控制 / 数据采集' },
  { label: '第 4 行', desc: '继电器 / 通信接口' },
  { label: '第 5 行', desc: '信号处理 / IO控制' },
]

const typeList = [
  { name: '继电器', color: '#5bc8ff' },
  { name: '信号处理', color: '#69f0ae' },
  { name: '通信接口', color: '#00e5ff' },
  { name: '电源管理', color: '#ffca28' },
  { name: 'IO控制', color: '#ce93d8' },
  { name: '数据采集', color: '#ff8a65' },
]

onMounted(() => { if (container.value) init(container.value) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container" />
    <div class="info-panel">
      <div class="panel-title">模块插槽箱</div>
      <div class="panel-desc">
        综合控制模块箱 8×5 = 40 个插槽，点击任意模块弹出/收回，弹出时显示参数弹窗。
      </div>

      <div class="ctrl-section">
        <div class="ctrl-label">快捷操作</div>
        <button class="action-btn retract" @click="retractAll()">全部收回</button>
        <div class="row-btns">
          <button
            v-for="(r, i) in rows"
            :key="i"
            class="row-btn"
            :title="r.desc"
            @click="ejectRow(i)"
          >弹出第 {{ i + 1 }} 行</button>
        </div>
      </div>

      <div class="type-legend">
        <div class="ctrl-label">模块类型</div>
        <div v-for="t in typeList" :key="t.name" class="type-item">
          <span class="type-dot" :style="{ background: t.color, boxShadow: `0 0 5px ${t.color}` }" />
          <span class="type-name" :style="{ color: t.color }">{{ t.name }}</span>
        </div>
      </div>

      <div class="status-legend">
        <div class="ctrl-label">状态指示灯</div>
        <div class="status-item"><span class="led green" />正常运行</div>
        <div class="status-item"><span class="led orange" />性能告警</div>
        <div class="status-item"><span class="led red" />模块故障</div>
      </div>

      <div class="tip">点击模块弹出 · 再次点击收回 · 拖拽旋转视角</div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }
.info-panel {
  position: absolute; top: 16px; right: 16px; width: 240px;
  background: rgba(6,12,24,0.93); border: 1px solid rgba(0,229,255,0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.ctrl-section { margin-bottom: 14px; }
.ctrl-label { color: var(--color-text-secondary); font-size: 11px; font-weight: 700; margin-bottom: 7px; }
.action-btn {
  width: 100%; padding: 6px 0; font-size: 11px; cursor: pointer; border-radius: 4px;
  border: 1px solid; transition: all .2s; margin-bottom: 7px;
}
.action-btn.retract {
  background: rgba(255,82,82,0.06); border-color: rgba(255,82,82,0.3); color: #ff8a8a;
}
.action-btn.retract:hover { background: rgba(255,82,82,0.14); }
.row-btns { display: flex; flex-direction: column; gap: 4px; }
.row-btn {
  width: 100%; padding: 5px 8px; font-size: 11px; cursor: pointer; text-align: left;
  background: rgba(0,229,255,0.04); border: 1px solid rgba(0,229,255,0.2);
  color: var(--color-text-secondary); border-radius: 4px; transition: all .2s;
}
.row-btn:hover { background: rgba(0,229,255,0.1); color: var(--color-accent); border-color: rgba(0,229,255,0.45); }
.type-legend { margin-bottom: 14px; }
.type-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.type-name { font-size: 11px; }
.status-legend { margin-bottom: 12px; }
.status-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 6px; }
.led { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.led.green { background: #00e676; box-shadow: 0 0 5px #00e676; }
.led.orange { background: #ffca28; box-shadow: 0 0 5px #ffca28; }
.led.red { background: #ff1744; box-shadow: 0 0 5px #ff1744; }
.tip { color: rgba(0,229,255,0.35); font-size: 10px; text-align: center; line-height: 1.5; }
</style>
