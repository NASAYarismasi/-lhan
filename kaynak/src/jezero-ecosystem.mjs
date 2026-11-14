import * as T from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { addSurface, createFirstPerson } from "./mars-fps.mjs"
import { moduleModel } from "./mars-models.mjs"
const el = id => document.getElementById(id)
const format = new Intl.NumberFormat("tr-TR", {maximumFractionDigits:1})
function updateBalance() {
  const days = Number(el("days").value)
  const recovery = Number(el("recovery").value)
  const totalOxygen = 3 * days * .84
  const byElectrolysis = el("electrolysis").checked
  const water = 3 * days * 3.52 * (1 - recovery / 100) + (byElectrolysis ? totalOxygen * 9 / 8 : 0)
  el("days-value").value = days + " Dünya günü"
  el("recovery-value").value = "%" + recovery
  el("water").textContent = format.format(water) + " kg"
  el("oxygen").textContent = format.format(byElectrolysis ? 0 : totalOxygen) + " kg"
  el("food").textContent = format.format(3 * days * 3035) + " kcal"
}
for (const id of ["days","recovery","electrolysis"]) el(id).addEventListener("input",updateBalance)
updateBalance()

async function showScene() {
  const renderer = new T.WebGLRenderer({canvas:el("scene"),antialias:true})
  renderer.setPixelRatio(Math.min(1.65,devicePixelRatio))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  const scene = new T.Scene()
  scene.background = new T.Color(0x231d1a)
  scene.fog = new T.FogExp2(0x59463d,.0027)
  const camera = new T.PerspectiveCamera(44,1,.1,850)
  const controls = new OrbitControls(camera,renderer.domElement)
  controls.enableDamping = true
  controls.minDistance = 6
  controls.maxDistance = 240
  controls.maxPolarAngle = Math.PI / 2 - .035
  scene.add(new T.HemisphereLight(0xe3cfc0,0x775c4b,.44))
  const sun = new T.DirectionalLight(0xffebd3,3.9)
  sun.position.set(-70,19,22)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048,2048)
  Object.assign(sun.shadow.camera,{left:-72,right:72,top:60,bottom:-60,near:1,far:170})
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.normalBias = .045
  scene.add(sun)
  const ground = addSurface(scene,"data:image/webp;base64," + el("ortho").textContent.trim(),{craterRelief:true})
  ground.castShadow = true
  const ray = new T.Raycaster()
  const down = new T.Vector3(0,-1,0)
  const probe = new T.Vector3()
  const obstacles = []
  function heightAt(x,z) {
    ray.set(probe.set(x,40,z),down)
    return ray.intersectObject(ground,false)[0]?.point.y ?? 0
  }
  function place(item,x,z,angle=0) {
    item.position.set(x,heightAt(x,z),z)
    item.rotation.y=angle
    item.traverse(mesh=>{
      if(mesh.isMesh&&!mesh.userData.noShadow) mesh.castShadow=mesh.receiveShadow=true
    })
    scene.add(item)
    obstacles.push(new T.Box3().setFromObject(item).expandByScalar(.28))
    return item
  }
  const poses = {
    panorama:[[40,24,54],[0,-.2,-14]],
    base:[[13,4.5,17],[0,1.4,0]],
    study:[[20,5,3],[8,.9,-4]],
  }
  let currentView = "panorama"
  const fps = createFirstPerson(renderer.domElement,camera,{
    groundY: heightAt,
    collides(x,z) {
      return Math.abs(x)>59 || Math.abs(z)>59 || obstacles.some(box =>
        x>box.min.x && x<box.max.x && z>box.min.z && z<box.max.z)
    },
    onMode(active) {
      controls.enabled = !active
      el("fps-toggle").setAttribute("aria-pressed",String(active))
      el("fps-toggle").textContent = active ? "Genel görünüme dön" : "Astronotun gözünden gez"
      el("camera-help").textContent = active
        ? "WASD ile yürü. Sahneye tıklayıp fareyle veya ok tuşlarıyla bak. Esc ile geri dön."
        : "Fareyle sürükleyerek bak, tekerlekle yaklaş."
      for (const button of el("views").querySelectorAll("[data-view]")) {
        button.setAttribute("aria-pressed",String(!active && button.dataset.view===currentView))
      }
    },
  })
  el("fps-toggle").disabled = false
  el("fps-toggle").addEventListener("click",()=>{
    if (!fps.active) fps.respawn({x:1.5,z:12})
    fps.setActive(!fps.active)
  })
  function view(id) {
    fps.setActive(false)
    currentView = id
    const [position,target]=poses[id]
    camera.position.fromArray(position)
    controls.target.fromArray(target)
    controls.update()
    for(const button of el("views").querySelectorAll("[data-view]")) button.setAttribute("aria-pressed",String(button.dataset.view===id))
  }
  el("views").addEventListener("click",event=>{if(event.target.dataset.view)view(event.target.dataset.view)})
  view("panorama")
  const observer=new ResizeObserver(()=>{
    const host=el("viewport")
    if(!host.clientWidth||!host.clientHeight)return
    renderer.setSize(host.clientWidth,host.clientHeight,false)
    camera.aspect=host.clientWidth/host.clientHeight
    camera.updateProjectionMatrix()
  })
  observer.observe(el("viewport"))
  let lastFrame
  renderer.setAnimationLoop(time=>{
    const delta = Math.min(.05,(time-(lastFrame ?? time))/1000)
    lastFrame = time
    if (fps.active) fps.update(delta)
    else controls.update()
    renderer.render(scene,camera)
  })
  place(moduleModel("greenhouse"),8,-6)
  place(moduleModel("treePod"),11,-7)
  place(moduleModel("waterRecycler"),7,-2,.4)
  place(moduleModel("airScrubber"),-4,-3)
  place(moduleModel("oxygenUnit"),-7,-3)
  for(const x of [-12,-8,-4]) place(moduleModel("solarPanel"),x,6,.33)
  const bytes=id=>Uint8Array.from(atob(el(id).textContent.trim()),c=>c.charCodeAt(0)).buffer
  const js=URL.createObjectURL(new Blob([el("decoder").textContent],{type:"text/javascript"}))
  const wasm=URL.createObjectURL(new Blob([bytes("wasm")],{type:"application/wasm"}))
  const draco=new DRACOLoader().setDecoderPath({js,wasm})
  const loader=new GLTFLoader().setDRACOLoader(draco)
  try {
    const models=await Promise.allSettled([["habitat",7,0,0,.16],["rover",3,-11,-7,-.48]].map(async ([id,width,x,z,yaw])=>{
      const {scene:model}=await loader.parseAsync(bytes(id),"")
      const box=new T.Box3().setFromObject(model)
      const size=box.getSize(new T.Vector3())
      const center=box.getCenter(new T.Vector3())
      const scale=width/Math.max(size.x,size.z)
      model.scale.multiplyScalar(scale)
      model.position.multiplyScalar(scale).add(new T.Vector3(-center.x*scale,-box.min.y*scale,-center.z*scale))
      const group=new T.Group()
      group.add(model)
      place(group,x,z,yaw)
    }))
    el("scene-status").textContent=models.every(model=>model.status==="fulfilled")?"":"Bazı NASA modelleri yüklenemedi."
  } finally {
    draco.dispose()
    URL.revokeObjectURL(js)
    URL.revokeObjectURL(wasm)
  }
}
showScene().catch(error=>{console.error(error);el("scene-status").textContent="3B arazi açılamadı. WebGL destekleyen bir tarayıcı kullan."})
