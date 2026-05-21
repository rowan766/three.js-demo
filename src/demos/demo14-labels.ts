import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

interface CarData {
  id: string; cargo: string; weight: string; dest: string
  status: 'normal' | 'warning' | 'alert'; color: number
  pos: [number, number, number]
  liveValue: { temp: number; press: number }
}

const CARS: CarData[] = [
  { id: 'GR-001', cargo: '粮食', weight: '58.4 t', dest: '成都东站', status: 'normal', color: 0x1565c0, pos: [-12, 0, 0], liveValue: { temp: 22, press: 101 } },
  { id: 'GR-002', cargo: '化工品 ⚠', weight: '45.0 t', dest: '重庆北站', status: 'warning', color: 0xe65100, pos: [-7, 0, 0], liveValue: { temp: 38, press: 105 } },
  { id: 'GR-003', cargo: '集装箱', weight: '62.8 t', dest: '上海虹桥', status: 'normal', color: 0x1565c0, pos: [-2, 0, 0], liveValue: { temp: 20, press: 101 } },
  { id: 'GR-004', cargo: '危险品 ✕', weight: '32.5 t', dest: '就地扣押', status: 'alert', color: 0xb71c1c, pos: [3, 0, 0], liveValue: { temp: 55, press: 118 } },
  { id: 'GR-005', cargo: '钢铁卷材', weight: '72.1 t', dest: '武汉站', status: 'normal', color: 0x37474f, pos: [8, 0, 0], liveValue: { temp: 25, press: 102 } },
]

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void
const carMeshes: THREE.Mesh[] = []
const labelObjects: CSS2DObject[] = []
let liveT = 0

let styleEl: HTMLStyleElement | null = null

function injectStyles() {
  styleEl = document.createElement('style')
  styleEl.textContent = `
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    @keyframes pulse-border { 0%,100%{box-shadow:0 0 8px rgba(255,82,82,0.4)} 50%{box-shadow:0 0 16px rgba(255,82,82,0.9)} }
    .car-label { pointer-events:none; user-select:none; transform:translate(-50%,-140%); }
    .label-card {
      font-family:'PingFang SC','Microsoft YaHei',sans-serif;
      border-radius:6px; padding:7px 10px;
      min-width:120px; max-width:160px;
      backdrop-filter:blur(6px);
    }
    .label-normal { background:rgba(4,10,24,0.88); border:1px solid rgba(0,229,255,0.4); box-shadow:0 0 10px rgba(0,229,255,0.15); }
    .label-warning { background:rgba(20,10,0,0.9); border:1px solid rgba(255,152,0,0.6); box-shadow:0 0 10px rgba(255,152,0,0.25); }
    .label-alert { background:rgba(20,0,0,0.92); border:1px solid rgba(255,82,82,0.7); animation:pulse-border 1.5s ease-in-out infinite; }
    .label-id { font-size:10px; font-weight:700; letter-spacing:0.5px; margin-bottom:4px; }
    .label-normal .label-id { color:#00e5ff; }
    .label-warning .label-id { color:#ffca28; }
    .label-alert .label-id { color:#ff5252; animation:blink 1s linear infinite; }
    .label-row { display:flex; justify-content:space-between; align-items:center; gap:6px; }
    .label-key { color:rgba(178,235,242,0.55); font-size:9px; white-space:nowrap; }
    .label-val { color:#e0f7fa; font-size:9px; font-weight:600; font-family:monospace; }
    .label-sep { height:1px; background:rgba(255,255,255,0.08); margin:4px 0; }
    .label-live { display:flex; gap:8px; margin-top:4px; }
    .live-item { display:flex;flex-direction:column;align-items:center;flex:1;
      background:rgba(0,229,255,0.05);border-radius:3px;padding:3px 0; }
    .live-key { color:rgba(128,203,196,0.5);font-size:8px; }
    .live-val { color:#e0f7fa;font-size:10px;font-weight:700;font-family:monospace; }
    .label-caret {
      position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
      width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
    }
    .caret-normal { border-top:7px solid rgba(0,229,255,0.5); }
    .caret-warning { border-top:7px solid rgba(255,152,0,0.5); }
    .caret-alert { border-top:7px solid rgba(255,82,82,0.5); }
  `
  document.head.appendChild(styleEl)
}

