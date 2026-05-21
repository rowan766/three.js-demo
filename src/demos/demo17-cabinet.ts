import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let composer: EffectComposer, outlinePass: OutlinePass
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void

interface DiskUnit {
  mesh: THREE.Mesh
  led: THREE.Mesh
  animT: number
  targetT: number
  isOut: boolean
  cabinetIdx: number
  unitIdx: number
  diskIdx: number
}

const DISK_EXTEND = 0.55
const diskUnits: DiskUnit[] = []
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let activePopup: CSS2DObject | null = null
let selectedDisk: THREE.Mesh | null = null
let styleEl: HTMLStyleElement | null = null

const DISK_DATA = [
  { model: 'HGST HC550', capacity: '18 TB', health: '98%', temp: '38°C', iops: '245', read: '260 MB/s', write: '230 MB/s', status: 'normal' },
  { model: 'Seagate Exos X18', capacity: '18 TB', health: '85%', temp: '42°C', iops: '210', read: '255 MB/s', write: '220 MB/s', status: 'warning' },
  { model: 'WD Gold WD181KRYZ', capacity: '18 TB', health: '99%', temp: '35°C', iops: '266', read: '270 MB/s', write: '245 MB/s', status: 'normal' },
  { model: 'Toshiba MG09ACA18', capacity: '18 TB', health: '72%', temp: '51°C', iops: '180', read: '240 MB/s', write: '210 MB/s', status: 'alert' },
  { model: 'Samsung PM9A3', capacity: '3.84 TB SSD', health: '100%', temp: '31°C', iops: '800K', read: '6.5 GB/s', write: '4.0 GB/s', status: 'normal' },
  { model: 'Intel D7-P5520', capacity: '7.68 TB SSD', health: '96%', temp: '33°C', iops: '750K', read: '6.2 GB/s', write: '3.8 GB/s', status: 'normal' },
]

function injectStyle() {
  styleEl = document.createElement('style')
  styleEl.textContent = `
    @keyframes disk-scan{0%,100%{opacity:.4}50%{opacity:1}}
    @keyframes disk-blink{0%,100%{opacity:1}50%{opacity:.2}}
  `
  document.head.appendChild(styleEl)
}

function createPopupEl(data: typeof DISK_DATA[0], du: DiskUnit): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = 'transform:translate(-50%,calc(-100% - 16px));pointer-events:none;user-select:none;'
  const card = document.createElement('div')
  Object.assign(card.style, {
    background: 'rgba(4,8,20,0.97)', border: `1px solid ${data.status === 'normal' ? '#00e5ff' : data.status === 'warning' ? '#ffca28' : '#ff5252'}`,
    borderRadius: '8px', padding: '12px 14px', minWidth: '220px',
    boxShadow: `0 0 20px ${data.status === 'normal' ? 'rgba(0,229,255,.3)' : data.status === 'warning' ? 'rgba(255,202,40,.3)' : 'rgba(255,82,82,.3)'}`,
    fontFamily: '\'PingFang SC\',\'Microsoft YaHei\',sans-serif', backdropFilter: 'blur(10px)', position: 'relative',
  })
  const rows: [string, string, boolean?][] = [
    ['型号', data.model],
    ['容量', data.capacity],
    ['健康度', data.health, data.status !== 'normal'],
    ['温度', data.temp, data.status === 'alert'],
    ['IOPS', data.iops],
    ['读取速率', data.read],
    ['写入速率', data.write],
    ['磁盘位', `Cabinet-${du.cabinetIdx + 1} / 单元-${du.unitIdx + 1} / Slot-${du.diskIdx + 1}`],
    ['状态', du.isOut ? '已拔出 ◄' : '已插入 ●', du.isOut],
  ]
  const statusColor = data.status === 'normal' ? '#00e5ff' : data.status === 'warning' ? '#ffca28' : '#ff5252'
  const header = document.createElement('div')
  header.style.cssText = `color:${statusColor};font-size:12px;font-weight:700;margin-bottom:8px;letter-spacing:.5px;`
  header.textContent = `◈ ${du.isOut ? '磁盘已弹出' : '磁盘信息'}`
  const scan = document.createElement('div')
  scan.style.cssText = 'height:1px;background:linear-gradient(90deg,transparent,currentColor,transparent);margin-bottom:8px;color:' + statusColor + ';animation:disk-scan 2s infinite;'
  const paramDiv = document.createElement('div')
  paramDiv.style.cssText = 'display:flex;flex-direction:column;gap:4px;'
  rows.forEach(([k, v, warn]) => {
    const r = document.createElement('div')
    r.style.cssText = 'display:flex;justify-content:space-between;gap:8px;'
    const kEl = document.createElement('span')
    kEl.textContent = k; kEl.style.cssText = 'color:rgba(128,203,196,.55);font-size:10px;white-space:nowrap;'
    const vEl = document.createElement('span')
    vEl.textContent = v
    vEl.style.cssText = `font-size:10px;font-weight:600;font-family:monospace;color:${warn ? '#ff5252' : '#e0f7fa'};${warn ? 'animation:disk-blink 1s infinite;' : ''}`
    r.appendChild(kEl); r.appendChild(vEl); paramDiv.appendChild(r)
  })
  const caret = document.createElement('div')
  caret.style.cssText = `position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${statusColor};`
  card.appendChild(header); card.appendChild(scan); card.appendChild(paramDiv); card.appendChild(caret)
  el.appendChild(card)
  return el
}

