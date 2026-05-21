import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let onResize: () => void

let train: THREE.Group
let wheels: THREE.Object3D[] = []
let curve: THREE.CatmullRomCurve3
let trainT = 0

let speedScale = 1.0
let cameraFollow = false
let trainLength = 0 // curve arc length, filled after build

const GAUGE = 1.435
const RAIL_R = 0.04

// 闭合椭圆轨道控制点
const LOOP_POINTS = [
  new THREE.Vector3(0, 0, -12),
  new THREE.Vector3(8, 0, -9),
  new THREE.Vector3(13, 0, 0),
  new THREE.Vector3(10, 0.5, 8),
  new THREE.Vector3(0, 1.0, 11),
  new THREE.Vector3(-10, 0.5, 8),
  new THREE.Vector3(-13, 0, 0),
  new THREE.Vector3(-8, 0, -9),
]

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060c14)
  scene.fog = new THREE.FogExp2(0x060c14, 0.02)

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 300)
  camera.position.set(0, 14, 28)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0x112233, 2))
  const dir = new THREE.DirectionalLight(0xfff0dd, 3)
  dir.position.set(15, 20, 10)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.left = dir.shadow.camera.bottom = -30
  dir.shadow.camera.right = dir.shadow.camera.top = 30
  scene.add(dir)
  const headlight = new THREE.SpotLight(0xffffff, 8, 30, Math.PI / 10, 0.3)
  headlight.name = 'headlight'
  scene.add(headlight)
  scene.add(headlight.target)

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x0c1a0a, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(80, 80, 0x00e5ff06, 0x00e5ff04))

  // Build track
  curve = new THREE.CatmullRomCurve3(LOOP_POINTS, true, 'catmullrom', 0.5)
  buildTrack()

  // Build train
  train = buildTrain()
  scene.add(train)

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

function buildTrack() {
  const N = 500
  const leftPts: THREE.Vector3[] = []
  const rightPts: THREE.Vector3[] = []
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= N; i++) {
    const t = i / N
    const pt = curve.getPointAt(t)
    const tan = curve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up).normalize()
    leftPts.push(pt.clone().addScaledVector(right, GAUGE / 2))
    rightPts.push(pt.clone().addScaledVector(right, -GAUGE / 2))
  }

  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9, roughness: 0.2 })
  ;[new THREE.CatmullRomCurve3(leftPts, true), new THREE.CatmullRomCurve3(rightPts, true)].forEach(c => {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(c, 500, RAIL_R, 8), railMat)
    rail.castShadow = true
    scene.add(rail)
  })

  // Sleepers
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95 })
  const sleeperGeo = new THREE.BoxGeometry(GAUGE + 0.5, 0.12, 0.24)
  for (let i = 0; i < 160; i++) {
    const t = i / 160
    const pt = curve.getPointAt(t)
    const tan = curve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up)
    const sl = new THREE.Mesh(sleeperGeo, sleeperMat)
    sl.position.copy(pt)
    sl.position.y += 0.06
    const mat4 = new THREE.Matrix4().makeBasis(right, up, tan.clone().negate())
    sl.setRotationFromMatrix(mat4)
    sl.castShadow = true
    sl.receiveShadow = true
    scene.add(sl)
  }
}

function buildTrain(): THREE.Group {
  const group = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, metalness: 0.6, roughness: 0.3 })
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.15, emissive: 0x003344 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.5, roughness: 0.4 })

  // Locomotive
  const loco = new THREE.Group()
  loco.name = 'loco'
  loco.add(box(bodyMat, 4.0, 1.1, 1.6, [0, 0.65, 0]))       // chassis
  loco.add(box(accentMat, 4.0, 0.08, 1.61, [0, 1.2, 0]))    // accent stripe
  loco.add(box(bodyMat, 1.4, 1.0, 1.5, [-1.1, 1.7, 0]))     // cabin
  loco.add(box(darkMat, 0.5, 0.5, 1.4, [1.5, 0.9, 0]))      // nose
  // Windows
  loco.add(box(accentMat, 0.05, 0.45, 0.55, [-0.95, 2.0, 0.76]))
  loco.add(box(accentMat, 0.05, 0.45, 0.55, [-0.95, 2.0, -0.76]))
  // Wheels
  for (let i = -1; i <= 1; i += 2) {
    for (const xo of [-1.2, 0, 1.2]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 20), darkMat)
      w.rotation.x = Math.PI / 2
      w.position.set(xo, 0.32, i * 0.85)
      loco.add(w)
      wheels.push(w)
    }
  }
  loco.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true } })
  group.add(loco)

  // One cargo car
  const car = new THREE.Group()
  car.position.set(-5.2, 0, 0)
  car.add(box(bodyMat, 3.5, 0.85, 1.5, [0, 0.55, 0]))
  car.add(box(accentMat, 3.5, 0.06, 1.51, [0, 0.98, 0]))
  for (let i = -1; i <= 1; i += 2) {
    for (const xo of [-1.0, 1.0]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 20), darkMat)
      w.rotation.x = Math.PI / 2
      w.position.set(xo, 0.28, i * 0.80)
      car.add(w)
      wheels.push(w)
    }
  }
  car.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true } })
  group.add(car)

  return group
}

function box(mat: THREE.Material, w: number, h: number, d: number, pos: [number, number, number]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(...pos)
  return m
}

const _up = new THREE.Vector3(0, 1, 0)
const _q1 = new THREE.Quaternion()
const _m = new THREE.Matrix4()

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()

  trainT = (trainT + delta * 0.04 * speedScale) % 1
  const pos = curve.getPointAt(trainT)
  const lookT = (trainT + 0.015) % 1
  const lookPos = curve.getPointAt(lookT)

  train.position.set(pos.x, pos.y + 0.5, pos.z)

  const dir = new THREE.Vector3().subVectors(lookPos, pos).normalize()
  const right = new THREE.Vector3().crossVectors(dir, _up)
  const up2 = new THREE.Vector3().crossVectors(right, dir)
  _m.makeBasis(right, up2, dir.clone().negate())
  _q1.setFromRotationMatrix(_m)
  train.quaternion.slerp(_q1, 0.2)

  // Spin wheels
  wheels.forEach(w => { w.rotation.y += delta * 4 * speedScale })

  // Headlight follows train
  const headlight = scene.getObjectByName('headlight') as THREE.SpotLight | undefined
  if (headlight) {
    headlight.position.copy(train.position).add(new THREE.Vector3(0, 1.5, 0))
    headlight.target.position.copy(lookPos)
    headlight.target.updateMatrixWorld()
  }

  // Camera follow
  if (cameraFollow) {
    const backDir = dir.clone().negate()
    const camPos = train.position.clone().addScaledVector(backDir, 10).add(new THREE.Vector3(0, 5, 0))
    camera.position.lerp(camPos, 0.05)
    camera.lookAt(train.position)
    controls.target.lerp(train.position, 0.05)
  }

  controls.update()
  renderer.render(scene, camera)
}

export function setSpeed(v: number) { speedScale = v }
export function setCameraFollow(v: boolean) {
  cameraFollow = v
  controls.enabled = !v
  if (!v) {
    camera.position.set(0, 14, 28)
    controls.target.set(0, 1, 0)
  }
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  controls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
