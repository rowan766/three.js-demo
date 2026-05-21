import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export interface DeviceData {
  id: string
  name: string
  type: string
  status: 'normal' | 'warning' | 'alert'
  params: Record<string, string>
  pos: [number, number, number]
}

const DEVICES: DeviceData[] = [
  { id: 'spd01', name: '多普勒测速传感器 #A01', type: 'ZPW-2000A 型轨道电路', status: 'normal',
    pos: [-7, 0.9, -1.5],
    params: { '当前速度': '118.5 km/h', '精度': '±0.1 km/h', '采集频率': '100 Hz', '工作温度': '-40~85°C', '最后校准': '2026-03-15' } },
  { id: 'spd02', name: '多普勒测速传感器 #A02', type: 'ZPW-2000A 型轨道电路', status: 'normal',
    pos: [7, 0.9, 1.5],
    params: { '当前速度': '117.2 km/h', '精度': '±0.1 km/h', '采集频率': '100 Hz', '工作温度': '-40~85°C', '最后校准': '2026-03-15' } },
  { id: 'sig01', name: '进站信号机 #R01', type: '色灯信号机（四显示）', status: 'normal',
    pos: [-11, 2.2, 2.5],
    params: { '当前显示': '绿灯（允许进站）', '闭塞方式': '自动闭塞', '控制系统': 'CTCS-3 级', '供电回路': '主路正常', '上次维护': '2026-04-20' } },
  { id: 'sig02', name: '出站信号机 #R02', type: '色灯信号机（四显示）', status: 'warning',
    pos: [11, 2.2, -2.5],
    params: { '当前显示': '黄灯（注意速度）', '告警原因': '前方区间占用', '闭塞方式': '自动闭塞', '控制系统': 'CTCS-3 级', '上次维护': '2026-04-18' } },
  { id: 'cam01', name: '视频监控摄像头 #C01', type: 'AI 智能分析摄像机', status: 'normal',
    pos: [-5, 4.2, 3.5],
    params: { '分辨率': '4K 3840×2160', '帧率': '30 fps', 'AI 分析': '行为识别/异物检测', '存储余量': '32%', '在线时长': '127 天 4 小时' } },
  { id: 'tmp01', name: '轨温传感器 #B01', type: 'PT100 铂电阻温度传感器', status: 'alert',
    pos: [-2, 0.45, 0],
    params: { '当前温度': '72.3°C ⚠', '告警阈值': '70°C', '超限时长': '00:08:22', '测量范围': '-50~150°C', '供电状态': '正常' } },
  { id: 'det01', name: '车轮踏面检测仪 #D01', type: 'TADS 型动态检测系统', status: 'normal',
    pos: [2, 0.1, 0.5],
    params: { '今日过车': '1,284 辆', '检出异常': '0 辆', '检测精度': '0.1 mm', '最近检测': '2 分钟前', '系统版本': 'v3.2.1' } },
  { id: 'rel01', name: '电气继电箱 #E01', type: 'JZXC 型组合继电器', status: 'normal',
    pos: [-9, 0.9, -3],
    params: { '工作电压': '220V AC ±10%', '负载电流': '12.4 A', '绝缘电阻': '> 10 MΩ', '防护等级': 'IP65', '安装日期': '2024-11-08' } },
]

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void
let composer: EffectComposer, outlinePass: OutlinePass
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const pickableObjects: THREE.Object3D[] = []
let activePopup: CSS2DObject | null = null
let selectedObj: THREE.Object3D | null = null

function buildDeviceMesh(d: DeviceData): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
  const mat = new THREE.MeshStandardMaterial({
    color: d.status === 'normal' ? 0x0d47a1 : d.status === 'warning' ? 0xe65100 : 0xb71c1c,
    metalness: 0.6, roughness: 0.3,
  })
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.userData.device = d
  return m
}

