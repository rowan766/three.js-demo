import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let composer: EffectComposer, outlinePass: OutlinePass
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void
let sky: Sky

// Train
let trainGroup: THREE.Group
let trainCurve: THREE.CatmullRomCurve3
let trainT = 0
const trainWheels: THREE.Object3D[] = []
let cameraMode: 'overview' | 'follow' | 'station' = 'overview'

// Equipment
interface EqItem { mesh: THREE.Mesh; popup: CSS2DObject | null; name: string; status: string; params: Record<string, string> }
const eqItems: EqItem[] = []
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let selectedEq: EqItem | null = null

// Data bars
const dataBars: { bar: THREE.Mesh; mat: THREE.MeshStandardMaterial; phase: number }[] = []

// Layers toggle
export const layers = { train: true, equipment: true, labels: true, dataBars: true }

let styleEl: HTMLStyleElement | null = null

function injectStyle() {
  styleEl = document.createElement('style')
  styleEl.textContent = '@keyframes comp-scan{0%,100%{opacity:.3}50%{opacity:1}}'
  document.head.appendChild(styleEl)
}

// ─── Scene Building ───────────────────────────────────────────────────────────
function buildEnvironment() {
  sky = new Sky(); sky.scale.setScalar(10000); scene.add(sky)
  const u = sky.material.uniforms
  u['turbidity'].value = 8; u['rayleigh'].value = 1.5
  u['mieCoefficient'].value = 0.004; u['mieDirectionalG'].value = 0.8
  const sun = new THREE.Vector3()
  sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(200))
  u['sunPosition'].value.copy(sun)

  const dir = new THREE.DirectionalLight(0xfff0dd, 3)
  dir.position.copy(sun).multiplyScalar(80); dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.left = dir.shadow.camera.bottom = -50
  dir.shadow.camera.right = dir.shadow.camera.top = 50
  scene.add(dir)
  scene.add(new THREE.AmbientLight(0x335577, 1.2))
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.008)

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x1a2e0a, roughness: 0.95 }))
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
  scene.add(new THREE.GridHelper(100, 100, 0x00e5ff06, 0x00e5ff04))

  // Station building (simplified)
  const smat = new THREE.MeshStandardMaterial({ color: 0xd0cfc9, roughness: 0.9 })
  const rmat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.8 })
  ;[
    [smat, 18, 8, 10, 0, 4, -18],
    [rmat, 13, 2.5, 0, 0, 9, -18],
    [smat, 5, 5, 8, -11, 2.5, -17],
    [smat, 5, 5, 8, 11, 2.5, -17],
  ].forEach(([m, w, h, d, px, py, pz]) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w as number, h as number, d as number), m as THREE.Material)
    me.position.set(px as number, py as number, pz as number)
    me.castShadow = me.receiveShadow = true; scene.add(me)
  })

  // Platform
  const pmat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.9 })
  const plat = new THREE.Mesh(new THREE.BoxGeometry(28, 0.6, 4), pmat)
  plat.position.set(0, 0.3, -9); plat.receiveShadow = true; scene.add(plat)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(28, 0.12, 4.5), new THREE.MeshStandardMaterial({ color: 0x90a4ae, transparent: true, opacity: 0.5 }))
  canopy.position.set(0, 5, -9); scene.add(canopy)

  // Trees
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 1 })
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1 })
  ;[[-18, -15], [-22, -8], [18, -12], [22, -6], [15, 8], [-16, 10]].forEach(([x, z]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), trunkMat)
    trunk.position.set(x, 0.75, z); scene.add(trunk)
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 8), treeMat)
    foliage.position.set(x, 2.75, z); foliage.castShadow = true; scene.add(foliage)
  })
}

