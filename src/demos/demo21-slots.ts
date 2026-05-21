import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

// ─── Types ────────────────────────────────────────────────────────────────────
// Three-step interaction: inserted ─click─► ejected ─click─► detail
//   detail + close btn ─► ejected   |   detail + click ─► inserted
type SlotState = 'inserted' | 'ejected' | 'detail'

interface ModuleSlot {
  mesh: THREE.Mesh
  ledMesh: THREE.Mesh
  state: SlotState
  animT: number          // 0 = inserted, 1 = ejected
  targetT: number
  baseZ: number          // initial local Z inside boxGroup
  popup: HTMLDivElement | null
  row: number
  col: number
  data: ModuleData
}

interface ModuleData {
  id: string
  name: string
  type: string
  typeColor: number
  typeText: string
  status: 'normal' | 'warning' | 'fault'
  voltage: string
  current: string
  temp: string
  firmware: string
  channel: string
  load: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 8
const ROWS = 5
const SLOT_W = 0.88
const SLOT_H = 0.78
const SLOT_D = 0.52
const GAP_X = 0.07
const GAP_Y = 0.07
const EJECT_DIST = 0.85
const BOX_PAD_X = 0.20
const BOX_PAD_Y = 0.20
const BOX_W = COLS * (SLOT_W + GAP_X) - GAP_X + BOX_PAD_X * 2
const BOX_H = ROWS * (SLOT_H + GAP_Y) - GAP_Y + BOX_PAD_Y * 2
const BOX_D = SLOT_D + 0.24

const CARD_BASE_Z = BOX_D / 2 - SLOT_D / 2 + 0.01  // local Z when inserted

const TYPE_CATALOG = [
  { type: '继电器',   color: 0x0d3a6a, text: '#5bc8ff' },
  { type: '信号处理', color: 0x0a3520, text: '#69f0ae' },
  { type: '通信接口', color: 0x053030, text: '#00e5ff' },
  { type: '电源管理', color: 0x3d2800, text: '#ffca28' },
  { type: 'IO 控制',  color: 0x2e0860, text: '#ce93d8' },
  { type: '数据采集', color: 0x3a1000, text: '#ff8a65' },
]

// ─── Scene globals ─────────────────────────────────────────────────────────────
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let composer: EffectComposer
let outlinePass: OutlinePass
let controls: OrbitControls
let clock: THREE.Clock
let animId: number
let onResize: () => void
let clickHandler: (e: MouseEvent) => void
let moveHandler: (e: MouseEvent) => void

const slots: ModuleSlot[] = []
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredMesh: THREE.Mesh | null = null
let styleEl: HTMLStyleElement | null = null
let boxGroup: THREE.Group
let popupContainer: HTMLElement | null = null  // ref for overlay popups

// ─── Data generator ───────────────────────────────────────────────────────────
function genData(col: number, row: number): ModuleData {
  const ti = (col * 3 + row * 2) % TYPE_CATALOG.length
  const cat = TYPE_CATALOG[ti]
  const roll = (col * 7 + row * 11) % 20
  const status: ModuleData['status'] = roll === 0 ? 'fault' : roll <= 3 ? 'warning' : 'normal'
  return {
    id: `M${String(row + 1).padStart(2, '0')}-${String(col + 1).padStart(2, '0')}`,
    name: `${cat.type} #${col + 1 + row * COLS}`,
    type: cat.type,
    typeColor: cat.color,
    typeText: cat.text,
    status,
    voltage: `${(3.28 + ((col + row) % 5) * 0.08).toFixed(2)} V`,
    current: `${(0.42 + (col % 6) * 0.05).toFixed(2)} A`,
    temp: `${38 + (row * 3 + col * 2) % 28} °C`,
    firmware: `v${2 + (col % 3)}.${row * 2 + 1}.${(col + row) % 9}`,
    channel: `CH${String(col * ROWS + row + 1).padStart(3, '0')}`,
    load: `${30 + (col * 5 + row * 7) % 60}%`,
  }
}

// ─── Style injection ───────────────────────────────────────────────────────────
function injectStyle() {
  styleEl = document.createElement('style')
  styleEl.textContent = `
    @keyframes s21-scan { 0%,100%{opacity:.25} 50%{opacity:.9} }
    @keyframes s21-pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
    @keyframes s21-fadein { from{opacity:0;transform:translate(-50%,calc(-100% - 10px))} to{opacity:1;transform:translate(-50%,calc(-100% - 18px))} }
  `
  document.head.appendChild(styleEl)
}

// ─── Popup builder ─────────────────────────────────────────────────────────────
function buildPopup(data: ModuleData, onClose: () => void): HTMLDivElement {
  const tc = data.typeText        // type accent color
  const sc = data.status === 'normal' ? '#52e8a0'
    : data.status === 'warning'   ? '#ffca28'
    :                               '#ff5252'

  const wrap = document.createElement('div')
  wrap.style.cssText = [
    'position:absolute',
    'transform:translate(-50%,-100%)',
    'pointer-events:auto',
    'user-select:none',
    'animation:s21-fadein .18s ease-out both',
    'width:230px',
    'z-index:10',
  ].join(';')

  // Card
  const card = document.createElement('div')
  card.style.cssText = [
    'background:rgba(5,10,22,0.97)',
    `border:1px solid ${tc}44`,
    `box-shadow:0 0 20px ${tc}22, inset 0 0 30px rgba(0,0,0,.4)`,
    'border-radius:7px',
    'overflow:hidden',
    'position:relative',
  ].join(';')

  // ── Header ──
  const hdr = document.createElement('div')
  hdr.style.cssText = [
    `background:${tc}12`,
    `border-bottom:1px solid ${tc}28`,
    'padding:9px 10px 8px',
    'display:flex',
    'align-items:flex-start',
    'justify-content:space-between',
    'gap:6px',
  ].join(';')

  const hdrLeft = document.createElement('div')
  hdrLeft.style.cssText = 'flex:1;min-width:0;'

  const title = document.createElement('div')
  title.style.cssText = `color:${tc};font-size:12px;font-weight:700;font-family:'PingFang SC',sans-serif;letter-spacing:.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
  title.textContent = data.name

  const badges = document.createElement('div')
  badges.style.cssText = 'display:flex;gap:5px;margin-top:5px;'

  const badgeType = document.createElement('span')
  badgeType.style.cssText = `font-size:9px;padding:1px 6px;border-radius:2px;background:${tc}18;border:1px solid ${tc}33;color:${tc};font-family:monospace;`
  badgeType.textContent = data.type

  const badgeStatus = document.createElement('span')
  badgeStatus.style.cssText = `font-size:9px;padding:1px 6px;border-radius:2px;background:${sc}14;border:1px solid ${sc}44;color:${sc};${data.status !== 'normal' ? 'animation:s21-pulse 1.1s infinite;' : ''}`
  badgeStatus.textContent = data.status === 'normal' ? '正常' : data.status === 'warning' ? '告警' : '故障'

  badges.appendChild(badgeType); badges.appendChild(badgeStatus)
  hdrLeft.appendChild(title); hdrLeft.appendChild(badges)

  // Close button
  const closeBtn = document.createElement('button')
  closeBtn.style.cssText = [
    'pointer-events:auto',
    'cursor:pointer',
    'flex-shrink:0',
    'width:18px',
    'height:18px',
    'border-radius:50%',
    `background:rgba(255,255,255,.05)`,
    `border:1px solid ${tc}44}`,
    `color:${tc}`,
    'font-size:12px',
    'line-height:1',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'transition:background .15s,border-color .15s',
    'margin-top:1px',
    'padding:0',
  ].join(';')
  closeBtn.innerHTML = '&#x2715;'
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = `${tc}22`
    closeBtn.style.borderColor = tc
  })
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(255,255,255,.05)'
    closeBtn.style.borderColor = `${tc}44`
  })
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    onClose()
  })

  hdr.appendChild(hdrLeft); hdr.appendChild(closeBtn)

  // ── Scan line ──
  const scan = document.createElement('div')
  scan.style.cssText = `height:1px;background:linear-gradient(90deg,transparent 0%,${tc}55 50%,transparent 100%);animation:s21-scan 2.4s ease-in-out infinite;`

  // ── Params ──
  const params = document.createElement('div')
  params.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0;padding:8px 10px 10px;'

  const rows: [string, string, boolean?][] = [
    ['编号',   data.id],
    ['通道',   data.channel],
    ['负载',   data.load],
    ['电压',   data.voltage],
    ['电流',   data.current],
    ['温度',   data.temp, data.status === 'fault'],
    ['固件版本', data.firmware],
    ['类型',   data.type],
  ]

  rows.forEach(([k, v, warn], i) => {
    const cell = document.createElement('div')
    const isRightCol = i % 2 === 1
    cell.style.cssText = [
      'padding:5px 6px',
      `border-bottom:1px solid rgba(255,255,255,.04)`,
      isRightCol ? `border-left:1px solid rgba(255,255,255,.04)` : '',
    ].join(';')

    const keyEl = document.createElement('div')
    keyEl.style.cssText = 'color:rgba(130,170,190,.5);font-size:9px;font-family:\'PingFang SC\',sans-serif;margin-bottom:2px;'
    keyEl.textContent = k

    const valEl = document.createElement('div')
    valEl.style.cssText = `font-size:10px;font-weight:600;font-family:monospace;color:${warn ? '#ff5252' : 'rgba(220,240,255,.9)'};${warn ? 'animation:s21-pulse 0.8s infinite;' : ''}`
    valEl.textContent = v

    cell.appendChild(keyEl); cell.appendChild(valEl)
    params.appendChild(cell)
  })

  // ── Caret ──
  const caret = document.createElement('div')
  caret.style.cssText = `position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid ${tc}44;`

  card.appendChild(hdr); card.appendChild(scan); card.appendChild(params); card.appendChild(caret)
  wrap.appendChild(card)

  return wrap
}

// ─── Slot position helpers ─────────────────────────────────────────────────────
function slotX(col: number): number {
  const totalW = COLS * (SLOT_W + GAP_X) - GAP_X
  return -totalW / 2 + col * (SLOT_W + GAP_X) + SLOT_W / 2
}

function slotY(row: number): number {
  return BOX_H - BOX_PAD_Y - SLOT_H / 2 - row * (SLOT_H + GAP_Y)
}

// ─── Interaction ───────────────────────────────────────────────────────────────
function showDetail(s: ModuleSlot) {
  if (!popupContainer) return
  // Close any other detail popup first
  slots.forEach(o => {
    if (o !== s && o.state === 'detail') hideDetail(o)
  })
  const pop = buildPopup(s.data, () => {
    hideDetail(s)
    s.targetT = 0
    s.state = 'inserted'
  })
  popupContainer.appendChild(pop)
  s.popup = pop
  s.state = 'detail'
}

function hideDetail(s: ModuleSlot) {
  if (s.popup) {
    s.popup.remove()
    s.popup = null
  }
}

function retract(s: ModuleSlot) {
  hideDetail(s)
  s.targetT = 0
  s.state = 'inserted'
}

function handleClick(s: ModuleSlot) {
  switch (s.state) {
    case 'inserted':
      s.targetT = 1
      s.state = 'ejected'
      showDetail(s)
      break
    case 'ejected':
      showDetail(s)
      break
    case 'detail':
      // Click slot while detail is open → retract everything
      retract(s)
      break
  }
}

// ─── Box build ────────────────────────────────────────────────────────────────
function buildBox() {
  boxGroup = new THREE.Group()

  const shellMat  = new THREE.MeshStandardMaterial({ color: 0x151c28, metalness: 0.6, roughness: 0.45 })
  const frameMat  = new THREE.MeshStandardMaterial({ color: 0x202840, metalness: 0.7, roughness: 0.35 })
  const recessMat = new THREE.MeshStandardMaterial({ color: 0x080d18, roughness: 0.95 })

  // Back panel
  const back = new THREE.Mesh(new THREE.BoxGeometry(BOX_W, BOX_H, 0.05), shellMat)
  back.position.set(0, BOX_H / 2, -BOX_D / 2 + 0.025)
  back.receiveShadow = true; boxGroup.add(back)

  // Side walls
  ;[-BOX_W / 2, BOX_W / 2].forEach(x => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.07, BOX_H + 0.07, BOX_D), shellMat)
    wall.position.set(x, BOX_H / 2, 0)
    wall.castShadow = true; boxGroup.add(wall)
  })

  // Top/bottom rails
  ;[BOX_H, 0].forEach(y => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(BOX_W + 0.08, 0.07, BOX_D), frameMat)
    rail.position.set(0, y, 0)
    rail.castShadow = true; boxGroup.add(rail)
  })

  // Front bezel
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(BOX_W + 0.1, BOX_H + 0.1, 0.05), frameMat)
  bezel.position.set(0, BOX_H / 2, BOX_D / 2 + 0.025)
  boxGroup.add(bezel)

  // Box label (CSS2D)
  const labelEl = document.createElement('div')
  labelEl.style.cssText = [
    'font-family:\'PingFang SC\',monospace',
    'font-size:11px',
    'font-weight:700',
    'color:#00e5ff',
    'text-shadow:0 0 8px rgba(0,229,255,.7)',
    'pointer-events:none',
    'white-space:nowrap',
    'background:rgba(4,8,20,.75)',
    'border:1px solid rgba(0,229,255,.3)',
    'border-radius:3px',
    'padding:2px 9px',
    'letter-spacing:.5px',
  ].join(';')
  labelEl.textContent = '综合控制模块箱 · IRMC-40'
  const boxLabel = new CSS2DObject(labelEl)
  boxLabel.position.set(0, BOX_H + 0.35, 0)
  boxGroup.add(boxLabel)

  // Stand
  const standMat = new THREE.MeshStandardMaterial({ color: 0x0e1218, metalness: 0.55, roughness: 0.55 })
  ;[-BOX_W * 0.3, BOX_W * 0.3].forEach(x => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), standMat)
    leg.position.set(x, -0.65, 0)
    leg.castShadow = true; boxGroup.add(leg)
  })
  const foot = new THREE.Mesh(new THREE.BoxGeometry(BOX_W * 0.75, 0.07, 0.45), standMat)
  foot.position.set(0, -1.32, 0)
  foot.castShadow = foot.receiveShadow = true; boxGroup.add(foot)

  // Slots
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const sx = slotX(col)
      const sy = slotY(row)
      const data = genData(col, row)
      const cat = TYPE_CATALOG.find(t => t.type === data.type)!

      // Recess hole
      const hole = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W + 0.01, SLOT_H + 0.01, 0.05), recessMat)
      hole.position.set(sx, sy, BOX_D / 2 + 0.002)
      boxGroup.add(hole)

      // Card
      const cardMat = new THREE.MeshStandardMaterial({
        color: data.typeColor,
        metalness: 0.4,
        roughness: 0.55,
        emissive: new THREE.Color(data.typeColor),
        emissiveIntensity: 0.08,
      })
      const card = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W - 0.04, SLOT_H - 0.04, SLOT_D - 0.03), cardMat)
      card.position.set(sx, sy, CARD_BASE_Z)
      card.castShadow = true
      card.userData.slotIdx = slots.length
      boxGroup.add(card)

      // Face stripe (bottom band)
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0a0e1a, roughness: 0.9 })
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W - 0.1, 0.09, 0.02), stripeMat)
      stripe.position.set(0, -(SLOT_H / 2 - 0.065), SLOT_D / 2)
      card.add(stripe)

      // ID label on face
      const idEl = document.createElement('div')
      idEl.style.cssText = `pointer-events:none;user-select:none;font-family:monospace;font-size:7.5px;font-weight:700;color:${cat.text};transform:translate(-50%,-50%);white-space:nowrap;opacity:.8;`
      idEl.textContent = data.id
      const idLabel = new CSS2DObject(idEl)
      idLabel.position.set(0, SLOT_H / 2 - 0.13, SLOT_D / 2 + 0.01)
      card.add(idLabel)

      // LED
      const ledColor = data.status === 'normal' ? 0x00e676 : data.status === 'warning' ? 0xffca28 : 0xff1744
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshBasicMaterial({ color: ledColor }),
      )
      led.position.set(SLOT_W / 2 - 0.07, SLOT_H / 2 - 0.1, SLOT_D / 2 + 0.015)
      card.add(led)

      slots.push({
        mesh: card,
        ledMesh: led,
        state: 'inserted',
        animT: 0,
        targetT: 0,
        baseZ: CARD_BASE_Z,
        popup: null,
        row,
        col,
        data,
      })
    }
  }

  scene.add(boxGroup)
}

// ─── Init ──────────────────────────────────────────────────────────────────────
export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  injectStyle()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060b18)
  scene.fog = new THREE.FogExp2(0x060b18, 0.022)

  camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.1, 120)
  camera.position.set(0, BOX_H / 2, 12)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  // CSS2D renderer — overlay is transparent to events; popups use separate HTML overlay
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none', overflow: 'hidden',
  })
  container.appendChild(labelRenderer.domElement)

  // Popup overlay container (independent of CSS2D layer)
  popupContainer = container

  // ── Lights ──
  scene.add(new THREE.AmbientLight(0x8899cc, 3.2))
  const key = new THREE.DirectionalLight(0xfff0e0, 3.5)
  key.position.set(5, 12, 10); key.castShadow = true
  key.shadow.camera.left = key.shadow.camera.bottom = -15
  key.shadow.camera.right = key.shadow.camera.top = 15
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x5577bb, 2)
  fill.position.set(-4, 4, 12); scene.add(fill)
  const rim = new THREE.DirectionalLight(0x223355, 1.5)
  rim.position.set(0, 8, -8); scene.add(rim)
  ;[-BOX_W * 0.35, 0, BOX_W * 0.35].forEach(x => {
    const pl = new THREE.PointLight(0x2266cc, 2, 10)
    pl.position.set(x, BOX_H / 2, 5); scene.add(pl)
  })

  // ── Ground ──
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.MeshStandardMaterial({ color: 0x080e1c, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.38
  ground.receiveShadow = true; scene.add(ground)
  scene.add(new THREE.GridHelper(40, 40, 0x00e5ff05, 0x00e5ff03))

  buildBox()

  // ── Post-processing ──
  const sz = new THREE.Vector2(container.clientWidth, container.clientHeight)
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  outlinePass = new OutlinePass(sz, scene, camera)
  outlinePass.edgeStrength = 3.5
  outlinePass.edgeGlow = 0.6
  outlinePass.edgeThickness = 1.0
  outlinePass.visibleEdgeColor.set('#00e5ff')
  outlinePass.hiddenEdgeColor.set('#001133')
  composer.addPass(outlinePass)
  composer.addPass(new OutputPass())

  // ── Controls ──
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, BOX_H / 2, 0)
  controls.minDistance = 4
  controls.maxDistance = 28
  controls.maxPolarAngle = Math.PI / 1.8

  // ── Mouse ──
  moveHandler = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect()
    mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    )
    raycaster.setFromCamera(mouse, camera)
    const hit = raycaster.intersectObjects(slots.map(s => s.mesh), false)[0]?.object as THREE.Mesh | undefined
    if (hit !== hoveredMesh) {
      hoveredMesh = hit ?? null
      outlinePass.selectedObjects = hoveredMesh ? [hoveredMesh] : []
      renderer.domElement.style.cursor = hoveredMesh ? 'pointer' : 'default'
    }
  }

  clickHandler = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect()
    mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    )
    raycaster.setFromCamera(mouse, camera)
    const hit = raycaster.intersectObjects(slots.map(s => s.mesh), false)[0]
    if (!hit) return
    const s = slots[(hit.object as THREE.Mesh).userData.slotIdx]
    if (s) handleClick(s)
  }

  renderer.domElement.addEventListener('mousemove', moveHandler)
  renderer.domElement.addEventListener('click', clickHandler)

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

// ─── Loop ──────────────────────────────────────────────────────────────────────
function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  slots.forEach((s, i) => {
    // Smooth eject/retract animation
    if (Math.abs(s.animT - s.targetT) > 0.0005) {
      s.animT += (s.targetT - s.animT) * Math.min(delta * 7, 1)
      s.mesh.position.z = s.baseZ + s.animT * EJECT_DIST
    }

    // LED blink by status
    const phase = elapsed * 2.5 + i * 0.41
    const alpha = s.data.status === 'normal'
      ? 0.65 + Math.sin(phase) * 0.35
      : s.data.status === 'warning'
        ? Math.abs(Math.sin(phase * 2.2)) * 0.9 + 0.05
        : Math.abs(Math.sin(phase * 5)) * 0.85 + 0.1
    const led = s.ledMesh.material as THREE.MeshBasicMaterial
    led.opacity = alpha
    led.transparent = true

    // Update popup position (project 3D → 2D screen)
    if (s.popup && popupContainer) {
      const pos = new THREE.Vector3()
      pos.set(0, SLOT_H / 2 + 0.15, SLOT_D / 2 + 0.05)
      s.mesh.localToWorld(pos)
      pos.project(camera)

      const rect = renderer.domElement.getBoundingClientRect()
      const x = (pos.x * 0.5 + 0.5) * rect.width
      const y = (-pos.y * 0.5 + 0.5) * rect.height

      if (pos.z < 1) {
        s.popup.style.display = ''
        s.popup.style.left = `${x}px`
        s.popup.style.top = `${y}px`
      } else {
        s.popup.style.display = 'none'
      }
    }
  })

  controls.update()
  composer.render()
  labelRenderer.render(scene, camera)
}

// ─── Public API ────────────────────────────────────────────────────────────────
export function retractAll() {
  slots.forEach(s => { if (s.state !== 'inserted') retract(s) })
}

export function ejectRow(row: number) {
  slots.filter(s => s.row === row && s.state === 'inserted').forEach(s => {
    s.targetT = 1
    s.state = 'ejected'
  })
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.domElement.removeEventListener('mousemove', moveHandler)
  renderer.domElement.removeEventListener('click', clickHandler)
  styleEl?.remove()
  slots.forEach(s => hideDetail(s))
  slots.length = 0
  controls.dispose()
  composer.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
}
