import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void

interface SensorPoint {
  name: string
  pos: THREE.Vector3
  channel: string   // metric shown
  value: number     // 0..1 normalized
  bar: THREE.Mesh
  barMat: THREE.MeshStandardMaterial
  label: CSS2DObject
  history: number[]
  chartCanvas: HTMLCanvasElement
  chartCtx: CanvasRenderingContext2D
  chartTex: THREE.CanvasTexture
  chartMesh: THREE.Mesh
}

const sensors: SensorPoint[] = []
let styleEl: HTMLStyleElement | null = null

const SENSOR_DATA = [
  { name: '速度监测 A1', pos: new THREE.Vector3(-9, 0, -1), channel: '速度 km/h', baseVal: 0.78, color: 0x00e5ff },
  { name: '温度传感 B1', pos: new THREE.Vector3(-5, 0, 0.8), channel: '温度 °C', baseVal: 0.45, color: 0xff7043 },
  { name: '振动检测 C1', pos: new THREE.Vector3(-1, 0, -0.6), channel: '振动 mm/s', baseVal: 0.2, color: 0xffca28 },
  { name: '轴重计量 D1', pos: new THREE.Vector3(3, 0, 0.5), channel: '轴重 t', baseVal: 0.62, color: 0x69f0ae },
  { name: '电压监测 E1', pos: new THREE.Vector3(7, 0, -0.8), channel: '电压 kV', baseVal: 0.88, color: 0xce93d8 },
  { name: '流量计 F1', pos: new THREE.Vector3(11, 0, 0.6), channel: '流量 L/min', baseVal: 0.33, color: 0x4fc3f7 },
]

const MAX_BAR_H = 5
const HIST_LEN = 40

function makeChartCanvas(color: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = 160; c.height = 60
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(4,8,22,0.9)'
  ctx.fillRect(0, 0, 160, 60)
  return [c, ctx]
}

