import * as T from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { moduleModel } from "./mars-models.mjs"
import { addSurface, createFirstPerson, placeholderAstronaut } from "./mars-fps.mjs"
import { createWristTerminal } from "./mars-wrist.mjs"
import { cargoOptions, defaultManifest, planMission, cargoLimitKg, transitDays } from "./mars-gorev-plani.mjs"
import { materialNames, nodes, crops, recipes, levelOf, startWorkshop, recipeError,
  craft, collect, grow, harvest, replant, sell } from "./mars-atolye.mjs"
import { modules, roles, exampleLanding, missionLength, createColony, createColonyFromFlight,
  footprints, roofSize, siteRadius, worldPlacement,
  placementError, placeModule, assignAstronaut, advanceSol, colonyReport } from "./mars-koloni.mjs"

const byId = id => document.getElementById(id)
const status = byId("message")
const viewport = byId("viewport")
const canvas = byId("scene")
let state = createColony(exampleLanding)
let flightLanding
let activeMissionPlan
let workshop = startWorkshop()
let selected = state.inventory[0]?.id
let playerId = state.crew[0].id
let sceneView
let lastReport = colonyReport(state)
const labels = { habitat: "Yaşam alanı", water: "Su", oxygen: "Oksijen", food: "Yiyecek", cleanAir: "CO₂ giderimi" }

const pick = position => {
  const issue = placementError(state, selected, position)
  if (issue) { status.textContent = issue; return }
  const name = modules[state.inventory.find(item => item.id === selected).type].name
  state = placeModule(state, selected, position)
  selected = state.inventory[0]?.id
  update()
  const surface = position.supportId ? "Çatı" : "Zemin"
  const number = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  status.textContent = name + " sıraya alındı. " + surface + " · X " + number.format(position.x) +
    " m · Z " + number.format(position.z) + " m."
}

