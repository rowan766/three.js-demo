import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let mixer: THREE.AnimationMixer
let onResize: () => void

// Demo meshes
let pendulumArm: THREE.Group
let wheel: THREE.Mesh
let trainBody: THREE.Group
let trainTrack: THREE.Line
let trainT = 0

// Easing demo
let easingBox: THREE.Mesh
let easingT = 0
let easingDir = 1

const EASING = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  elasticOut: (t: number) => {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1
  },
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75 }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375 }
    t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375
  },
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 6, 18)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0x112244, 2))
  const dir = new THREE.DirectionalLight(0xffffff, 2.5)
  dir.position.set(6, 10, 8)
  dir.castShadow = true
  scene.add(dir)
  scene.add(new THREE.PointLight(0x00e5ff, 2, 25))

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  scene.add(new THREE.GridHelper(40, 40, 0x00e5ff10, 0x00e5ff08))

  // ① Pendulum (sine wave)
  pendulumArm = new THREE.Group()
  pendulumArm.position.set(-8, 5, 0)
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0x00e5ff }))
  pendulumArm.add(pivot)
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 3),
    new THREE.MeshStandardMaterial({ color: 0x00b4d8 }),
  )
  rod.position.y = -1.5
  pendulumArm.add(rod)
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.35), new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8 }))
  bob.position.y = -3
  pendulumArm.add(bob)
  scene.add(pendulumArm)

  // ② Spinning wheel (rotation)
  const wheelGroup = new THREE.Group()
  wheelGroup.position.set(-2.5, 2, 0)
  wheel = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.1, 16, 48),
    new THREE.MeshStandardMaterial({ color: 0x00b4d8, metalness: 0.7 }),
  )
  wheelGroup.add(wheel)
  // spokes
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x0077b6 }),
    )
    spoke.rotation.z = (i / 8) * Math.PI * 2
    wheelGroup.add(spoke)
  }
  scene.add(wheelGroup)

  // ③ Train body along straight path (position lerp)
  trainBody = new THREE.Group()
  trainBody.position.set(3, 0.6, 0)
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x023e8a, metalness: 0.6 }),
  )
  trainBody.add(chassis)
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x0077b6, metalness: 0.5 }),
  )
  cab.position.set(-0.8, 0.8, 0)
  trainBody.add(cab)
  scene.add(trainBody)

  // Track line
  const pts = []
  for (let i = 0; i <= 64; i++) {
    const x = -6 + (i / 64) * 12
    pts.push(new THREE.Vector3(x, 0.05, 0))
  }
  trainTrack = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x00e5ff40 }),
  )
  scene.add(trainTrack)

  // ④ Easing comparison boxes
  const easingColors = [0x00e5ff, 0x48cae4, 0x00b4d8, 0x0077b6]
  Object.keys(EASING).forEach((key, i) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: easingColors[i], metalness: 0.5 }),
    )
    b.position.set(8 + i * 0.9, 0.3, 0)
    b.userData.easingKey = key
    b.userData.startX = 8 + i * 0.9
    b.castShadow = true
    scene.add(b)
    if (i === 0) easingBox = b
  })

  // AnimationMixer on chassis (scale pulse via keyframes)
  mixer = new THREE.AnimationMixer(chassis)
  const kfTrack = new THREE.VectorKeyframeTrack('.scale', [0, 0.5, 1], [1, 1, 1, 1, 1.15, 1, 1, 1, 1])
  const clip = new THREE.AnimationClip('pulse', 1, [kfTrack])
  const action = mixer.clipAction(clip)
  action.play()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 2, 0)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)

  loop()
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  // Pendulum
  pendulumArm.rotation.z = Math.sin(elapsed * 2) * 0.5

  // Wheel
  wheel.rotation.z -= delta * 2

  // Train position loop
  trainT = (trainT + delta * 0.25) % 1
  trainBody.position.x = -6 + trainT * 12

  // Easing boxes bounce
  easingT += delta * 0.6 * easingDir
  if (easingT >= 1) { easingT = 1; easingDir = -1 }
  if (easingT <= 0) { easingT = 0; easingDir = 1 }

  scene.children.forEach(obj => {
    if (obj instanceof THREE.Mesh && obj.userData.easingKey) {
      const fn = EASING[obj.userData.easingKey as keyof typeof EASING]
      obj.position.z = (fn(easingT) - 0.5) * 6
    }
  })

  mixer.update(delta)
  controls.update()
  renderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  controls.dispose()
  mixer.stopAllAction()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