function buildTrack() {
  const pts = [
    new THREE.Vector3(0, 0, -12), new THREE.Vector3(10, 0, -9),
    new THREE.Vector3(16, 0, 0), new THREE.Vector3(12, 0, 10),
    new THREE.Vector3(0, 0, 14), new THREE.Vector3(-12, 0, 10),
    new THREE.Vector3(-16, 0, 0), new THREE.Vector3(-10, 0, -9),
  ]
  trainCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)

  const up = new THREE.Vector3(0, 1, 0)
  const N = 400, lPts: THREE.Vector3[] = [], rPts: THREE.Vector3[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N; const pt = trainCurve.getPointAt(t)
    const tan = trainCurve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up).normalize()
    lPts.push(pt.clone().addScaledVector(right, 0.72))
    rPts.push(pt.clone().addScaledVector(right, -0.72))
  }
  const rmat = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, metalness: 0.9, roughness: 0.2 })
  ;[new THREE.CatmullRomCurve3(lPts, true), new THREE.CatmullRomCurve3(rPts, true)].forEach(c => {
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 400, 0.035, 6), rmat))
  })
  const slMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95 })
  for (let i = 0; i < 160; i++) {
    const t = i / 160; const pt = trainCurve.getPointAt(t)
    const tan = trainCurve.getTangentAt(t).normalize()
    const right = new THREE.Vector3().crossVectors(tan, up)
    const sl = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.22), slMat)
    sl.position.copy(pt).setY(0.05)
    sl.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, up, tan.clone().negate()))
    scene.add(sl)
  }
}

function buildTrain() {
  trainGroup = new THREE.Group()
  const bmat = new THREE.MeshStandardMaterial({ color: 0x0d47a1, metalness: 0.65, roughness: 0.3 })
  const amat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.9, roughness: 0.15, emissive: 0x002233 })
  const dmat = new THREE.MeshStandardMaterial({ color: 0x111, metalness: 0.4 })

  ;[[-5.2, 4.2], [0, 4.2], [5.2, 3.8]].forEach(([xo, len], ui) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 1.55), bmat)
    body.position.set(xo, 0.6, 0); body.castShadow = true; trainGroup.add(body)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 1.56), amat)
    stripe.position.set(xo, 1.12, 0); trainGroup.add(stripe)
    if (ui === 0) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.5), bmat)
      cab.position.set(xo - len / 2 - 0.5, 1.05, 0); trainGroup.add(cab)
    }
    for (const dx of [-len / 2 + 0.8, len / 2 - 0.8]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 1.6), dmat)
      bogie.position.set(xo + dx, 0.14, 0)
      trainGroup.add(bogie)
      for (const side of [-0.83, 0.83]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.13, 20), dmat)
        w.rotation.x = Math.PI / 2; w.position.set(xo + dx, 0.3, side)
        trainGroup.add(w); trainWheels.push(w)
      }
    }
  })
  scene.add(trainGroup)
}

function buildEquipment() {
  const EQ_DATA = [
    { name: '多普勒测速仪 A1', status: '正常', pos: [-9, 0, -1.5] as [number, number, number], color: 0x1565c0, params: { '速度': '118.5 km/h', '精度': '±0.1', '频率': '100 Hz' } },
    { name: '进站信号机 R1', status: '正常', pos: [-13, 0, 2] as [number, number, number], color: 0x4527a0, params: { '状态': '绿灯开放', '闭塞': 'AB-1区间', '系统': 'CTCS-3' } },
    { name: '轨温传感器 B1', status: '告警', pos: [-3, 0, 0.5] as [number, number, number], color: 0xbf360c, params: { '温度': '72.3°C', '阈值': '70°C', '超限': '8min' } },
    { name: '踏面检测仪 D1', status: '正常', pos: [3, 0, -0.5] as [number, number, number], color: 0x00695c, params: { '过车': '1284辆', '异常': '0辆', '最近': '2min前' } },
    { name: '出站信号机 R2', status: '正常', pos: [13, 0, -2] as [number, number, number], color: 0x4527a0, params: { '状态': '黄灯注意', '闭塞': 'AB-2区间', '系统': 'CTCS-3' } },
    { name: '视频监控 C1', status: '正常', pos: [8, 0, 4] as [number, number, number], color: 0x2e7d32, params: { '分辨率': '4K 30fps', '存储': '68%', '在线': '127天' } },
  ]

  EQ_DATA.forEach(d => {
    const geoH = d.name.includes('信号') ? 4.5 : d.name.includes('摄像') ? 0.8 : 0.7
    const geo = d.name.includes('信号') ? new THREE.CylinderGeometry(0.06, 0.08, geoH, 8) : new THREE.BoxGeometry(0.6, geoH, 0.6)
    const mat = new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.6, roughness: 0.35 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...d.pos)
    mesh.position.y = geoH / 2 + 0.01
    mesh.castShadow = true; scene.add(mesh)
    mesh.userData.eqData = d

    // CSS2D label
    const el = document.createElement('div')
    const statusColor = d.status === '正常' ? '#69f0ae' : '#ffca28'
    el.style.cssText = `pointer-events:none;user-select:none;transform:translate(-50%,-130%);`
    el.innerHTML = `<div style="font-family:'PingFang SC',sans-serif;font-size:9px;font-weight:700;color:${statusColor};background:rgba(4,8,22,.82);border:1px solid ${statusColor}55;border-radius:3px;padding:2px 6px;white-space:nowrap;">● ${d.name}</div>`
    const lobj = new CSS2DObject(el)
    lobj.position.set(0, geoH + 0.2, 0)
    mesh.add(lobj)

    eqItems.push({ mesh, popup: null, name: d.name, status: d.status, params: d.params as unknown as Record<string, string> })
  })
}