function makeScene() {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  const scene = new T.Scene()
  const clearSky = new T.Color(0xb99d8f)
  const stormSky = new T.Color(0x916953)
  scene.fog = new T.FogExp2(clearSky, .005)
  const sky = new T.Mesh(new T.SphereGeometry(275, 40, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { horizon: { value: clearSky.clone() }, upper: { value: new T.Color(0x796553) } },
    vertexShader: "varying vec3 dir; void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "varying vec3 dir; uniform vec3 horizon; uniform vec3 upper; void main(){float h=smoothstep(0.,.68,normalize(dir).y); gl_FragColor=vec4(mix(horizon,upper,h),1.);\n#include <colorspace_fragment>\n}",
  }))
  scene.add(sky)
  const camera = new T.PerspectiveCamera(41, 1, .055, 300)
  scene.add(camera)
  let wrist
  let wristRaised = false
  try {
    wrist = createWristTerminal(camera, decode("team-wrist-data").buffer)
  } catch (error) {
    byId("wrist").disabled = true
    console.warn(error)
  }
  camera.position.set(29, 35, 35)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.35
  controls.minDistance = 18
  controls.maxDistance = 93
  const ambient = new T.HemisphereLight(0xffeadb, 0x8b796c, 1.35)
  scene.add(ambient)
  const sun = new T.DirectionalLight(0xffe2ca, 2.15)
  sun.position.set(-32, 22, 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 82 })
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.normalBias = .035
  scene.add(sun)
  const ground = addSurface(scene, "data:image/webp;base64," + byId("ortho-data").textContent.trim())
  const groundRay = new T.Raycaster()
  const above = new T.Vector3()
  const down = new T.Vector3(0, -1, 0)
  function groundY(x, z) {
    above.set(x, 20, z)
    groundRay.set(above, down)
    return groundRay.intersectObject(ground, false)[0]?.point.y ?? 0
  }
  const roofGeometry = new T.BoxGeometry(roofSize.x * 2, .15, roofSize.z * 2)
  const roofMaterial = new T.MeshStandardMaterial({ color: 0x747875, metalness: .35, roughness: .68 })
  const roofMark = new T.MeshBasicMaterial({ color: 0xdfab5d, polygonOffset: true, polygonOffsetFactor: -1 })
  const railLong = new T.BoxGeometry(roofSize.x * 2, .025, .035)
  const railShort = new T.BoxGeometry(.035, .025, roofSize.z * 2)
  const postGeometry = new T.BoxGeometry(.085, 1, .085)
  const foundationGeometry = new T.BoxGeometry(1, 1, 1)
  let habitatAsset
  let panelAsset
  let roofHeight = 2.16

  const objects = new T.Group()
  const deposits = new T.Group()
  const depositMeshes = new Map()
  const oreMaterial = new T.MeshStandardMaterial({ color: 0xaa7959, roughness: .86 })
  const iceMaterial = new T.MeshStandardMaterial({ color: 0x8cb0b9, roughness: .48 })
  for (const node of nodes) {
    const rock = new T.Mesh(new T.DodecahedronGeometry(.64, 1),
      node.material === "ice" ? iceMaterial : oreMaterial)
    rock.position.set(node.x, groundY(node.x, node.z) + .4, node.z)
    rock.scale.set(1.24, .57, .94)
    rock.rotation.y = node.x
    rock.userData.deposit = node
    rock.castShadow = true
    depositMeshes.set(node.id, rock)
    deposits.add(rock)
  }
  const reference = new T.Group()
  reference.position.set(-9.5, .02, 4)
  reference.rotation.y = -.38
  scene.add(objects, deposits, reference)
  const crewModels = new Map()
  const loadedCharacters = new Set()
  let teamCharacter
  const crewColors = [0xd9d2bf, 0xb88052, 0xa9b9c2]
  const faceData = byId("face-data").textContent.trim()
  const faceTexture = faceData ? new T.TextureLoader().load("data:image/png;base64," + faceData) : null
  if (faceTexture) faceTexture.colorSpace = T.SRGBColorSpace
  state.crew.forEach((person, index) => {
    const actor = new T.Group()
    actor.position.set([-6, -2, 6][index], 0, 12.8)
    actor.position.y = groundY(actor.position.x, actor.position.z)
    actor.rotation.y = faceTexture ? -1.02 : 0
    actor.add(placeholderAstronaut(crewColors[index], faceTexture))
    scene.add(actor)
    crewModels.set(index, actor)
  })
  const models = new Map()
  function model(type) {
    if (!models.has(type)) models.set(type, (type === "habitat" && habitatAsset) ||
      (type === "solarPanel" && panelAsset) || moduleModel(type))
    return models.get(type).clone()
  }
  const roofs = new Map()
  const preview = new T.Group()
  scene.add(preview)
  let dragStart
  let lastPointer
  const ray = new T.Raycaster()
  const pointer = new T.Vector2()
  const aimLabel = byId("aim")
  const groundObstacles = []
  const hardware = []
  const marker = new T.Mesh(new T.RingGeometry(.17, .23, 24),
    new T.MeshBasicMaterial({ color: 0x9cf2bd, side: T.DoubleSide, depthTest: false }))
  marker.rotation.x = -Math.PI / 2
  marker.visible = false
  marker.renderOrder = 10
  scene.add(marker)
  const outline = new T.Box3Helper(new T.Box3(), 0xa5f6bf)
  outline.visible = false
  outline.material.depthTest = false
  outline.renderOrder = 10
  scene.add(outline)
  let previewType
  let localPreviewBounds
  let roofAccess
  function occupied(x, z, buffer = 0) {
    return groundObstacles.some(area =>
      Math.abs(x - area.x) < area.halfX + buffer && Math.abs(z - area.z) < area.halfZ + buffer)
  }
  function collides(x, z) {
    if (roofAccess) return true
    if (Math.abs(x) > siteRadius || Math.abs(z) > siteRadius || occupied(x, z, .31)) return true
    for (const actor of crewModels.values()) {
      if (actor.visible && Math.hypot(x - actor.position.x, z - actor.position.z) < .63) return true
    }
    return false
  }

  function targetAt(event) {
    if (event) {
      const bounds = canvas.getBoundingClientRect()
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
        1 - (event.clientY - bounds.top) / bounds.height * 2)
    } else pointer.set(0, 0)
    camera.updateMatrixWorld()
    ray.setFromCamera(pointer, camera)
    const hits = ray.intersectObjects([ground, objects, deposits, ...hardware.filter(asset => asset.visible)], true)
    const hit = hits.find(hit => hit.object.visible)
    if (!hit || (fps.active && hit.distance > 14)) return null
    if (hit.object.userData.deposit) {
      return { deposit: hit.object.userData.deposit, distance: hit.distance }
    }
    let owner = hit.object
    while (owner && !owner.userData.module && owner !== scene) owner = owner.parent
    const item = owner?.userData.module
    const surface = hit.object.userData.roofId && hit.point.y >= hit.object.userData.top - .02
      ? "roof" : hit.object === ground ? "ground" : "blocked"
    return { item, surface, position: { x: hit.point.x, z: hit.point.z, supportId: hit.object.userData.roofId }, y: hit.point.y }
  }

  function inspect(target) {
    if (!target) return { error: "Kurulum için uygun bir yüzeye bak." }
    if (target.surface === "blocked") return { error: "Zemini veya yaşam modülünün üstündeki montaj alanını hedefle." }
    const error = placementError(state, selected, target.position)
    if (error) return { error }
    const type = state.inventory.find(item => item.id === selected).type
    const { x, z, supportId } = target.position
    const size = footprints[type]
    if (!supportId) {
      if (hardware.some(asset => asset.visible && Math.abs(x - asset.position.x) < size.x + asset.userData.radius &&
        Math.abs(z - asset.position.z) < size.z + asset.userData.radius)) return { error: "NASA aracına çok yakın." }
      if (nodes.some(node => Math.abs(x - node.x) < size.x + .7 && Math.abs(z - node.z) < size.z + .7)) {
        return { error: "Kaynak yatağının çevresini açık bırak." }
      }
      if (fps.active && Math.abs(camera.position.x - x) < size.x + .31 &&
          Math.abs(camera.position.z - z) < size.z + .31) return { error: "Yerleştirmek için bir adım geri çık." }
      if ([...crewModels.values()].some(actor => actor.visible &&
          Math.abs(actor.position.x - x) < size.x + .3 && Math.abs(actor.position.z - z) < size.z + .3)) {
        return { error: "Bu noktada bir astronot var." }
      }
      return { y: foundationHeight(x, z, size), type }
    }
    return { y: roofs.get(supportId).userData.top, type }
  }

  function drawTarget(target) {
    const deposit = target?.deposit
    const crop = crops[target?.item?.type]
    const candidate = inspect(deposit ? null : target)
    const show = Boolean(target && selected && !deposit)
    marker.visible = show
    outline.visible = show && !candidate.error
    if (show) {
      const { x, z } = target.position
      marker.position.set(x, target.y + .035, z)
      marker.material.color.setHex(candidate.error ? 0xf79580 : 0xa5f6bf)
      if (!candidate.error) {
        if (previewType !== candidate.type || !preview.children.length) {
          preview.clear()
          const ghost = model(candidate.type)
          ghost.traverse(part => {
            if (!part.isMesh) return
            part.material = ghostMaterial
          })
          preview.add(ghost)
          previewType = candidate.type
          preview.position.set(0, 0, 0)
          preview.updateMatrixWorld(true)
          localPreviewBounds = new T.Box3().setFromObject(ghost)
        }
        preview.position.set(x, candidate.y + .008, z)
        preview.updateMatrixWorld(true)
        outline.box.copy(localPreviewBounds).translate(preview.position)
      }
    }
    preview.visible = outline.visible
    if (fps.active) {
      const canAccess = target?.item?.type === "habitat" && !roofAccess
      const label = deposit
        ? materialNames[deposit.material] + (target.distance > 8 ? " · Yaklaş" : " · E ile topla")
        : crop ? modules[target.item.type].name + " · " +
          (workshop.growing[target.item.id] === null ? "E ile yeni dönem başlat" :
            workshop.growing[target.item.id] >= crop.sols ? "E ile hasat et" :
            (workshop.growing[target.item.id] ?? 0) + "/" + crop.sols + " üretim solu")
        : target?.item && (target.surface === "blocked" || !selected)
        ? modules[target.item.type].name + (canAccess ? " · R ile çatı görüşü" : "")
        : show ? candidate.error ?? (target.position.supportId ? "E · Çatıya monte et" : "E · Zemine yerleştir") : ""
      if (aimLabel.textContent !== label) aimLabel.textContent = label
    }
  }

  function commit(target) {
    if (target?.deposit) {
      if (fps.active && target.distance > 8) {
        status.textContent = "Toplamak için yatağa yaklaş."
        return
      }
      workshopAction(() => {
        workshop = collect(workshop, target.deposit.id, state.sol)
        return "+" + target.deposit.amount + " " + materialNames[target.deposit.material] + " · +2 madencilik XP"
      })
      return
    }
    if (crops[target?.item?.type]) {
      tendCrop(target.item)
      return
    }
    if (!selected) return
    const candidate = inspect(target)
    if (candidate.error) { status.textContent = candidate.error; return }
    pick(target.position)
  }

  const ghostMaterial = new T.MeshBasicMaterial({ color: 0x7cf6c4, transparent: true, opacity: .32,
    depthWrite: false })
  const fps = createFirstPerson(canvas, camera, {
    onMode(active) {
      if (!active) setWrist(false)
      roofAccess = undefined
      controls.enabled = !active
      viewport.classList.toggle("fps", active)
      byId("view-mode").textContent = active ? "Üs planına dön" : "Astronotun gözünden gez"
      byId("view-help").textContent = active
        ? "WASD ile yürü · E ile yerleştir · Yaşam modülüne bakıp R ile çatıya eriş · Esc ile çık"
        : "Modülü seç ve zeminde veya çatıda istediğin noktaya tıkla · Sürükleyerek döndür"
      lastPointer = undefined
      redrawScene()
    },
    onAim: () => drawTarget(targetAt()),
    interact: () => commit(targetAt()),
    accessRoof(lookFrom) {
      if (roofAccess) {
        lookFrom(roofAccess, -.22)
        roofAccess = undefined
        return
      }
      const target = targetAt()
      const roof = target?.item?.type === "habitat" && roofs.get(target.item.id)
      if (!roof) {
        status.textContent = "Çatıya erişmek için yaşam modülüne yaklaş ve bak."
        return
      }
      roofAccess = camera.position.clone()
      const { x, z } = worldPlacement(target.item)
      lookFrom(new T.Vector3(x, roof.userData.top + 1.67, z), -1.47)
      status.textContent = "Nişanı çatıda istediğin noktaya getir. E ile yerleştir, R ile in."
    },
    collides,
    groundY,
  })
  function setWrist(raised) {
    wristRaised = Boolean(wrist && raised)
    byId("wrist").setAttribute("aria-pressed", String(wristRaised))
  }
  function toggleWrist() {
    if (!wrist) return
    if (!fps.active) {
      fps.respawn(crewModels.get(state.crew.findIndex(person => person.id === playerId)).position)
      fps.setActive(true)
    }
    setWrist(!wristRaised)
    canvas.focus({ preventScroll: true })
  }
  document.addEventListener("keydown", event => {
    if (!event.repeat && event.code === "AltLeft" && (document.activeElement === canvas || document.pointerLockElement === canvas)) {
      event.preventDefault()
      toggleWrist()
    }
  })
  canvas.addEventListener("pointermove", event => {
    if (fps.active) return
    lastPointer = event
    drawTarget(targetAt(event))
  })
  canvas.addEventListener("pointerleave", () => {
    if (!fps.active) { lastPointer = undefined; drawTarget(null) }
  })
  canvas.addEventListener("pointerdown", event => { dragStart = [event.clientX, event.clientY] })
  canvas.addEventListener("pointerup", event => {
    if (fps.active || event.button !== 0 || !dragStart || Math.hypot(event.clientX - dragStart[0], event.clientY - dragStart[1]) > 5) return
    commit(targetAt(event))
  })
  const observer = new ResizeObserver(() => {
    const { clientWidth, clientHeight } = viewport
    if (!clientWidth || !clientHeight) return
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(clientWidth, clientHeight, false)
  })
  observer.observe(viewport)
  let previousTime
  renderer.setAnimationLoop(time => {
    const delta = Math.min(.05, (time - (previousTime ?? time)) / 1000)
    previousTime = time
    if (fps.active) fps.update(delta)
    else controls.update()
    wrist?.frame(delta, fps.active && wristRaised)
    sky.position.copy(camera.position)
    renderer.render(scene, camera)
  })

  function redrawScene() {
    const playerIndex = state.crew.findIndex(person => person.id === playerId)
    byId("helmet").textContent = "Astronot " + (playerIndex + 1) + " · Sağlık %" + state.crew[playerIndex].health
    const storm = Boolean(state.timeline.at(-1)?.storm)
    const horizon = storm ? stormSky : clearSky
    sky.material.uniforms.horizon.value.copy(horizon)
    sky.material.uniforms.upper.value.setHex(storm ? 0x745442 : 0x796553)
    scene.fog.color.copy(horizon)
    scene.fog.density = storm ? .045 : .005
    sun.intensity = storm ? .62 : 2.15
    ambient.intensity = storm ? 1.05 : 1.35
    objects.clear()
    for (const node of nodes) depositMeshes.get(node.id).visible = workshop.collected[node.id] !== state.sol
    roofs.clear()
    groundObstacles.length = 0
    for (const asset of hardware.filter(asset => asset.visible)) groundObstacles.push({ x: asset.position.x, z: asset.position.z,
      halfX: asset.userData.radius, halfZ: asset.userData.radius })
    for (const item of state.placed) {
      const { x, z, supportId } = worldPlacement(item)
      const unit = model(item.type)
      const size = footprints[item.type]
      const roof = supportId && roofs.get(supportId)
      const y = roof ? roof.userData.top : foundationHeight(x, z, size)
      unit.position.set(x, y, z)
      unit.userData.module = item
      if (!supportId) {
        for (const side of [-1, 1]) for (const back of [-1, 1]) {
          const dx = side * size.x * .74
          const dz = back * size.z * .74
          const terrainY = groundY(x + dx, z + dz)
          const length = Math.max(.06, y - terrainY)
          const foot = new T.Mesh(foundationGeometry, roofMaterial)
          foot.scale.set(.18, length, .18)
          foot.position.set(dx, -length / 2 + .01, dz)
          foot.castShadow = true
          unit.add(foot)
        }
      }
      unit.traverse(part => {
        if (part.isMesh) {
          part.castShadow = !part.userData.noShadow
          part.receiveShadow = !part.userData.noShadow
        }
      })
      const plants = unit.getObjectByName("plants")
      if (plants) {
        plants.visible = item.type === "treePod" || workshop.growing[item.id] !== null
        plants.scale.setScalar(.38 + .62 * (workshop.growing[item.id] ?? 0) / crops[item.type].sols)
      }
      objects.add(unit)
      if (!supportId) groundObstacles.push({ x, z, halfX: size.x, halfZ: size.z })
      if (item.type === "habitat") {
        const mount = new T.Mesh(roofGeometry, roofMaterial)
        mount.position.y = roofHeight + .075
        mount.castShadow = mount.receiveShadow = true
        mount.userData = { roofId: item.id, top: y + roofHeight + .15 }
        unit.add(mount)
        roofs.set(item.id, mount)
        for (const side of [-1, 1]) {
          const edgeX = new T.Mesh(railShort, roofMark)
          edgeX.position.set(side * (roofSize.x - .04), roofHeight + .151, 0)
          const edgeZ = new T.Mesh(railLong, roofMark)
          edgeZ.position.set(0, roofHeight + .151, side * (roofSize.z - .04))
          // Edge markings are visual only. Raycasting must reach the mount.
          edgeX.raycast = edgeZ.raycast = () => {}
          unit.add(edgeX, edgeZ)
          for (const back of [-1, 1]) {
            const post = new T.Mesh(postGeometry, roofMaterial)
            post.scale.y = roofHeight
            post.position.set(side * 1.35, roofHeight / 2, back * 1.35)
            post.castShadow = true
            unit.add(post)
          }
        }
      }
    }
    state.crew.forEach((person, index) => {
      crewModels.get(index).visible = person.health > 0 && (!fps.active || person.id !== playerId)
    })
    wrist?.draw(state, lastReport)
    scene.updateMatrixWorld(true)
    preview.clear()
    drawTarget(fps.active ? targetAt() : lastPointer ? targetAt(lastPointer) : null)
  }

  function foundationHeight(x, z, size) {
    return Math.max(groundY(x, z), ...[-1, 1].flatMap(a =>
      [-1, 1].map(b => groundY(x + a * size.x, z + b * size.z)))) + .006
  }

  async function loadNASA() {
    const targets = [
      ["habitat-data", gltf => {
        habitatAsset = fitModel(gltf.scene, 5.12)
        roofHeight = new T.Box3().setFromObject(habitatAsset).max.y + .16
        models.delete("habitat")
      }],
      ["insight-data", gltf => {
        const leftPanel = gltf.scene.getObjectByName("panel_l_root")
        if (!leftPanel) throw new Error("InSight solar array missing")
        gltf.scene.updateMatrixWorld(true)
        const detached = leftPanel.clone()
        leftPanel.matrixWorld.decompose(detached.position, detached.quaternion, detached.scale)
        panelAsset = fitModel(detached, 2.18)
        models.delete("solarPanel")
        const lander = fitModel(gltf.scene, 6)
        lander.position.set(9.5, groundY(9.5, -6), -6)
        lander.rotation.y = .3
        lander.userData.radius = 3
        scene.add(lander)
        hardware.push(lander)
      }],
      ["ingenuity-data", gltf => {
        const helicopter = fitModel(gltf.scene, 1.2)
        helicopter.position.set(-6.5, groundY(-6.5, .5), .5)
        helicopter.rotation.y = .63
        helicopter.userData.radius = .68
        scene.add(helicopter)
        hardware.push(helicopter)
      }],
      ["team-crew-data", gltf => {
        teamCharacter = fitCharacter(gltf.scene)
        for (const [index, actor] of crewModels) {
          if (loadedCharacters.has(index)) continue
          actor.clear()
          actor.add(teamCharacter.clone())
        }
        byId("character-status").textContent = "Emre’nin uçuş modelindeki NASA astronotu kullanılıyor."
      }],
    ]
    const results = await Promise.allSettled(targets.map(async ([id, apply]) =>
      apply(await parseModel(decode(id).buffer))))
    redrawScene()
    byId("nasa-status").textContent = results.every(item => item.status === "fulfilled")
      ? "NASA modelleri sahnede · HDU, InSight ve Ingenuity"
      : "Bazı NASA modelleri açılamadı. İlgili parça için geçici model kullanılıyor."
  }

  return {
    redraw: redrawScene,
    loadNASA,
    toggleWrist,
    toggleView() {
      if (!fps.active) fps.respawn(crewModels.get(state.crew.findIndex(person => person.id === playerId)).position)
      fps.setActive(!fps.active)
    },
    selectPlayer() {
      roofAccess = undefined
      fps.respawn(crewModels.get(state.crew.findIndex(person => person.id === playerId)).position)
      redrawScene()
    },
    async loadCharacter(id, bytes) {
      const index = state.crew.findIndex(person => person.id === id)
      const actor = crewModels.get(index)
      if (!actor) throw new RangeError("Astronot bulunamadı.")
      const gltf = await parseModel(bytes)
      const character = fitCharacter(gltf.scene)
      for (const child of [...actor.children]) {
        if (!teamCharacter || loadedCharacters.has(index)) child.traverse(part => {
          if (!part.isMesh) return
          part.geometry.dispose()
          for (const material of new Set([part.material].flat())) {
            for (const value of Object.values(material)) {
              if (value?.isTexture && value !== faceTexture) value.dispose()
            }
            material.dispose()
          }
        })
        actor.remove(child)
      }
      actor.add(character)
      loadedCharacters.add(index)
    },
    async loadRover() {
      const button = byId("rover")
      const feedback = byId("rover-status")
      if (reference.children.length) {
        reference.visible = !reference.visible
        button.textContent = reference.visible ? "Perseverance’ı gizle" : "Perseverance’ı göster"
        feedback.textContent = reference.visible ? "Perseverance, üssün batısında · NASA/JPL" : ""
        redrawScene()
        return
      }
      button.disabled = true
      feedback.textContent = "NASA modeli yükleniyor…"
      try {
        const gltf = await parseModel(decode("rover-data").buffer)
        const rover = fitModel(gltf.scene, 3)
        reference.position.y = groundY(reference.position.x, reference.position.z)
        reference.add(rover)
        reference.userData.radius = 1.55
        hardware.push(reference)
        redrawScene()
        feedback.textContent = "Perseverance, üssün batısında · NASA/JPL"
        button.textContent = "Perseverance’ı gizle"
      } catch (error) {
        console.error(error)
        button.disabled = false
        feedback.textContent = "Model yüklenemedi. Tekrar dene."
      } finally {
        button.disabled = false
      }
    },
  }
}

