import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void

// Stations
const STATIONS = [
  { name: '铁路枢纽站', pos: new THREE.Vector3(0, 0, 0), color: 0x00e5ff },
  { name: '北方货运站', pos: new THREE.Vector3(0, 0, -15), color: 0x69f0ae },
  { name: '东部客运站', pos: new THREE.Vector3(16, 0, -5), color: 0x69f0ae },
  { name: '南方综合站', pos: new THREE.Vector3(5, 0, 14), color: 0x69f0ae },
  { name: '西部工业站', pos: new THREE.Vector3(-14, 0, 4), color: 0xffca28 },
  { name: '东北联络站', pos: new THREE.Vector3(10, 0, -14), color: 0xff8a65 },
]

// Routes: pairs of station indices
const ROUTES = [
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 5],
]

interface TrainOnRoute {
  curve: THREE.CatmullRomCurve3
  t: number; speed: number; dir: 1 | -1
  mesh: THREE.Group; trailMeshes: THREE.Mesh[]
}

const trains: TrainOnRoute[] = []

let tourMode = false
let tourT = 0
const tourWaypoints: THREE.Vector3[] = []

function buildRoute(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const mid = a.clone().lerp(b, 0.5)
  mid.x += (Math.random() - 0.5) * 4
  mid.z += (Math.random() - 0.5) * 4
  return new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()])
}

function buildTrainMesh(color: number): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 })
  const ac = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
  g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.55), mat), { castShadow: true }))
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.5, 8), mat)
  head.rotation.z = Math.PI / 2; head.position.set(-1.1, 0, 0)
  g.add(head)
  const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), ac)
  headlight.position.set(-1.3, 0, 0)
  g.add(headlight)
  return g
}

function buildStationMesh(s: typeof STATIONS[0]): THREE.Group {
  const g = new THREE.Group()
  // Platform disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.5, 0.15, 20),
    new THREE.MeshStandardMaterial({ color: s.color, metalness: 0.4, roughness: 0.5, emissive: s.color, emissiveIntensity: 0.1 }),
  )
  g.add(disc)
  // Beacon column
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x37474f }),
  )
  beacon.position.y = 1.25; g.add(beacon)
  // Glow top
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: s.color }),
  )
  glow.position.y = 2.6; g.add(glow)
  g.add(new THREE.PointLight(s.color, 1, 6))
  // Label
  const el = document.createElement('div')
  el.style.cssText = `
    font-family:'PingFang SC',sans-serif;font-size:11px;font-weight:700;
    color:${`#${s.color.toString(16).padStart(6, '0')}`};
    text-shadow:0 0 8px currentColor;pointer-events:none;
    transform:translate(-50%,-140%);white-space:nowrap;
    background:rgba(4,8,20,.75);border:1px solid currentColor;
    border-radius:4px;padding:3px 7px;
  `
  el.textContent = s.name
  const label = new CSS2DObject(el)
  label.position.set(0, 3.0, 0)
  g.add(label)
  g.position.copy(s.pos)
  g.position.y = 0.08
  return g
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x040a14)
  scene.fog = new THREE.FogExp2(0x040a14, 0.015)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 300)
  camera.position.set(0, 30, 35)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' })
  container.appendChild(labelRenderer.domElement)

  scene.add(new THREE.AmbientLight(0x112244, 2))
  const dir = new THREE.DirectionalLight(0xffeedd, 2)
  dir.position.set(10, 20, 10); dir.castShadow = true
  dir.shadow.camera.left = dir.shadow.camera.bottom = -40
  dir.shadow.camera.right = dir.shadow.camera.top = 40
  scene.add(dir)

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.95 }))
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
  scene.add(new THREE.GridHelper(80, 80, 0x00e5ff06, 0x00e5ff04))

  // Build stations
  STATIONS.forEach(s => scene.add(buildStationMesh(s)))

  // Build routes + trains
  const trainColors = [0x00b4d8, 0x69f0ae, 0xff8a65, 0xffca28, 0xce93d8, 0xf48fb1]
  ROUTES.forEach(([ai, bi], ri) => {
    const curve = buildRoute(STATIONS[ai].pos, STATIONS[bi].pos)
    const pts = curve.getPoints(80)

    // Track tube
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.04, 6),
      new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.8 }),
    )
    rail.castShadow = true; scene.add(rail)

    // Glowing route line overlay
    const lineMat = new THREE.LineBasicMaterial({ color: trainColors[ri], opacity: 0.35, transparent: true })
    const linePts = pts.map(p => p.clone().add(new THREE.Vector3(0, 0.12, 0)))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), lineMat))

    // Train
    const mesh = buildTrainMesh(trainColors[ri])
    scene.add(mesh)
    trains.push({ curve, t: ri / ROUTES.length, speed: 0.04 + ri * 0.005, dir: ri % 2 === 0 ? 1 : -1, mesh, trailMeshes: [] })

    // Tour waypoints from curve midpoints
    tourWaypoints.push(curve.getPointAt(0.5).add(new THREE.Vector3(0, 12, 8)))
  })
  tourWaypoints.push(new THREE.Vector3(0, 28, 32)) // overview

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.target.set(0, 0, 0)
  controls.maxPolarAngle = Math.PI / 2.1

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

const _up = new THREE.Vector3(0, 1, 0)

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()

  trains.forEach(tr => {
    tr.t = ((tr.t + delta * tr.speed * tr.dir) + 1) % 1
    const pos = tr.curve.getPointAt(tr.t)
    const lookT = (tr.t + 0.02 * tr.dir + 1) % 1
    const look = tr.curve.getPointAt(lookT)
    tr.mesh.position.copy(pos).add(new THREE.Vector3(0, 0.25, 0))
    tr.mesh.lookAt(look.x, pos.y + 0.25, look.z)
  })

  if (tourMode) {
    tourT += delta * 0.08
    const n = tourWaypoints.length
    const i = Math.floor(tourT % n)
    const next = (i + 1) % n
    const t = tourT % 1
    camera.position.lerpVectors(tourWaypoints[i], tourWaypoints[next], t)
    camera.lookAt(0, 0, 0)
    controls.target.set(0, 0, 0)
  }

  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

export function setTourMode(on: boolean) {
  tourMode = on
  controls.enabled = !on
  if (!on) { camera.position.set(0, 30, 35); controls.target.set(0, 0, 0) }
}

export function focusStation(idx: number) {
  const s = STATIONS[idx]
  if (!s) return
  camera.position.set(s.pos.x, 15, s.pos.z + 15)
  controls.target.copy(s.pos)
  controls.update()
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  controls.dispose(); renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
  trains.length = 0
}
