import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let onResize: () => void

// Named lights for animation
let pointLight1: THREE.PointLight
let pointLight2: THREE.PointLight
let spotLight: THREE.SpotLight
let hemiLight: THREE.HemisphereLight
let dirLight: THREE.DirectionalLight
let pointHelper1: THREE.Mesh
let pointHelper2: THREE.Mesh
let spotHelper: THREE.SpotLightHelper
let dirHelper: THREE.DirectionalLightHelper

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060c18)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 16)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // Floor
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9, metalness: 0.1 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Grid
  scene.add(new THREE.GridHelper(30, 30, 0x00e5ff10, 0x00e5ff08))

  // A cluster of demo objects
  const objMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.5, metalness: 0.4 })
  const positions: [number, number, number][] = [
    [0, 0.75, 0], [-3, 0.5, -2], [3, 0.5, -2], [-2, 0.5, 2], [2, 0.5, 2],
  ]
  positions.forEach(([x, y, z]) => {
    const geo = Math.random() > 0.5
      ? new THREE.BoxGeometry(1.2, 1.5, 1.2)
      : new THREE.CylinderGeometry(0.6, 0.6, 1.5, 16)
    const m = new THREE.Mesh(geo, objMat.clone())
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    scene.add(m)
  })

  // 1. HemisphereLight — sky/ground ambient
  hemiLight = new THREE.HemisphereLight(0x112244, 0x020408, 0.8)
  scene.add(hemiLight)

  // 2. DirectionalLight — sun-like
  dirLight = new THREE.DirectionalLight(0xffeedd, 1.2)
  dirLight.position.set(10, 12, 6)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(1024, 1024)
  scene.add(dirLight)
  dirHelper = new THREE.DirectionalLightHelper(dirLight, 2, 0xffdd88)
  scene.add(dirHelper)

  // 3. PointLight 1 — cyan orbiting
  pointLight1 = new THREE.PointLight(0x00e5ff, 3, 15)
  pointLight1.castShadow = true
  scene.add(pointLight1)
  pointHelper1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
  )
  scene.add(pointHelper1)

  // 4. PointLight 2 — magenta orbiting
  pointLight2 = new THREE.PointLight(0xff44cc, 3, 15)
  pointLight2.castShadow = true
  scene.add(pointLight2)
  pointHelper2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff44cc }),
  )
  scene.add(pointHelper2)

  // 5. SpotLight
  spotLight = new THREE.SpotLight(0xffffff, 4, 20, Math.PI / 8, 0.3, 1)
  spotLight.position.set(-6, 10, 4)
  spotLight.castShadow = true
  spotLight.target.position.set(0, 0, 0)
  scene.add(spotLight)
  scene.add(spotLight.target)
  spotHelper = new THREE.SpotLightHelper(spotLight)
  scene.add(spotHelper)

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

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  // Orbit the two point lights
  const r1 = 6
  pointLight1.position.set(Math.cos(elapsed * 0.8) * r1, 3, Math.sin(elapsed * 0.8) * r1)
  pointHelper1.position.copy(pointLight1.position)

  const r2 = 5
  pointLight2.position.set(Math.cos(elapsed * 0.8 + Math.PI) * r2, 2, Math.sin(elapsed * 0.8 + Math.PI) * r2)
  pointHelper2.position.copy(pointLight2.position)

  // Pulsate spot intensity
  spotLight.intensity = 3 + Math.sin(elapsed * 2) * 1.5

  spotHelper.update()
  dirHelper.update()
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