async function parseModel(bytes) {
  const wrapper = URL.createObjectURL(new Blob([byId("decoder").textContent], { type: "text/javascript" }))
  const wasm = URL.createObjectURL(new Blob([decode("decoder-binary")], { type: "application/wasm" }))
  const decoder = new DRACOLoader().setDecoderPath({ js: wrapper, wasm })
  try {
    return await new GLTFLoader().setDRACOLoader(decoder).parseAsync(bytes, "")
  } finally {
    decoder.dispose()
    URL.revokeObjectURL(wrapper)
    URL.revokeObjectURL(wasm)
  }
}

function fitModel(model, width) {
  const group = new T.Group()
  group.add(model)
  const bounds = new T.Box3().setFromObject(model)
  const center = bounds.getCenter(new T.Vector3())
  const size = bounds.getSize(new T.Vector3())
  const scale = width / Math.max(size.x, size.z)
  model.scale.multiplyScalar(scale)
  model.position.multiplyScalar(scale)
  model.position.add(new T.Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale))
  model.traverse(part => { if (part.isMesh) part.castShadow = part.receiveShadow = true })
  return group
}

function fitCharacter(character) {
  const bounds = new T.Box3().setFromObject(character)
  const size = bounds.getSize(new T.Vector3())
  const center = bounds.getCenter(new T.Vector3())
  if (!(size.y > 0)) throw new Error("Karakter geometrisi bulunamadı.")
  const scale = 1.88 / size.y
  character.scale.multiplyScalar(scale)
  character.position.multiplyScalar(scale)
  character.position.add(new T.Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale))
  character.traverse(part => { if (part.isMesh) part.castShadow = true })
  return character
}

