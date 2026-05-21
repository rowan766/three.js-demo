import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface EqInfo {
  id: string
  name: string
  cat: string
  status: 'normal' | 'warning' | 'alert'
  params: Record<string, string>
  hitPoint?: THREE.Vector3
  distance?: number
}

interface EqData {
  id: string; name: string; cat: string; status: EqInfo['status']
  color: number; pos: [number, number, number]
  params: Record<string, string>
}

const EQ_DATA: EqData[] = [
  { id: 'spd-a01', name: '多普勒测速仪 A01', cat: '速度检测', status: 'normal', color: 0x1565c0,
    pos: [-7, 0, -1.5], params: { '当前速度': '118.5 km/h', '精度': '±0.1 km/h', '采集频率': '100 Hz', '状态码': '0x00 正常' } },
  { id: 'spd-a02', name: '多普勒测速仪 A02', cat: '速度检测', status: 'normal', color: 0x1565c0,
    pos: [7, 0, 1.5], params: { '当前速度': '117.2 km/h', '精度': '±0.1 km/h', '采集频率': '100 Hz', '状态码': '0x00 正常' } },
  { id: 'sig-r01', name: '进站信号机 R01', cat: '信号设备', status: 'normal', color: 0x4527a0,
    pos: [-11, 0, 2.5], params: { '当前显示': '绿灯', '距离下站': '2.3 km', '闭塞区间': 'AB-1', '状态码': '0x01 允许' } },
  { id: 'sig-r02', name: '出站信号机 R02', cat: '信号设备', status: 'warning', color: 0x4527a0,
    pos: [11, 0, -2.5], params: { '当前显示': '黄灯', '距离下站': '1.8 km', '闭塞区间': 'AB-2', '状态码': '0x02 注意' } },
  { id: 'cam-c01', name: '视频监控 C01', cat: '视频监控', status: 'normal', color: 0x2e7d32,
    pos: [-5, 0, 3.5], params: { '分辨率': '4K@30fps', '存储': '已用 68%', '在线时长': '127 天', '状态码': '0x00 录制中' } },
  { id: 'cam-c02', name: '视频监控 C02', cat: '视频监控', status: 'normal', color: 0x2e7d32,
    pos: [5, 0, -3.5], params: { '分辨率': '1080P@60fps', '存储': '已用 42%', '在线时长': '89 天', '状态码': '0x00 录制中' } },
  { id: 'tmp-b01', name: '轨温传感器 B01', cat: '温度监测', status: 'alert', color: 0xbf360c,
    pos: [-2, 0, 0], params: { '当前温度': '72.3°C', '阈值': '70°C', '超限时长': '00:08:22', '状态码': '0xFF 超温告警' } },
  { id: 'det-d01', name: '踏面检测仪 D01', cat: '车辆检测', status: 'normal', color: 0x00695c,
    pos: [2, 0, 0.5], params: { '今日过车': '1,284 辆', '异常数': '0', '最近检测': '2分钟前', '状态码': '0x00 正常' } },
  { id: 'rel-e01', name: '电气继电箱 E01', cat: '电气设备', status: 'normal', color: 0x37474f,
    pos: [-9, 0, -3], params: { '工作电压': '220V AC', '电流': '12.4 A', '绝缘电阻': '> 10 MΩ', '状态码': '0x00 正常' } },
  { id: 'cnt-f01', name: '计轴传感器 F01', cat: '计轴设备', status: 'normal', color: 0x4e342e,
    pos: [9, 0, 3], params: { '今日计轴': '2,568 次', '误差率': '0.00%', '工作频率': '30 kHz', '状态码': '0x00 正常' } },
]

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let controls: OrbitControls, clock: THREE.Clock
let animId: number, onResize: () => void
let onHoverCb: ((i: EqInfo | null) => void) | null = null
let onSelectCb: ((i: EqInfo | null) => void) | null = null

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const equipmentGroups: THREE.Group[] = []
let hoveredGroup: THREE.Group | null = null
let selectedGroup: THREE.Group | null = null

