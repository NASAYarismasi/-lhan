import * as T from "three"
import area from "../data/jezero.json"

export const cell = 4
const material = color => new T.MeshStandardMaterial({ color, roughness: .78 })
const white = material(0xe4d1b9)
const dark = material(0x273642)
const gold = material(0xe5ad69)
const glass = material(0x447c83)
const blue = material(0x304e89)

export function terrainModel(scale = 1) {
  const { width, height, heights, spacingX, spacingZ } = area
  const geometry = new T.PlaneGeometry((width - 1) * spacingX * scale,
    (height - 1) * spacingZ * scale, width - 1, height - 1)
  geometry.rotateX(-Math.PI / 2)
  const values = heights.flat()
  const low = Math.min(...values)
  const range = Math.max(...values) - low
  const colors = []
  const position = geometry.attributes.position
  for (let index = 0; index < position.count; index++) {
    const meters = values[index] - low
    position.setY(index, meters * scale)
    const shade = new T.Color(0x753e35).lerp(new T.Color(0xca8361), meters / range)
    colors.push(shade.r, shade.g, shade.b)
  }
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
  mesh.name = "Jezero_MOLA"
  return mesh
}

function part(group, geometry, surface, x, y, z) {
  const item = new T.Mesh(geometry, surface)
  item.position.set(x, y, z)
  group.add(item)
  return item
}

export function moduleModel(type) {
  const group = new T.Group()
  group.name = type
  const box = (w, h, d, surface, x, y, z) => part(group, new T.BoxGeometry(w,h,d), surface,x,y,z)
  const tube = (r, h, surface, x, y, z) => part(group, new T.CylinderGeometry(r,r,h,20),surface,x,y,z)
  if (type.endsWith("Pod")) {
    const tree = type === "treePod"
    const height = tree ? 2.25 : 1.04
    const soil = material(0x4e3024)
    const foliage = material(type === "beanPod" ? 0x76a653 : 0x3e7a43)
    const bubble = new T.MeshPhysicalMaterial({
      color: 0xcbe7e5, transparent: true, opacity: .24, depthWrite: false, roughness: .24,
    })
    box(tree ? 2.1 : 1.8, .26, tree ? 1.9 : 1.5, dark, 0, .13, 0)
    box(tree ? 1.9 : 1.62, .12, tree ? 1.7 : 1.32, soil, 0, .31, 0)
    const cover = part(group, new T.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), bubble, 0, .26, 0)
    cover.scale.set(tree ? 1.05 : .9, height, tree ? .95 : .75)
    cover.userData.noShadow = true
    const plants = new T.Group()
    plants.name = "plants"
    plants.position.y = .36
    group.add(plants)
    for (const x of tree ? [0] : [-.48, 0, .48]) {
      const stem = tree ? 1 : type === "beanPod" ? .52 : .24
      part(plants, new T.CylinderGeometry(.025, .065, stem, 8), soil, x, stem / 2, 0)
      for (const z of [-.19, .19]) {
        const leaf = part(plants, new T.IcosahedronGeometry(tree ? .48 : .17, 1), foliage, x, stem, z)
        leaf.scale.set(1, .7, 1)
      }
      if (tree) part(plants, new T.SphereGeometry(.085, 10, 8), material(0xc65138), x + .18, 1, .53)
    }
    return group
  }
  box(3.3,.16,3.1,dark,0,.08,0)
  switch (type) {
    case "habitat":
      tube(.9,2.5,white,0,1.05,0).rotation.z = Math.PI / 2
      tube(.43,.12,dark,1.31,1.04,0).rotation.z = Math.PI / 2
      for (const x of [-.7,0,.7]) box(.34,.32,.12,glass,x,1.28,.87)
      break
    case "solarPanel":
      tube(.13,1.15,white,0,.72,0)
      for (const x of [-.8,.8]) {
        box(1.53,.09,1.28,blue,x,1.3,0).rotation.x = -.42
        for (const z of [-.4,0,.4]) box(1.48,.04,.025,white,x,1.36+z*.44,z)
      }
      break
    case "battery":
      for (const x of [-.81,.81]) {
        box(1.39,1.0,1.62,gold,x,.66,0)
        box(.95,.1,.8,dark,x,1.19,.18)
      }
      break
    case "oxygenUnit":
    case "waterRecycler":
    case "airScrubber":
      box(2.45,.35,1.8,white,0,.32,0)
      for (const x of [-.65,.65]) tube(.4,1.43,type === "oxygenUnit" ? white :
        type === "airScrubber" ? dark : glass,x,1.16,0)
      box(2,.14,.24,gold,0,1.88,0)
      break
    case "greenhouse":
      box(2.95,.52,2.05,white,0,.38,0)
      part(group,new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI/2),glass,0,.63,0).scale.set(1.49,1.3,1.05)
      for (const x of [-.7,0,.7]) box(.08,.08,1.92,white,x,.67,0)
      break
  }
  return group
}
