import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void
let stats: Stats
let statsContainer: HTMLElement | null = null
const meshes: THREE.Mesh[] = []

export interface RendererInfo {
  fps: number; ms: number
  calls: number; triangles: number
  geometries: number; textures: number; programs: number
  memory: number
}

let onInfoCb: ((info: RendererInfo) => void) | null = null
let lastFpsTime = 0, frameCount = 0, fps = 0, lastFrameMs = 0

export interface SceneConfig {
  wireframe: boolean; fog: boolean; objectCount: number; autoRotate: boolean
}

export const config: SceneConfig = { wireframe: false, fog: true, objectCount: 50, autoRotate: true }

export function init(container: HTMLElement, onInfo: (info: RendererInfo) => void) {
  clock = new THREE.Clock()
  onInfoCb = onInfo

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060c14)
  scene.fog = new THREE.FogExp2(0x060c14, 0.03)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 16)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // Stats panel (FPS/MS/MB)
  stats = new Stats()
  stats.showPanel(0) // FPS panel
  Object.assign(stats.dom.style, { position: 'absolute', top: '8px', left: '8px', zIndex: '100' })
  statsContainer = container
  container.appendChild(stats.dom)

  scene.add(new THREE.AmbientLight(0x223355, 1.5))
  const dir = new THREE.DirectionalLight(0xffeedd, 3)
  dir.position.set(8, 15, 8)
  dir.castShadow = true
  dir.shadow.mapSize.set(1024, 1024)
  scene.add(dir)
  scene.add(new THREE.PointLight(0x00e5ff, 1, 30))

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(60, 60, 0x00e5ff08, 0x00e5ff05))

  buildObjects()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = config.autoRotate
  controls.autoRotateSpeed = 1.5

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function buildObjects() {
  meshes.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); scene.remove(m) })
  meshes.length = 0

  const geos = [
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12),
    new THREE.ConeGeometry(0.4, 0.9, 10),
    new THREE.TorusGeometry(0.4, 0.12, 10, 32),
  ]

  const areaHalf = 12
  for (let i = 0; i < config.objectCount; i++) {
    const geo = geos[i % geos.length]
    const color = new THREE.Color().setHSL((i / config.objectCount) * 0.6 + 0.55, 0.8, 0.45)
    const mat = new THREE.MeshStandardMaterial({
      color, metalness: 0.5, roughness: 0.4,
      wireframe: config.wireframe,
    })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(
      (Math.random() - 0.5) * areaHalf * 2,
      Math.random() * 4 + 0.5,
      (Math.random() - 0.5) * areaHalf * 2,
    )
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    m.castShadow = true
    m.receiveShadow = true
    scene.add(m)
    meshes.push(m)
  }
}

export function applyConfig() {
  controls.autoRotate = config.autoRotate
  if (scene.fog) {
    (scene.fog as THREE.FogExp2).density = config.fog ? 0.03 : 0
  }
  meshes.forEach(m => {
    (m.material as THREE.MeshStandardMaterial).wireframe = config.wireframe
  })
}

export function rebuildObjects() { buildObjects() }

export function setStatsPanel(panel: 0 | 1 | 2) { stats.showPanel(panel) }

function loop() {
  animId = requestAnimationFrame(loop)
  stats.begin()

  const now = performance.now()
  frameCount++
  if (now - lastFpsTime >= 500) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsTime))
    lastFpsTime = now
    frameCount = 0
  }
  lastFrameMs = Math.round(clock.getDelta() * 1000 * 10) / 10

  if (config.autoRotate) {
    meshes.forEach((m, i) => {
      m.rotation.y += 0.005 * (i % 2 === 0 ? 1 : -1)
      m.rotation.x += 0.003
    })
  }

  controls.update()
  renderer.render(scene, camera)

  const info = renderer.info
  onInfoCb?.({
    fps,
    ms: lastFrameMs,
    calls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: info.programs?.length ?? 0,
    memory: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      ? Math.round(((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory!.usedJSHeapSize) / 1024 / 1024)
      : 0,
  })

  stats.end()
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  stats.dom.parentElement?.removeChild(stats.dom)
  controls.dispose()
  meshes.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose() })
  meshes.length = 0
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
