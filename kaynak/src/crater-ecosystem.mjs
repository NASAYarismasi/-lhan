import * as T from "three"
import { createSolarFarm } from "./solar-farm.mjs"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

// DOM Elements
const el = id => document.getElementById(id)
const format = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 })

// Life Support Balance State
function updateBalance() {
  const days = Number(el("days").value)
  const recovery = Number(el("recovery").value)
  const totalOxygen = 3 * days * 0.84 // kg for 3 crew
  const byElectrolysis = el("electrolysis").checked
  const netWaterNeeded = 3 * days * 3.52 * (1 - recovery / 100) + (byElectrolysis ? totalOxygen * (9 / 8) : 0)
  const closedLoopSavedWater = 3 * days * 3.52 * (recovery / 100)
  
  el("days-value").value = days + " Dünya günü"
  el("recovery-value").value = "%" + recovery
  el("water").textContent = format.format(netWaterNeeded) + " kg"
  el("saved-water").textContent = format.format(closedLoopSavedWater) + " kg"
  el("oxygen").textContent = format.format(byElectrolysis ? 0 : totalOxygen) + " kg"
  el("food").textContent = format.format(3 * days * 3035) + " kcal"
}
for (const id of ["days", "recovery", "electrolysis"]) {
  const elem = el(id)
  if (elem) elem.addEventListener("input", updateBalance)
}
updateBalance()

// ============================================================================
// CRATER MORPHOLOGY & TERRAIN ELEVATION MATHEMATICS
// ============================================================================
// Based on planetary impact crater profiles (Pike, Melosh - Impact Cratering)
// Overturned rim flap, parabolic/sub-spherical bowl, central rebound peak,
// radial ejecta hummocks, and micro-impact superposition.

const CRATERS = [
  // Primary giant impact basins (visible in wide panorama like BBC photo)
  { cx: -32, cz: -48, r: 72, depth: 18.5, rimH: 5.2, peak: true, rays: 14 },
  { cx: 48,  cz: 28,  r: 54, depth: 14.0, rimH: 4.2, peak: true, rays: 11 },
  { cx: -52, cz: 45,  r: 46, depth: 11.5, rimH: 3.6, peak: false, rays: 8 },
  { cx: 62,  cz: -52, r: 60, depth: 15.5, rimH: 4.6, peak: true, rays: 12 },
  
  // Secondary impact craters (scattered across the ridges and terraces)
  { cx: -12, cz: -14, r: 24, depth: 6.8, rimH: 2.1, peak: false, rays: 6 },
  { cx: 18,  cz: -28, r: 20, depth: 5.5, rimH: 1.7, peak: false, rays: 5 },
  { cx: -6,  cz: 32,  r: 22, depth: 5.8, rimH: 1.8, peak: false, rays: 6 },
  { cx: 32,  cz: -10, r: 18, depth: 4.8, rimH: 1.5, peak: false, rays: 4 },
  { cx: -68, cz: -8,  r: 28, depth: 7.5, rimH: 2.3, peak: false, rays: 7 },
  { cx: 14,  cz: 68,  r: 30, depth: 8.2, rimH: 2.5, peak: false, rays: 8 },
  { cx: 75,  cz: 12,  r: 25, depth: 6.9, rimH: 2.2, peak: false, rays: 6 },
  
  // Tertiary impact craters (prominent in midground & walking views)
  { cx: 6,   cz: -4,  r: 10, depth: 2.8, rimH: 0.95, peak: false },
  { cx: -20, cz: 14,  r: 13, depth: 3.4, rimH: 1.1, peak: false },
  { cx: 25,  cz: 40,  r: 14, depth: 3.7, rimH: 1.2, peak: false },
  { cx: -36, cz: -20, r: 9,  depth: 2.4, rimH: 0.8, peak: false },
  { cx: 46,  cz: 6,   r: 12, depth: 3.2, rimH: 1.0, peak: false },
  { cx: -10, cz: -62, r: 16, depth: 4.2, rimH: 1.3, peak: false },
  { cx: 70,  cz: -18, r: 17, depth: 4.5, rimH: 1.4, peak: false },
  { cx: -68, cz: 42,  r: 15, depth: 3.9, rimH: 1.2, peak: false },
  { cx: 0,   cz: 22,  r: 8,  depth: 2.2, rimH: 0.75, peak: false },
  { cx: -30, cz: 30,  r: 7,  depth: 1.9, rimH: 0.65, peak: false },
  { cx: 34,  cz: -36, r: 9,  depth: 2.5, rimH: 0.8, peak: false },
  { cx: 14,  cz: -46, r: 6,  depth: 1.6, rimH: 0.55, peak: false },
  { cx: -16, cz: -36, r: 8,  depth: 2.1, rimH: 0.7, peak: false },
  { cx: -50, cz: -56, r: 11, depth: 2.9, rimH: 0.95, peak: false },
  { cx: 42,  cz: 58,  r: 11, depth: 3.0, rimH: 0.95, peak: false },
  { cx: -3,  cz: -22, r: 7,  depth: 1.8, rimH: 0.6, peak: false },
  { cx: -24, cz: -2,  r: 8,  depth: 2.2, rimH: 0.7, peak: false },
  { cx: 18,  cz: 16,  r: 7,  depth: 1.9, rimH: 0.65, peak: false },
  { cx: -42, cz: 20,  r: 10, depth: 2.7, rimH: 0.85, peak: false },
  { cx: 55,  cz: 42,  r: 12, depth: 3.2, rimH: 1.0, peak: false },
  
  // Field of small pockmarks near the base
  { cx: 8,   cz: 8,   r: 4.2, depth: 1.1, rimH: 0.38, peak: false },
  { cx: -7,  cz: 5,   r: 3.8, depth: 0.95, rimH: 0.32, peak: false },
  { cx: 3,   cz: -12, r: 4.5, depth: 1.2, rimH: 0.4, peak: false },
  { cx: -14, cz: -4,  r: 4.0, depth: 1.0, rimH: 0.35, peak: false },
  { cx: 12,  cz: -2,  r: 3.5, depth: 0.85, rimH: 0.3, peak: false },
  { cx: -4,  cz: -16, r: 3.2, depth: 0.8, rimH: 0.28, peak: false },
  { cx: 7,   cz: 18,  r: 4.8, depth: 1.3, rimH: 0.42, peak: false }
]

// Düz zemin bölgeleri: koloni sahası ve iniş düzlükleri.
// inner yarıçapında tamamen düz, outer yarıçapına kadar yumuşak geçiş.
const FLAT_ZONES = [
  { cx: -62, cz: 52, inner: 42, outer: 58 }, // Engineered solar-field terrace
  { cx: 0, cz: 0, inner: 36, outer: 60 },      // Koloni sahası (krater tabanı)
  { cx: -150, cz: 130, inner: 42, outer: 78 }, // Batı iniş düzlüğü
  { cx: 160, cz: -140, inner: 46, outer: 84 }, // Doğu iniş düzlüğü
  { cx: 110, cz: 150, inner: 36, outer: 68 },  // Güney ovası
]

