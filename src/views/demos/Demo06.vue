<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { init, dispose, loadFile, type ModelInfo } from '@/demos/demo06-model-loader'
import { ElMessage } from 'element-plus'

const container = ref<HTMLElement>()
const modelInfo = ref<ModelInfo | null>(null)
const loading = ref(false)
const isDragOver = ref(false)

function onInfo(info: ModelInfo | null) {
  loading.value = info === null
  modelInfo.value = info
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  handleFile(file)
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function handleFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['glb', 'gltf', 'fbx'].includes(ext ?? '')) {
    ElMessage.warning('仅支持 .glb / .gltf / .fbx 格式')
    return
  }
  loading.value = true
  loadFile(file)
}

onMounted(() => { if (container.value) init(container.value, onInfo) })
onUnmounted(() => dispose())
</script>

<template>
  <div class="demo-wrap">
    <div ref="container" class="canvas-container"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="onDrop"
    />

    <!-- Drag overlay -->
    <transition name="fade">
      <div v-if="isDragOver" class="drop-overlay">
        <div class="drop-hint">
          <el-icon size="48"><Upload /></el-icon>
          <p>释放以加载模型</p>
        </div>
      </div>
    </transition>

    <div class="info-panel">
      <div class="panel-title">模型加载</div>
      <div class="panel-desc">支持 GLB / GLTF / FBX 格式，自动播放内置动画。</div>

      <!-- Upload zone -->
      <label class="upload-zone" :class="{ active: isDragOver }">
        <input type="file" accept=".glb,.gltf,.fbx" style="display:none" @change="onFileInput" />
        <el-icon><FolderOpened /></el-icon>
        <span>点击选择 或 拖拽模型文件到画布</span>
      </label>

      <!-- Loading indicator -->
      <div v-if="loading" class="loading-row">
        <el-icon class="spin"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <!-- Model info -->
      <template v-if="modelInfo && !loading">
        <div class="divider" />
        <div class="stat-title">模型信息</div>
        <div class="stat-grid">
          <div class="stat-item"><span class="stat-label">文件名</span><span class="stat-value small">{{ modelInfo.name }}</span></div>
          <div class="stat-item"><span class="stat-label">顶点数</span><span class="stat-value">{{ modelInfo.vertices.toLocaleString() }}</span></div>
          <div class="stat-item"><span class="stat-label">三角面</span><span class="stat-value">{{ modelInfo.triangles.toLocaleString() }}</span></div>
          <div class="stat-item"><span class="stat-label">Mesh 数</span><span class="stat-value">{{ modelInfo.meshes }}</span></div>
          <div class="stat-item"><span class="stat-label">动画数</span><span class="stat-value">{{ modelInfo.animations }}</span></div>
          <div class="stat-item"><span class="stat-label">文件大小</span><span class="stat-value">{{ modelInfo.size }}</span></div>
        </div>
      </template>

      <div class="tips">
        <div>· 默认显示 Box Mesh 占位模型</div>
        <div>· GLTFLoader / FBXLoader 动态加载</div>
        <div>· 自动适配相机位置 + 投影阴影</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-wrap { width: 100%; height: 100%; position: relative; overflow: hidden; }
.canvas-container { width: 100%; height: 100%; }

.drop-overlay {
  position: absolute; inset: 0;
  background: rgba(0, 229, 255, 0.08);
  border: 2px dashed var(--color-accent);
  display: flex; align-items: center; justify-content: center;
  pointer-events: none; z-index: 10;
}
.drop-hint { text-align: center; color: var(--color-accent); }
.drop-hint p { margin-top: 12px; font-size: 16px; }

.info-panel {
  position: absolute; top: 16px; right: 16px; width: 270px;
  background: rgba(6, 12, 24, 0.92); border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px; padding: 16px; backdrop-filter: blur(8px);
  max-height: calc(100% - 32px); overflow-y: auto;
}
.panel-title { color: var(--color-accent); font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.panel-desc { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 12px; line-height: 1.5; }

.upload-zone {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border: 1px dashed rgba(0, 229, 255, 0.3);
  border-radius: 6px; cursor: pointer; color: var(--color-text-secondary);
  font-size: 12px; transition: all 0.2s; margin-bottom: 10px;
}
.upload-zone:hover, .upload-zone.active {
  border-color: var(--color-accent); color: var(--color-accent);
  background: rgba(0, 229, 255, 0.05);
}

.loading-row { display: flex; align-items: center; gap: 8px; color: var(--color-accent); font-size: 13px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.divider { height: 1px; background: rgba(0, 229, 255, 0.12); margin: 10px 0; }
.stat-title { color: var(--color-text-secondary); font-size: 11px; margin-bottom: 8px; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 12px; }
.stat-item { background: rgba(0,229,255,0.04); border-radius: 4px; padding: 5px 7px; }
.stat-label { display: block; color: rgba(128,203,196,0.6); font-size: 10px; margin-bottom: 2px; }
.stat-value { color: var(--color-text-primary); font-size: 12px; font-weight: 600; }
.stat-value.small { font-size: 10px; word-break: break-all; }

.tips { color: rgba(0, 229, 255, 0.35); font-size: 10px; line-height: 1.8; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
