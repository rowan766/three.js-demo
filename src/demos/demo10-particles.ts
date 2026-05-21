import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animId: number
let clock: THREE.Clock
let onResize: () => void

type ParticleSystem = { points: THREE.Points; update: (dt: number) => void; dispose: () => void }
let activeSystems: ParticleSystem[] = []

// ─── Rain ────────────────────────────────────────────────────────────────────
function createRain(count = 6000): ParticleSystem {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count)

  function reset(i: number) {
    positions[i * 3] = (Math.random() - 0.5) * 60
    positions[i * 3 + 1] = Math.random() * 35 + 5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60
    velocities[i] = 8 + Math.random() * 6
  }

  for (let i = 0; i < count; i++) reset(i)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: 0x80d8ff,
    size: 0.08,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const points = new THREE.Points(geo, mat)

  function update(dt: number) {
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= velocities[i] * dt
      positions[i * 3] -= 1.5 * dt // slight wind
      if (positions[i * 3 + 1] < 0) reset(i)
    }
    geo.attributes.position.needsUpdate = true
  }

  function dispose() {
    geo.dispose()
    mat.dispose()
    scene.remove(points)
  }

  scene.add(points)
  return { points, update, dispose }
}

// ─── Sparks / Fire ───────────────────────────────────────────────────────────
function createSparks(count = 800): ParticleSystem {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const ages = new Float32Array(count)
  const lifetimes = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  function resetParticle(i: number) {
    positions[i * 3] = (Math.random() - 0.5) * 0.6
    positions[i * 3 + 1] = 0.5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6
    const speed = 2 + Math.random() * 5
    const angle = Math.random() * Math.PI * 2
    const spread = 0.4
    velocities[i * 3] = Math.cos(angle) * speed * spread + (Math.random() - 0.5) * 0.5
    velocities[i * 3 + 1] = speed
    velocities[i * 3 + 2] = Math.sin(angle) * speed * spread + (Math.random() - 0.5) * 0.5
    ages[i] = 0
    lifetimes[i] = 0.6 + Math.random() * 1.2
  }

  for (let i = 0; i < count; i++) {
    resetParticle(i)
    ages[i] = Math.random() * lifetimes[i]
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const points = new THREE.Points(geo, mat)

  function update(dt: number) {
    for (let i = 0; i < count; i++) {
      ages[i] += dt
      if (ages[i] > lifetimes[i]) { resetParticle(i); continue }
      const life = ages[i] / lifetimes[i]
      positions[i * 3] += velocities[i * 3] * dt
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt
      velocities[i * 3 + 1] -= 5 * dt // gravity
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt
      // Color: orange → yellow → white fade
      const r = 1.0
      const g = life < 0.5 ? life * 1.2 : 0.6 + (1 - life) * 0.4
      const b = life > 0.7 ? (life - 0.7) * 2 : 0
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate = true
  }

  function dispose() { geo.dispose(); mat.dispose(); scene.remove(points) }

  scene.add(points)
  return { points, update, dispose }
}

// ─── Snow ────────────────────────────────────────────────────────────────────
function createSnow(count = 3000): ParticleSystem {
  const positions = new Float32Array(count * 3)
  const drift = new Float32Array(count * 2) // x/z phase

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50
    positions[i * 3 + 1] = Math.random() * 30
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50
    drift[i * 2] = Math.random() * Math.PI * 2
    drift[i * 2 + 1] = 0.5 + Math.random() * 1.5
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.8, depthWrite: false })
  const points = new THREE.Points(geo, mat)

  function update(dt: number) {
    const elapsed = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      positions[i * 3] += Math.sin(elapsed + drift[i * 2]) * 0.3 * dt
      positions[i * 3 + 1] -= drift[i * 2 + 1] * dt
      positions[i * 3 + 2] += Math.cos(elapsed * 0.7 + drift[i * 2]) * 0.2 * dt
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 30
        positions[i * 3] = (Math.random() - 0.5) * 50
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50
      }
    }
    geo.attributes.position.needsUpdate = true
  }

  function dispose() { geo.dispose(); mat.dispose(); scene.remove(points) }

  scene.add(points)
  return { points, update, dispose }
}

// ─── Galaxy ──────────────────────────────────────────────────────────────────
function createGalaxy(count = 8000): ParticleSystem {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  const radii = new Float32Array(count)
  const phases = new Float32Array(count)

  const innerColor = new THREE.Color(0x00e5ff)
  const outerColor = new THREE.Color(0x4400aa)

  for (let i = 0; i < count; i++) {
    const r = 1 + Math.pow(Math.random(), 2) * 18
    const branchAngle = ((i % 3) / 3) * Math.PI * 2
    const spin = r * 0.5
    const rnd = (Math.random() - 0.5) * (1.5 / r)
    const ph = Math.random() * Math.PI * 2
    radii[i] = r
    phases[i] = branchAngle + spin + ph
    speeds[i] = (0.05 + Math.random() * 0.05) / r
    positions[i * 3] = Math.cos(phases[i]) * r + rnd
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5
    positions[i * 3 + 2] = Math.sin(phases[i]) * r + rnd
    const mixed = new THREE.Color().lerpColors(innerColor, outerColor, r / 18)
    colors[i * 3] = mixed.r; colors[i * 3 + 1] = mixed.g; colors[i * 3 + 2] = mixed.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false })
  const points = new THREE.Points(geo, mat)
  points.position.y = 5

  function update(dt: number) {
    for (let i = 0; i < count; i++) {
      phases[i] += speeds[i] * dt
      positions[i * 3] = Math.cos(phases[i]) * radii[i]
      positions[i * 3 + 2] = Math.sin(phases[i]) * radii[i]
    }
    geo.attributes.position.needsUpdate = true
  }

  function dispose() { geo.dispose(); mat.dispose(); scene.remove(points) }

  scene.add(points)
  return { points, update, dispose }
}

// ─── Public API ──────────────────────────────────────────────────────────────
type ParticleType = 'rain' | 'sparks' | 'snow' | 'galaxy'
let currentType: ParticleType = 'rain'

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x030810)

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 20)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // Emitter object (spark source)
  scene.add(new THREE.PointLight(0xff6600, 2, 10))
  scene.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.4, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }),
  ))

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)
  scene.add(new THREE.GridHelper(60, 60, 0x00e5ff08, 0x00e5ff05))
  scene.add(new THREE.AmbientLight(0x112233, 1))

  setParticleType('rain')

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 5, 0)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

export function setParticleType(type: ParticleType) {
  activeSystems.forEach(s => s.dispose())
  activeSystems = []
  currentType = type

  if (type === 'rain') {
    scene.background = new THREE.Color(0x040c1a)
    activeSystems.push(createRain())
  } else if (type === 'sparks') {
    scene.background = new THREE.Color(0x050505)
    activeSystems.push(createSparks())
  } else if (type === 'snow') {
    scene.background = new THREE.Color(0x0a1428)
    activeSystems.push(createSnow())
  } else if (type === 'galaxy') {
    scene.background = new THREE.Color(0x000005)
    activeSystems.push(createGalaxy())
  }
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  activeSystems.forEach(s => s.update(delta))
  controls.update()
  renderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  activeSystems.forEach(s => s.dispose())
  activeSystems = []
  controls.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
}
