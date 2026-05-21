import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let meshes: THREE.Mesh[] = []
let clock: THREE.Clock

const GEOMETRIES = [
  { geo: new THREE.BoxGeometry(1.2, 1.2, 1.2), label: 'Box', color: 0x00e5ff, pos: [-5, 0, 0] },
  { geo: new THREE.SphereGeometry(0.8, 32, 32), label: 'Sphere', color: 0x00b4d8, pos: [-2.5, 0, 0] },
  { geo: new THREE.CylinderGeometry(0.6, 0.6, 1.4, 32), label: 'Cylinder', color: 0x0077b6, pos: [0, 0, 0] },
  { geo: new THREE.TorusGeometry(0.7, 0.25, 16, 64), label: 'Torus', color: 0x023e8a, pos: [2.5, 0, 0] },
  { geo: new THREE.ConeGeometry(0.7, 1.4, 32), label: 'Cone', color: 0x48cae4, pos: [5, 0, 0] },
  { geo: new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16), label: 'TorusKnot', color: 0x90e0ef, pos: [0, 0, 3] },
]

export function init(container: HTMLElement) {
  clock = new THREE.Clock()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e1a)
  scene.fog = new THREE.FogExp2(0x0a0e1a, 0.04)

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 4, 12)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // Lights
  const ambientLight = new THREE.AmbientLight(0x112244, 1.5)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0x00e5ff, 2)
  dirLight.position.set(5, 10, 5)
  dirLight.castShadow = true
  scene.add(dirLight)

  const pointLight = new THREE.PointLight(0x0077b6, 2, 20)
  pointLight.position.set(-3, 5, 3)
  scene.add(pointLight)

  // Ground grid
  const gridHelper = new THREE.GridHelper(20, 20, 0x00e5ff, 0x0d2040)
  gridHelper.position.y = -1.2
  scene.add(gridHelper)

  // Geometries
  GEOMETRIES.forEach(({ geo, color, pos }) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.6,
      roughness: 0.3,
      emissive: new THREE.Color(color).multiplyScalar(0.15),
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...(pos as [number, number, number]))
    mesh.castShadow = true
    scene.add(mesh)
    meshes.push(mesh)
  })

  // Wireframe overlay on first mesh as example
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.12 })
  const wireGeo = GEOMETRIES[0].geo.clone()
  const wireMesh = new THREE.Mesh(wireGeo, wireMat)
  wireMesh.position.set(...(GEOMETRIES[0].pos as [number, number, number]))
  scene.add(wireMesh)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 3
  controls.maxDistance = 30

  window.addEventListener('resize', onResize)

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }

  // Store resize handler for dispose
  ;(renderer as any)._onResize = onResize

  loop()
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  update(delta)
  renderer.render(scene, camera)
}

export function update(delta: number) {
  controls.update()
  meshes.forEach((mesh, i) => {
    mesh.rotation.x += delta * 0.4 * (i % 2 === 0 ? 1 : -1)
    mesh.rotation.y += delta * 0.6
  })
}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', (renderer as any)._onResize)
  controls.dispose()
  meshes.forEach(m => {
    m.geometry.dispose()
    ;(m.material as THREE.Material).dispose()
  })
  meshes = []
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
