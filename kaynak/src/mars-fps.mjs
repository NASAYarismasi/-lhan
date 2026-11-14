import * as T from "three"
import jezero from "../data/jezero-hirise.json"

export function createFirstPerson(canvas, camera, { onMode, onAim, interact, accessRoof, collides, groundY }) {
  const keys = new Set()
  const motion = new T.Vector2()
  const look = new T.Euler(0, 0, 0, "YXZ")
  const eyeHeight = 1.67
  const spawn = new T.Vector3(0, eyeHeight, 15)
  const savedPosition = new T.Vector3()
  const savedRotation = new T.Quaternion()
  let savedFov = camera.fov
  let active = false
  let walkingTime = 0
  function respawn(position) {
    spawn.x = position.x
    spawn.z = position.z + 1.2
    spawn.y = groundY(spawn.x, spawn.z) + eyeHeight
    if (!active) return
    camera.position.copy(spawn)
    look.set(-.31, 0, 0)
    turn(0, 0)
    walkingTime = 0
  }
  function lookFrom(position, pitch) {
    camera.position.copy(position)
    look.x = pitch
    turn(0, 0)
    camera.updateMatrixWorld()
  }

  function turn(dx, dy) {
    look.y -= dx * .0022
    look.x = T.MathUtils.clamp(look.x - dy * .0022, -1.47, 1.47)
    camera.quaternion.setFromEuler(look)
  }

  function setActive(value) {
    if (active === value) return
    active = value
    keys.clear()
    if (value) {
      savedFov = camera.fov
      savedPosition.copy(camera.position)
      savedRotation.copy(camera.quaternion)
      camera.position.copy(spawn)
      look.set(-.31, 0, 0)
      camera.quaternion.setFromEuler(look)
      canvas.focus({ preventScroll: true })
    } else {
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      camera.position.copy(savedPosition)
      camera.quaternion.copy(savedRotation)
    }
    camera.fov = value ? 66 : savedFov
    camera.updateProjectionMatrix()
    onMode(value)
  }

  canvas.addEventListener("click", () => {
    if (!active) return
    if (document.pointerLockElement === canvas) {
      interact?.()
    } else {
      try { canvas.requestPointerLock?.()?.catch(() => {}) } catch { /* Arrow keys still control the view. */ }
    }
  })
  document.addEventListener("mousemove", event => {
    if (active && (document.pointerLockElement === canvas || (event.target === canvas && event.buttons === 1))) {
      turn(event.movementX, event.movementY)
    }
  })
  document.addEventListener("keydown", event => {
    if (!active || (document.activeElement !== canvas && document.pointerLockElement !== canvas)) return
    if (event.code === "Escape") setActive(false)
    if (event.code === "KeyE" && !event.repeat) interact?.()
    if (event.code === "KeyR" && !event.repeat) accessRoof?.(lookFrom)
    if (["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      keys.add(event.code)
      event.preventDefault()
    }
  })
  document.addEventListener("keyup", event => keys.delete(event.code))
  document.addEventListener("pointerlockchange", () => keys.clear())
  canvas.addEventListener("blur", () => keys.clear())
  window.addEventListener("blur", () => keys.clear())

  return {
    get active() { return active },
    setActive,
    respawn,
    update(delta) {
      if (!active) return
      const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"))
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"))
      const turnX = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"))
      const turnY = Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"))
      if (turnX || turnY) turn(turnX * delta * 620, turnY * delta * 620)

      motion.set(right, forward).normalize().multiplyScalar(delta * 3.3)
      const sin = Math.sin(look.y)
      const cos = Math.cos(look.y)
      const x = camera.position.x + cos * motion.x - sin * motion.y
      const z = camera.position.z - sin * motion.x - cos * motion.y
      if (!collides(x, camera.position.z)) camera.position.x = x
      if (!collides(camera.position.x, z)) camera.position.z = z
      if (right || forward) walkingTime += delta * 8
      if (right || forward) {
        camera.position.y = groundY(camera.position.x, camera.position.z) + eyeHeight + Math.sin(walkingTime) * .027
      }
      camera.updateMatrixWorld()
      onAim?.()
    },
  }
}

export function addSurface(scene, orthoUrl, { craterRelief = false } = {}) {
  // Decorative grain and rocks over the measured HiRISE elevation surface.
  const map = document.createElement("canvas")
  map.width = map.height = 256
  const context = map.getContext("2d")
  const pixels = context.createImageData(256, 256)
  let seed = 831
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < pixels.data.length; i += 4) {
    const shade = random() * 44 + (random() < .027 ? 48 : 0)
    pixels.data.set([105+shade, 55+shade*.72, 37+shade*.55, 255], i)
  }
  context.putImageData(pixels, 0, 0)
  const texture = new T.CanvasTexture(map)
  texture.colorSpace = T.SRGBColorSpace
  texture.wrapS = texture.wrapT = T.RepeatWrapping
  texture.repeat.set(34, 34)
  texture.anisotropy = 4
  const ortho = new T.TextureLoader().load(orthoUrl)
  ortho.colorSpace = T.SRGBColorSpace
  ortho.anisotropy = 8
  const material = new T.MeshStandardMaterial({
    color: 0xdacbbd, map: ortho, roughness: .97, bumpMap: texture, bumpScale: .042,
  })
  // Illustrative impact features placed outside the habitat area.
  const craters = [
    [-19,-19,8], [18,-24,11], [-40,-7,13], [30,0,7], [17,24,9],
    [-13,29,7], [-33,-43,12], [39,-39,13], [3,-44,9], [-46,31,9],
    [49,29,11], [55,-11,10], [-8,-25,3], [9,-13,3], [-24,12,5],
    [25,-8,4], [-31,-29,4], [35,19,4], [4,35,4], [-51,-30,6],
  ]
  function craterHeight(x,z) {
    let height = 0
    for (const [cx,cz,radius] of craters) {
      const r = Math.hypot(x-cx,z-cz) / radius
      if (r < 1.25) {
        const bowl = Math.max(0,1-(r/.94)**2)
        height += radius * (.076 * Math.exp(-((r-1)**2)/.014) - .25 * bowl)
      }
    }
    return height
  }
  function surfaceFor(samples, step, innerHole = false) {
    const segments = samples.length - 1
    const geometry = new T.PlaneGeometry(segments * jezero.stepX * step,
      segments * jezero.stepZ * step, segments, segments)
    geometry.rotateX(-Math.PI / 2)
    const positions = geometry.attributes.position
    const uv = geometry.attributes.uv
    const uv2 = uv.clone()
    const elevations = samples.flat()
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index)
      const z = positions.getZ(index)
      const fine = craterRelief && step === 1 ? craterHeight(x,z) +
        .13 * Math.sin(x*1.87+z*.61)*Math.cos(z*1.21-x*.42) : 0
      positions.setY(index, elevations[index] - jezero.heightDatumM + fine)
      if (step === 1) uv.setXY(index, .5 + (uv.getX(index) - .5) / 4, .5 + (uv.getY(index) - .5) / 4)
      else uv2.setXY(index, uv2.getX(index) * 4, uv2.getY(index) * 4)
    }
    texture.channel = 1
    geometry.setAttribute("uv1", uv2)
    if (innerHole) {
      const indices = geometry.index.array
      const outside = []
      for (let row = 0; row < segments; row++) for (let column = 0; column < segments; column++) {
        if (row >= 48 && row < 80 && column >= 48 && column < 80) continue
        const start = (row * segments + column) * 6
        outside.push(...indices.subarray(start, start + 6))
      }
      geometry.setIndex(outside)
    }
    geometry.computeVertexNormals()
    const mesh = new T.Mesh(geometry, material)
    mesh.receiveShadow = true
    scene.add(mesh)
    return mesh
  }
  surfaceFor(jezero.surroundings, 4, true)
  const surface = surfaceFor(jezero.local, 1)
  const groundRay = new T.Raycaster()
  const top = new T.Vector3()
  const down = new T.Vector3(0, -1, 0)
  const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0),
    new T.MeshStandardMaterial({ roughness: .96 }), 160)
  const pose = new T.Object3D()
  for (let i = 0; i < rocks.count; i++) {
    const z = (random() - .5) * 84
    const x = (random() < .5 ? -1 : 1) * (8 + random() * 34)
    const size = .06 + random() ** 3 * .53
    groundRay.set(top.set(x, 50, z), down)
    const height = groundRay.intersectObject(surface, false)[0].point.y
    pose.position.set(x, height + size * .12, z)
    pose.rotation.set(random(), random() * Math.PI, random())
    pose.scale.set(size, size * (.32 + random() * .31), size * .79)
    pose.updateMatrix()
    rocks.setMatrixAt(i, pose.matrix)
    rocks.setColorAt(i, new T.Color(0x876f60).multiplyScalar(.56 + random() * .57))
  }
  rocks.castShadow = true
  rocks.receiveShadow = true
  scene.add(rocks)
  return surface
}

