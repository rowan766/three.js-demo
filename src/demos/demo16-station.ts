import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void
let sky: Sky, sunDir: THREE.Vector3
let sunLight: THREE.DirectionalLight

// Train animation state
const TrainPhase = { IDLE: 0, APPROACHING: 1, STOPPED: 2, DEPARTING: 3 } as const
type TrainPhaseVal = (typeof TrainPhase)[keyof typeof TrainPhase]
let trainPhase: TrainPhaseVal = TrainPhase.IDLE
let phaseTimer = 0
let trainX = -40
let trainGroup: THREE.Group
let doorL: THREE.Mesh, doorR: THREE.Mesh
let doorOpen = 0 // 0..1

// LED arrays
const leds: THREE.Mesh[] = []
let ledT = 0

const CAM_PRESETS = {
  overview: { pos: new THREE.Vector3(0, 22, 35), target: new THREE.Vector3(0, 0, 0) },
  platform: { pos: new THREE.Vector3(-2, 4, 12), target: new THREE.Vector3(0, 2, -4) },
  front: { pos: new THREE.Vector3(0, 6, 20), target: new THREE.Vector3(0, 3, 0) },
}
type CamPreset = keyof typeof CAM_PRESETS

const mat = {
  concrete: new THREE.MeshStandardMaterial({ color: 0xd0cfc9, roughness: 0.9, metalness: 0 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.35, metalness: 0.1, roughness: 0.05 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.8, roughness: 0.3 }),
  roofRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.85 }),
  platform: new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.95 }),
  canopy: new THREE.MeshStandardMaterial({ color: 0x90a4ae, transparent: true, opacity: 0.6, metalness: 0.4 }),
  trainBody: new THREE.MeshStandardMaterial({ color: 0x0d47a1, metalness: 0.65, roughness: 0.3 }),
  trainAccent: new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.9, roughness: 0.15, emissive: 0x002233 }),
  rail: new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9, roughness: 0.2 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x3e3a35, roughness: 0.95 }),
}

function box(m: THREE.Material, w: number, h: number, d: number, px = 0, py = 0, pz = 0, rx = 0, ry = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(px, py, pz)
  mesh.rotation.set(rx, ry, 0)
  mesh.castShadow = mesh.receiveShadow = true
  return mesh
}

function buildStationBuilding(scene: THREE.Scene) {
  const g = new THREE.Group()
  // Main hall
  g.add(box(mat.concrete, 18, 8, 10, 0, 4, -12))
  g.add(box(mat.glass, 17.8, 5, 0.1, 0, 4.5, -7.05))  // front facade glass
  g.add(box(mat.glass, 17.8, 5, 0.1, 0, 4.5, -16.95)) // back facade glass
  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(13, 3, 4), mat.roofRed)
  roof.position.set(0, 9, -12); roof.rotation.y = Math.PI / 4; roof.castShadow = true
  g.add(roof)
  // Side wings
  ;[-10, 10].forEach(x => { g.add(box(mat.concrete, 6, 5, 8, x, 2.5, -11)) })
  // Entrance columns
  for (let x = -7; x <= 7; x += 3.5) {
    g.add(box(mat.steel, 0.4, 6, 0.4, x, 3, -7.2))
  }
  // Sign board
  const signEl = document.createElement('div')
  signEl.style.cssText = 'font-family:\'PingFang SC\',sans-serif;font-size:18px;font-weight:700;color:#00e5ff;text-shadow:0 0 12px rgba(0,229,255,0.8);letter-spacing:4px;pointer-events:none;white-space:nowrap;'
  signEl.textContent = '★ 铁路示范站 ★'
  const sign = new CSS2DObject(signEl)
  sign.position.set(0, 7.5, -7)
  g.add(sign)
  scene.add(g)
}

