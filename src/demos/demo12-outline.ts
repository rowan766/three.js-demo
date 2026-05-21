import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
let controls: OrbitControls, clock: THREE.Clock, animId: number, onResize: () => void
let composer: EffectComposer, outlinePass: OutlinePass, fxaaPass: ShaderPass
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const selectableObjects: THREE.Object3D[] = []
let selectedObjects: THREE.Object3D[] = []

export const outlineParams = {
  edgeStrength: 3,
  edgeGlow: 1,
  edgeThickness: 2,
  visibleEdgeColor: '#00e5ff',
  hiddenEdgeColor: '#003355',
}

// Scene objects metadata
const OBJECTS = [
  { name: '高速动车组 CR400AF', geo: () => buildTrain(0x0d47a1), pos: [-5, 0.8, 0] as [number,number,number] },
  { name: '变电所主变压器', geo: () => buildBox(0x37474f, 1.2, 1.8, 0.8), pos: [3, 0.9, -2] as [number,number,number] },
  { name: '接触网支柱 #01', geo: () => buildPole(0x607d8b), pos: [-9, 0, -2] as [number,number,number] },
  { name: '接触网支柱 #02', geo: () => buildPole(0x607d8b), pos: [9, 0, 2] as [number,number,number] },
  { name: '应急操作台', geo: () => buildBox(0x1a237e, 1.5, 0.9, 0.7), pos: [6, 0.45, 2] as [number,number,number] },
  { name: '轨道传感器阵列', geo: () => buildBox(0x004d40, 2.4, 0.15, 0.3), pos: [0, 0.075, 0] as [number,number,number] },
]

function buildTrain(color: number): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 })
  const am = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.9, roughness: 0.15 })
  ;[
    [new THREE.BoxGeometry(4.5, 1.2, 1.6), mat, [0, 0, 0]],
    [new THREE.BoxGeometry(1.2, 1.0, 1.5), mat, [-1.4, 1.1, 0]],
    [new THREE.BoxGeometry(4.5, 0.07, 1.61), am, [0, 0.63, 0]],
  ].forEach(([geo, m, pos]) => {
    const mesh = new THREE.Mesh(geo as THREE.BufferGeometry, m as THREE.Material)
    mesh.position.set(...(pos as [number, number, number]))
    g.add(mesh)
  })
  g.traverse(c => { if (c instanceof THREE.Mesh) c.castShadow = true })
  return g
}

function buildBox(color: number, w: number, h: number, d: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 }),
  )
  m.castShadow = true
  return m
}

function buildPole(color: number): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.4 })
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 8), mat))
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.06), mat)
  top.position.y = 3
  g.add(top)
  return g
}

export function init(container: HTMLElement) {
  clock = new THREE.Clock()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060c14)

  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 18)

  renderer = new THREE.WebGLRenderer({ antialias: false }) // FXAA handles AA
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(1)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0x223355, 2))
  const dir = new THREE.DirectionalLight(0xffffff, 3)
  dir.position.set(8, 15, 8)
  dir.castShadow = true
  dir.shadow.mapSize.set(1024, 1024)
  scene.add(dir)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x0a1628, roughness: 0.9 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  scene.add(new THREE.GridHelper(50, 50, 0x00e5ff08, 0x00e5ff05))

  // Build scene objects
  OBJECTS.forEach(({ geo, pos }) => {
    const obj = geo()
    obj.position.set(...pos)
    scene.add(obj)
    selectableObjects.push(obj)
  })

  // EffectComposer setup
  const sz = new THREE.Vector2(container.clientWidth, container.clientHeight)
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  outlinePass = new OutlinePass(sz, scene, camera)
  applyOutlineParams()
  composer.addPass(outlinePass)

  fxaaPass = new ShaderPass(FXAAShader)
  fxaaPass.uniforms['resolution'].value.set(1 / container.clientWidth, 1 / container.clientHeight)
  composer.addPass(fxaaPass)

  composer.addPass(new OutputPass())

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 1, 0)

  renderer.domElement.addEventListener('click', onClick)

  onResize = () => {
    const w = container.clientWidth, h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
    fxaaPass.uniforms['resolution'].value.set(1 / w, 1 / h)
    outlinePass.resolution = new THREE.Vector2(w, h)
  }
  window.addEventListener('resize', onResize)
  loop()
}

function applyOutlineParams() {
  outlinePass.edgeStrength = outlineParams.edgeStrength
  outlinePass.edgeGlow = outlineParams.edgeGlow
  outlinePass.edgeThickness = outlineParams.edgeThickness
  outlinePass.visibleEdgeColor.set(outlineParams.visibleEdgeColor)
  outlinePass.hiddenEdgeColor.set(outlineParams.hiddenEdgeColor)
}

function onClick(e: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(selectableObjects, true)

  if (hits.length > 0) {
    let root = hits[0].object
    while (root.parent && root.parent !== scene) root = root.parent
    const shiftHeld = (e as MouseEvent).shiftKey

    if (shiftHeld) {
      const idx = selectedObjects.indexOf(root)
      if (idx >= 0) selectedObjects.splice(idx, 1)
      else selectedObjects.push(root)
    } else {
      selectedObjects = selectedObjects.includes(root) && selectedObjects.length === 1 ? [] : [root]
    }
    outlinePass.selectedObjects = selectedObjects
  } else if (!(e as MouseEvent).shiftKey) {
    selectedObjects = []
    outlinePass.selectedObjects = []
  }
}

export function getSelectedNames(): string[] {
  return selectedObjects.map(o => {
    const idx = selectableObjects.indexOf(o)
    return idx >= 0 ? OBJECTS[idx].name : o.name
  })
}

export function setOutlineParam(key: keyof typeof outlineParams, value: number | string) {
  (outlineParams as Record<string, number | string>)[key] = value
  applyOutlineParams()
}

export function clearSelection() {
  selectedObjects = []
  outlinePass.selectedObjects = []
}

function loop() {
  animId = requestAnimationFrame(loop)
  controls.update()
  composer.render()
}

export function update(_delta: number) {}

export function dispose() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer.domElement.removeEventListener('click', onClick)
  controls.dispose()
  composer.dispose()
  renderer.dispose()
  renderer.domElement.parentElement?.removeChild(renderer.domElement)
  selectableObjects.length = 0
  selectedObjects = []
}