function decode(id) {
  return Uint8Array.from(atob(byId(id).textContent.trim()), char => char.charCodeAt(0))
}

function button(text, onClick) {
  const item = document.createElement("button")
  item.type = "button"
  item.textContent = text
  item.onclick = onClick
  return item
}
function workshopAction(action) {
  if (lastReport.status !== "in-progress") return
  const feedback = byId("workshop-message")
  try {
    feedback.textContent = action()
    status.textContent = feedback.textContent
    update()
  } catch (error) {
    feedback.textContent = error.message
    status.textContent = error.message
  }
}

function tendCrop(unit) {
  workshopAction(() => {
    if (workshop.growing[unit.id] === null) {
      workshop = replant(workshop, unit)
      return modules[unit.type].name + " · Yeni üretim dönemi başladı."
    }
    workshop = harvest(workshop, unit)
    const crop = crops[unit.type]
    return "+" + crop.amount + " " + materialNames[crop.yield] + " · +" + crop.xp + " tarım XP"
  })
}

function updateWorkshop(stopped) {
  const { stock, xp } = workshop
  byId("workshop-stock").textContent = stock.credits + " kredi · " + Object.entries(stock)
    .filter(([id]) => id !== "credits")
    .map(([id, amount]) => materialNames[id] + " " + amount).join(" · ")
  byId("workshop-skills").textContent = "Madencilik " + levelOf(xp.mining) + ". seviye · " + xp.mining +
    " XP  /  Tarım " + levelOf(xp.farming) + ". seviye · " + xp.farming + " XP"
  byId("recipes").replaceChildren(...recipes.map(recipe => {
    const action = button(recipe.name, () => workshopAction(() => {
      workshop = craft(workshop, recipe.id)
      if (!recipe.reward) {
        const item = { id: "workshop-" + workshop.crafted, type: recipe.id }
        state = { ...state, inventory: [...state.inventory, item] }
        selected = item.id
      }
      return recipe.name + " · Tamamlandı."
    }))
    const detail = document.createElement("small")
    const cost = Object.entries(recipe.cost).map(([id, amount]) => amount + " " + materialNames[id]).join(" · ")
    detail.textContent = recipeError(workshop, recipe) || cost
    action.title = cost
    action.append(detail)
    action.disabled = stopped
    return action
  }))
  byId("harvests").replaceChildren(...state.placed.filter(unit => crops[unit.type]).map(unit => {
    const crop = crops[unit.type]
    const empty = workshop.growing[unit.id] === null
    const progress = workshop.growing[unit.id] ?? 0
    const action = button(modules[unit.type].name + " · " +
      (empty ? "Yeni dönem başlat" : progress === crop.sols ? "Hasat et" : progress + "/" + crop.sols + " sol"),
      () => tendCrop(unit))
    action.disabled = stopped || (!empty && progress < crop.sols)
    return action
  }))
  const saleButtons = [["mineral", 2], ["potato", 4], ["bean", 6], ["apple", 8]].map(([id, price]) => {
    const action = button(materialNames[id] + " teslim et · +" + price + " kredi", () => workshopAction(() => {
      workshop = sell(workshop, id)
      return materialNames[id] + " teslim edildi · +" + price + " kredi"
    }))
    action.disabled = stopped || stock[id] < 1
    return action
  })
  const foodButtons = ["potato", "bean", "apple"].filter(id => stock[id] > 0).map(id => {
    const action = button(materialNames[id] + " → erzak", () => workshopAction(() => {
      workshop = { ...workshop, stock: { ...workshop.stock, [id]: workshop.stock[id] - 1 } }
      state = { ...state, supplies: { ...state.supplies, food: state.supplies.food + 1 } }
      return materialNames[id] + " erzağa eklendi."
    }))
    action.disabled = stopped
    return action
  })
  byId("trade").replaceChildren(...saleButtons, ...foodButtons)
}

