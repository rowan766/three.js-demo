import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let animId: number
let clock: THREE.Clock
let onResize: () => void

// Multiple cameras
let perspCamera: THREE.PerspectiveCamera
let orthoCamera: THREE.OrthographicCamera
let activeCamera: THREE.Camera
let orbitControls: OrbitControls

// Auto-tour
let tourMode = false
let tourT = 0
const TOUR_WAYPOINTS = [
  new THREE.Vector3(0, 8, 16),
  new THREE.Vector3(12, 4, 8),
  new THREE.Vector3(0, 12, 0),
  new THREE.Vector3(-12, 4, 8),
  new THREE.Vector3(0, 4, 16),
]

const cameraState = {
  mode: 'perspective' as 'perspective' | 'ortho',
  fov: 60,
  touring: false,
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.025)

  const w = container.clientWidth
  const h = container.clientHeight

  perspCamera = new THREE.PerspectiveCamera(60, w / h, 0.1, 300)
  perspCamera.position.set(0, 8, 16)

  orthoCamera = new THREE.OrthographicCamera(-10, 10, 10 * (h / w), -10 * (h / w), 0.1, 300)
  orthoCamera.position.set(0, 8, 16)
  orthoCamera.lookAt(0, 0, 0)

  activeCamera = perspCamera

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0x112244, 1.5))
  const dir = new THREE.DirectionalLight(0xffffff, 2)
  dir.position.set(8, 12, 6)
  dir.castShadow = true
  scene.add(dir)
  const pt = new THREE.PointLight(0x00e5ff, 2, 30)
  pt.position.set(0, 6, 0)
  scene.add(pt)

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  scene.add(new THREE.GridHelper(40, 40, 0x00e5ff10, 0x00e5ff08))

  // Scene objects — railway station-ish arrangement
  const colors = [0x00e5ff, 0x00b4d8, 0x0077b6, 0x023e8a, 0x48cae4]
  const buildingData: [number, number, number, number, number][] = [
    [0, 1.5, -8, 3, 3],
    [-5, 1, -5, 2, 2],
    [5, 1, -5, 2, 2],
    [-8, 0.75, 0, 1.5, 1.5],
    [8, 0.75, 0, 1.5, 1.5],
    [-3, 0.5, 4, 1, 1],
    [3, 0.5, 4, 1, 1],
  ]
  buildingData.forEach(([x, y, z, half, h2], i) => {
    const geo = new THREE.BoxGeometry(half * 2, h2 * 2, half * 2)
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], metalness: 0.4, roughness: 0.5, emissive: new THREE.Color(colors[i % colors.length]).multiplyScalar(0.05) })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    scene.add(m)
  })

  // Camera frustum helper (shows perspective camera from ortho view)
  const frustumHelper = new THREE.CameraHelper(perspCamera)
  scene.add(frustumHelper)

  orbitControls = new OrbitControls(perspCamera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.target.set(0, 0, 0)

  onResize = () => {
    const w2 = container.clientWidth
    const h2 = container.clientHeight
    perspCamera.aspect = w2 / h2
    perspCamera.updateProjectionMatrix()
    orthoCamera.left = -10
    orthoCamera.right = 10
    orthoCamera.top = 10 * (h2 / w2)
    orthoCamera.bottom = -10 * (h2 / w2)
    orthoCamera.updateProjectionMatrix()
    renderer.setSize(w2, h2)
  }
  window.addEventListener('resize', onResize)

  loop()
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()

  if (cameraState.touring) {
    tourT += delta * 0.15
    const total = TOUR_WAYPOINTS.length
    const i = Math.floor(tourT % total)
    const next = (i + 1) % total
    const t = (tourT % 1)
    perspCamera.position.lerpVectors(TOUR_WAYPOINTS[i], TOUR_WAYPOINTS[next], t)
    perspCamera.lookAt(0, 0, 0)
  }

  orbitControls.update()
  renderer.render(scene, activeCamera)
}

export function update(_delta: number) {}

export function setCameraMode(mode: 'perspective' | 'ortho') {
  cameraState.mode = mode
  activeCamera = mode === 'perspective' ? perspCamera : orthoCamera
}

export function setFov(fov: number) {
  cameraState.fov = fov
  perspCamera.fov = fov
  perspCamera.updateProjectionMatrix()
}

export function toggleTour(on: boolean) {
  cameraState.touring = on
  tourMode = on
  if (on) {
    orbitControls.enabled = false
    tourT = 0
  } else {
    orbitControls.enabled = true
  }
}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  orbitControls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