function buildDataBars() {
  const positions: [number, number, number][] = [[-6, 0, 3], [-2, 0, 3.5], [2, 0, 3], [6, 0, 3.5]]
  const colors = [0x00e5ff, 0xff7043, 0x69f0ae, 0xffca28]
  positions.forEach(([x, y, z], i) => {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i], transparent: true, opacity: 0.7, emissive: colors[i], emissiveIntensity: 0.2 })
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), mat)
    bar.position.set(x, 0.5, z); bar.castShadow = true; scene.add(bar)
    dataBars.push({ bar, mat, phase: i * 1.2 })
  })
}

function createEqPopup(eq: EqItem): CSS2DObject {
  const el = document.createElement('div')
  el.style.cssText = 'transform:translate(-50%,calc(-100% - 14px));pointer-events:none;user-select:none;'
  const statusColor = eq.status === '正常' ? '#00e5ff' : '#ffca28'
  let paramHTML = Object.entries(eq.params).map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;gap:8px;"><span style="color:rgba(128,203,196,.55);font-size:10px;">${k}</span><span style="color:#e0f7fa;font-size:10px;font-weight:600;font-family:monospace;">${v}</span></div>`,
  ).join('')
  el.innerHTML = `
    <div style="background:rgba(4,8,20,.96);border:1px solid ${statusColor};border-radius:8px;padding:11px 14px;min-width:190px;
      box-shadow:0 0 20px ${statusColor}55;font-family:'PingFang SC',sans-serif;backdrop-filter:blur(10px);position:relative;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,${statusColor},transparent);margin-bottom:8px;animation:comp-scan 2s infinite;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="color:${statusColor};font-size:12px;font-weight:700;">${eq.name}</div>
        <div style="color:${eq.status === '正常' ? '#69f0ae' : '#ffca28'};font-size:10px;font-weight:600;">● ${eq.status}</div>
      </div>
      <div style="height:1px;background:rgba(255,255,255,.06);margin-bottom:7px;"></div>
      <div style="display:flex;flex-direction:column;gap:4px;">${paramHTML}</div>
      <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${statusColor};"></div>
    </div>`
  const obj = new CSS2DObject(el)
  const geo = eq.mesh.geometry as THREE.BufferGeometry
  const box3 = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute)
  obj.position.set(0, box3.max.y + 0.2, 0)
  return obj
}