function buildPlatformAndCanopy(scene: THREE.Scene) {
  // Platform 1 (main)
  const p1 = new THREE.Group()
  p1.add(box(mat.platform, 28, 0.6, 5, 0, 0.3, 0))
  // Yellow safety line
  p1.add(box(new THREE.MeshStandardMaterial({ color: 0xffee58, roughness: 0.8 }), 28, 0.02, 0.15, 0, 0.62, -1.8))
  // Benches
  for (let x = -10; x <= 10; x += 5) {
    p1.add(box(mat.wood, 2, 0.1, 0.5, x, 0.85, -1))
    p1.add(box(mat.steel, 0.06, 0.65, 0.06, x - 0.9, 0.6, -0.8))
    p1.add(box(mat.steel, 0.06, 0.65, 0.06, x + 0.9, 0.6, -0.8))
  }
  // Lighting poles on platform
  for (let x = -12; x <= 12; x += 6) {
    const pole = box(mat.steel, 0.08, 5, 0.08, x, 2.5, -2.2)
    p1.add(pole)
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfffde7 }))
    lamp.position.set(x, 5.15, -2.2)
    const pl = new THREE.PointLight(0xfff8e1, 0.8, 6)
    pl.position.set(x, 5, -2.2)
    scene.add(pl)
    leds.push(lamp)
    p1.add(lamp)
  }
  // Canopy
  p1.add(box(mat.canopy, 28, 0.15, 5, 0, 5, -2))
  // Canopy support beams
  for (let x = -12; x <= 12; x += 6) {
    p1.add(box(mat.steel, 0.1, 5, 0.1, x, 2.5, -4.5))
  }
  scene.add(p1)

  // Platform 2 (island platform at back)
  const p2 = p1.clone()
  p2.position.z = -6
  scene.add(p2)
}

function buildTracks(scene: THREE.Scene) {
  const railMat = mat.rail
  const slMat = mat.wood
  // 3 tracks
  const trackZ = [2.5, -3.5, -10]
  trackZ.forEach(z => {
    ;[-0.72, 0.72].forEach(x => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(50, 0.07, 0.07), railMat)
      r.position.set(0, 0.07, z + x * 0.5)
      scene.add(r)
    })
    for (let i = -24; i <= 24; i++) {
      const sl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.24), slMat)
      sl.position.set(i, 0.05, z)
      sl.castShadow = sl.receiveShadow = true
      scene.add(sl)
    }
  })
}

function buildOHLE(scene: THREE.Scene) {
  // Overhead line equipment poles
  for (let x = -20; x <= 20; x += 8) {
    const pole = box(mat.steel, 0.12, 8, 0.12, x, 4, -3.5)
    scene.add(pole)
    // Cross arm
    const arm = box(mat.steel, 6, 0.06, 0.06, x, 8.1, -3.5)
    scene.add(arm)
    // Wire (as thin line geometry)
    const wirePts = [new THREE.Vector3(x - 4, 8, -3.5), new THREE.Vector3(x + 4, 8, -3.5)]
    const wire = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(wirePts),
      new THREE.LineBasicMaterial({ color: 0xc0c0c0 }),
    )
    scene.add(wire)
  }
  // Contact wire along track
  const catPts = [new THREE.Vector3(-25, 7.8, 2.5), new THREE.Vector3(25, 7.8, 2.5)]
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(catPts), new THREE.LineBasicMaterial({ color: 0xd4a017 })))
}

function buildTrain(): THREE.Group {
  const g = new THREE.Group()
  // Loco + 2 cars
  const units: [number, number][] = [[-8.5, 4.5], [0, 4], [8.5, 4]]
  units.forEach(([xoff, len], ui) => {
    const body = box(mat.trainBody, len, 1.1, 1.6, xoff, 0.65, 0)
    g.add(body)
    g.add(box(mat.trainAccent, len, 0.07, 1.61, xoff, 1.22, 0))
    // Windows
    for (let wx = xoff - len / 2 + 0.6; wx < xoff + len / 2 - 0.3; wx += 0.7) {
      g.add(box(new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.5 }), 0.4, 0.35, 0.01, wx, 0.75, 0.81))
    }
    // Bogies
    ;[-len / 2 + 0.8, len / 2 - 0.8].forEach(bx => {
      g.add(box(new THREE.MeshStandardMaterial({ color: 0x111 }), 0.9, 0.28, 1.65, xoff + bx, 0.14, 0))
    })
    if (ui === 0) {
      // Cabin + nose
      g.add(box(mat.trainBody, 1.3, 1.0, 1.5, xoff - len / 2 - 0.5, 1.15, 0))
      g.add(box(mat.trainBody, 0.6, 0.55, 1.2, xoff - len / 2 - 1.15, 0.78, 0))
    }
  })
  // Doors (car1 doors for animation)
  doorL = box(mat.trainBody, 0.75, 0.9, 0.05, -0.5, 0.65, 0.83)
  doorR = box(mat.trainBody, 0.75, 0.9, 0.05, 0.5, 0.65, 0.83)
  g.add(doorL, doorR)
  g.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true } })
  return g
}

