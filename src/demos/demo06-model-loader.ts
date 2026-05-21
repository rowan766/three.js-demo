import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let onResize: () => void
let currentModel: THREE.Object3D | null = null
let mixer: THREE.AnimationMixer | null = null

export interface ModelInfo {
  name: string
  vertices: number
  triangles: number
  meshes: number
  animations: number
  size: string
}

let onInfoUpdate: ((info: ModelInfo | null) => void) | null = null

export function init(container: HTMLElement, onInfo?: (info: ModelInfo | null) => void) {
  clock = new THREE.Clock()
  onInfoUpdate = onInfo ?? null

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02)

  const w = container.clientWidth
  const h = container.clientHeight
  camera = new THREE.PerspectiveCamera(55, w / h, 0.01, 500)
  camera.position.set(0, 3, 8)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  // Lights
  scene.add(new THREE.AmbientLight(0x223355, 2))
  const dir = new THREE.DirectionalLight(0xffffff, 3)
  dir.position.set(5, 10, 8)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  scene.add(dir)
  const pt = new THREE.PointLight(0x00e5ff, 1.5, 30)
  pt.position.set(-4, 6, 4)
  scene.add(pt)

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9, metalness: 0.1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(40, 40, 0x00e5ff10, 0x00e5ff08))

  // Axis helper
  scene.add(new THREE.AxesHelper(2))

  // Default placeholder — a box-based locomotive silhouette
  loadDefaultModel()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.minDistance = 0.5
  controls.maxDistance = 100

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function loadDefaultModel() {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0x023e8a, metalness: 0.7, roughness: 0.3 })
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.2, emissive: 0x003344 })

  // Body
  group.add(makeMesh(new THREE.BoxGeometry(3.6, 0.9, 1.4), mat, [0, 0.55, 0]))
  // Cab
  group.add(makeMesh(new THREE.BoxGeometry(1.1, 0.9, 1.3), mat, [-1.0, 1.4, 0]))
  // Nose
  group.add(makeMesh(new THREE.BoxGeometry(0.8, 0.5, 1.0), mat, [1.5, 0.75, 0]))
  // Stripe
  group.add(makeMesh(new THREE.BoxGeometry(3.6, 0.08, 1.41), accentMat, [0, 1.0, 0]))
  // Wheels × 4
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 24), mat)
      w.rotation.x = Math.PI / 2
      w.position.set(i * 1.1, 0.3, j * 0.77)
      group.add(w)
    }
  }
  group.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true } })
  setModel(group)
  onInfoUpdate?.({ name: '默认占位模型（Box Mesh）', vertices: 0, triangles: 0, meshes: 5, animations: 0, size: '-' })
}

function makeMesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  return m
}

function setModel(obj: THREE.Object3D) {
  if (currentModel) scene.remove(currentModel)
  currentModel = obj
  obj.position.y = 0
  scene.add(obj)

  // Auto-fit camera
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  camera.position.set(center.x, center.y + maxDim, center.z + maxDim * 2)
  controls.target.copy(center)
  controls.update()
}

function collectInfo(obj: THREE.Object3D, fileSizeBytes: number): ModelInfo {
  let vertices = 0, triangles = 0, meshes = 0
  obj.traverse(c => {
    if (c instanceof THREE.Mesh && c.geometry) {
      meshes++
      const pos = c.geometry.attributes.position
      if (pos) vertices += pos.count
      const idx = c.geometry.index
      triangles += idx ? idx.count / 3 : pos ? pos.count / 3 : 0
    }
  })
  const sizeStr = fileSizeBytes < 1024 * 1024
    ? `${(fileSizeBytes / 1024).toFixed(1)} KB`
    : `${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB`
  return { name: obj.name || '未命名', vertices, triangles: Math.round(triangles), meshes, animations: 0, size: sizeStr }
}

export function loadFile(file: File) {
  const url = URL.createObjectURL(file)
  const ext = file.name.split('.').pop()?.toLowerCase()
  onInfoUpdate?.(null) // loading state

  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader()
    loader.load(url, (gltf) => {
      if (mixer) { mixer.stopAllAction(); mixer = null }
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene)
        gltf.animations.forEach(clip => mixer!.clipAction(clip).play())
      }
      setModel(gltf.scene)
      const info = collectInfo(gltf.scene, file.size)
      info.animations = gltf.animations.length
      info.name = file.name
      onInfoUpdate?.(info)
      URL.revokeObjectURL(url)
    }, undefined, (err) => {
      console.error('GLTFLoader error', err)
      URL.revokeObjectURL(url)
    })
  } else if (ext === 'fbx') {
    const loader = new FBXLoader()
    loader.load(url, (fbx) => {
      if (mixer) { mixer.stopAllAction(); mixer = null }
      if (fbx.animations.length > 0) {
        mixer = new THREE.AnimationMixer(fbx)
        fbx.animations.forEach(clip => mixer!.clipAction(clip).play())
      }
      setModel(fbx)
      const info = collectInfo(fbx, file.size)
      info.animations = fbx.animations.length
      info.name = file.name
      onInfoUpdate?.(info)
      URL.revokeObjectURL(url)
    }, undefined, (err) => {
      console.error('FBXLoader error', err)
      URL.revokeObjectURL(url)
    })
  }
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  mixer?.update(delta)
  controls.update()
  renderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  controls.dispose()
  mixer?.stopAllAction()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