const _up3 = new THREE.Vector3(0, 1, 0)
const _mat4 = new THREE.Matrix4()
const _q = new THREE.Quaternion()

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  injectStyle()
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(58, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.set(0, 18, 32)

  renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(1)
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

  const sz = new THREE.Vector2(container.clientWidth, container.clientHeight)
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  outlinePass = new OutlinePass(sz, scene, camera)
  outlinePass.edgeStrength = 4; outlinePass.edgeGlow = 1.2; outlinePass.edgeThickness = 2
  outlinePass.visibleEdgeColor.set('#00e5ff'); outlinePass.hiddenEdgeColor.set('#003355')
  composer.addPass(outlinePass)
  composer.addPass(new OutputPass())

  buildEnvironment()
  buildTrack()
  buildTrain()
  buildEquipment()
  buildDataBars()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.target.set(0, 1, 0)
  controls.maxPolarAngle = Math.PI / 2.05

  renderer.domElement.addEventListener('click', onCanvasClick)

  onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    labelRenderer.setSize(container.clientWidth, container.clientHeight)
    composer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function onCanvasClick(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const meshes = eqItems.map(e => e.mesh)
  const hits = raycaster.intersectObjects(meshes, false)
  if (hits.length > 0) {
    const eq = eqItems.find(e => e.mesh === hits[0].object)
    if (!eq) return
    if (selectedEq === eq) {
      // deselect
      if (eq.popup) { eq.popup.element.remove(); eq.mesh.remove(eq.popup); eq.popup = null }
      selectedEq = null; outlinePass.selectedObjects = []
    } else {
      if (selectedEq?.popup) { selectedEq.popup.element.remove(); selectedEq.mesh.remove(selectedEq.popup); selectedEq.popup = null }
      selectedEq = eq
      eq.popup = createEqPopup(eq)
      eq.mesh.add(eq.popup)
      outlinePass.selectedObjects = [eq.mesh]
    }
  } else {
    if (selectedEq?.popup) { selectedEq.popup.element.remove(); selectedEq.mesh.remove(selectedEq.popup); selectedEq.popup = null }
    selectedEq = null; outlinePass.selectedObjects = []
  }
}

export function setCameraMode(mode: 'overview' | 'follow' | 'station') {
  cameraMode = mode
  controls.enabled = mode !== 'follow'
  if (mode === 'overview') { camera.position.set(0, 18, 32); controls.target.set(0, 1, 0) }
  if (mode === 'station') { camera.position.set(0, 8, -3); controls.target.set(0, 3, -12) }
}

export function toggleLayer(key: keyof typeof layers, v: boolean) {
  layers[key] = v
  if (key === 'train') trainGroup.visible = v
  if (key === 'dataBars') dataBars.forEach(d => { d.bar.visible = v })
  if (key === 'equipment') eqItems.forEach(e => { e.mesh.visible = v })
}

function loop() {
  animId = requestAnimationFrame(loop)
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  // Train movement
  if (layers.train) {
    trainT = (trainT + delta * 0.05) % 1
    const pos = trainCurve.getPointAt(trainT)
    const lookPos = trainCurve.getPointAt((trainT + 0.015) % 1)
    trainGroup.position.set(pos.x, pos.y + 0.5, pos.z)
    const dir = new THREE.Vector3().subVectors(lookPos, pos).normalize()
    const right = new THREE.Vector3().crossVectors(dir, _up3)
    const up2 = new THREE.Vector3().crossVectors(right, dir)
    _mat4.makeBasis(right, up2, dir.clone().negate())
    _q.setFromRotationMatrix(_mat4)
    trainGroup.quaternion.slerp(_q, 0.15)
    trainWheels.forEach(w => { w.rotation.y += delta * 4 })

    if (cameraMode === 'follow') {
      const backDir = dir.clone().negate()
      const camPos = trainGroup.position.clone().addScaledVector(backDir, 10).add(new THREE.Vector3(0, 5, 0))
      camera.position.lerp(camPos, 0.05)
      camera.lookAt(trainGroup.position)
      controls.target.lerp(trainGroup.position, 0.05)
    }
  }

  // Data bars
  if (layers.dataBars) {
    dataBars.forEach(d => {
      const v = 0.3 + Math.abs(Math.sin(elapsed * 0.6 + d.phase)) * 3.5
      d.bar.scale.y += (v - d.bar.scale.y) * Math.min(delta * 2, 1)
      d.bar.position.y = d.bar.scale.y * 0.5
      d.mat.emissiveIntensity = 0.1 + d.bar.scale.y / 4 * 0.4
    })
  }

  controls.update()
  composer.render()
  labelRenderer.render(scene, camera)
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.domElement.removeEventListener('click', onCanvasClick)
  styleEl?.remove()
  eqItems.forEach(e => { if (e.popup) { e.popup.element.remove() } })
  eqItems.length = 0; dataBars.length = 0; trainWheels.length = 0
  controls.dispose(); composer.dispose(); renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  labelRenderer.domElement.parentElement?.removeChild(labelRenderer.domElement)
}