function updateTrain(delta: number) {
  phaseTimer += delta
  switch (trainPhase) {
    case TrainPhase.IDLE:
      if (phaseTimer > 3) { trainPhase = TrainPhase.APPROACHING; phaseTimer = 0; trainX = -40 }
      break
    case TrainPhase.APPROACHING:
      trainX += delta * (12 - Math.max(0, (trainX + 5) * 0.4))
      if (trainX >= -1) { trainX = -1; trainPhase = TrainPhase.STOPPED; phaseTimer = 0 }
      break
    case TrainPhase.STOPPED:
      doorOpen = Math.min(1, doorOpen + delta * 1.5)
      if (phaseTimer > 5) { doorOpen = Math.max(0, doorOpen - delta * 1.5) }
      if (phaseTimer > 6.5 && doorOpen <= 0) { trainPhase = TrainPhase.DEPARTING; phaseTimer = 0 }
      break
    case TrainPhase.DEPARTING:
      trainX += delta * (3 + phaseTimer * 3)
      if (trainX > 42) { trainPhase = TrainPhase.IDLE; phaseTimer = 0 }
      break
  }
  trainGroup.position.x = trainX
  doorL.position.x = -0.5 - doorOpen * 0.55
  doorR.position.x = 0.5 + doorOpen * 0.55
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.copy(CAM_PRESETS.overview.pos)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  container.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.clientWidth, container.clientHeight)
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' })
  container.appendChild(labelRenderer.domElement)

  // Sky
  sky = new Sky(); sky.scale.setScalar(10000); scene.add(sky)
  sunDir = new THREE.Vector3()
  sky.material.uniforms['turbidity'].value = 8
  sky.material.uniforms['rayleigh'].value = 1.5
  sky.material.uniforms['mieCoefficient'].value = 0.005
  sky.material.uniforms['mieDirectionalG'].value = 0.8

  sunLight = new THREE.DirectionalLight(0xfff0dd, 3)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -40
  sunLight.shadow.camera.right = sunLight.shadow.camera.top = 40
  scene.add(sunLight)
  scene.add(new THREE.AmbientLight(0x335577, 1.2))

  scene.fog = new THREE.FogExp2(0x87ceeb, 0.01)

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat.ground)
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)

  buildStationBuilding(scene)
  buildPlatformAndCanopy(scene)
  buildTracks(scene)
  buildOHLE(scene)

  trainGroup = buildTrain()
  trainGroup.position.set(-40, 0, 2.5)
  scene.add(trainGroup)

  setElevation(35)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.02
  controls.target.copy(CAM_PRESETS.overview.target)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function setElevation(deg: number) {
  const phi = THREE.MathUtils.degToRad(90 - deg)
  sunDir.setFromSphericalCoords(1, phi, THREE.MathUtils.degToRad(210))
  sky.material.uniforms['sunPosition'].value.copy(sunDir)
  sunLight.position.copy(sunDir).multiplyScalar(80)
  sunLight.intensity = Math.max(0.3, deg / 90 * 3.5)
  if (scene.fog instanceof THREE.FogExp2) {
    const t = deg / 90
    scene.fog.color.setRGB(0.5 * t + 0.02, 0.7 * t + 0.05, 0.9 * t + 0.15)
  }
}

export function setCameraPreset(preset: CamPreset) {
  const p = CAM_PRESETS[preset]
  camera.position.copy(p.pos)
  controls.target.copy(p.target)
  controls.update()
}

export function setTimeOfDay(deg: number) { setElevation(deg) }

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  ledT += delta
  leds.forEach((l, i) => { (l.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(ledT * 2 + i * 0.5) * 0.3 })
  updateTrain(delta)
  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  controls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
}