function update() {
  lastReport = colonyReport(state)
  const stopped = lastReport.status !== "in-progress"
  byId("sol").textContent = state.sol + " / " + missionLength + " sol"
  byId("advance").disabled = stopped
  const day = state.timeline.at(-1)
  const choices = byId("player")
  for (const option of choices.options) {
    option.disabled = state.crew.find(person => person.id === option.value).health <= 0
  }
  const livingPlayer = state.crew.find(person => person.health > 0)
  if (livingPlayer && state.crew.find(person => person.id === playerId).health <= 0) {
    playerId = livingPlayer.id
    choices.value = playerId
    sceneView?.selectPlayer()
  }
  byId("weather").textContent = day?.storm ? "Toz fırtınası" : day ? "Açık gökyüzü" : "İniş tamamlandı"
  byId("inventory").replaceChildren(...state.inventory.map(item => {
    const choice = button(modules[item.type].name, () => { selected = item.id; update() })
    choice.setAttribute("aria-pressed", String(selected === item.id))
    choice.title = modules[item.type].detail
    choice.disabled = stopped
    return choice
  }))
  byId("selected").textContent = selected ? modules[state.inventory.find(item => item.id === selected).type].detail
    : "Envanter boş."
  byId("crew").replaceChildren(...state.crew.map((person, index) => {
    const label = document.createElement("label")
    label.append("Astronot " + (index + 1) + " · %" + person.health)
    const select = document.createElement("select")
    select.add(new Option("Görev seç", ""))
    for (const [id, name] of Object.entries(roles)) select.add(new Option(name, id))
    select.value = person.role ?? ""
    select.disabled = stopped || !person.health
    select.onchange = () => { state = assignAstronaut(state, person.id, select.value || null) }
    label.append(select)
    return label
  }))
  const number = new Intl.NumberFormat("tr", { maximumFractionDigits: 2 })
  byId("resources").textContent = "Su " + number.format(state.supplies.water) + " · Oksijen " + number.format(state.supplies.oxygen) +
    " · Yiyecek " + number.format(state.supplies.food) + " · Yedek parça " + state.supplies.spareParts
  byId("energy").textContent = day ? "Üretilen " + day.generation + " · Harcanan " + day.used + " · Batarya " + day.battery + "/" + day.capacity
    : "Başlangıç enerjisi " + state.startupEnergy
  byId("system-status").textContent = state.operations
    ? (day?.systems.join(" · ") || "Yaşam desteği donanımını yerleştir ve inşaata ata.") : ""
  byId("buildings").textContent = state.placed.filter(item => item.active).length + " etkin · " +
    state.placed.filter(item => !item.active).length + " inşaat bekliyor"
  const tbody = byId("log")
  tbody.replaceChildren()
  for (const row of state.timeline) {
    const tr = tbody.insertRow()
    for (const value of [row.sol, row.storm ? "Fırtına" : "Açık", row.generation,
      row.used, row.battery, row.missing.map(key => labels[key]).join(", ") || "Karşılandı"]) {
      tr.insertCell().textContent = value
    }
  }
  byId("outcome").textContent = stopped ? (lastReport.status === "success" ? "Görev başarılı" : "Görev başarısız") : "Görev sürüyor"
  byId("reasons").replaceChildren(...lastReport.reasons.map(reason => {
    const item = document.createElement("li")
    item.textContent = reason
    return item
  }))
  byId("report").disabled = !stopped
  updateWorkshop(stopped)
  sceneView?.redraw()
}