function setEmissive(group: THREE.Group, hex: number, intensity = 1) {
  group.traverse(c => {
    if (c instanceof THREE.Mesh) {
      const mat = c.material as THREE.MeshStandardMaterial
      mat.emissive.setHex(hex)
      mat.emissiveIntensity = intensity
    }
  })
}

function findRoot(obj: THREE.Object3D): THREE.Group | null {
  let cur: THREE.Object3D | null = obj
  while (cur) {
    if (cur.userData.isEquipment) return cur as THREE.Group
    cur = cur.parent
  }
  return null
}

function buildEquipment(d: EqData): THREE.Group {
  const group = new THREE.Group()
  group.userData = { isEquipment: true, ...d }

  const baseMat = new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.6, roughness: 0.4 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.6 })
  const statusCol = d.status === 'normal' ? 0x00e676 : d.status === 'warning' ? 0xffca28 : 0xff1744
  const statusMat = new THREE.MeshBasicMaterial({ color: statusCol })

  if (d.cat === '速度检测') {
    // Pole + box sensor
    group.add(makeMesh(new THREE.CylinderGeometry(0.05, 0.06, 1.8, 8), darkMat, [0, 0.9, 0]))
    group.add(makeMesh(new THREE.BoxGeometry(0.35, 0.25, 0.2), baseMat, [0, 1.8, 0]))
    group.add(makeMesh(new THREE.SphereGeometry(0.04), statusMat, [0.18, 1.88, 0]))
  } else if (d.cat === '信号设备') {
    // Tall signal pole
    group.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.08, 4.5, 8), darkMat, [0, 2.25, 0]))
    group.add(makeMesh(new THREE.BoxGeometry(0.35, 0.9, 0.25), baseMat, [0, 4.0, 0]))
    // Signal lights
    const lightColors = [0xff1744, 0xffca28, 0x00e676]
    lightColors.forEach((c, i) => {
      const lm = new THREE.MeshBasicMaterial({ color: d.status === 'normal' ? (i === 2 ? c : 0x222222) : (i === 1 ? c : 0x222222) })
      group.add(makeMesh(new THREE.SphereGeometry(0.09, 8, 8), lm, [0, 4.35 - i * 0.3, 0.13]))
    })
  } else if (d.cat === '视频监控') {
    // Pole + camera
    group.add(makeMesh(new THREE.CylinderGeometry(0.05, 0.06, 4.0, 8), darkMat, [0, 2.0, 0]))
    group.add(makeMesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), darkMat, [0, 4.0, 0.2]))
    group.add(makeMesh(new THREE.BoxGeometry(0.28, 0.2, 0.32), baseMat, [0, 4.0, 0]))
    group.add(makeMesh(new THREE.CylinderGeometry(0.07, 0.05, 0.15, 12), darkMat, [0, 4.0, 0.23]))
    group.add(makeMesh(new THREE.SphereGeometry(0.03), statusMat, [0.14, 4.08, 0]))
  } else if (d.cat === '温度监测') {
    // Small sensor on rail-level
    group.add(makeMesh(new THREE.CylinderGeometry(0.15, 0.18, 0.12, 16), baseMat, [0, 0.06, 0]))
    group.add(makeMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), darkMat, [0, 0.27, 0]))
    group.add(makeMesh(new THREE.SphereGeometry(0.06, 8, 8), statusMat, [0, 0.45, 0]))
  } else if (d.cat === '车辆检测') {
    // Flat detector between rails
    group.add(makeMesh(new THREE.BoxGeometry(1.4, 0.1, 0.3), baseMat, [0, 0.05, 0]))
    group.add(makeMesh(new THREE.BoxGeometry(1.35, 0.04, 0.12), darkMat, [0, 0.1, 0]))
    group.add(makeMesh(new THREE.SphereGeometry(0.05), statusMat, [0.6, 0.12, 0]))
  } else if (d.cat === '电气设备') {
    // Tall cabinet
    group.add(makeMesh(new THREE.BoxGeometry(0.6, 1.6, 0.4), baseMat, [0, 0.8, 0]))
    group.add(makeMesh(new THREE.BoxGeometry(0.58, 0.55, 0.05), darkMat, [0, 0.9, 0.21]))
    group.add(makeMesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: 0x999999 }), [0.1, 0.85, 0.24]))
    group.add(makeMesh(new THREE.SphereGeometry(0.04), statusMat, [-0.2, 1.5, 0.22]))
  } else {
    // Generic axle counter — small rectangular box
    group.add(makeMesh(new THREE.BoxGeometry(0.2, 0.15, 0.4), baseMat, [0, 0.075, 0]))
    group.add(makeMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), darkMat, [0, 0.24, 0]))
    group.add(makeMesh(new THREE.SphereGeometry(0.04), statusMat, [0, 0.35, 0]))
  }

  group.position.set(...d.pos)
  group.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true } })
  return group
}

function makeMesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  return m
}

export function init(
  container: HTMLElement,
  onHover: (i: EqInfo | null) => void,
  onSelect: (i: EqInfo | null) => void,
) {
  clock = new THREE.Clock()
  onHoverCb = onHover
  onSelectCb = onSelect

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.025)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 18)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0x223355, 2))
  const dir = new THREE.DirectionalLight(0xffeedd, 3)
  dir.position.set(8, 15, 10)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.left = dir.shadow.camera.bottom = -25
  dir.shadow.camera.right = dir.shadow.camera.top = 25
  scene.add(dir)

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(60, 60, 0x00e5ff08, 0x00e5ff05))

  // Simple track segment
  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9, roughness: 0.2 })
  ;[-0.7175, 0.7175].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(30, 0.07, 0.07), railMat)
    rail.position.set(0, 0.07, x)
    scene.add(rail)
  })
  const slMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95 })
  for (let i = -14; i <= 14; i += 1) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.24), slMat)
    sl.position.set(i, 0.05, 0)
    sl.receiveShadow = true
    scene.add(sl)
  }

  // Equipment
  EQ_DATA.forEach(d => {
    const g = buildEquipment(d)
    scene.add(g)
    equipmentGroups.push(g)
  })

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 1, 0)

  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('click', onClick)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function onMouseMove(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(equipmentGroups, true)
  const newHover = hits.length > 0 ? findRoot(hits[0].object) : null
  if (newHover !== hoveredGroup) {
    if (hoveredGroup && hoveredGroup !== selectedGroup) setEmissive(hoveredGroup, 0x000000)
    if (newHover && newHover !== selectedGroup) setEmissive(newHover, 0x002233, 0.8)
    hoveredGroup = newHover
    renderer.domElement.style.cursor = newHover ? 'pointer' : ''
    onHoverCb?.(newHover ? (newHover.userData as EqInfo) : null)
  }
}

function onClick(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(equipmentGroups, true)
  const newSel = hits.length > 0 ? findRoot(hits[0].object) : null
  if (selectedGroup && selectedGroup !== newSel) setEmissive(selectedGroup, 0x000000)
  selectedGroup = newSel
  if (selectedGroup) {
    setEmissive(selectedGroup, 0x003344, 1.5)
    const info = selectedGroup.userData as EqInfo
    info.hitPoint = hits[0].point
    info.distance = Math.round(hits[0].distance * 100) / 100
    onSelectCb?.(info)
  } else {
    onSelectCb?.(null)
  }
}

function loop() {
  animId = requestAnimationFrame(loop)
  controls.update()
  renderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.domElement.removeEventListener('mousemove', onMouseMove)
  renderer.domElement.removeEventListener('click', onClick)
  renderer.domElement.style.cursor = ''
  controls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  equipmentGroups.length = 0
  hoveredGroup = selectedGroup = null
}
