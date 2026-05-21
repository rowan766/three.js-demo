import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let onResize: () => void

const GAUGE = 1.435 // 标准轨距(m)
const RAIL_RADIUS = 0.04
const SLEEPER_W = GAUGE + 0.5
const SLEEPER_H = 0.12
const SLEEPER_D = 0.24

// 控制点 — 带高差的 S 形曲线
const CONTROL_POINTS = [
  new THREE.Vector3(-18, 0, 2),
  new THREE.Vector3(-12, 0.3, -4),
  new THREE.Vector3(-6, 0.8, -6),
  new THREE.Vector3(0, 1.0, -4),
  new THREE.Vector3(6, 0.8, 0),
  new THREE.Vector3(12, 0.3, 4),
  new THREE.Vector3(18, 0, 2),
]

export let mainCurve: THREE.CatmullRomCurve3

// 可见性开关
const visibility = { rails: true, sleepers: true, ballast: true, helpers: true }
const groups: Record<string, THREE.Group> = {}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.025)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 300)
  camera.position.set(0, 10, 22)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0x223355, 1.5))
  const dir = new THREE.DirectionalLight(0xffeedd, 2.5)
  dir.position.set(10, 20, 10)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.left = -30
  dir.shadow.camera.right = 30
  dir.shadow.camera.top = 30
  dir.shadow.camera.bottom = -30
  scene.add(dir)
  scene.add(new THREE.PointLight(0x00e5ff, 1.5, 40))

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x0c1a0a, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(80, 80, 0x00e5ff08, 0x00e5ff05))

  // Build main curve
  mainCurve = new THREE.CatmullRomCurve3(CONTROL_POINTS, false, 'catmullrom', 0.5)

  buildRails()
  buildSleepers()
  buildBallast()
  buildHelpers()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 1, 0)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function buildRails() {
  const grp = new THREE.Group()
  groups['rails'] = grp
  scene.add(grp)

  const N = 400
  const leftPts: THREE.Vector3[] = []
  const rightPts: THREE.Vector3[] = []
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= N; i++) {
    const t = i / N
    const pt = mainCurve.getPointAt(t)
    const tan = mainCurve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up).normalize()
    leftPts.push(pt.clone().addScaledVector(right, GAUGE / 2))
    rightPts.push(pt.clone().addScaledVector(right, -GAUGE / 2))
  }

  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9, roughness: 0.2 })
  const leftCurve = new THREE.CatmullRomCurve3(leftPts)
  const rightCurve = new THREE.CatmullRomCurve3(rightPts)
  const leftRail = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 400, RAIL_RADIUS, 8), railMat)
  const rightRail = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 400, RAIL_RADIUS, 8), railMat)
  leftRail.castShadow = true
  rightRail.castShadow = true
  grp.add(leftRail, rightRail)
}

function buildSleepers() {
  const grp = new THREE.Group()
  groups['sleepers'] = grp
  scene.add(grp)

  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95, metalness: 0.0 })
  const geo = new THREE.BoxGeometry(SLEEPER_W, SLEEPER_H, SLEEPER_D)
  const NUM = 120
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < NUM; i++) {
    const t = i / NUM
    const pt = mainCurve.getPointAt(t)
    const tan = mainCurve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up).normalize()

    const sleeper = new THREE.Mesh(geo, sleeperMat)
    sleeper.position.copy(pt)
    sleeper.position.y += SLEEPER_H / 2

    const matrix = new THREE.Matrix4()
    matrix.makeBasis(right, up, tan.clone().negate())
    sleeper.setRotationFromMatrix(matrix)

    sleeper.castShadow = true
    sleeper.receiveShadow = true
    grp.add(sleeper)
  }
}

function buildBallast() {
  const grp = new THREE.Group()
  groups['ballast'] = grp
  scene.add(grp)

  // Ballast bed as a tube slightly wider and lower than the track
  const N = 300
  const midPts: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const pt = mainCurve.getPointAt(i / N)
    midPts.push(new THREE.Vector3(pt.x, pt.y - 0.05, pt.z))
  }
  const midCurve = new THREE.CatmullRomCurve3(midPts)
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x5d4e37, roughness: 1.0, metalness: 0.0 })

  // Use an ellipse-like cross-section
  class EllipticTube extends THREE.Curve<THREE.Vector2> {
    getPoint(t: number) {
      const a = 1.4, b = 0.25
      const angle = t * Math.PI * 2
      return new THREE.Vector2(Math.cos(angle) * a, Math.sin(angle) * b)
    }
  }
  const ballastGeo = new THREE.TubeGeometry(midCurve, 300, 1, 8)
  // Instead, use a simple flat box as ballast
  grp.add(new THREE.Mesh(
    new THREE.TubeGeometry(midCurve, 300, 0.9, 6),
    ballastMat,
  ))
}

function buildHelpers() {
  const grp = new THREE.Group()
  groups['helpers'] = grp
  scene.add(grp)

  // Control point spheres
  const cpMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  CONTROL_POINTS.forEach(pt => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), cpMat)
    m.position.copy(pt)
    grp.add(m)
  })

  // Spline debug line
  const pts = mainCurve.getPoints(200)
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, opacity: 0.4, transparent: true })
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
  grp.add(new THREE.Line(lineGeo, lineMat))
}

export function setVisibility(key: 'rails' | 'sleepers' | 'ballast' | 'helpers', val: boolean) {
  visibility[key] = val
  if (groups[key]) groups[key].visible = val
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
  controls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