byId("advance").onclick = () => {
  const next = advanceSol(state, { prioritizeLifeSupport: byId("priority").checked })
  if (next !== state) workshop = grow(workshop, next)
  state = next
  update()
  const day = state.timeline.at(-1)
  if (day) {
    status.textContent = lastReport.status !== "in-progress" ? "Görev bitti. Sonucu görev raporunda incele."
      : day.missing.length ? "Karşılanmayan ihtiyaçlar · " + day.missing.map(key => labels[key]).join(", ")
      : "Sol " + day.sol + " tamamlandı. Sıradaki sol için görevleri ata."
  }
}
function beginColony(next) {
  state = next
  workshop = startWorkshop()
  byId("workshop-message").textContent = "Buz ve maden yataklarını keşfet."
  selected = state.inventory[0]?.id
  playerId = (state.crew.find(person => person.health > 0) ?? state.crew[0]).id
  byId("player").replaceChildren(...state.crew.map((person, index) => new Option("Astronot " + (index + 1), person.id)))
  byId("player").value = playerId
  status.textContent = "Envanterden modül seç ve uygun yüzeye yerleştir."
  update()
  sceneView?.selectPlayer()
}
function startPlannedColony(plan) {
  return { ...createColonyFromFlight(plan.landing), operations: { ...plan.operations }, wastewater: 0 }
}
byId("reset").onclick = () => beginColony(activeMissionPlan ? startPlannedColony(activeMissionPlan)
  : flightLanding ? createColonyFromFlight(flightLanding) : createColony(exampleLanding))

