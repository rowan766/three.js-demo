import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let meshes: THREE.Mesh[] = []
let onResize: () => void

const MATERIALS = [
  {
    label: 'MeshBasicMaterial',
    desc: '不受光照影响',
    mat: () => new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: false }),
  },
  {
    label: 'MeshLambertMaterial',
    desc: '漫反射，性能好',
    mat: () => new THREE.MeshLambertMaterial({ color: 0x48cae4, emissive: 0x023e8a }),
  },
  {
    label: 'MeshPhongMaterial',
    desc: '高光反射（Phong模型）',
    mat: () => new THREE.MeshPhongMaterial({ color: 0x0077b6, shininess: 120, specular: 0x00e5ff }),
  },
  {
    label: 'MeshStandardMaterial',
    desc: 'PBR 金属粗糙度',
    mat: () => new THREE.MeshStandardMaterial({ color: 0x00b4d8, metalness: 0.8, roughness: 0.2 }),
  },
  {
    label: 'MeshPhysicalMaterial',
    desc: 'PBR 扩展，支持透明涂层',
    mat: () => new THREE.MeshPhysicalMaterial({ color: 0x90e0ef, metalness: 0.5, roughness: 0.1, clearcoat: 1 }),
  },
  {
    label: 'MeshToonMaterial',
    desc: '卡通渐变风格',
    mat: () => new THREE.MeshToonMaterial({ color: 0x00e5ff }),
  },
  {
    label: 'MeshNormalMaterial',
    desc: '法线可视化',
    mat: () => new THREE.MeshNormalMaterial(),
  },
  {
    label: 'MeshDepthMaterial',
    desc: '深度可视化',
    mat: () => new THREE.MeshDepthMaterial(),
  },
]

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 3, 14)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0x223355, 2))
  const dir = new THREE.DirectionalLight(0xffffff, 3)
  dir.position.set(5, 10, 8)
  scene.add(dir)
  const point = new THREE.PointLight(0x00e5ff, 2, 30)
  point.position.set(-4, 5, 4)
  scene.add(point)

  // Grid
  const grid = new THREE.GridHelper(24, 24, 0x00e5ff, 0x0d2040)
  grid.position.y = -1.5
  scene.add(grid)

  // 8 spheres arranged in 2 rows × 4 cols
  const positions: [number, number, number][] = [
    [-5.25, 0, 0], [-1.75, 0, 0], [1.75, 0, 0], [5.25, 0, 0],
    [-5.25, 0, 3.5], [-1.75, 0, 3.5], [1.75, 0, 3.5], [5.25, 0, 3.5],
  ]

  MATERIALS.forEach(({ mat }, i) => {
    const geo = new THREE.SphereGeometry(1, 32, 32)
    const mesh = new THREE.Mesh(geo, mat())
    mesh.position.set(...positions[i])
    scene.add(mesh)
    meshes.push(mesh)
  })

  // Checker texture demo plane
  const canvas2d = document.createElement('canvas')
  canvas2d.width = canvas2d.height = 128
  const ctx = canvas2d.getContext('2d')!
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#00e5ff22' : '#0a0e1a'
      ctx.fillRect(c * 16, r * 16, 16, 16)
    }
  }
  const tex = new THREE.CanvasTexture(canvas2d)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 4)
  const planeMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), planeMat)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -1.5
  scene.add(plane)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

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
  controls.update()
  meshes.forEach((m, i) => {
    m.rotation.y += delta * 0.5 * (i % 2 === 0 ? 1 : -1)
  })
  renderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  controls.dispose()
  meshes.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose() })
  meshes = []
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