function createLabel(car: CarData): CSS2DObject {
  const wrapper = document.createElement('div')
  wrapper.className = 'car-label'

  const card = document.createElement('div')
  card.className = `label-card label-${car.status}`
  card.style.position = 'relative'
  card.setAttribute('data-car-id', car.id)

  const idEl = document.createElement('div')
  idEl.className = 'label-id'
  idEl.textContent = `◈ ${car.id}`

  const sep1 = document.createElement('div'); sep1.className = 'label-sep'

  function row(k: string, v: string): HTMLDivElement {
    const r = document.createElement('div'); r.className = 'label-row'
    const kEl = document.createElement('span'); kEl.className = 'label-key'; kEl.textContent = k
    const vEl = document.createElement('span'); vEl.className = 'label-val'; vEl.textContent = v
    r.appendChild(kEl); r.appendChild(vEl)
    return r
  }

  const sep2 = document.createElement('div'); sep2.className = 'label-sep'

  const live = document.createElement('div'); live.className = 'label-live'
  ;[['温度', `${car.liveValue.temp}°C`], ['气压', `${car.liveValue.press}kPa`]].forEach(([k, v]) => {
    const item = document.createElement('div'); item.className = 'live-item'
    const kEl = document.createElement('div'); kEl.className = 'live-key'; kEl.textContent = k
    const vEl = document.createElement('div'); vEl.className = 'live-val'; vEl.textContent = v
    vEl.setAttribute('data-live-key', k)
    item.appendChild(kEl); item.appendChild(vEl)
    live.appendChild(item)
  })

  const caret = document.createElement('div')
  caret.className = `label-caret caret-${car.status}`

  card.appendChild(idEl)
  card.appendChild(sep1)
  card.appendChild(row('货物', car.cargo))
  card.appendChild(row('重量', car.weight))
  card.appendChild(row('目的地', car.dest))
  card.appendChild(sep2)
  card.appendChild(live)
  card.appendChild(caret)
  wrapper.appendChild(card)

  const obj = new CSS2DObject(wrapper)
  obj.position.set(0, 1.4, 0)
  return obj
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  injectStyles()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x070d1a)
  scene.fog = new THREE.FogExp2(0x070d1a, 0.025)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 5, 16)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden',
  })
  container.appendChild(labelRenderer.domElement)

  scene.add(new THREE.AmbientLight(0x223355, 2))
  const dir = new THREE.DirectionalLight(0xffeedd, 3)
  dir.position.set(8, 12, 6)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  scene.add(dir)

  // Ground + track
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }))
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(60, 30, 0x00e5ff08, 0x00e5ff05))

  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9 })
  ;[-0.72, 0.72].forEach(x => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(35, 0.07, 0.07), railMat)
    r.position.set(0, 0.07, x)
    scene.add(r)
  })

  // Car bodies
  CARS.forEach(car => {
    const bodyMat = new THREE.MeshStandardMaterial({ color: car.color, metalness: 0.5, roughness: 0.35 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 1.5), bodyMat)
    body.position.set(...car.pos)
    body.position.y = 0.5
    body.castShadow = true
    scene.add(body)
    carMeshes.push(body)

    // Bogies
    for (const dx of [-1.4, 1.4]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.6), new THREE.MeshStandardMaterial({ color: 0x111111 }))
      bogie.position.set(car.pos[0] + dx, 0.15, car.pos[2])
      scene.add(bogie)
    }

    // Label
    const label = createLabel(car)
    body.add(label)
    labelObjects.push(label)
  })

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0.5, 0)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

// Simulate live data updates in labels
function updateLiveValues(elapsed: number) {
  liveT = elapsed
  CARS.forEach((car, i) => {
    // Temperature fluctuates
    const tempFluc = Math.sin(elapsed * 0.3 + i) * 1.5
    const pressFluc = Math.sin(elapsed * 0.5 + i * 1.3) * 2
    const newTemp = (car.liveValue.temp + tempFluc).toFixed(1)
    const newPress = (car.liveValue.press + pressFluc).toFixed(0)

    const card = document.querySelector(`[data-car-id="${car.id}"]`)
    if (!card) return
    const liveVals = card.querySelectorAll('.live-val')
    if (liveVals[0]) liveVals[0].textContent = `${newTemp}°C`
    if (liveVals[1]) liveVals[1].textContent = `${newPress}kPa`
  })
}

function loop() {
  animId = requestAnimationFrame(loop)
  const elapsed = clock.getElapsedTime()
  updateLiveValues(elapsed)
  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  styleEl?.remove()
  controls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
  carMeshes.length = 0
  labelObjects.length = 0
}