const cargoForm = byId("cargo-form")
function configureCargo() {
  for (const [key, value] of Object.entries(defaultManifest)) {
    if (key !== "equipment") cargoForm.elements.namedItem(key).value = value
  }
  for (const [id, item] of Object.entries(cargoOptions)) {
    const label = document.createElement("label")
    label.className = "check"
    label.title = item.description
    const input = document.createElement("input")
    input.type = "checkbox"
    input.name = "equipment"
    input.value = id
    input.checked = defaultManifest.equipment.includes(id)
    label.append(input, item.name)
    byId("cargo-kit").append(label)
  }
}
function currentPlan() {
  if (!cargoForm.checkValidity()) return null
  const inputs = new FormData(cargoForm)
  return planMission({
    mealDays: Number(inputs.get("mealDays")), waterDays: Number(inputs.get("waterDays")),
    oxygenDays: Number(inputs.get("oxygenDays")), spareParts: Number(inputs.get("spareParts")),
    driedMealShare: Number(inputs.get("driedMealShare")), equipment: inputs.getAll("equipment"),
  })
}
function showPlan() {
  const plan = currentPlan()
  byId("cargo-launch").disabled = !plan?.withinLimit
  if (!plan) {
    byId("cargo-total").textContent = "Erzak miktarlarını izin verilen aralıkta gir."
    byId("transit-plan").textContent = ""
    byId("cargo-list").replaceChildren()
    return
  }
  const kg = value => Math.round(value).toLocaleString("tr-TR") + " kg"
  byId("cargo-total").textContent = "Mars iniş yükü " + kg(plan.massKg) + " / " + kg(cargoLimitKg) +
    (plan.withinLimit ? "" : " · Kütle sınırı aşıldı")
  const { transit } = plan
  byId("transit-plan").textContent = transitDays + " Dünya günü transfer için " +
    kg(transit.foodKg) + " öğün, " + kg(transit.waterKg) + " su ve " +
    kg(transit.oxygenReserveKg) + " yedek oksijen. Transfer aracında su geri kazanımı ve elektroliz varsayılıyor."
  byId("cargo-list").replaceChildren(...plan.cargo.map(entry => {
    const item = document.createElement("li")
    item.textContent = entry.name + " · " + kg(entry.kg)
    return item
  }))
}
configureCargo()
showPlan()
cargoForm.addEventListener("input", showPlan)
cargoForm.addEventListener("submit", event => {
  event.preventDefault()
  const plan = currentPlan()
  if (!plan?.withinLimit) return
  activeMissionPlan = plan
  flightLanding = undefined
  beginColony(startPlannedColony(plan))
  byId("landing-status").textContent = "Dünya yük planı uygulandı · Jezero"
  cargoForm.closest("details").open = false
})
byId("landing-file").onchange = async event => {
  const input = event.currentTarget
  const file = input.files[0]
  if (!file) return
  input.disabled = true
  try {
    const payload = JSON.parse(await file.text())
    const next = createColonyFromFlight(payload)
    flightLanding = payload
    activeMissionPlan = undefined
    beginColony(next)
    byId("landing-status").textContent = "Uçuş verisi alındı · " + file.name + " · İniş tercihi " +
      (payload.landingSite === "flat" ? "düz saha" : "engebeli saha") + " · Başlangıç enerjisi " + payload.surfaceEnergy
  } catch {
    byId("landing-status").textContent = "İniş verisi okunamadı. Emre’nin crew, supplies, modules, landingSite ve surfaceEnergy alanlarını içeren JSON dosyasını seç."
  } finally {
    input.disabled = false
    input.value = ""
  }
}
byId("report").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" }))
  const link = document.createElement("a")
  link.href = url
  link.download = "mars-koloni-raporu.json"
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
try {
  sceneView = makeScene()
  const choices = byId("player")
  state.crew.forEach((person, index) => choices.add(new Option("Astronot " + (index + 1), person.id)))
  choices.onchange = () => { playerId = choices.value; sceneView.selectPlayer() }
  byId("view-mode").onclick = () => sceneView.toggleView()
  byId("wrist").onclick = () => sceneView.toggleWrist()
  const characterFile = byId("character-file")
  characterFile.onchange = async () => {
    const file = characterFile.files[0]
    if (!file) return
    const id = playerId
    const name = choices.selectedOptions[0].textContent
    const feedback = byId("character-status")
    characterFile.disabled = true
    feedback.textContent = "Karakter yükleniyor…"
    try {
      const bytes = await file.arrayBuffer()
      if (bytes.byteLength < 12 || new DataView(bytes).getUint32(0, true) !== 0x46546c67) {
        throw new Error("Geçersiz GLB")
      }
      await sceneView.loadCharacter(id, bytes)
      feedback.textContent = name + " · " + file.name + " yüklendi."
    } catch {
      feedback.textContent = "Model açılamadı. Dokuları dosyaya gömülü bir GLB seç."
    } finally {
      characterFile.value = ""
      characterFile.disabled = false
    }
  }
  byId("rover").onclick = () => sceneView.loadRover()
  sceneView.loadNASA()
  sceneView.loadRover()
  if (document.querySelector("main").dataset.startView === "fps") sceneView.toggleView()
} catch (error) {
  console.error(error)
  viewport.hidden = true
  byId("rover").disabled = true
  byId("view-mode").disabled = true
  byId("character-file").disabled = true
  status.textContent = "3B görünüm açılamadı. WebGL destekleyen bir tarayıcıda aç."
}
const initialPlan = currentPlan()
activeMissionPlan = initialPlan
beginColony(startPlannedColony(initialPlan))
byId("landing-status").textContent = "Varsayılan Dünya yükü · Jezero"