function drawChart(ctx: CanvasRenderingContext2D, history: number[], colorHex: number, label: string, value: number) {
  const c = ctx.canvas
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.fillStyle = 'rgba(4,8,22,0.92)'
  ctx.fillRect(0, 0, c.width, c.height)
  // Border
  const col = `#${colorHex.toString(16).padStart(6, '0')}`
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.5
  ctx.strokeRect(0.5, 0.5, c.width - 1, c.height - 1)
  ctx.globalAlpha = 1
  // Chart line
  if (history.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9
    history.forEach((v, i) => {
      const x = (i / (HIST_LEN - 1)) * (c.width - 20) + 4
      const y = (1 - v) * (c.height - 20) + 8
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    // Fill under
    ctx.lineTo((history.length - 1) / (HIST_LEN - 1) * (c.width - 20) + 4, c.height - 12)
    ctx.lineTo(4, c.height - 12)
    ctx.closePath()
    ctx.globalAlpha = 0.12; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1
  }
  // Current value text
  ctx.fillStyle = col; ctx.font = 'bold 11px monospace'
  ctx.fillText(`${(value * 100).toFixed(1)}%`, 4, 14)
  ctx.fillStyle = 'rgba(178,235,242,.6)'; ctx.font = '9px sans-serif'
  ctx.fillText(label, 4, c.height - 4)
}

function makeLabelEl(s: typeof SENSOR_DATA[0]): HTMLDivElement {
  const el = document.createElement('div')
  const col = `#${s.color.toString(16).padStart(6, '0')}`
  el.style.cssText = `pointer-events:none;user-select:none;transform:translate(-50%,-108%);`
  el.innerHTML = `<div style="font-family:'PingFang SC',sans-serif;font-size:10px;font-weight:700;color:${col};text-shadow:0 0 6px ${col};background:rgba(4,8,22,.82);border:1px solid ${col}44;border-radius:4px 4px 0 0;padding:2px 7px;text-align:center;white-space:nowrap;">${s.name}</div>`
  return el
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x040a14)
  scene.fog = new THREE.FogExp2(0x040a14, 0.02)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 20)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' })
  container.appendChild(labelRenderer.domElement)

  scene.add(new THREE.AmbientLight(0x112244, 2))
  const dir = new THREE.DirectionalLight(0xffeedd, 2)
  dir.position.set(8, 12, 8); scene.add(dir)

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.95 }))
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
  scene.add(new THREE.GridHelper(60, 60, 0x00e5ff08, 0x00e5ff05))

  // Rail segment
  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9 })
  ;[-0.72, 0.72].forEach(x => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(34, 0.07, 0.07), railMat)
    r.position.set(0, 0.07, x)
    scene.add(r)
  })

  // Build sensor points
  SENSOR_DATA.forEach(sd => {
    const col = sd.color

    // Base cylinder (mounting post)
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.7 }),
    )
    base.position.copy(sd.pos).setY(0.15)
    scene.add(base)

    // Data bar (height animated)
    const barMat = new THREE.MeshStandardMaterial({
      color: col, transparent: true, opacity: 0.75,
      emissive: col, emissiveIntensity: 0.2,
    })
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1, 0.35), barMat)
    bar.position.copy(sd.pos).setY(0.5)
    bar.castShadow = true
    scene.add(bar)

    // Glow ring at top
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.04, 6, 20),
      new THREE.MeshBasicMaterial({ color: col }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.copy(sd.pos).setY(1.1)
    scene.add(ring)
    bar.userData.ring = ring

    // Point light for glow
    const pl = new THREE.PointLight(col, 0.6, 4)
    pl.position.copy(sd.pos).setY(1)
    scene.add(pl)

    // Chart canvas → texture → plane (attached to bar top)
    const [canvas, ctx] = makeChartCanvas(`#${col.toString(16).padStart(6, '0')}`)
    const tex = new THREE.CanvasTexture(canvas)
    const chartPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    )
    chartPlane.position.copy(sd.pos).setY(0)
    chartPlane.rotation.x = -Math.PI / 4
    scene.add(chartPlane)

    // CSS2D name label
    const labelEl = makeLabelEl(sd)
    const labelObj = new CSS2DObject(labelEl)
    labelObj.position.set(0, MAX_BAR_H + 0.4, 0)
    bar.add(labelObj)

    sensors.push({
      name: sd.name, pos: sd.pos.clone(), channel: sd.channel,
      value: sd.baseVal, bar, barMat, label: labelObj,
      history: Array(HIST_LEN).fill(sd.baseVal),
      chartCanvas: canvas, chartCtx: ctx, chartTex: tex, chartMesh: chartPlane,
    })
  })

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.target.set(0, 2, 0)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  sensors.forEach((s, i) => {
    // Simulate fluctuating sensor value
    const noise = Math.sin(elapsed * 0.7 + i * 1.3) * 0.12 + Math.sin(elapsed * 1.8 + i * 2.1) * 0.06
    s.value = Math.max(0.05, Math.min(0.98, SENSOR_DATA[i].baseVal + noise))

    // Update history
    s.history.push(s.value)
    if (s.history.length > HIST_LEN) s.history.shift()

    // Animate bar height
    const targetH = Math.max(0.15, s.value * MAX_BAR_H)
    s.bar.scale.y += (targetH - s.bar.scale.y) * Math.min(delta * 3, 1)
    s.bar.position.y = s.bar.scale.y * 0.5 + 0.3

    // Move ring to bar top
    const ring = s.bar.userData.ring as THREE.Mesh | undefined
    if (ring) ring.position.setY(s.bar.scale.y + 0.3)

    // Color by value
    const hue = (1 - s.value) * 0.33
    s.barMat.color.setHSL(hue + 0.55, 0.9, 0.5)
    s.barMat.emissiveIntensity = 0.15 + s.value * 0.3

    // Update chart plane position (follow bar top)
    s.chartMesh.position.y = s.bar.scale.y + 1.0
    s.chartMesh.lookAt(s.chartMesh.position.clone().add(new THREE.Vector3(0, 0.3, 1)))

    // Redraw chart every 4 frames
    if (Math.round(elapsed * 15) % 4 === 0) {
      const col = SENSOR_DATA[i].color
      drawChart(s.chartCtx, s.history, col, s.channel, s.value)
      s.chartTex.needsUpdate = true
    }
  })

  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  styleEl?.remove()
  sensors.forEach(s => { s.chartTex.dispose(); s.barMat.dispose() })
  sensors.length = 0
  controls.dispose(); renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
}
