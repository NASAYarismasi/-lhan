import * as T from "three"
import { STLLoader } from "three/addons/loaders/STLLoader.js"

// Forearm cut and attachment dimensions adapted from Samet's wrist-scene.js.
function extractArm(source) {
  const data = source.attributes.position
  const positions = []
  const scale = 1.8 / 74.2626838684082
  for (let start = 0; start < data.count; start += 3) {
    const triangle = [start, start + 1, start + 2]
    const height = index => (data.getZ(index) + 37.13139343261719) * scale
    if (!triangle.every(index => data.getX(index) > 16.5 && height(index) > 1.19 && height(index) < 1.47)) continue
    for (const index of triangle) {
      positions.push(data.getX(index) * scale - .4, height(index) - 1.32, -data.getY(index) * scale - .09)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createWristTerminal(camera, bytes) {
  const source = new STLLoader().parse(bytes)
  const armGeometry = extractArm(source)
  source.dispose()
  if (!armGeometry.attributes.position.count) throw new Error("Bilek geometrisi bulunamadı.")
  const rig = new T.Group()
  rig.visible = false
  camera.add(rig)
  const suit = new T.MeshStandardMaterial({ color: 0xd8d6c6, roughness: .85, side: T.DoubleSide, depthTest: false })
  rig.add(new T.Mesh(armGeometry, suit))
  const sleeve = new T.Mesh(new T.CylinderGeometry(.067, .092, 1.05, 16, 4, true), suit)
  sleeve.rotation.z = -Math.PI / 2
  sleeve.position.set(-.49, 0, .012)
  rig.add(sleeve)

  const caseMaterial = new T.MeshStandardMaterial({ color: 0x242a31, roughness: .72, depthTest: false })
  const terminal = new T.Group()
  terminal.position.set(.17, .080, .015)
  terminal.rotation.x = -Math.PI / 2
  terminal.add(new T.Mesh(new T.BoxGeometry(.14, .09, .014), caseMaterial))
  rig.add(terminal)
  for (const x of [.125, .215]) {
    const strap = new T.Mesh(new T.TorusGeometry(.060, .004, 8, 24), caseMaterial)
    strap.rotation.y = Math.PI / 2
    strap.scale.y = .9
    strap.position.set(x, 0, .015)
    rig.add(strap)
  }

  const canvas = document.createElement("canvas")
  canvas.width = 640
  canvas.height = 410
  const context = canvas.getContext("2d")
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  const screen = new T.Mesh(new T.PlaneGeometry(.13, .082), new T.MeshBasicMaterial({
    map: texture, depthTest: false, toneMapped: false,
  }))
  screen.position.z = .0074
  terminal.add(screen)
  rig.traverse(object => { if (object.isMesh) object.renderOrder = 20 })
  terminal.children[0].renderOrder = 21
  screen.renderOrder = 22

  const hidden = new T.Vector3(-.29, -.53, -.32)
  const shown = new T.Vector3(-.16, -.105, -.36)
  const down = new T.Quaternion().setFromEuler(new T.Euler(.2, -.2, -.5))
  const up = new T.Quaternion().setFromEuler(new T.Euler(1.35, 0, .12))
  const number = new Intl.NumberFormat("tr", { maximumFractionDigits: 1 })
  let amount = 0
  return {
    draw(state, report) {
      context.fillStyle = "#100b08"
      context.fillRect(0, 0, 640, 410)
      context.strokeStyle = "#9e5027"
      context.lineWidth = 4
      context.strokeRect(12, 12, 616, 386)
      context.fillStyle = "#ffac64"
      context.font = "bold 31px monospace"
      context.fillText("ARES  /  SOL " + state.sol, 32, 65)
      const rows = [
        ["BATARYA", number.format(state.battery) + " / " + number.format(state.timeline.at(-1)?.capacity ?? 0)], 
        ["SU", number.format(state.supplies.water)],
        ["OKSİJEN", number.format(state.supplies.oxygen)],
        ["YİYECEK", number.format(state.supplies.food)],
      ]
      rows.forEach(([label, value], index) => {
        const y = 111 + index * 60
        context.fillStyle = "#24170f"
        context.fillRect(32, y - 27, 576, 48)
        context.fillStyle = "#ffce9d"
        context.fillText(label, 45, y + 6)
        context.textAlign = "right"
        context.fillText(value, 590, y + 6)
        context.textAlign = "left"
      })
      context.font = "bold 23px monospace"
      context.fillStyle = "#ffac64"
      context.fillText({ success: "GÖREV TAMAMLANDI", failed: "GÖREV BAŞARISIZ", "in-progress": "GÖREV: 10 SOL YAŞAM DESTEĞİ" }[report.status], 32, 372)
      texture.needsUpdate = true
    },
    frame(delta, raised) {
      amount = T.MathUtils.lerp(amount, Number(raised), Math.min(1, delta * 13))
      rig.visible = amount > .005
      rig.position.lerpVectors(hidden, shown, amount)
      rig.quaternion.slerpQuaternions(down, up, amount)
    },
  }
}