// Kraterlerin dikey etkisi: Mars ovası hissi için yumuşatılmış derinlik
const CRATER_DEPTH_SCALE = 0.66
const CRATER_RIM_SCALE = 0.8

function regionalHeight(x, z) {
  return 4.2 * Math.sin(x * 0.016 + z * 0.012) +
         2.8 * Math.cos(x * 0.009 - z * 0.021) +
         1.1 * Math.sin(x * 0.038 - z * 0.031)
}

// Ham (düzleştirilmemiş) yükseklik
function rawTerrainHeight(x, z) {
  let y = regionalHeight(x, z)

  // 2. Accumulate impact crater morphologies
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i]
    const dx = x - c.cx
    const dz = z - c.cz
    const d = Math.hypot(dx, dz)
    const rho = d / c.r

    if (rho < 2.8) {
      if (rho < 1.0) {
        const innerSlope = Math.pow(Math.max(0, 1.0 - rho * rho), 0.72)
        const bowl = -c.depth * innerSlope
        const rimInfluence = c.rimH * Math.exp(-Math.pow((rho - 1.0) / 0.15, 2))

        let peakH = 0
        if (c.peak && rho < 0.28) {
          peakH = (c.depth * 0.42) * Math.exp(-Math.pow(rho / 0.09, 2))
        }

        y += (bowl + peakH) * CRATER_DEPTH_SCALE + rimInfluence * CRATER_RIM_SCALE
      } else {
        const delta = rho - 1.0
        const angle = Math.atan2(dz, dx)
        const lobeNoise = 1.0 + 0.14 * Math.cos((c.rays || 7) * angle) +
                          0.07 * Math.sin((c.rays ? c.rays * 2 : 13) * angle)

        const ejecta = c.rimH * Math.exp(-3.2 * delta) * lobeNoise
        y += ejecta * CRATER_RIM_SCALE
      }
    }
  }

  // 3. Fine fractal regolith roughness
  const microNoise = 0.22 * Math.sin(x * 0.95 + z * 0.52) * Math.cos(z * 0.81 - x * 0.44) +
                     0.10 * Math.sin(x * 2.1 - z * 1.7) * Math.sin(z * 2.4 + x * 1.3) +
                     0.04 * Math.sin(x * 4.8 + z * 5.1)
  return y + microNoise
}

const flatLevels = new Array(FLAT_ZONES.length).fill(null)

// Düz bölgelerin referans kotu: bölge merkezinin ham yüksekliği
function zoneLevel(index) {
  if (flatLevels[index] === null) {
    const zone = FLAT_ZONES[index]
    flatLevels[index] = rawTerrainHeight(zone.cx, zone.cz)
  }
  return flatLevels[index]
}

export function getTerrainHeight(x, z) {
  let y = rawTerrainHeight(x, z)

  for (let i = 0; i < FLAT_ZONES.length; i++) {
    const zone = FLAT_ZONES[i]
    const distance = Math.hypot(x - zone.cx, z - zone.cz)
    if (distance >= zone.outer) continue
    const t = distance <= zone.inner ? 1 : 1 - (distance - zone.inner) / (zone.outer - zone.inner)
    const blend = t * t * (3 - 2 * t)
    y = y * (1 - blend) + zoneLevel(i) * blend
  }

  return y
}