function createPopupEl(d: DeviceData): HTMLDivElement {
  const el = document.createElement('div')
  Object.assign(el.style, {
    transform: 'translate(-50%, calc(-100% - 18px))',
    pointerEvents: 'none',
    userSelect: 'none',
  })

  const card = document.createElement('div')
  card.setAttribute('data-popup', d.id)
  Object.assign(card.style, {
    background: 'rgba(4,10,22,0.96)',
    border: '1px solid #00e5ff',
    borderRadius: '8px',
    padding: '14px 16px 12px',
    minWidth: '230px',
    maxWidth: '280px',
    boxShadow: '0 0 24px rgba(0,229,255,0.3), 0 0 60px rgba(0,100,160,0.15)',
    fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
    backdropFilter: 'blur(10px)',
    position: 'relative',
  })

  // Scan line animation bar at top
  const scanBar = document.createElement('div')
  Object.assign(scanBar.style, {
    height: '2px', background: 'linear-gradient(90deg,transparent,#00e5ff,transparent)',
    marginBottom: '10px', borderRadius: '1px',
    animation: 'scan 2s linear infinite',
  })

  // Header row
  const header = document.createElement('div')
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;'
  const title = document.createElement('div')
  title.textContent = d.name
  title.style.cssText = 'color:#00e5ff;font-size:12px;font-weight:700;letter-spacing:0.3px;flex:1;'
  const badge = document.createElement('div')
  badge.textContent = d.status === 'normal' ? '● 正常' : d.status === 'warning' ? '● 告警' : '● 异常'
  badge.style.cssText = `font-size:10px;font-weight:600;white-space:nowrap;color:${
    d.status === 'normal' ? '#69f0ae' : d.status === 'warning' ? '#ffca28' : '#ff5252'};`
  header.appendChild(title)
  header.appendChild(badge)

  const typeRow = document.createElement('div')
  typeRow.textContent = d.type
  typeRow.style.cssText = 'color:rgba(128,203,196,0.65);font-size:10px;margin-bottom:9px;'

  const divider = document.createElement('div')
  divider.style.cssText = 'height:1px;background:linear-gradient(90deg,rgba(0,229,255,0.3),transparent);margin-bottom:9px;'

  const params = document.createElement('div')
  params.style.cssText = 'display:flex;flex-direction:column;gap:5px;'
  Object.entries(d.params).forEach(([k, v]) => {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;'
    const kEl = document.createElement('span')
    kEl.textContent = k
    kEl.style.cssText = 'color:rgba(128,203,196,0.55);font-size:10px;white-space:nowrap;'
    const vEl = document.createElement('span')
    vEl.textContent = v
    vEl.style.cssText = 'color:#e0f7fa;font-size:10px;font-weight:600;font-family:monospace;text-align:right;'
    row.appendChild(kEl)
    row.appendChild(vEl)
    params.appendChild(row)
  })

  // Arrow caret
  const caret = document.createElement('div')
  Object.assign(caret.style, {
    position: 'absolute', bottom: '-8px', left: '50%',
    transform: 'translateX(-50%)',
    width: '0', height: '0',
    borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
    borderTop: '8px solid #00e5ff',
  })

  card.appendChild(scanBar)
  card.appendChild(header)
  card.appendChild(typeRow)
  card.appendChild(divider)
  card.appendChild(params)
  card.appendChild(caret)
  el.appendChild(card)

  return el
}

// Inject keyframe animation for scan bar
let styleEl: HTMLStyleElement | null = null
function injectStyle() {
  styleEl = document.createElement('style')
  styleEl.textContent = '@keyframes scan{0%{opacity:0.3}50%{opacity:1}100%{opacity:0.3}}'
  document.head.appendChild(styleEl)
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  injectStyle()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060c14)
  scene.fog = new THREE.FogExp2(0x060c14, 0.02)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 18)

  renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(1)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  // CSS2DRenderer
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none', overflow: 'hidden',
  })
  container.appendChild(labelRenderer.domElement)

  scene.add(new THREE.AmbientLight(0x223355, 2))
  const dir = new THREE.DirectionalLight(0xffeedd, 3)
  dir.position.set(8, 15, 8)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  scene.add(dir)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(60, 60, 0x00e5ff08, 0x00e5ff05))

  // Rail segment
  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9 })
  ;[-0.72, 0.72].forEach(x => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(30, 0.07, 0.07), railMat)
    r.position.set(0, 0.07, x)
    scene.add(r)
  })

  // Build device objects
  DEVICES.forEach(d => {
    const mesh = buildDeviceMesh(d)
    mesh.position.set(...d.pos)
    scene.add(mesh)
    pickableObjects.push(mesh)
  })

  // EffectComposer + OutlinePass
  const sz = new THREE.Vector2(container.clientWidth, container.clientHeight)
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  outlinePass = new OutlinePass(sz, scene, camera)
  outlinePass.edgeStrength = 4
  outlinePass.edgeGlow = 1
  outlinePass.edgeThickness = 2
  outlinePass.visibleEdgeColor.set('#00e5ff')
  outlinePass.hiddenEdgeColor.set('#003355')
  composer.addPass(outlinePass)
  composer.addPass(new OutputPass())

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 1, 0)

  renderer.domElement.addEventListener('click', onClick)

  onResize = () => {
    const w = container.clientWidth, h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    labelRenderer.setSize(w, h)
    composer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function showPopup(mesh: THREE.Mesh) {
  // Remove existing popup
  if (activePopup) { mesh.parent ? null : null; activePopup.element.remove(); scene.remove(activePopup) }
  const d = mesh.userData.device as DeviceData
  const el = createPopupEl(d)
  activePopup = new CSS2DObject(el)
  activePopup.position.set(0, 0.8, 0)
  mesh.add(activePopup)
  outlinePass.selectedObjects = [mesh]
  selectedObj = mesh
}

function hidePopup() {
  if (activePopup) {
    activePopup.element.remove()
    activePopup.parent?.remove(activePopup)
    activePopup = null
  }
  outlinePass.selectedObjects = []
  selectedObj = null
}

function onClick(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(pickableObjects, false)

  if (hits.length > 0) {
    const mesh = hits[0].object as THREE.Mesh
    if (mesh === selectedObj) hidePopup()
    else showPopup(mesh)
  } else {
    hidePopup()
  }
}

function loop() {
  animId = requestAnimationFrame(loop)
  controls.update()
  composer.render()
  labelRenderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.domElement.removeEventListener('click', onClick)
  hidePopup()
  styleEl?.remove()
  controls.dispose()
  composer.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
  pickableObjects.length = 0
}
