import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Surface EVA never gets close enough to resolve hardware lens refraction.
 * glTF transmission on three tiny Perseverance lenses otherwise causes Three.js
 * to render the entire regolith/colony again into a transmission buffer.
 */
export function prepareSurfaceMaterials(root) {
  const materials = new Map()
  const convert = source => {
    if (!source.isMeshPhysicalMaterial) return source
    if (!materials.has(source)) {
      const material = new T.MeshStandardMaterial().copy(source)
      if (source.transmission > 0) {
        material.transparent = true; material.opacity = .28; material.depthWrite = false
        material.color.multiply(new T.Color(0x849ba3))
        material.forceSinglePass = true
      }
      materials.set(source, material)
    }
    return materials.get(source)
  }
  root.traverse(mesh => {
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material)
  })
  materials.forEach((_, source) => source.dispose())
  return root
}

/** Bake static NASA hardware into material batches, retaining its metre-scale silhouette.
 * Skinned/morph meshes are left intact. The returned root owns the new buffers.
 */
export function batchStaticModel(root) {
  root.updateMatrixWorld(true)
  const inverse = root.matrixWorld.clone().invert(), buckets = new Map()
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.isSkinnedMesh || Array.isArray(mesh.material) ||
        Object.keys(mesh.geometry.morphAttributes).length) return
    const geometry = mesh.geometry
    const attributes = Object.keys(geometry.attributes).sort().map(name => {
      const attribute = geometry.attributes[name]
      return `${name}:${attribute.itemSize}:${attribute.normalized}`
    }).join(',')
    const key = `${mesh.material.uuid}/${Boolean(geometry.index)}/${attributes}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(mesh)
  })
  const retired = new Set()
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue
    const geometries = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(
      new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)))
    const geometry = mergeGeometries(geometries)
    geometries.forEach(part => part.dispose())
    if (!geometry) continue
    const batch = new T.Mesh(geometry, meshes[0].material)
    batch.name = 'Static_material_batch'
    batch.castShadow = batch.receiveShadow = true
    root.add(batch)
    for (const mesh of meshes) {
      // A static mesh can also be a transform parent for an unbatched part.
      for (const child of [...mesh.children]) root.attach(child)
      retired.add(mesh.geometry); mesh.removeFromParent()
    }
  }
  retired.forEach(geometry => geometry.dispose())
  return root
}