function buildCabinet(scene: THREE.Scene, cx: number, cabinetIdx: number) {
  const G = new THREE.Group()
  G.position.set(cx, 0, 0)

  // Cabinet body
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x2a2d38, metalness: 0.55, roughness: 0.45 })
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d3f4e, metalness: 0.65, roughness: 0.35 })
  const outerH = 10, outerW = 1.8, outerD = 1.0
  G.add(makeMesh(new THREE.BoxGeometry(outerW, outerH, outerD), cabinetMat, [0, outerH / 2, 0]))
  // Door frame
  G.add(makeMesh(new THREE.BoxGeometry(outerW + 0.02, outerH + 0.02, 0.04), frameMat, [0, outerH / 2, outerD / 2 + 0.02]))
  // Vent slots top/bottom
  G.add(makeMesh(new THREE.BoxGeometry(outerW - 0.1, 0.3, outerD + 0.02), new THREE.MeshStandardMaterial({ color: 0x111 }), [0, outerH - 0.2, 0]))

  // Fan discs
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x333, metalness: 0.6 })
  ;[-0.4, 0, 0.4].forEach(fx => {
    G.add(makeMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), fanMat, [fx, outerH - 0.15, 0]))
  })

  // Server units — 8 units per cabinet, 3 disks each
  const UNITS = 8, DISKS = 3
  const UNIT_H = 0.7, UNIT_GAP = 0.18
  const startY = 0.4

  for (let u = 0; u < UNITS; u++) {
    const unitY = startY + u * (UNIT_H + UNIT_GAP)
    const unitMat = new THREE.MeshStandardMaterial({
      color: u % 2 === 0 ? 0x2c3045 : 0x343848,
      metalness: 0.4, roughness: 0.5,
    })
    G.add(makeMesh(new THREE.BoxGeometry(outerW - 0.1, UNIT_H, outerD - 0.1), unitMat, [0, unitY + UNIT_H / 2, 0]))

    // Disk drives
    const diskW = (outerW - 0.22) / DISKS
    for (let d = 0; d < DISKS; d++) {
      const diskX = -outerW / 2 + 0.1 + diskW * d + diskW / 2
      const dataIdx = (cabinetIdx * UNITS * DISKS + u * DISKS + d) % DISK_DATA.length
      const data = DISK_DATA[dataIdx]
      const diskMat = new THREE.MeshStandardMaterial({
        color: data.status === 'normal' ? 0x1a4a80 : data.status === 'warning' ? 0x5a3800 : 0x5a0a0a,
        metalness: 0.45, roughness: 0.4,
      })
      const diskGeo = new THREE.BoxGeometry(diskW - 0.04, UNIT_H - 0.1, 0.52)
      const diskMesh = makeMesh(diskGeo, diskMat, [diskX, unitY + UNIT_H / 2, outerD / 2 - 0.26])
      diskMesh.castShadow = true
      diskMesh.userData = { cabinetIdx, unitIdx: u, diskIdx: d, dataIdx }
      G.add(diskMesh)

      // LED indicator
      const ledColor = data.status === 'normal' ? 0x00e676 : data.status === 'warning' ? 0xffca28 : 0xff1744
      const ledMat = new THREE.MeshBasicMaterial({ color: ledColor })
      const led = makeMesh(new THREE.SphereGeometry(0.03, 6, 6), ledMat, [diskX - diskW / 2 + 0.06, unitY + UNIT_H * 0.75, outerD / 2 + 0.01])
      G.add(led)

      diskUnits.push({ mesh: diskMesh, led, animT: 0, targetT: 0, isOut: false, cabinetIdx, unitIdx: u, diskIdx: d })
    }
  }

  G.traverse(c => { if (c instanceof THREE.Mesh) c.receiveShadow = true })
  scene.add(G)
}

function makeMesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); return m
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  injectStyle()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050a12)
  scene.fog = new THREE.FogExp2(0x050a12, 0.04)

  camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(0, 5, 8)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' })
  container.appendChild(labelRenderer.domElement)

  // Ambient — bright enough to lift the dark base
  scene.add(new THREE.AmbientLight(0x8899bb, 3))

  // Key light from upper-right-front
  const dir = new THREE.DirectionalLight(0xffeedd, 3)
  dir.position.set(6, 12, 10); dir.castShadow = true; dir.shadow.mapSize.set(1024, 1024)
  dir.shadow.camera.left = dir.shadow.camera.bottom = -12
  dir.shadow.camera.right = dir.shadow.camera.top = 12
  scene.add(dir)

  // Front fill light — illuminates cabinet faces directly
  const fill = new THREE.DirectionalLight(0x6699cc, 2)
  fill.position.set(0, 5, 12)
  scene.add(fill)

  // Rim light from behind/above for depth
  const rim = new THREE.DirectionalLight(0x224466, 1.5)
  rim.position.set(-5, 10, -8)
  scene.add(rim)

  // Per-cabinet strip lights (simulate LED strips inside racks)
  ;[-3.5, 0, 3.5].forEach(cx => {
    const strip = new THREE.PointLight(0x00d4ff, 2, 6)
    strip.position.set(cx, 5, 1.2)
    scene.add(strip)
  })

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.9 }))
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
  scene.add(new THREE.GridHelper(20, 20, 0x00e5ff06, 0x00e5ff04))

  // 3 cabinets
  buildCabinet(scene, -3.5, 0)
  buildCabinet(scene, 0, 1)
  buildCabinet(scene, 3.5, 2)

  // EffectComposer
  const sz = new THREE.Vector2(container.clientWidth, container.clientHeight)
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  outlinePass = new OutlinePass(sz, scene, camera)
  outlinePass.edgeStrength = 4; outlinePass.edgeGlow = 1; outlinePass.edgeThickness = 1.5
  outlinePass.visibleEdgeColor.set('#00e5ff'); outlinePass.hiddenEdgeColor.set('#003355')
  composer.addPass(outlinePass)
  composer.addPass(new OutputPass())

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.target.set(0, 5, 0)
  controls.minDistance = 1.5; controls.maxDistance = 15

  const diskMeshes = diskUnits.map(d => d.mesh)
  renderer.domElement.addEventListener('click', (e) => {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(diskMeshes, false)
    if (hits.length > 0) {
      const mesh = hits[0].object as THREE.Mesh
      const du = diskUnits.find(d => d.mesh === mesh)
      if (!du) return
      du.isOut = !du.isOut
      du.targetT = du.isOut ? 1 : 0
      // Update/replace popup
      if (activePopup) { activePopup.element.remove(); selectedDisk?.remove(activePopup); activePopup = null }
      selectedDisk = mesh
      outlinePass.selectedObjects = [mesh]
      const dataIdx = mesh.userData.dataIdx as number
      const el = createPopupEl(DISK_DATA[dataIdx], du)
      activePopup = new CSS2DObject(el)
      activePopup.position.set(0, 0.5, 0.8)
      mesh.add(activePopup)
    } else {
      if (activePopup) { activePopup.element.remove(); selectedDisk?.remove(activePopup); activePopup = null }
      outlinePass.selectedObjects = []; selectedDisk = null
    }
  })

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
    composer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  diskUnits.forEach(du => {
    if (Math.abs(du.animT - du.targetT) > 0.001) {
      du.animT += (du.targetT - du.animT) * Math.min(delta * 6, 1)
      du.mesh.position.z += (du.animT * DISK_EXTEND - du.mesh.userData._prevZ || 0)
      du.mesh.userData._prevZ = du.animT * DISK_EXTEND
    }
    // LED blink
    const on = Math.sin(elapsed * 3 + du.diskIdx * 0.7 + du.unitIdx * 1.1) > 0
    ;(du.led.material as THREE.MeshBasicMaterial).opacity = du.isOut ? 0.1 : (on ? 1 : 0.3)
  })

  controls.update()
  composer.render()
  labelRenderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  styleEl?.remove()
  if (activePopup) { activePopup.element.remove() }
  controls.dispose(); composer.dispose(); renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
  diskUnits.length = 0
}