export function placeholderAstronaut(color, faceTexture) {
  const astronaut = new T.Group()
  const suit = new T.MeshStandardMaterial({ color, roughness: .76 })
  const joint = new T.MeshStandardMaterial({ color: 0x323e48, roughness: .88 })
  const visor = new T.MeshStandardMaterial({ color: 0x806f4d, metalness: .48, roughness: .22 })
  const add = (geometry, material, x, y, z) => {
    const part = new T.Mesh(geometry, material)
    part.position.set(x, y, z)
    part.castShadow = true
    astronaut.add(part)
    return part
  }
  add(new T.CapsuleGeometry(.245, .33, 5, 10), suit, 0, 1.13, 0)
  add(new T.BoxGeometry(.39, .53, .24), joint, 0, 1.22, -.25)
  add(new T.SphereGeometry(.215, 18, 14), suit, 0, 1.64, 0)
  add(new T.SphereGeometry(.178, 20, 14), visor, 0, 1.65, .12).scale.set(1, .79, .59)
  if (faceTexture) {
    const geometry = new T.CircleGeometry(1, 40)
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, .13 + uv.getX(i) * .68, .15 + uv.getY(i) * .73)
    }
    const face = new T.Mesh(geometry, new T.MeshBasicMaterial({ map: faceTexture, toneMapped: false }))
    face.position.set(0, 1.65, .228)
    face.scale.set(.133, .124, 1)
    astronaut.add(face)
  }
  for (const side of [-1, 1]) {
    add(new T.CapsuleGeometry(.1, .30, 4, 9), suit, side * .33, 1.04, 0).rotation.z = side * .16
    add(new T.CapsuleGeometry(.112, .46, 4, 9), suit, side * .13, .49, 0)
    add(new T.BoxGeometry(.23, .15, .33), joint, side * .13, .095, .07)
  }
  return astronaut
}
