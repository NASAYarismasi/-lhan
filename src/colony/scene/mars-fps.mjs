import * as T from "three"

export function createFirstPerson(canvas, camera, { onMode, onAim, interact, accessRoof, collides, groundY }) {
  const keys = new Set()
  const motion = new T.Vector2()
  const look = new T.Euler(0, 0, 0, "YXZ")
  const eyeHeight = 1.67
  const spawn = new T.Vector3(0, eyeHeight, 15)
  const savedPosition = new T.Vector3()
  const savedRotation = new T.Quaternion()
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
    camera.fov = value ? 66 : 41
    camera.updateProjectionMatrix()
    onMode(value)
  }

  canvas.addEventListener("click", () => {
    if (!active) return
    if (document.pointerLockElement === canvas) {
      interact()
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
    if (event.code === "KeyE" && !event.repeat) interact()
    if (event.code === "KeyR" && !event.repeat) accessRoof(lookFrom)
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
      onAim()
    },
  }
}

export function addSurface(scene) {
  // Deterministic regolith and rocks on the fictional construction site.
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
  const geometry = new T.PlaneGeometry(106, 106, 40, 40)
  geometry.rotateX(-Math.PI / 2)
  const points = geometry.attributes.position
  for (let i = 0; i < points.count; i++) {
    const distance = Math.max(Math.abs(points.getX(i)), Math.abs(points.getZ(i)))
    const strength = T.MathUtils.smoothstep(distance, 19, 42)
    points.setY(i, -.035 + strength * (Math.sin(points.getX(i) * .19) + Math.cos(points.getZ(i) * .23)) * .95)
  }
  geometry.computeVertexNormals()
  const surface = new T.Mesh(geometry, new T.MeshStandardMaterial({ map: texture, roughness: 1, bumpMap: texture, bumpScale: .038 }))
  surface.receiveShadow = true
  scene.add(surface)
  const rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0),
    new T.MeshStandardMaterial({ roughness: .96 }), 160)
  const pose = new T.Object3D()
  for (let i = 0; i < rocks.count; i++) {
    const z = (random() - .5) * 75
    const x = (random() < .5 ? -1 : 1) * (13.2 + random() * 26)
    const size = .08 + random() ** 3 * .78
    const strength = T.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), 19, 42)
    pose.position.set(x, size * .12 - .035 + strength * (Math.sin(x * .19) + Math.cos(z * .23)) * .95, z)
    pose.rotation.set(random(), random() * Math.PI, random())
    pose.scale.set(size, size * .53, size * .77)
    pose.updateMatrix()
    rocks.setMatrixAt(i, pose.matrix)
    rocks.setColorAt(i, new T.Color(0x9f654d).multiplyScalar(.62 + random() * .51))
  }
  rocks.castShadow = true
  rocks.receiveShadow = true
  scene.add(rocks)
  return surface
}

export function placeholderAstronaut(color) {
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
  for (const side of [-1, 1]) {
    add(new T.CapsuleGeometry(.1, .30, 4, 9), suit, side * .33, 1.04, 0).rotation.z = side * .16
    add(new T.CapsuleGeometry(.112, .46, 4, 9), suit, side * .13, .49, 0)
    add(new T.BoxGeometry(.23, .15, .33), joint, side * .13, .095, .07)
  }
  return astronaut
}
