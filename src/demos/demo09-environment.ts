import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let onResize: () => void
let sky: Sky
let sun: THREE.Vector3
let sunSphere: THREE.Mesh

// 白天时分参数
const params = {
  elevation: 30,   // 太阳仰角 0-90
  azimuth: 180,    // 方位角
  fogDensity: 0.008,
  autoTime: false,
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 10000)
  camera.position.set(0, 8, 30)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.8
  container.appendChild(renderer.domElement)

  // Sky
  sky = new Sky()
  sky.scale.setScalar(10000)
  scene.add(sky)
  sun = new THREE.Vector3()
  updateSky()

  // Sun visualizer
  sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(30, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff0cc }),
  )
  scene.add(sunSphere)

  // Directional light (sun)
  const sunLight = new THREE.DirectionalLight(0xffeedd, 4)
  sunLight.name = 'sunLight'
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -40
  sunLight.shadow.camera.right = sunLight.shadow.camera.top = 40
  scene.add(sunLight)
  scene.add(sunLight.target)

  scene.add(new THREE.AmbientLight(0x224466, 1))

  // Ground — procedural texture
  const groundTex = buildGroundTexture()
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping
  groundTex.repeat.set(20, 20)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Simple landscape — mountains
  buildMountains()

  // Railway scene in foreground
  buildRailwayScene()

  // Fog
  scene.fog = new THREE.FogExp2(0x87ceeb, params.fogDensity)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.05
  controls.target.set(0, 2, 0)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function buildGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1a2e0a'
  ctx.fillRect(0, 0, 256, 256)
  // Add some noise-like variation
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = Math.random() * 2
    const light = Math.floor(Math.random() * 30)
    ctx.fillStyle = `rgb(${15 + light},${35 + light * 1.5},${5 + light})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return new THREE.CanvasTexture(c)
}

function buildMountains() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x1c3a1c, roughness: 1.0 })
  const positions: [number, number, number, number][] = [
    [-80, 0, -120, 35],
    [-40, 0, -140, 28],
    [0, 0, -150, 40],
    [50, 0, -130, 32],
    [90, 0, -110, 38],
    [-100, 0, -80, 25],
    [100, 0, -90, 30],
  ]
  positions.forEach(([x, y, z, h]) => {
    const geo = new THREE.ConeGeometry(h * 0.8, h, 7 + Math.floor(Math.random() * 4))
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y + h / 2, z)
    scene.add(m)
  })
}

function buildRailwayScene() {
  // Simple S-curve track
  const curvePts = [
    new THREE.Vector3(-20, 0, 5),
    new THREE.Vector3(-10, 0, -3),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(10, 0, 3),
    new THREE.Vector3(20, 0, 1),
  ]
  const c = new THREE.CatmullRomCurve3(curvePts)
  const railMat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9, roughness: 0.2 })
  const up = new THREE.Vector3(0, 1, 0)
  const N = 200
  const lPts: THREE.Vector3[] = [], rPts: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const pt = c.getPointAt(i / N)
    const tan = c.getTangentAt(i / N).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up).normalize()
    lPts.push(pt.clone().addScaledVector(right, 0.7175))
    rPts.push(pt.clone().addScaledVector(right, -0.7175))
  }
  ;[new THREE.CatmullRomCurve3(lPts), new THREE.CatmullRomCurve3(rPts)].forEach(rc => {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(rc, 200, 0.04, 8), railMat)
    rail.castShadow = true
    scene.add(rail)
  })

  // Sleepers
  const slMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95 })
  const slGeo = new THREE.BoxGeometry(1.9, 0.12, 0.24)
  for (let i = 0; i < 60; i++) {
    const t = i / 60
    const pt = c.getPointAt(t)
    const tan = c.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up)
    const sl = new THREE.Mesh(slGeo, slMat)
    sl.position.copy(pt).setY(0.06)
    const m4 = new THREE.Matrix4().makeBasis(right, up, tan.clone().negate())
    sl.setRotationFromMatrix(m4)
    sl.receiveShadow = true
    scene.add(sl)
  }

  // Platform
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.6, 3),
    new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.8 }),
  )
  platform.position.set(0, 0.3, -3)
  platform.castShadow = true
  platform.receiveShadow = true
  scene.add(platform)

  // Station building
  const bldg = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 3),
    new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.7 }),
  )
  bldg.position.set(0, 2, -5.5)
  bldg.castShadow = true
  bldg.receiveShadow = true
  scene.add(bldg)
  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.8 }),
  )
  roof.position.set(0, 5.25, -5.5)
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  scene.add(roof)

  // Trees
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 1.0 })
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0 })
  const treePositions: [number, number][] = [[-15, -8], [-18, -12], [15, -10], [18, -6], [12, -14]]
  treePositions.forEach(([x, z]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), trunkMat)
    trunk.position.set(x, 0.75, z)
    scene.add(trunk)
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 8), treeMat)
    foliage.position.set(x, 2.75, z)
    foliage.castShadow = true
    scene.add(foliage)
  })
}

function updateSky() {
  const phi = THREE.MathUtils.degToRad(90 - params.elevation)
  const theta = THREE.MathUtils.degToRad(params.azimuth)
  sun.setFromSphericalCoords(1, phi, theta)

  const uniforms = sky.material.uniforms
  uniforms['sunPosition'].value.copy(sun)
  uniforms['turbidity'].value = 10
  uniforms['rayleigh'].value = 2
  uniforms['mieCoefficient'].value = 0.005
  uniforms['mieDirectionalG'].value = 0.8

  // Update sun sphere position
  if (sunSphere) {
    sunSphere.position.copy(sun).multiplyScalar(3000)
  }

  // Update sun light
  const sunLight = scene.getObjectByName('sunLight') as THREE.DirectionalLight | undefined
  if (sunLight) {
    sunLight.position.copy(sun).multiplyScalar(100)
    const t = Math.max(0, params.elevation / 90)
    sunLight.intensity = t * 4
    // Sky color adjustment
    const skyColor = new THREE.Color().setHSL(0.6, 0.5, 0.2 + t * 0.5)
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color = skyColor
  }
}

export function setElevation(v: number) {
  params.elevation = v
  updateSky()
}

export function setFogDensity(v: number) {
  params.fogDensity = v
  if (scene.fog instanceof THREE.FogExp2) scene.fog.density = v
}

export function setAutoTime(v: boolean) {
  params.autoTime = v
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()

  if (params.autoTime) {
    params.elevation = (params.elevation + delta * 4) % 90
    updateSky()
  }

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