// ============================================================================
// DYNAMIC PROCEDURAL TEXTURE GENERATION (HIGH-RESOLUTION REGOLITH)
// ============================================================================
// Kusursuz (seamless) tiling yüzey detayı: kum tanesi, çakıl ve mikro çukur.
// 2048px genel albedo 620m'yi kapladığı için yakın planda bulanık kalıyor;
// bu doku shader içinde çarpılarak gerçek regolit tanesini geri getirir.
function generateSurfaceDetailTexture() {
  const size = 512
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  let seed = 13177
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  // Temel kum gürültüsü (ortalama 0.5)
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + (rnd() - 0.5) * 120
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v))
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)

  const wrapped = (draw) => {
    for (let ox = -size; ox <= size; ox += size) {
      for (let oy = -size; oy <= size; oy += size) draw(ox, oy)
    }
  }

  // Yumuşak toz lekeleri
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 18 + rnd() * 70
    wrapped((ox, oy) => {
      const grad = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
      const tone = rnd() < 0.5 ? 255 : 0
      grad.addColorStop(0, "rgba(" + tone + "," + tone + "," + tone + ",0.10)")
      grad.addColorStop(1, "rgba(" + tone + "," + tone + "," + tone + ",0)")
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Çakıl taneleri: açık ve koyu, hafif gölgeli
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 0.7 + Math.pow(rnd(), 2.4) * 5.2
    const rot = rnd() * Math.PI
    const light = rnd() < 0.55
    const value = light ? 175 + rnd() * 70 : 45 + rnd() * 55
    wrapped((ox, oy) => {
      ctx.fillStyle = "rgba(" + Math.round(value) + "," + Math.round(value) + "," + Math.round(value) + "," + (0.28 + rnd() * 0.35) + ")"
      ctx.beginPath()
      ctx.ellipse(x + ox, y + oy, r, r * (0.55 + rnd() * 0.5), rot, 0, Math.PI * 2)
      ctx.fill()

      // ışık yönü hissi: üst kenarı aydınlat
      ctx.strokeStyle = "rgba(255,255,255,0.16)"
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(x + ox, y + oy, r * 1.02, Math.PI * 1.05, Math.PI * 1.85)
      ctx.stroke()
    })
  }

  // İnce kum sırtları
  ctx.lineWidth = 1
  for (let i = 0; i < 40; i++) {
    const y0 = rnd() * size
    const amp = 2 + rnd() * 6
    const freq = 0.02 + rnd() * 0.05
    ctx.strokeStyle = rnd() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"
    ctx.beginPath()
    for (let x = 0; x <= size; x += 4) {
      const y = y0 + Math.sin(x * freq + i) * amp
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const texture = new T.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = T.RepeatWrapping
  texture.colorSpace = T.NoColorSpace
  texture.anisotropy = 16
  return texture
}

function generateRegolithTextures(isMoonMode = false, extent = 450) {
  const size = 2048
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  // Tozlu Mars regoliti: kızıl toprak, açık toz lekeleri, bazalt çakıl.
  // Ay modu aynı üreticiyi monokrom paletle kullanır (karşılaştırma görünümü).
  const pal = isMoonMode
    ? { base: [146, 147, 152], light: [216, 217, 221], dark: [76, 77, 82], rock: [118, 119, 125], ray: [238, 240, 244] }
    : { base: [148, 95, 72], light: [203, 158, 126], dark: [88, 54, 43], rock: [121, 82, 64], ray: [212, 160, 122] }

  const css = (tone, alpha) => "rgba(" + tone[0] + ", " + tone[1] + ", " + tone[2] + ", " + alpha + ")"

  ctx.fillStyle = css(pal.base, 1)
  ctx.fillRect(0, 0, size, size)

  let seed = 4921
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  const worldToTex = (wx, wz) => ({
    u: ((wx + extent) / (2 * extent)) * size,
    v: ((wz + extent) / (2 * extent)) * size
  })

  // 1. Büyük toz ve toprak lekeleri: yumuşak, doğal renk geçişleri
  for (let i = 0; i < 360; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 26 + Math.pow(rnd(), 2.1) * 165
    const tone = rnd() < 0.55 ? pal.light : pal.dark
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, css(tone, 0.14 + rnd() * 0.24))
    grad.addColorStop(1, css(tone, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Orta ölçek: toz birikintileri ve çakıl cepleri (yakın planda okunur)
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 2 + Math.pow(rnd(), 1.6) * 15
    const tone = rnd() < 0.5 ? pal.light : pal.dark
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, css(tone, 0.10 + rnd() * 0.18))
    grad.addColorStop(1, css(tone, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 2. Rüzgâr dalgaları: ince kum sırtları
  ctx.lineWidth = 2
  for (let band = 0; band < 90; band++) {
    const y0 = rnd() * size
    const amp = 2 + rnd() * 8
    const freq = 0.004 + rnd() * 0.012
    const tone = rnd() < 0.5 ? pal.light : pal.dark
    ctx.strokeStyle = css(tone, 0.03 + rnd() * 0.05)
    ctx.beginPath()
    for (let x = 0; x <= size; x += 8) {
      const y = y0 + Math.sin(x * freq + band) * amp + Math.sin(x * freq * 2.7) * amp * 0.4
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // 3. Krater çevresinde yumuşak ejecta örtüsü ve soluk ışınlar
  for (const c of CRATERS) {
    const pos = worldToTex(c.cx, c.cz)
    const texRadius = (c.r / (2 * extent)) * size

    const halo = ctx.createRadialGradient(pos.u, pos.v, texRadius * 0.8, pos.u, pos.v, texRadius * 3.0)
    halo.addColorStop(0, css(pal.ray, isMoonMode ? 0.42 : 0.20))
    halo.addColorStop(0.45, css(pal.ray, isMoonMode ? 0.22 : 0.10))
    halo.addColorStop(1, css(pal.ray, 0))
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(pos.u, pos.v, texRadius * 3.0, 0, Math.PI * 2)
    ctx.fill()

    const rayCount = c.rays || 8
    ctx.lineWidth = Math.max(1, (c.r / extent) * size * 0.05)
    for (let a = 0; a < rayCount; a++) {
      const angle = (a / rayCount) * Math.PI * 2 + c.cx * 0.1
      const rayLen = texRadius * (1.5 + 1.1 * Math.sin(a * 3.7))
      ctx.strokeStyle = css(pal.ray, isMoonMode ? 0.26 : 0.09)
      ctx.beginPath()
      ctx.moveTo(pos.u + Math.cos(angle) * texRadius * 0.9, pos.v + Math.sin(angle) * texRadius * 0.9)
      ctx.lineTo(pos.u + Math.cos(angle) * rayLen, pos.v + Math.sin(angle) * rayLen)
      ctx.stroke()
    }

    const floor = ctx.createRadialGradient(pos.u, pos.v, 0, pos.u, pos.v, texRadius)
    floor.addColorStop(0, css(pal.dark, 0.52))
    floor.addColorStop(0.72, css(pal.dark, 0.30))
    floor.addColorStop(1, css(pal.dark, 0))
    ctx.fillStyle = floor
    ctx.beginPath()
    ctx.arc(pos.u, pos.v, texRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  // 4. Küçük çarpma çukurları
  for (let i = 0; i < 700; i++) {
    const mx = rnd() * size
    const my = rnd() * size
    const mr = 1.2 + Math.pow(rnd(), 3) * 9

    ctx.fillStyle = css(pal.dark, 0.18 + rnd() * 0.28)
    ctx.beginPath()
    ctx.arc(mx, my, mr, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = css(pal.light, 0.16 + rnd() * 0.22)
    ctx.lineWidth = Math.max(1, mr * 0.3)
    ctx.beginPath()
    ctx.arc(mx, my, mr * 1.05, Math.PI * 0.8, Math.PI * 1.6)
    ctx.stroke()
  }

  // 5. Çakıl, taş ve toz taneleri (Mars yüzeyinin karakteristik dokusu)
  for (let i = 0; i < 18000; i++) {
    const mx = rnd() * size
    const my = rnd() * size
    const mr = 0.5 + Math.pow(rnd(), 2) * 3.6
    const pick = rnd()
    const tone = pick < 0.45 ? pal.rock : pick < 0.8 ? pal.dark : pal.light
    ctx.fillStyle = css(tone, 0.16 + rnd() * 0.46)
    ctx.beginPath()
    ctx.ellipse(mx, my, mr, mr * (0.55 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // 6. İnce gren
  const imgData = ctx.getImageData(0, 0, size, size)
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    const grain = (rnd() - 0.5) * (isMoonMode ? 26 : 18)
    d[i] = Math.min(255, Math.max(0, d[i] + grain))
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain))
  }
  ctx.putImageData(imgData, 0, 0)

  const albedoTexture = new T.CanvasTexture(canvas)
  albedoTexture.colorSpace = T.SRGBColorSpace
  albedoTexture.wrapS = albedoTexture.wrapT = T.ClampToEdgeWrapping
  albedoTexture.anisotropy = 16

  // Yakın plan için tekrar eden ince taneli kabartma dokusu
  const detail = document.createElement("canvas")
  detail.width = detail.height = 256
  const dCtx = detail.getContext("2d")
  const dImg = dCtx.createImageData(256, 256)
  for (let i = 0; i < dImg.data.length; i += 4) {
    const v = 96 + rnd() * 96
    dImg.data[i] = dImg.data[i + 1] = dImg.data[i + 2] = v
    dImg.data[i + 3] = 255
  }
  dCtx.putImageData(dImg, 0, 0)
  const bumpTexture = new T.CanvasTexture(detail)
  bumpTexture.wrapS = bumpTexture.wrapT = T.RepeatWrapping
  bumpTexture.repeat.set(extent * 0.85, extent * 0.85)
  bumpTexture.anisotropy = 8

  return { albedoTexture, bumpTexture }
}

// ============================================================================
// MAIN 3D APPLICATION INITIALIZATION
// ============================================================================
async function initCraterEnvironment() {
  const canvas = el("scene")
  const viewport = el("viewport")
  
  // High-performance WebGL2 renderer
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  })
  renderer.setPixelRatio(Math.min(2.0, window.devicePixelRatio))
  renderer.setSize(viewport.clientWidth, viewport.clientHeight, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = T.SRGBColorSpace

  const scene = new T.Scene()
  scene.background = new T.Color(0x0b0806)

  // Mars toz pusu: uzak arazi boğuk bir ufuk çizgisine karışır
  const fogColor = new T.Color(0xd9a684)
  scene.fog = new T.FogExp2(fogColor, 0.0042)

  // Tozlu gökyüzü kubbesi (ufukta açık kayısı, zirvede somon)
  const skyCanvas = document.createElement("canvas")
  skyCanvas.width = 8
  skyCanvas.height = 512
  const skyCtx = skyCanvas.getContext("2d")
  const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512)
  skyGradient.addColorStop(0, "#8d5a45")
  skyGradient.addColorStop(0.45, "#b87f61")
  skyGradient.addColorStop(0.75, "#d3a385")
  skyGradient.addColorStop(1, "#e8c6a6")
  skyCtx.fillStyle = skyGradient
  skyCtx.fillRect(0, 0, 8, 512)
  const skyTexture = new T.CanvasTexture(skyCanvas)
  skyTexture.colorSpace = T.SRGBColorSpace
  const skyDome = new T.Mesh(
    new T.SphereGeometry(1250, 32, 24),
    new T.MeshBasicMaterial({ map: skyTexture, side: T.BackSide, fog: false, depthWrite: false })
  )
  skyDome.name = "MarsSky"
  scene.add(skyDome)

  const camera = new T.PerspectiveCamera(48, viewport.clientWidth / viewport.clientHeight, 0.1, 1400)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 2
  controls.maxDistance = 380
  controls.maxPolarAngle = Math.PI / 2 - 0.015

  // ==========================================================================
  // CELESTIAL ENVIRONMENT (STARS & EARTH IN THE SKY)
  // ==========================================================================
  // Starfield: 3,500 sharp points in space
  const starGeo = new T.BufferGeometry()
  const starCount = 3500
  const starPositions = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  
  let sSeed = 7129
  function sRnd() {
    sSeed = (Math.imul(sSeed, 1664525) + 1013904223) >>> 0
    return sSeed / 4294967296
  }

  for (let i = 0; i < starCount; i++) {
    const theta = sRnd() * Math.PI * 2
    const phi = Math.acos(sRnd() * 2 - 1)
    const dist = 750 + sRnd() * 250
    starPositions[i * 3]     = dist * Math.sin(phi) * Math.cos(theta)
    starPositions[i * 3 + 1] = Math.abs(dist * Math.cos(phi)) // Keep mostly in upper hemisphere
    starPositions[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta)

    const shade = 0.7 + sRnd() * 0.3
    const hueChoice = sRnd()
    if (hueChoice < 0.2) {
      starColors[i * 3] = shade * 0.85; starColors[i * 3 + 1] = shade * 0.92; starColors[i * 3 + 2] = shade * 1.0 // Blue-white
    } else if (hueChoice < 0.35) {
      starColors[i * 3] = shade * 1.0; starColors[i * 3 + 1] = shade * 0.88; starColors[i * 3 + 2] = shade * 0.72 // Gold-amber
    } else {
      starColors[i * 3] = shade; starColors[i * 3 + 1] = shade; starColors[i * 3 + 2] = shade // Pure white
    }
  }
  starGeo.setAttribute("position", new T.BufferAttribute(starPositions, 3))
  starGeo.setAttribute("color", new T.BufferAttribute(starColors, 3))

  const starMat = new T.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  })
  const starField = new T.Points(starGeo, starMat)
  starField.visible = false
  scene.add(starField)

  // 3D Earth floating in space (The iconic Earthrise view above lunar craters)
  const earthGroup = new T.Group()
  earthGroup.position.set(-140, 95, -220)
  
  // Earth surface canvas texture
  const earthCanvas = document.createElement("canvas")
  earthCanvas.width = 512; earthCanvas.height = 256
  const eCtx = earthCanvas.getContext("2d")
  eCtx.fillStyle = "#0c2c62" // Ocean blue
  eCtx.fillRect(0, 0, 512, 256)
  
  // Continents (Africa, Europe, Americas approximation)
  eCtx.fillStyle = "#2d5a27"
  eCtx.beginPath()
  eCtx.ellipse(230, 110, 48, 75, 0.2, 0, Math.PI * 2); eCtx.fill() // Africa
  eCtx.beginPath()
  eCtx.ellipse(220, 55, 38, 30, -0.1, 0, Math.PI * 2); eCtx.fill() // Europe
  eCtx.beginPath()
  eCtx.ellipse(120, 75, 45, 55, -0.2, 0, Math.PI * 2); eCtx.fill() // N. America
  eCtx.beginPath()
  eCtx.ellipse(150, 160, 32, 60, 0.2, 0, Math.PI * 2); eCtx.fill() // S. America
  eCtx.beginPath()
  eCtx.ellipse(340, 80, 85, 45, 0.1, 0, Math.PI * 2); eCtx.fill() // Asia
  
  // Swirling white clouds
  eCtx.fillStyle = "rgba(255, 255, 255, 0.72)"
  for (let c = 0; c < 30; c++) {
    eCtx.beginPath()
    eCtx.ellipse(sRnd() * 512, sRnd() * 256, 35 + sRnd() * 45, 12 + sRnd() * 18, sRnd() * Math.PI, 0, Math.PI * 2)
    eCtx.fill()
  }

  const earthTex = new T.CanvasTexture(earthCanvas)
  earthTex.colorSpace = T.SRGBColorSpace
  
  const earthMesh = new T.Mesh(
    new T.SphereGeometry(18, 48, 36),
    new T.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.1
    })
  )
  earthGroup.add(earthMesh)

  // Glowing blue atmospheric limb halo
  const atmosphereMesh = new T.Mesh(
    new T.SphereGeometry(18.9, 48, 36),
    new T.MeshBasicMaterial({
      color: 0x4896ff,
      transparent: true,
      opacity: 0.38,
      side: T.BackSide
    })
  )
  earthGroup.add(atmosphereMesh)
  earthGroup.visible = false
  scene.add(earthGroup)

  // ==========================================================================
  // HARSH SPACE SOLAR LIGHTING & SHADOWS
  // ==========================================================================
  // 1. Directional Sun Light: Low grazing angle to cast dramatic crater shadows
  const sunLight = new T.DirectionalLight(0xffe2c6, 2.7)
  sunLight.position.set(-70, 140, 115)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.near = 10
  sunLight.shadow.camera.far = 400
  sunLight.shadow.camera.left = -160
  sunLight.shadow.camera.right = 160
  sunLight.shadow.camera.top = 160
  sunLight.shadow.camera.bottom = -160
  sunLight.shadow.bias = -0.0004
  sunLight.shadow.normalBias = 0.05
  scene.add(sunLight)

  // 2. Faint Earthshine / Starlight Ambient
  const earthshineLight = new T.HemisphereLight(0xdfae8c, 0x7d4d38, 1.05)
  scene.add(earthshineLight)

  // ==========================================================================
  // TERRAIN MESH GENERATION (DENSE SUBDIVIDED CRATER FIELD)
  // ==========================================================================
  const terrainSize = 620 // 620m x 620m: kesintisiz Mars ovası ve uzak sırtlar
  const segments = 320    // ~2m çözünürlük
  const terrainGeo = new T.PlaneGeometry(terrainSize, terrainSize, segments, segments)
  terrainGeo.rotateX(-Math.PI / 2) // Orient to X-Z plane

  const posAttr = terrainGeo.attributes.position
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const z = posAttr.getZ(i)
    const y = getTerrainHeight(x, z)
    posAttr.setY(i, y)
  }
  terrainGeo.computeVertexNormals()

  // Mars regolit dokuları (tema ile Ay referansına çevrilebilir)
  let currentTheme = "mars"
  const terrainExtent = terrainSize / 2
  let { albedoTexture, bumpTexture } = generateRegolithTextures(false, terrainExtent)

  const terrainMat = new T.MeshStandardMaterial({
    map: albedoTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.42,
    roughness: 1.0,
    metalness: 0.02
  })

  // Yakın planda kum/çakıl tanesini geri getiren tiling detay katmanı.
  // İki farklı ölçekte örneklenir; tekrar deseni böylece görünmez olur.
  const surfaceDetail = generateSurfaceDetailTexture()
  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetailMap = { value: surfaceDetail }
    shader.uniforms.uDetailScale = { value: 84 }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uDetailMap;\nuniform float uDetailScale;"
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float dA = texture2D(uDetailMap, vMapUv * uDetailScale).r;
        float dB = texture2D(uDetailMap, vMapUv * uDetailScale * 3.17 + vec2(0.37, 0.11)).r;
        float dGrain = dA * 0.66 + dB * 0.34;
        diffuseColor.rgb *= 0.62 + dGrain * 0.82;`
      )
  }
  terrainMat.customProgramCacheKey = () => "mars-regolith-detail-v1"

  const terrainMesh = new T.Mesh(terrainGeo, terrainMat)
  terrainMesh.receiveShadow = true
  terrainMesh.castShadow = true
  scene.add(terrainMesh)

  // ==========================================================================
  // UZAK TEPELER (MARS UFUK SIRTLARI)
  // ==========================================================================
  const hills = new T.Group()
  const hillMat = new T.MeshStandardMaterial({ color: 0x9d6b53, roughness: 1, metalness: 0, flatShading: true })
  const hillMatFar = new T.MeshStandardMaterial({ color: 0xb08a6f, roughness: 1, metalness: 0, flatShading: true })
  const moundGeo = new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)

  let hSeed = 4711
  const hRnd = () => {
    hSeed = (Math.imul(hSeed, 1664525) + 1013904223) >>> 0
    return hSeed / 4294967296
  }

  for (let ring = 0; ring < 2; ring++) {
    const baseRadius = ring === 0 ? 250 : 390
    for (let i = 0; i < 54; i++) {
      const angle = (i / 54) * Math.PI * 2 + hRnd() * 0.09
      const radius = baseRadius + hRnd() * (ring === 0 ? 55 : 90)
      const width = (ring === 0 ? 34 : 60) + hRnd() * (ring === 0 ? 45 : 80)
      const height = (ring === 0 ? 6 : 11) + hRnd() * (ring === 0 ? 12 : 22)
      const mound = new T.Mesh(moundGeo, ring === 0 ? hillMat : hillMatFar)
      mound.scale.set(width, height, width * (0.5 + hRnd() * 0.5))
      mound.position.set(Math.cos(angle) * radius, -height * 0.18, Math.sin(angle) * radius)
      mound.rotation.y = hRnd() * Math.PI
      mound.receiveShadow = true
      hills.add(mound)
    }
  }
  scene.add(hills)

  // ==========================================================================
  // INSTANCED BOULDERS & IMPACT BRECCIA FIELDS
  // ==========================================================================
  // Mars taş tarlası: iri kayalar, yassı tabakalar ve çakıl
  const rockMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0.03, flatShading: true })
  const slabMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0.02 })
  const pebbleMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0.02, flatShading: true })

  const dummy = new T.Object3D()
  const tint = new T.Color()
  const rockLayers = []

  let rSeed = 8831
  function rRnd() {
    rSeed = (Math.imul(rSeed, 1664525) + 1013904223) >>> 0
    return rSeed / 4294967296
  }

  function scatterRocks(mesh, count, options) {
    const tints = []
    let placed = 0
    let guard = 0
    while (placed < count && guard < count * 20) {
      guard++
      let x, z
      if (rRnd() < 0.65) {
        const angle = rRnd() * Math.PI * 2
        const radius = Math.sqrt(rRnd()) * options.radius
        x = Math.cos(angle) * radius
        z = Math.sin(angle) * radius
      } else {
        const c = CRATERS[Math.floor(rRnd() * CRATERS.length)]
        const angle = rRnd() * Math.PI * 2
        const distance = c.r * (0.75 + rRnd() * 0.7)
        x = c.cx + Math.cos(angle) * distance
        z = c.cz + Math.sin(angle) * distance
      }
      // Üssün oturduğu alanı boş bırak
      if (Math.hypot(x, z) < options.pad || ((x + 62 > -27 && x + 62 < 41) && Math.abs(z - 52) < 31)) continue

      const scale = options.minScale + Math.pow(rRnd(), 2.6) * (options.maxScale - options.minScale)
      dummy.position.set(x, getTerrainHeight(x, z) + scale * (0.32 - options.bury), z)
      const tilt = options.tilt === undefined ? Math.PI : options.tilt
      dummy.rotation.set((rRnd() - 0.5) * tilt, rRnd() * Math.PI * 2, (rRnd() - 0.5) * tilt)
      dummy.scale.set(scale, scale * options.flat * (0.5 + rRnd() * 0.6), scale * (0.7 + rRnd() * 0.6))
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)
      tints.push({ pick: Math.floor(rRnd() * options.palette.length), light: (rRnd() - 0.5) * 0.12 })
      placed++
    }
    mesh.count = placed
    mesh.instanceMatrix.needsUpdate = true
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.tints = tints
    mesh.userData.palette = options.palette
    rockLayers.push(mesh)
    scene.add(mesh)
  }

  function paintRocks(isMoonMode) {
    for (const mesh of rockLayers) {
      const palette = isMoonMode
        ? [0x6f7076, 0x83848a, 0x9a9ba1, 0x5c5d63, 0x8a8b91]
        : mesh.userData.palette
      mesh.userData.tints.forEach((entry, index) => {
        tint.setHex(palette[entry.pick % palette.length])
        tint.offsetHSL(0, 0, entry.light)
        mesh.setColorAt(index, tint)
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  const MARS_ROCK_COLORS = [0x8a6350, 0x9c7460, 0xa88268, 0x74503f, 0xb59a83]
  const MARS_SLAB_COLORS = [0x8f6a56, 0xa07c65, 0x7a5746, 0xb19079, 0x6d4d3f]
  const MARS_PEBBLE_COLORS = [0x7d5747, 0x96705a, 0xa9876d, 0x6a4a3c]

  scatterRocks(new T.InstancedMesh(new T.DodecahedronGeometry(1, 1), rockMat, 1500), 1500, {
    minScale: 0.16, maxScale: 1.9, flat: 1, radius: 280, bury: 0.34, pad: 30, palette: MARS_ROCK_COLORS,
  })
  scatterRocks(new T.InstancedMesh(new T.BoxGeometry(1, 1, 1, 2, 1, 2), slabMat, 1100), 1100, {
    minScale: 0.4, maxScale: 2.6, flat: 0.16, radius: 240, bury: 0.42, pad: 28, palette: MARS_SLAB_COLORS, tilt: 0.22,
  })
  scatterRocks(new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), pebbleMat, 12000), 12000, {
    minScale: 0.035, maxScale: 0.26, flat: 0.7, radius: 140, bury: 0.42, pad: 12, palette: MARS_PEBBLE_COLORS, tilt: 1.1,
  })
  // Koloni sahasının çevresindeki ince çakıl halısı (yakın plan dokusu)
  scatterRocks(new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), pebbleMat, 22000), 22000, {
    minScale: 0.02, maxScale: 0.11, flat: 0.65, radius: 58, bury: 0.45, pad: 8, palette: MARS_PEBBLE_COLORS, tilt: 1.3,
  })
  paintRocks(false)

  // ==========================================================================
  // RESEARCH BASE MODULES & LIFE SUPPORT COLONY (LOCATED ON TERRACE AT X=0, Z=0)
  // ==========================================================================
  const colonyGroup = new T.Group()
  const baseObstacles = []

  function placeBaseItem(object, x, z, yaw = 0) {
    const y = getTerrainHeight(x, z)
    object.position.set(x, y, z)
    object.rotation.y = yaw
    object.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    colonyGroup.add(object)
    
    // Add collision bounding box for FPS
    const box = new T.Box3().setFromObject(object).expandByScalar(0.4)
    baseObstacles.push(box)
    return object
  }

  // 1. Habitat Demonstration Unit (NASA HDU)
  function createHabitatModule() {
    const group = new T.Group()
    
    // Main cylindrical body
    const bodyGeo = new T.CylinderGeometry(3.6, 3.6, 4.2, 24)
    const bodyMat = new T.MeshStandardMaterial({
      color: 0xdededf,
      roughness: 0.35,
      metalness: 0.45
    })
    const body = new T.Mesh(bodyGeo, bodyMat)
    body.position.y = 2.1
    group.add(body)

    // Top dome
    const domeGeo = new T.SphereGeometry(3.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const dome = new T.Mesh(domeGeo, bodyMat)
    dome.position.y = 4.2
    group.add(dome)

    // Airlock module
    const airlockGeo = new T.BoxGeometry(2.2, 2.4, 2.8)
    const airlockMat = new T.MeshStandardMaterial({ color: 0x42464d, roughness: 0.6, metalness: 0.5 })
    const airlock = new T.Mesh(airlockGeo, airlockMat)
    airlock.position.set(0, 1.2, 3.8)
    group.add(airlock)

    // Foundation support legs
    const legMat = new T.MeshStandardMaterial({ color: 0xb58b2e, metalness: 0.8, roughness: 0.3 })
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const leg = new T.Mesh(new T.CylinderGeometry(0.12, 0.22, 1.6), legMat)
      leg.position.set(Math.cos(angle) * 3.5, 0.4, Math.sin(angle) * 3.5)
      group.add(leg)
    }

    return group
  }
  placeBaseItem(createHabitatModule(), 0, 0, 0.2)

  // 2. Hydroponic Greenhouse Dome (Sera Ünitesi)
  function createGreenhouseDome() {
    const group = new T.Group()
    
    // Base ring
    const ring = new T.Mesh(
      new T.CylinderGeometry(4.2, 4.4, 0.8, 24),
      new T.MeshStandardMaterial({ color: 0x383a3f, roughness: 0.7 })
    )
    ring.position.y = 0.4
    group.add(ring)

    // Translucent glass dome
    const dome = new T.Mesh(
      new T.SphereGeometry(4.2, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshStandardMaterial({
        color: 0x6ed4ff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
        metalness: 0.3
      })
    )
    dome.position.y = 0.8
    group.add(dome)

    // Glowing interior plant grow LED light (warm purple / photosynthetic magenta)
    const growLight = new T.PointLight(0xff55bb, 3.5, 14)
    growLight.position.set(0, 2.6, 0)
    group.add(growLight)

    // Hydroponic vertical crop trays inside
    const trayMat = new T.MeshStandardMaterial({ color: 0x228833, roughness: 0.8 })
    for (let r = 0; r < 4; r++) {
      const angle = (r / 4) * Math.PI * 2
      const tray = new T.Mesh(new T.BoxGeometry(0.8, 1.8, 1.6), trayMat)
      tray.position.set(Math.cos(angle) * 2.2, 1.4, Math.sin(angle) * 2.2)
      tray.rotation.y = angle
      group.add(tray)
    }

    return group
  }
  placeBaseItem(createGreenhouseDome(), 12, -4, 0.4)

  // 3. ECLSS Water Recovery & Sabatier Air Recycler
  function createECLSSModule() {
    const group = new T.Group()
    
    const container = new T.Mesh(
      new T.BoxGeometry(3.2, 2.2, 2.4),
      new T.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.5, metalness: 0.6 })
    )
    container.position.y = 1.1
    group.add(container)

    // Pressurized water storage tanks
    const tankGeo = new T.CylinderGeometry(0.65, 0.65, 2.6, 16)
    const tankMat = new T.MeshStandardMaterial({ color: 0x2a75d3, metalness: 0.7, roughness: 0.25 })
    
    const tank1 = new T.Mesh(tankGeo, tankMat)
    tank1.position.set(-0.9, 1.3, 1.3)
    group.add(tank1)
    
    const tank2 = new T.Mesh(tankGeo, tankMat)
    tank2.position.set(0.9, 1.3, 1.3)
    group.add(tank2)

    return group
  }
  placeBaseItem(createECLSSModule(), 8, 8, -0.3)

  // Detailed, dimensioned PV field on its own level terrace.
  const solarFarm = createSolarFarm(scene, getTerrainHeight, baseObstacles)

  // 5. High-Gain Communications Dish Antenna
  function createCommsDish() {
    const group = new T.Group()
    
    const pylon = new T.Mesh(new T.CylinderGeometry(0.25, 0.35, 4.2), new T.MeshStandardMaterial({ color: 0x555a62, metalness: 0.7 }))
    pylon.position.y = 2.1
    group.add(pylon)

    // Parabolic dish pointing up toward Earth
    const dish = new T.Mesh(
      new T.SphereGeometry(2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.8),
      new T.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.6, roughness: 0.3, side: T.DoubleSide })
    )
    dish.position.set(0, 4.4, 0)
    dish.rotation.x = -0.6
    dish.rotation.y = -0.8
    group.add(dish)

    return group
  }
  placeBaseItem(createCommsDish(), -8, -12, 0.5)

  // 6. Lunar / Planetary Rover (Keşif Aracı)
  function createRoverModel() {
    const group = new T.Group()
    
    const chassis = new T.Mesh(new T.BoxGeometry(2.8, 0.8, 1.8), new T.MeshStandardMaterial({ color: 0xb58b2e, metalness: 0.6, roughness: 0.4 }))
    chassis.position.y = 0.9
    group.add(chassis)

    // 6 wheels
    const wheelGeo = new T.CylinderGeometry(0.42, 0.42, 0.36, 16)
    const wheelMat = new T.MeshStandardMaterial({ color: 0x222225, roughness: 0.9 })
    wheelGeo.rotateZ(Math.PI / 2)

    for (const wx of [-1.1, 0, 1.1]) {
      for (const wz of [-1.1, 1.1]) {
        const w = new T.Mesh(wheelGeo, wheelMat)
        w.position.set(wx, 0.42, wz)
        group.add(w)
      }
    }

    // Science mast & camera
    const mast = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 1.6), new T.MeshStandardMaterial({ color: 0x444444 }))
    mast.position.set(1.0, 1.7, 0.4)
    group.add(mast)
    
    const camHead = new T.Mesh(new T.BoxGeometry(0.3, 0.2, 0.35), new T.MeshStandardMaterial({ color: 0x111111 }))
    camHead.position.set(1.0, 2.5, 0.4)
    group.add(camHead)

    return group
  }
  placeBaseItem(createRoverModel(), 6, -12, -0.6)

  // 7. Astronaut Figures (EVA Spacesuit Models)
  function createAstronaut(color = 0xdddddf) {
    const group = new T.Group()
    const suitMat = new T.MeshStandardMaterial({ color, roughness: 0.65 })
    const visorMat = new T.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.1 }) // Gold reflective visor

    // Torso & PLSS Backpack
    const torso = new T.Mesh(new T.BoxGeometry(0.65, 0.85, 0.45), suitMat)
    torso.position.y = 1.2
    group.add(torso)
    
    const backpack = new T.Mesh(new T.BoxGeometry(0.5, 0.7, 0.32), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }))
    backpack.position.set(0, 1.25, -0.35)
    group.add(backpack)

    // Helmet & Gold Visor
    const helmet = new T.Mesh(new T.SphereGeometry(0.28, 16, 16), suitMat)
    helmet.position.set(0, 1.82, 0)
    group.add(helmet)

    const visor = new T.Mesh(new T.SphereGeometry(0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), visorMat)
    visor.position.set(0, 1.82, 0.08)
    visor.rotation.x = Math.PI / 2
    group.add(visor)

    // Legs
    for (const lx of [-0.18, 0.18]) {
      const leg = new T.Mesh(new T.CylinderGeometry(0.12, 0.14, 0.75), suitMat)
      leg.position.set(lx, 0.42, 0)
      group.add(leg)
    }

    return group
  }
  placeBaseItem(createAstronaut(), 2.4, 4.2, -0.8)
  placeBaseItem(createAstronaut(), 3.6, 5.0, -1.2)
  scene.add(colonyGroup)

  // ==========================================================================
  // CAMERA VIEWPOINTS (MARS SURFACE)
  // ==========================================================================
  const poses = {
    solar: { pos: [8, solarFarm.level + 49, 119], target: [-55, solarFarm.level, 52] },
    // Exact perspective matching the user's uploaded BBC News photo
    // Elevated camera looking across the curved horizon with deep crater shadows
    panorama: {
      pos: [58, 28, 62],
      target: [-15, -4, -22]
    },
    // Front rim of the major 72m crater looking down into shadow
    rim: {
      pos: [-12, 14, -12],
      target: [-32, -10, -48]
    },
    // Research Base & Greenhouse overview
    base: {
      pos: [18, 14, 22],
      target: [1, -1.5, 0]
    },
    // Inside the massive crater basin looking up at towering rim walls
    basin: {
      pos: [-30, -14, -40],
      target: [-30, 8, 10]
    }
  }

  // ==========================================================================
  // FIRST PERSON EXPLORATION (FPS WALK ON THE CRATER RIM)
  // ==========================================================================
  const keys = new Set()
  let fpsActive = false
  const eyeHeight = 1.75
  const lookAngles = { yaw: 0, pitch: 0 }
  const walkSpeed = 5.2 // m/s
  let isPointerLocked = false

  function updateFPSCamera() {
    const cosPitch = Math.cos(lookAngles.pitch)
    const dir = new T.Vector3(
      -Math.sin(lookAngles.yaw) * cosPitch,
      Math.sin(lookAngles.pitch),
      -Math.cos(lookAngles.yaw) * cosPitch
    )
    const target = camera.position.clone().add(dir)
    camera.lookAt(target)
  }

  function setFPSActive(active) {
    fpsActive = active
    controls.enabled = !active
    
    const btn = el("fps-toggle")
    if (btn) {
      btn.setAttribute("aria-pressed", String(active))
      btn.textContent = active ? "Genel Panoramaya Dön (Esc)" : "Astronotun Gözünden Gez (FPS)"
    }
    
    const help = el("camera-help")
    if (help) {
      help.textContent = active
        ? "WASD ile yürü · Fare veya Ok Tuşlarıyla bak · Shift ile koş · Esc ile çık"
        : "Fareyle sürükleyerek bak, tekerlekle yaklaş. Krater morfolojisi ve gölgeler gerçek planetary bilim standartlarındadır."
    }

    if (active) {
      // Koloni sahasının dışında, düz ovaya bakan bir noktada başla
      const spawnX = 26
      const spawnZ = 34
      camera.position.set(spawnX, getTerrainHeight(spawnX, spawnZ) + eyeHeight, spawnZ)
      lookAngles.yaw = 0.66
      lookAngles.pitch = -0.06
      updateFPSCamera()
      
      // Request pointer lock for smooth FPS mouse look
      canvas.requestPointerLock?.()

      const hud = el("hud-telemetry")
      if (hud) {
        const groundY = getTerrainHeight(spawnX, spawnZ)
        hud.textContent = `Astronot FPS | X: ${spawnX.toFixed(1)}m | Y: ${groundY.toFixed(1)}m | O2: %100 | Güç: Normal`
      }
    } else {
      if (document.exitPointerLock) document.exitPointerLock()
      setView(activeView)
    }
  }

  const fps = {
    get active() { return fpsActive },
    setActive: setFPSActive,
    update(delta) {
      if (!fpsActive) return

      // Keyboard turn
      const turnX = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"))
      const turnY = Number(keys.has("ArrowUp")) - Number(keys.has("ArrowDown"))
      if (turnX || turnY) {
        lookAngles.yaw -= turnX * delta * 2.2
        lookAngles.pitch = Math.max(-1.3, Math.min(1.3, lookAngles.pitch + turnY * delta * 1.8))
        updateFPSCamera()
      }

      // Movement
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"))
      const strafe  = Number(keys.has("KeyD")) - Number(keys.has("KeyA"))
      const sprint  = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.8 : 1.0

      if (forward !== 0 || strafe !== 0) {
        const moveVector = new T.Vector3()
        const sinYaw = Math.sin(lookAngles.yaw)
        const cosYaw = Math.cos(lookAngles.yaw)

        // Forward vector (horizontal)
        const fX = -sinYaw * forward
        const fZ = -cosYaw * forward

        // Strafe vector (horizontal)
        const sX = cosYaw * strafe
        const sZ = -sinYaw * strafe

        moveVector.set(fX + sX, 0, fZ + sZ).normalize().multiplyScalar(walkSpeed * sprint * delta)

        const nextX = camera.position.x + moveVector.x
        const nextZ = camera.position.z + moveVector.z

        // Boundary limit (-170m .. +170m)
        if (Math.abs(nextX) < 170 && Math.abs(nextZ) < 170) {
          // Collision check against base structures
          const collides = baseObstacles.some(box =>
            nextX > box.min.x && nextX < box.max.x && nextZ > box.min.z && nextZ < box.max.z
          )
          if (!collides) {
            camera.position.x = nextX
            camera.position.z = nextZ
          }
        }

        // Stick to true crater terrain surface
        const groundY = getTerrainHeight(camera.position.x, camera.position.z)
        camera.position.y = groundY + eyeHeight
        updateFPSCamera()

        // Update live telemetry HUD
        const hud = el("hud-telemetry")
        if (hud) {
          hud.textContent = `X: ${camera.position.x.toFixed(1)}m | Y: ${groundY.toFixed(1)}m | Z: ${camera.position.z.toFixed(1)}m | O2: %100 | Güç: Normal`
        }
      }
    }
  }

  let activeView = "panorama"
  function setView(viewId) {
    if (fpsActive) setFPSActive(false)
    activeView = viewId
    const p = poses[viewId]
    if (p) {
      camera.position.fromArray(p.pos)
      controls.target.fromArray(p.target)
      controls.update()
      
      const buttons = el("views").querySelectorAll("button[data-view]")
      buttons.forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.view === viewId)))

      const hud = el("hud-telemetry")
      if (hud) {
        const viewLabels = {
          panorama: "Bakış: Mars Ovası Panoraması | Mod: Bilimsel Keşif",
          rim: "Bakış: 72m Krater Kenarı (Rim Crest) | Yükseklik: +14m",
          solar: "Bakış: Mars Güneş Tarlası | 42 masa / 420 panel / 840 m²",
          base: "Bakış: Düz Koloni Sahası | Modül: ECLSS",
          basin: "Bakış: Krater Tabanı (Derin Çanak) | Derinlik: -18.5m"
        }
        hud.textContent = viewLabels[viewId] || `Kamera: ${viewId}`
      }
    }
  }

  el("views").addEventListener("click", ev => {
    const v = ev.target.dataset.view
    if (v) setView(v)
  })

  // Set initial view matching reference image
  setView("solar")

  // Pointer lock & mouse movement
  canvas.addEventListener("click", () => {
    if (fpsActive && !isPointerLocked) {
      canvas.requestPointerLock?.()
    }
  })

  document.addEventListener("pointerlockchange", () => {
    isPointerLocked = document.pointerLockElement === canvas
  })

  window.addEventListener("mousemove", ev => {
    if (!fpsActive || !isPointerLocked) return
    lookAngles.yaw -= ev.movementX * 0.0022
    lookAngles.pitch = Math.max(-1.35, Math.min(1.35, lookAngles.pitch - ev.movementY * 0.0022))
    updateFPSCamera()
  })

  window.addEventListener("keydown", ev => {
    keys.add(ev.code)
    if (ev.code === "Escape" && fpsActive) {
      setFPSActive(false)
    }
    if (ev.code === "KeyF" && !ev.repeat) {
      setFPSActive(!fpsActive)
    }
  })

  window.addEventListener("keyup", ev => keys.delete(ev.code))
  window.addEventListener("blur", () => keys.clear())

  const fpsToggleBtn = el("fps-toggle")
  if (fpsToggleBtn) {
    fpsToggleBtn.disabled = false
    fpsToggleBtn.addEventListener("click", () => setFPSActive(!fpsActive))
  }

  // ==========================================================================
  // THEME SWITCHER (AY / LUNAR VS MARS / JEZERO)
  // ==========================================================================
  const themeToggleBtn = el("theme-toggle")

  function applyTheme(theme) {
    currentTheme = theme
    const isMoon = theme === "moon"

    const newTextures = generateRegolithTextures(isMoon, terrainExtent)
    terrainMat.map = newTextures.albedoTexture
    terrainMat.bumpMap = newTextures.bumpTexture
    terrainMat.needsUpdate = true

    skyDome.visible = !isMoon
    scene.background.set(isMoon ? 0x000003 : 0x0b0806)
    scene.fog = isMoon ? null : new T.FogExp2(fogColor, 0.0042)
    starField.visible = isMoon
    earthGroup.visible = isMoon

    hillMat.color.set(isMoon ? 0x6f7076 : 0x9d6b53)
    hillMatFar.color.set(isMoon ? 0x7d7e85 : 0xb08a6f)
    paintRocks(isMoon)

    sunLight.color.set(isMoon ? 0xffffff : 0xffe4c9)
    sunLight.intensity = isMoon ? 4.0 : 3.1
    earthshineLight.color.set(isMoon ? 0x2a3244 : 0xd9a582)
    earthshineLight.groundColor.set(isMoon ? 0x0b0d12 : 0x6d4030)
    earthshineLight.intensity = isMoon ? 0.25 : 0.95

    if (themeToggleBtn) {
      themeToggleBtn.textContent = isMoon ? "Ortam: 🌕 Ay (Referans)" : "Ortam: 🪐 Mars (Jezero)"
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      applyTheme(currentTheme === "moon" ? "mars" : "moon")
    })
  }
  applyTheme("mars")

  // ==========================================================================
  // RENDER LOOP & RESIZING
  // ==========================================================================
  const resizeObserver = new ResizeObserver(() => {
    if (!viewport.clientWidth || !viewport.clientHeight) return
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false)
    camera.aspect = viewport.clientWidth / viewport.clientHeight
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(viewport)

  let lastTime = performance.now()
  renderer.setAnimationLoop(time => {
    const delta = Math.min(0.05, (time - lastTime) / 1000)
    lastTime = time

    // Slow Earth rotation
    earthMesh.rotation.y += delta * 0.04
    atmosphereMesh.rotation.y += delta * 0.05

    if (fpsActive) {
      fps.update(delta)
    } else {
      controls.update()
    }

    renderer.render(scene, camera)
  })

  // Clear loading status
  const statusEl = el("scene-status")
  if (statusEl) statusEl.textContent = ""
}

// Start application
initCraterEnvironment().catch(err => {
  console.error("3D Init Error:", err)
  const st = el("scene-status")
  if (st) st.textContent = "3B sahne yüklenemedi: " + err.message
})
