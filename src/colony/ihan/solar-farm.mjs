export function addSolarFarm(T, scene, terrainHeight, obstacles) {
  // Adapted from Samet's solar preview in 0e3352a87baebff83558045dcb539462d3ecf4f7.
  const farm = new T.Group()
  farm.name = "MarsSolarFarm"
  const x0 = -57, z0 = 46
  const level = terrainHeight(x0, z0)
  farm.position.set(x0, level, z0)
  scene.add(farm)
  const cells = document.createElement("canvas")
  cells.width = 500
  cells.height = 400
  const ctx = cells.getContext("2d")
  ctx.fillStyle = "#8a8981"
  ctx.fillRect(0, 0, 500, 400)
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
    const x = col * 100, y = row * 200
    ctx.fillStyle = (row + col) % 2 ? "#172b47" : "#1f3452"
    ctx.fillRect(x + 3, y + 3, 94, 194)
    ctx.fillStyle = "#4a607a"
    for (let line = 1; line < 16; line++) ctx.fillRect(x + 5, y + line * 12, 90, 1)
    ctx.fillRect(x + 49, y + 4, 1, 192)
  }
  const texture = new T.CanvasTexture(cells)
  texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 8
  const frame = new T.MeshStandardMaterial({color:0x686b66, metalness:.58, roughness:.48})
  const panel = new T.MeshStandardMaterial({map:texture, metalness:.26, roughness:.34})
  const part = (parent, geometry, material, x, y, z) => {
    const mesh = new T.Mesh(geometry, material)
    mesh.position.set(x,y,z)
    mesh.receiveShadow = mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  const back = new T.BoxGeometry(5,.09,4)
  const face = new T.PlaneGeometry(5,4).rotateX(-Math.PI/2)
  const column = new T.BoxGeometry(.13,1,.13)
  const footing = new T.BoxGeometry(.44,.14,.44)
  for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
    const x = (col - 3) * 6, z = (row - 2.5) * 8
    const y = terrainHeight(x0 + x, z0 + z) - level
    const table = new T.Group()
    table.position.set(x,y+2.25,z)
    table.rotation.x = .55
    farm.add(table)
    part(table,back,frame,0,0,0)
    part(table,face,panel,0,.052,0)
    for (const dx of [-1.9,1.9]) for (const dz of [-1.4,1.4]) {
      const groundZ = z + dz * Math.cos(table.rotation.x)
      const ground = terrainHeight(x0+x+dx,z0+groundZ)-level
      const top = y + 2.2 - dz * Math.sin(table.rotation.x)
      const height = Math.max(.1,top-ground)
      part(farm,column,frame,x+dx,ground+height/2,groundZ).scale.y = height
      part(farm,footing,frame,x+dx,ground+.035,groundZ)
    }
    obstacles.push(new T.Box3(
      new T.Vector3(x0+x-2.68,level+y,z0+z-1.93),
      new T.Vector3(x0+x+2.68,level+y+3.4,z0+z+1.93)))
  }
  const cabinet = new T.BoxGeometry(2.8,2.3,1.6)
  for (let i = 0; i < 10; i++) {
    const x = 23 + 4 * Math.floor(i / 5), z = (i % 5 - 2) * 4.5
    const ground = terrainHeight(x0+x,z0+z)
    const mesh = part(farm,cabinet,frame,x,ground-level+1.15,z)
    mesh.updateWorldMatrix(true,false)
    obstacles.push(new T.Box3().setFromObject(mesh).expandByScalar(.2))
  }
  // Host adaptation: the weather buttons only exist on İhan's stand-alone page (and not in node tests).
  const weatherButtons = typeof document?.querySelectorAll === "function" ? document.querySelectorAll("[data-solar-weather]") : []
  const update = (factor) => {
    const produced = 42 * 10 * 2 * 2.5 * .25 * .8 * factor
    const balance = produced - 413
    document.getElementById("solar-generated").textContent = produced + " kWh/sol"
    document.getElementById("solar-balance").textContent = (balance >= 0 ? "+" : "") + balance + " kWh/sol"
    for (const button of weatherButtons) button.setAttribute("aria-pressed", String(Number(button.dataset.solarWeather) === factor))
  }
  if (weatherButtons.length) {
    for (const button of weatherButtons) button.addEventListener("click", () => update(Number(button.dataset.solarWeather)))
    update(1)
  }
  instanceByGeometry(T, farm)
  return {farm, level, x0, z0}
}

// Host optimisation (Emre/Claude): the farm is static, so the ~390 meshes above (42 tables × back,
// face, 4 columns, 4 footings + 10 cabinets) collapse into one InstancedMesh per geometry/material
// pair — same geometry and placement, ~5 draw calls instead of ~390.
function instanceByGeometry(T, root) {
  root.updateMatrixWorld(true)
  const inverse = root.matrixWorld.clone().invert()
  const groups = new Map()
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh) return
    const key = mesh.geometry.uuid + "|" + mesh.material.uuid
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(mesh)
  })
  for (const meshes of groups.values()) {
    const [first] = meshes
    const batch = new T.InstancedMesh(first.geometry, first.material, meshes.length)
    meshes.forEach((mesh, i) => batch.setMatrixAt(i, inverse.clone().multiply(mesh.matrixWorld)))
    batch.castShadow = batch.receiveShadow = true
    batch.computeBoundingSphere()
    for (const mesh of meshes) mesh.removeFromParent()
    root.add(batch)
  }
  for (const child of [...root.children]) if (child.isGroup && !child.children.length) root.remove(child)
}
