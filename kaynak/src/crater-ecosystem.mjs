import { createSurfaceAudio } from "./surface-audio.mjs"
import { createAirSystem } from "../../sistemler/hava.mjs"
import { createWaterSystem } from "../../sistemler/su.mjs"
import { connectFirstNight } from "./first-night.mjs"
import sampleLanding from "../../EMRE-ORNEK-INIS.json"
import { addSolarFarm } from "./solar-farm.mjs"
import * as T from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
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

// Geniş ova; yüzeydeki ince ayrıntıları regolit dokusu taşır.
export function getTerrainHeight(x, z) {
  return .09 * Math.sin(x * .054 + z * .025)
       + .07 * Math.sin(z * .067 - x * .034)
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
async function initMarsEnvironment() {
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
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = T.SRGBColorSpace

  const scene = new T.Scene()
  scene.background = new T.Color(0x0b0806)

  // Mars toz pusu: uzak arazi boğuk bir ufuk çizgisine karışır
  const fogColor = new T.Color(0xc99e7b)
  scene.fog = new T.FogExp2(fogColor, 0.004)

  const dustSky = new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, fog:false, toneMapped:false,
    uniforms:{sun:{value:new T.Vector3(86,26,-29).normalize()}},
    vertexShader:`
      varying vec3 ray;
      void main() {
        ray = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
      }`,
    fragmentShader:`
      varying vec3 ray;
      uniform vec3 sun;
      void main() {
        vec3 direction = normalize(ray);
        float height = smoothstep(-.07,.48,direction.y);
        float forward = max(0.,dot(direction,sun));
        float glow = pow(forward,6.)*.54 + pow(forward,25.)*.24;
        vec3 horizon = vec3(.66,.43,.28);
        vec3 upper = vec3(.42,.30,.23);
        vec3 color = mix(horizon,upper,height);
        color = mix(color,vec3(.86,.66,.51),glow);
        gl_FragColor = vec4(color,1.);
        #include <colorspace_fragment>
      }`
  })
  const skyDome = new T.Mesh(new T.SphereGeometry(1250,48,32),dustSky)
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
  const sunLight = new T.DirectionalLight(0xffe0bd, 3.5)
  sunLight.position.set(86, 26, -29)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.near = 10
  sunLight.shadow.camera.far = 400
  sunLight.shadow.camera.left = -72
  sunLight.shadow.camera.right = 72
  sunLight.shadow.camera.top = 72
  sunLight.shadow.camera.bottom = -72
  sunLight.shadow.bias = -0.0004
  sunLight.shadow.normalBias = 0.025
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
    bumpScale: 0.10,
    roughness: 1.0,
    metalness: 0.02
  })

  // Yakın planda kum/çakıl tanesini geri getiren tiling detay katmanı.
  // İki farklı ölçekte örneklenir; tekrar deseni böylece görünmez olur.
  const surfaceDetail = generateSurfaceDetailTexture()
  const photoSource = el("regolith-photo")
  const regolithPhoto = photoSource
    ? new T.TextureLoader().load("data:image/jpeg;base64," + photoSource.textContent.trim())
    : surfaceDetail
  if (photoSource) {
    regolithPhoto.colorSpace = T.SRGBColorSpace
    regolithPhoto.wrapS = regolithPhoto.wrapT = T.MirroredRepeatWrapping
    regolithPhoto.anisotropy = Math.min(12,renderer.capabilities.getMaxAnisotropy())
  }
  const photoWeight = {value:photoSource ? 1 : 0}
  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRegolith = {value:regolithPhoto}
    shader.uniforms.uPhotoWeight = photoWeight
    shader.uniforms.uDetailMap = { value: surfaceDetail }
    shader.uniforms.uDetailScale = { value: 84 }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uDetailMap;\nuniform float uDetailScale;\nuniform sampler2D uRegolith;\nuniform float uPhotoWeight;"
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float dA = texture2D(uDetailMap, vMapUv * uDetailScale).r;
        float dB = texture2D(uDetailMap, vMapUv * uDetailScale * 3.17 + vec2(0.37, 0.11)).r;
        float dGrain = dA * 0.66 + dB * 0.34;
        diffuseColor.rgb *= 0.71 + dGrain * 0.60;
        vec2 meters = (vMapUv - .5) * vec2(620.,-620.);
        vec2 photoUv = meters / vec2(2.8,2.5) + .10 * sin(meters.yx * .81);
        vec3 photo = texture2D(uRegolith,photoUv).rgb;
        vec3 photoWide = texture2D(uRegolith,vec2(.6*meters.x+.8*meters.y,-.8*meters.x+.6*meters.y)/6.1).rgb;
        float drift = sin(meters.x*.31+sin(meters.y*.19))*sin(meters.y*.22+meters.x*.07);
        vec3 soil = mix(photo,photoWide,.28)*(1.22 + .16*drift);
        soil *= .90 + .22*dGrain;
        float along = meters.y-14.5;
        float center = 5.75 + along*.20 + .006*along*along;
        float wheels = abs(abs(meters.x-center)-1.03);
        float trace = 1.-smoothstep(.10,.26,wheels);
        float tread = smoothstep(.22,.76,sin(along*48.+meters.x*11.));
        trace *= smoothstep(-1.,.25,along)*(1.-smoothstep(23.,29.,along));
        soil *= 1.-trace*(.095 + tread*.11);
        vec2 drill = meters - vec2(60.7,-26.8);
        float outline = length(drill/vec2(3.8,2.6)) + .10*sin(drill.x*6.+drill.y*4.) + .10*dGrain;
        float icePatch = 1.-smoothstep(.52,1.03,outline);
        float veins = sin(drill.x*8.+sin(drill.y*6.)*1.65+drill.y*3.);
        float frost = smoothstep(.11,.78,veins*.38 + photo.r*.85 + .28);
        vec3 icySoil = mix(soil*.83,vec3(.58,.65,.69),frost*.72);
        soil = mix(soil,icySoil,icePatch);
        diffuseColor.rgb = mix(diffuseColor.rgb,soil,uPhotoWeight);`
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
      const height = (ring === 0 ? 3 : 6) + hRnd() * (ring === 0 ? 5 : 11)
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
  function fracturedRock(seed, flat) {
    const geometry = new T.IcosahedronGeometry(1,2)
    const position = geometry.attributes.position
    for (let i=0;i<position.count;i++) {
      const x=position.getX(i), y=position.getY(i), z=position.getZ(i)
      const wear=1+.13*Math.sin(x*5.3+y*3.7+seed)*Math.cos(z*4.7-y*3.1)
      const top=flat ? .56+.19*x-.09*z : .83+.24*x+.15*z
      position.setXYZ(i,x*wear+.16*y,Math.max(-.73,Math.min(y*wear,top)),z*wear)
    }
    geometry.computeVertexNormals()
    return geometry
  }

  rockMat.onBeforeCompile = shader => {
    shader.vertexShader="varying vec3 rockPoint;\n"+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nrockPoint=position;")
    shader.fragmentShader="varying vec3 rockPoint;\n"+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`
      #include <color_fragment>
      vec3 p = rockPoint;
      float erosion=sin(p.y*43.+sin(p.x*8.+p.z*7.)*.62);
      float grains=sin(dot(p,vec3(87.,131.,111.)))*sin(dot(p,vec3(153.,-123.,187.)));
      float bed=smoothstep(.58,.98,erosion);
      diffuseColor.rgb *= .89 + bed*.22 + grains*.13;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.31,1.18,1.03),
        .38*(1.-smoothstep(-.72,.05,p.y)));
    `)
  }
  const pebbleMat = new T.MeshStandardMaterial({color:0xffffff,roughness:.96,flatShading:true})

  const dummy = new T.Object3D()
  const tint = new T.Color()
  const rockLayers = []
  const rockObstacles = []

  let rSeed = 8831
  function rRnd() {
    rSeed = (Math.imul(rSeed, 1664525) + 1013904223) >>> 0
    return rSeed / 4294967296
  }

  function scatterRocks(mesh, count, options) {
    mesh.geometry.computeBoundingBox()
    const geometryBounds=mesh.geometry.boundingBox
    const tints = []
    let placed = 0
    let guard = 0
    while (placed < count && guard < count * 20) {
      guard++
      const angle = rRnd() * Math.PI * 2
      const radius = Math.sqrt(rRnd()) * options.radius
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const patches=.5+.5*Math.sin(x*.17+Math.sin(z*.14)*1.7)*Math.cos(z*.16-x*.11)
      if (rRnd() > .32+.68*patches) continue
      // Üssün oturduğu alanı boş bırak
      if (Math.hypot(x, z) < options.pad) continue

      const scale = options.minScale + Math.pow(rRnd(), 2.6) * (options.maxScale - options.minScale)
      dummy.position.set(x, getTerrainHeight(x, z) + scale * (0.51 * options.flat - options.bury), z)
      const tilt = options.tilt === undefined ? Math.PI : options.tilt
      dummy.rotation.set((rRnd() - 0.5) * tilt, rRnd() * Math.PI * 2, (rRnd() - 0.5) * tilt)
      dummy.scale.set(scale, scale * options.flat * (0.5 + rRnd() * 0.6), scale * (0.7 + rRnd() * 0.6))
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)
      if (scale>.32 && options.maxScale>.26) {
        const bounds=geometryBounds.clone().applyMatrix4(dummy.matrix)
        if(bounds.max.y-getTerrainHeight(x,z)>.095) rockObstacles.push(bounds)
      }
      tints.push({ pick: Math.floor(rRnd() * options.palette.length), light: (rRnd() - 0.5) * 0.12 })
      placed++
    }
    mesh.count = placed
    mesh.instanceMatrix.needsUpdate = true
    mesh.castShadow = options.maxScale > .26
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

  for (const seed of [2,7,12]) {
    const slabs=seed!==7
    const count=slabs?380:680
    scatterRocks(new T.InstancedMesh(fracturedRock(seed,slabs),rockMat,count),count,{
      minScale:slabs?.15:.18, maxScale:slabs?1.75:1.5,
      flat:slabs?.33:.72, radius:seed===12?112:245,
      bury:.25, pad:slabs?15:25,
      palette:slabs?MARS_SLAB_COLORS:MARS_ROCK_COLORS, tilt:slabs?.45:.65
    })
  }
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
  const indoorObstacles = []

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

  // Panelized weather covers, low service decks and recessed airlocks.
  const sand = new T.MeshStandardMaterial({vertexColors:true, roughness:.82})
  const steel = new T.MeshStandardMaterial({color:0x686056, metalness:.45, roughness:.58})
  const deckMat = new T.MeshStandardMaterial({color:0x76634e, roughness:.94})
  const hatchMat = new T.MeshStandardMaterial({color:0x827465, roughness:.63, metalness:.22})
  const seal = new T.MeshStandardMaterial({color:0xc0a688, roughness:.7})
  function mesh(group, geometry, material, x,y,z){
    const part = new T.Mesh(geometry,material)
    part.position.set(x,y,z)
    group.add(part)
    return part
  }

  const points = []
  const colors = []
  const panelColor = new T.Color()
  const sectors = 28
  const rings = [[3.65,0],[3.65,.50],[3.56,.92],[3.33,1.51],[3.02,2.12],[2.55,2.65],[1.87,3.05],[1.03,3.31]]
  function vertex(row,index){
    const [radius,y] = rings[row]
    const angle = (index + (row%2)*.5)*Math.PI*2/sectors
    return [radius*Math.cos(angle),y,radius*Math.sin(angle)]
  }
  function panel(a,b,c){
    panelColor.setHex(0xbeb2a1).multiplyScalar(.975+.025*(.5+.5*Math.sin(points.length*13.19)))
    points.push(...a,...b,...c)
    for(let i=0;i<3;i++) colors.push(panelColor.r,panelColor.g,panelColor.b)
  }
  for(let row=0;row<rings.length-1;row++){
    for(let col=0;col<sectors;col++){
      const lower=vertex(row,col)
      const next=vertex(row,col+1)
      const upper=vertex(row+1,col)
      const offset=vertex(row+1,col+(row%2?-1:1))
      if(row%2){
        panel(lower,offset,upper)
        panel(lower,upper,next)
      }else{
        panel(lower,upper,next)
        panel(next,upper,offset)
      }
    }
  }
  for(let col=0;col<sectors;col++) panel(vertex(rings.length-1,col),[0,3.49,0],vertex(rings.length-1,col+1))
  const shell = new T.BufferGeometry()
  shell.setAttribute("position",new T.Float32BufferAttribute(points,3))
  shell.setAttribute("color",new T.Float32BufferAttribute(colors,3))
  const normals = []
  for (let i=0;i<points.length;i+=3) {
    const normal = new T.Vector3(points[i],points[i+1]*1.16,points[i+2]).normalize()
    normals.push(normal.x,normal.y,normal.z)
  }
  shell.setAttribute("normal",new T.Float32BufferAttribute(normals,3))

  const leg=new T.BoxGeometry(.25,1,.25)
  const foot=new T.BoxGeometry(.65,.12,.65)
  const collar=new T.CylinderGeometry(3.65,3.66,.24,32)
  const centers = [-9, 0, 9]
  const radius = 3.65
  const locks = []
  const waterSite = {x:64,z:-26}
  const floorY = Math.max(...centers.flatMap(x => [-3.8,3.8].flatMap(dx =>
    [-3.65,3.65].map(z => getTerrainHeight(x+dx,z))))) + .34
  const interior = new T.MeshStandardMaterial({color:0xcac2b1,roughness:.86})
  const fabric = new T.MeshStandardMaterial({color:0x87948f,roughness:1})
  const rack = new T.MeshStandardMaterial({color:0x666e70,roughness:.49,metalness:.36})
  const glazing = new T.MeshPhysicalMaterial({
    color:0x97bdc4,transparent:true,opacity:.34,roughness:.12,metalness:.15,side:T.DoubleSide,depthWrite:false
  })
  const light = new T.MeshBasicMaterial({color:0xffe9bd})
  function block(group,w,h,d,material,x,y,z){
    return mesh(group,new T.BoxGeometry(w,h,d),material,x,y,z)
  }
  function wallWithPorts(index){
    const material=sand.clone()
    material.side=T.DoubleSide
    material.onBeforeCompile=shader=>{
      shader.vertexShader="varying vec3 habitatPosition;\n"+shader.vertexShader
      shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nhabitatPosition=position;")
      const ports=["(habitatPosition.z > 2.15 && abs(habitatPosition.x) < .82 && habitatPosition.y < 2.19)"]
      if(index>0) ports.push("(habitatPosition.x < -2.4 && abs(habitatPosition.z) < .94 && habitatPosition.y < 2.44)")
      if(index<2) ports.push("(habitatPosition.x > 2.4 && abs(habitatPosition.z) < .94 && habitatPosition.y < 2.44)")
      ports.push("(habitatPosition.z > 2.3 && length((habitatPosition.xy-vec2(-1.24,1.56))/vec2(.32,.24))<1.0)")
      ports.push("(habitatPosition.z > 2.3 && length((habitatPosition.xy-vec2(1.24,1.56))/vec2(.32,.24))<1.0)")
      shader.fragmentShader="varying vec3 habitatPosition;\n"+shader.fragmentShader
      shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`
        #include <color_fragment>
        vec3 p=habitatPosition;
        float grit=sin(dot(p,vec3(212.,331.,177.)))*sin(dot(p,vec3(153.,-287.,227.)));
        float runoff=sin(29.*p.x+31.*p.z+sin(7.*p.z))*.5+.5;
        float dust=(1.-smoothstep(.17,1.4,p.y))*(.38+.62*runoff);
        diffuseColor.rgb *= 1. + grit*.047 - dust*.16;
        diffuseColor.rgb = mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.13,.94,.78),dust*.42);
      `)
      shader.fragmentShader=shader.fragmentShader.replace("#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif("+ports.join(" || ")+")discard;")
    }
    material.customProgramCacheKey=()=> "habitat-"+index
    return material
  }
  for(const [index,x] of centers.entries()){
    const group=new T.Group()
    group.position.set(x,floorY,0)
    block(group,8.2,.18,8.2,deckMat,0,-.11,0)
    mesh(group,collar,seal,0,-.11,0)
    mesh(group,shell,wallWithPorts(index),0,0,0).scale.y = index===1 ? 1.28 : .94
    for(const dx of [-3.75,3.75]) for(const z of [-3.75,3.75]){
      const base=getTerrainHeight(x+dx,z)-floorY
      const height=Math.max(.08,-base-.14)
      mesh(group,leg,steel,dx,base+height/2,z).scale.y=height
      mesh(group,foot,deckMat,dx,base+.035,z)
    }
    const shellHeight = index===1 ? 1.28 : .94
    const seamMat = new T.MeshStandardMaterial({color:0x988779, roughness:.9})
    for (const ringIndex of [2,4,6]) {
      const [r,y]=rings[ringIndex]
      const seam=mesh(group,new T.TorusGeometry(r-.007,.013,5,72),seamMat,0,y*shellHeight,0)
      seam.rotation.x=Math.PI/2
    }
    const stripe=new T.MeshStandardMaterial({color:0x485962,roughness:.79})
    mesh(group,new T.CylinderGeometry(3.659,3.661,.115,48,1,true),stripe,0,.46,0)
    for(let i=0;i<10;i++){
      const angle=i*Math.PI/5
      const brace=block(group,.12,.53,.047,steel,3.58*Math.cos(angle),.54,3.58*Math.sin(angle))
      brace.rotation.y=Math.PI/2-angle
    }
    for (let i=0; i<sectors; i++) {
      const a=i*Math.PI*2/sectors
      const fastener=mesh(group,new T.BoxGeometry(.048,.06,.025),steel,3.64*Math.cos(a),.38,3.64*Math.sin(a))
      fastener.rotation.y=Math.PI/2-a
    }
    for(const side of [-1,1]){
      const bezel=mesh(group,new T.TorusGeometry(.29,.047,8,28),steel,side*1.24,1.56*(index===1?1.28:.94),3.08)
      bezel.scale.x=1.17
      const window=mesh(group,new T.SphereGeometry(1,24,16),glazing,side*1.24,1.56*(index===1?1.28:.94),3.02)
      window.scale.set(.35,.27,.47)
    }
    block(group,1.7,.055,.22,light,0,2.83,-.5)
    const lamp=new T.PointLight(0xffe6b8,10,6)
    lamp.position.set(0,2.65,-.35)
    group.add(lamp)
    const furnishingsStart=group.children.length
    if(index===0){
      // Orion-inspired sleeping bags secured against the cabin wall.
      for(const offset of [-1,0,1]){
        block(group,.66,1.75,.21,fabric,offset,1.02,-2.38)
        block(group,.74,.11,.43,rack,offset,.13,-2.38)
      }
    }else if(index===1){
      // Orion-style stowage, food warmer and potable-water dispenser.
      block(group,2.3,1.05,.63,interior,0,.53,-2.45)
      block(group,.55,.29,.39,rack,-.66,1.2,-2.43)
      block(group,.44,.52,.32,rack,.61,1.31,-2.51)
      block(group,.13,.1,.13,steel,.61,1.15,-2.29)
    }else{
      // ISS-style equipment racks for water recovery and cabin air treatment.
      for(const offset of [-.62,.62]){
        block(group,1.1,1.82,.62,interior,offset,.91,-2.25)
        for(const y of [.43,.85,1.27,1.61]) block(group,.83,.22,.045,rack,offset,y,-1.93)
      }
    }
    group.updateMatrixWorld(true)
    for(const furniture of group.children.slice(furnishingsStart)) {
      indoorObstacles.push(new T.Box3().setFromObject(furniture))
    }
    if(index===1){
      mesh(group,new T.CylinderGeometry(.025,.038,1.58,12),steel,-.5,5.08,-.18)
      mesh(group,new T.CylinderGeometry(.05,.064,.81,12),steel,.42,4.7,-.35)
    }
    const chamber = new T.Group()
    group.add(chamber)
    block(chamber,1.94,.16,2.28,deckMat,0,-.08,4.01)
    block(chamber,1.94,.16,2.28,seal,0,2.13,4.01)
    for (const side of [-1,1]) {
      block(chamber,.14,2.12,2.28,seal,side*.91,1.06,4.01)
    }
    const makeHatch = z => {
      const frame = new T.Group()
      frame.position.z = z
      chamber.add(frame)
      for (const side of [-1,1]) block(frame,.16,2.13,.18,steel,side*.81,1.07,0)
      block(frame,1.79,.15,.18,steel,0,2.08,0)
      const leaf = new T.Group()
      frame.add(leaf)
      for (const side of [-1,1]) block(leaf,.55,1.98,.11,hatchMat,side*.52,1.00,0)
      block(leaf,.5,.64,.11,hatchMat,0,1.66,0)
      block(leaf,.5,.99,.11,hatchMat,0,.50,0)
      block(leaf,.49,.31,.045,glazing,0,1.147,0)
      block(leaf,.28,.054,.10,steel,.29,.88,.07)
      return leaf
    }
    const lock = { x, inner:makeHatch(2.92), outer:makeHatch(5.12) }
    locks.push(lock)
    for(const z of [3.24,4.86]) block(chamber,.45,.05,.14,light,0,2.03,z)
    const chamberLight = new T.PointLight(0xffdeb0,3,3.6)
    chamberLight.position.set(0,1.95,4)
    chamber.add(chamberLight)
    const footY=getTerrainHeight(x,6.65)+.02
    lock.rampFootY=footY
    const ramp=block(colonyGroup,1.55,.12,Math.hypot(1.53,floorY-footY),deckMat,x,(floorY+footY)/2,5.885)
    ramp.rotation.x=Math.atan2(floorY-footY,1.53)
    ramp.castShadow=ramp.receiveShadow=true
    group.traverse(part=>{if(part.isMesh && part.material!==glazing){part.castShadow=true;part.receiveShadow=true}})
    colonyGroup.add(group)
  }
  const tunnelMaterial=new T.MeshStandardMaterial({color:0xa5a59c,roughness:.66,metalness:.26,side:T.DoubleSide})
  for(const x of [-4.5,4.5]){
    const tube=mesh(colonyGroup,new T.CylinderGeometry(1.27,1.27,4.05,32,1,true),tunnelMaterial,x,floorY+1.19,0)
    tube.rotation.z=Math.PI/2
    tube.castShadow=tube.receiveShadow=true
    block(colonyGroup,4.1,.14,1.57,deckMat,x,floorY-.025,0)
    for(const dx of [-1.65,-1.1,-.55,0,.55,1.1,1.65]){
      mesh(colonyGroup,new T.TorusGeometry(1.275,.044,8,32),steel,x+dx,floorY+1.19,0).rotation.y=Math.PI/2
    }
  }
  const insideZone=(x,z)=>centers.some(cx=>Math.hypot(x-cx,z)<radius-.33)
    || (Math.abs(z)<.73 && Math.abs(x)<9)
  const outsideObstacle=(x,z)=>centers.some(cx=>Math.hypot(x-cx,z)<radius+.25)
    || (Math.abs(z)<1.46 && Math.abs(x)<9)
    || locks.some(lock=>Math.abs(x-lock.x)<1.14 && z>2.85 && z<5.34)

  const mast = new T.Group()
  const mastRod = new T.CylinderGeometry(.033,.044,1,8)
  const guyWire = (start,end) => {
    const direction = end.clone().sub(start)
    const rod = mesh(mast,mastRod,steel,...start.clone().lerp(end,.5).toArray())
    rod.scale.y = direction.length()
    rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize())
  }
  for (let bay=0;bay<8;bay++) for (const side of [-1,1]) {
    guyWire(new T.Vector3(side*.26,bay,.0),new T.Vector3(side*.26,bay+1,.0))
    guyWire(new T.Vector3(side*.26,bay,.0),new T.Vector3(-side*.26,bay+1,.0))
  }
  for (const dx of [-2.2,2.2]) {
    const anchorY=getTerrainHeight(-14+dx,-1)-getTerrainHeight(-14,-1)
    guyWire(new T.Vector3(dx,anchorY,0),new T.Vector3(0,6.5,0))
    block(mast,.15,1,.26,seal,dx/4,7.1,.08)
  }
  mesh(mast,mastRod,steel,0,8.6,0).scale.y=1.4
  placeBaseItem(mast,-14,-1)
  const solar = addSolarFarm(T, scene, getTerrainHeight, baseObstacles)

  scene.add(colonyGroup)
  const systems = el("first-night") ? [
    createAirSystem(scene,{x:19,z:5,heightAt:getTerrainHeight}),
    createWaterSystem(scene,{...waterSite,heightAt:getTerrainHeight})
  ] : []
  for (const {group} of systems) {
    group.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true}})
    baseObstacles.push(new T.Box3().setFromObject(group).expandByScalar(.25))
  }
  if (systems.length) connectFirstNight(...systems,sampleLanding)
  const portraitAssets = el("scene-rover")
  if (portraitAssets) {
    const assetBytes = id => Uint8Array.from(atob(el(id).textContent.trim()), char=>char.charCodeAt(0)).buffer
    const wrapper = URL.createObjectURL(new Blob([el("scene-decoder").textContent],{type:"text/javascript"}))
    const wasm = URL.createObjectURL(new Blob([assetBytes("scene-wasm")],{type:"application/wasm"}))
    const draco = new DRACOLoader().setDecoderPath({js:wrapper,wasm})
    const loader = new GLTFLoader().setDRACOLoader(draco)
    const load = async (id,height,point,yaw) => {
      const {scene:model}=await loader.parseAsync(assetBytes(id),"")
      const bounds=new T.Box3().setFromObject(model)
      const size=bounds.getSize(new T.Vector3())
      const center=bounds.getCenter(new T.Vector3())
      const scale=height/size.y
      model.scale.multiplyScalar(scale)
      model.position.multiplyScalar(scale).add(new T.Vector3(-center.x*scale,-bounds.min.y*scale,-center.z*scale))
      for(const [x,z] of point){
        const group=new T.Group()
        group.add(model.clone())
        placeBaseItem(group,x,z,yaw)
        renderer.shadowMap.needsUpdate = true
      }
    }
    Promise.allSettled([load("scene-rover",2.18,[[5.75,14.5]],-.6),
      load("scene-suit",1.85,[[-5.8,2.9]],-.55)]).finally(()=>{
      draco.dispose()
      URL.revokeObjectURL(wrapper)
      URL.revokeObjectURL(wasm)
    })
  }

  // ==========================================================================
  // CAMERA VIEWPOINTS (MARS SURFACE)
  // ==========================================================================
  const poses = {
    air:{pos:[24,5.5,15],target:[19,1.6,5]},
    water:{pos:[waterSite.x-9,6.1,waterSite.z+11],target:[waterSite.x-2,1.65,waterSite.z]},
    solar: {
      pos: [solar.x0+30,solar.level+36,solar.z0+46],
      target: [solar.x0,solar.level,solar.z0]
    },
    // Low camera framing the habitat, suited crew and rover.
    panorama: {
      pos: [-2.2, getTerrainHeight(-2.2,28)+2.0, 28],
      target: [0, floorY+2.35, 1]
    },
    // Research Base & Greenhouse overview
    base: {
      pos: [15, 5, 17],
      target: [0, 1, 0]
    }
  }

  // ==========================================================================
  // FIRST PERSON EXPLORATION (FPS WALK ON THE CRATER RIM)
  // ==========================================================================
  const keys = new Set()
  const audio = createSurfaceAudio()
  const bodyRadius=.25
  const stepHeight=.20
  const bodyHeight=1.84
  let grounded=true
  let jumpQueued=false
  let stride=0
  const nearBox=(box,x,z)=> {
    const dx=x-Math.max(box.min.x,Math.min(x,box.max.x))
    const dz=z-Math.max(box.min.z,Math.min(z,box.max.z))
    return dx*dx+dz*dz<bodyRadius*bodyRadius
  }
  function movementAt(x,z,feet,allowStep) {
    let ground=indoors?floorY:getTerrainHeight(x,z)
    if(!indoors && z>=5.12 && z<=6.65) {
      const lock=locks.find(entry=>Math.abs(x-entry.x)<.76)
      if(lock) ground=Math.max(ground,T.MathUtils.lerp(floorY,lock.rampFootY,(z-5.12)/1.53))
    }
    let support=ground
    if (Math.abs(x)>=170 || Math.abs(z)>=170
        || (indoors?!insideZone(x,z):outsideObstacle(x,z))) return {blocked:true,support}
    const obstacles=indoors?[indoorObstacles]:[baseObstacles,rockObstacles]
    for(const layer of obstacles) for(const box of layer) {
      if(!nearBox(box,x,z)) continue
      const top=box.max.y
      if(top<=feet+.015 || (allowStep && top-feet<=stepHeight && box.min.y<=feet+.12)) {
        support=Math.max(support,top)
      } else if(box.min.y<feet+bodyHeight && top>feet) {
        return {blocked:true,support}
      }
    }
    return {blocked:false,support}
  }
  let indoors = false
  let airlockCycle = null
  let fpsActive = false
  const eyeHeight = 1.75
  const lookAngles = { yaw: 0, pitch: 0 }
  const walkSpeed = 1.55 // illustrative suited walking speed in m/s
  const marsGravity = 3.7 // NASA Glenn, m/s²
  let fallSpeed = 0
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
    if (airlockCycle) {
      airlockCycle.lock.inner.position.x = airlockCycle.lock.outer.position.x = 0
      airlockCycle = null
      renderer.shadowMap.needsUpdate = true
    }
    indoors = false
    fallSpeed = 0
    grounded = true
    jumpQueued = false
    stride = 0
    el("habitat-entry").textContent="Hava kilidinden gir"
    controls.enabled = !active
    
    const btn = el("fps-toggle")
    if (btn) {
      btn.setAttribute("aria-pressed", String(active))
      btn.textContent = active ? "Genel Panoramaya Dön (Esc)" : "Astronotun Gözünden Gez (FPS)"
    }
    
    const help = el("camera-help")
    if (help) {
      help.textContent = active
        ? "WASD ile yürü · Fare veya Ok Tuşlarıyla bak · Boşluk ile zıpla · E ile hava kilidi · Esc ile çık"
        : "Fareyle sürükleyerek bak, tekerlekle yaklaş. Alçak güneş altında Mars yerleşimini incele."
    }

    if (active) {
      canvas.focus({preventScroll:true})
      audio.enable()
      // Koloni sahasının dışında, düz ovaya bakan bir noktada başla
      const spawnX = 0
      const spawnZ = 12
      camera.position.set(spawnX, getTerrainHeight(spawnX, spawnZ) + eyeHeight, spawnZ)
      lookAngles.yaw = 0
      lookAngles.pitch = -0.06
      updateFPSCamera()
      
      // Request pointer lock for smooth FPS mouse look
      try { canvas.requestPointerLock?.()?.catch(() => {}) } catch { /* keyboard look remains available */ }

      const hud = el("hud-telemetry")
      if (hud) {
        const groundY = getTerrainHeight(spawnX, spawnZ)
        hud.textContent = `Astronot FPS | X: ${spawnX.toFixed(1)}m | Y: ${groundY.toFixed(1)}m | O2: %100 | Güç: Normal`
      }
    } else {
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      setView(activeView)
    }
  }

  const fps = {
    get active() { return fpsActive },
    setActive: setFPSActive,
    update(delta) {
      if (!fpsActive || airlockCycle) return

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

      const previousY=camera.position.y
      const startX=camera.position.x, startZ=camera.position.z
      let feet=previousY-eyeHeight
      if (jumpQueued && grounded) {
        fallSpeed=-1.75
        grounded=false
        stride=0
      }
      jumpQueued=false
      const angle=lookAngles.yaw
      const travel=walkSpeed*sprint*delta/(Math.hypot(forward,strafe)||1)
      const dx=(Math.cos(angle)*strafe-Math.sin(angle)*forward)*travel
      const dz=(-Math.sin(angle)*strafe-Math.cos(angle)*forward)*travel
      const move=(x,z)=>{
        const query=movementAt(x,z,feet,grounded)
        if(query.blocked) return
        camera.position.x=x
        camera.position.z=z
        if(grounded && query.support>feet) feet=query.support
      }
      if(dx) move(camera.position.x+dx,camera.position.z)
      if(dz) move(camera.position.x,camera.position.z+dz)
      const {support:groundY}=movementAt(camera.position.x,camera.position.z,feet,grounded)
      const airborne=!grounded
      if(!grounded || feet>groundY+.025) {
        feet-=(fallSpeed+marsGravity*delta/2)*delta
        fallSpeed+=marsGravity*delta
        grounded=false
        if(indoors && feet+bodyHeight>floorY+2.32 && fallSpeed<0) {
          feet=floorY+2.32-bodyHeight
          fallSpeed=0
        }
      }
      if(feet<=groundY && fallSpeed>=0) {
        if(airborne && fallSpeed>.85) audio.landing(indoors)
        feet=groundY
        fallSpeed=0
        grounded=true
      }
      camera.position.y=feet+eyeHeight
      if(grounded) {
        stride+=Math.hypot(camera.position.x-startX,camera.position.z-startZ)
        if(stride>=.65) {
          audio.step(indoors)
          stride-=.65
        }
      }

      if (forward || strafe || camera.position.y !== previousY) {
        updateFPSCamera()

        // Update live telemetry HUD
        const hud = el("hud-telemetry")
        if (hud) {
          hud.textContent = `X: ${camera.position.x.toFixed(1)}m | Y: ${feet.toFixed(1)}m | Z: ${camera.position.z.toFixed(1)}m | O2: %100 | Güç: Normal`
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
          air:"Hava tesisi · O₂ üretimi ve CO₂ temizliği",
          water:"Su tesisi · Buz çıkarma ve geri kazanım",
          solar: "Güneş tarlası · 42 masa · 420 panel",
          panorama: "Bakış: Mars Ovası Panoraması | Mod: Bilimsel Keşif",
          base: "Bakış: Düz Koloni Sahası | Modül: ECLSS",
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
  setView("panorama")

  // Pointer lock & mouse movement
  canvas.addEventListener("click", () => {
    if (fpsActive && !isPointerLocked) {
      try { canvas.requestPointerLock?.()?.catch(() => {}) } catch { /* keyboard look remains available */ }
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

  const hatchButton = el("habitat-entry")
  const airlockStatus = message => {
    el("hud-telemetry").textContent=message
    const feedback=el("airlock-feedback")
    if (feedback) feedback.textContent=message
  }

  function cycleAirlock(direct = false) {
    if (airlockCycle) return
    audio.enable()
    const wasActive = fpsActive
    if (!fpsActive) setFPSActive(true)
    const fromZ = indoors ? 2.35 : 6.05
    const nearest = locks.reduce((best,lock) =>
      Math.abs(camera.position.x-lock.x)<Math.abs(camera.position.x-best.x)?lock:best,locks[1])
    const lock = wasActive ? nearest : locks[1]
    if (!direct && Math.hypot(camera.position.x-lock.x,camera.position.z-fromZ)>2.25) {
      airlockStatus("En yakın kubbenin hava kilidine yaklaş ve E’ye bas.")
      return
    }
    airlockCycle={lock, entering:!indoors, elapsed:0, phase:-1}
    camera.position.set(lock.x,(indoors?floorY:getTerrainHeight(lock.x,fromZ))+eyeHeight,fromZ)
    lookAngles.yaw=indoors?Math.PI:0
    lookAngles.pitch=0
    updateFPSCamera()
  }

  function updateAirlock(delta) {
    if (!airlockCycle) return
    const {lock,entering}=airlockCycle
    const first=entering?lock.outer:lock.inner
    const second=entering?lock.inner:lock.outer
    const elapsed=airlockCycle.elapsed+=delta
    const phase=elapsed<.65?0:elapsed<1.3?1:elapsed<2.55?2:elapsed<3.2?3:4
    if (phase===airlockCycle.phase) return
    airlockCycle.phase=phase
    if (phase===0) {
      first.position.x=1.64
      audio.door(true)
      airlockStatus(entering?"Dış kapı açık · Hazneye giriş":"İç kapı açık · Hazneye giriş")
    } else if (phase===1) {
      camera.position.set(lock.x,floorY+eyeHeight,4.02)
      first.position.x=0
      audio.door(false)
      airlockStatus("İki kapı kapalı · Hazne sızdırmazlığı kontrol ediliyor")
    } else if (phase===2) {
      audio.pressure()
      airlockStatus(entering?"Hazne kabin basıncına getiriliyor":"Hazne dış ortam basıncına getiriliyor")
    } else if (phase===3) {
      second.position.x=1.64
      audio.door(true)
      airlockStatus(entering?"İç kapı açık · Kabine geçiş":"Dış kapı açık · Yüzeye geçiş")
    } else {
      indoors=entering
      const z=indoors?2.35:6.05
      camera.position.set(lock.x,(indoors?floorY:getTerrainHeight(lock.x,z))+eyeHeight,z)
      fallSpeed=0
      grounded=true
      stride=0
      second.position.x=0
      audio.door(false)
      airlockCycle=null
      hatchButton.textContent=indoors?"Hava kilidinden çık":"Hava kilidinden gir"
      airlockStatus(indoors?"İç mekân · Yan tüneller diğer kubbelere bağlanır":"Dış ortam · E ile hava kilidini çalıştır")
    }
    updateFPSCamera()
    renderer.shadowMap.needsUpdate=true
  }
  hatchButton.addEventListener("click", () => cycleAirlock(true))
  window.addEventListener("keydown", ev => {
    if (fpsActive && ev.code==="Space" && (isPointerLocked || !ev.target.closest?.("button,input,select,textarea"))) {
      ev.preventDefault()
      if (!ev.repeat && !airlockCycle) {
        audio.enable()
        jumpQueued=true
      }
    }
    keys.add(ev.code)
    if (fpsActive && ev.code==="KeyE" && !ev.repeat) cycleAirlock()
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
    photoWeight.value = photoSource && !isMoon ? 1 : 0

    const newTextures = generateRegolithTextures(isMoon, terrainExtent)
    terrainMat.map = newTextures.albedoTexture
    terrainMat.bumpMap = newTextures.bumpTexture
    terrainMat.needsUpdate = true

    skyDome.visible = !isMoon
    scene.background.set(isMoon ? 0x000003 : 0x0b0806)
    scene.fog = isMoon ? null : new T.FogExp2(fogColor, 0.004)
    starField.visible = isMoon
    earthGroup.visible = isMoon

    hillMat.color.set(isMoon ? 0x6f7076 : 0x9d6b53)
    hillMatFar.color.set(isMoon ? 0x7d7e85 : 0xb08a6f)
    paintRocks(isMoon)

    sunLight.color.set(isMoon ? 0xffffff : 0xffe0bd)
    sunLight.intensity = isMoon ? 4.0 : 3.5
    earthshineLight.color.set(isMoon ? 0x2a3244 : 0xe9bfa7)
    earthshineLight.groundColor.set(isMoon ? 0x0b0d12 : 0x6d4030)
    earthshineLight.intensity = isMoon ? 0.25 : 1.7

    if (themeToggleBtn) {
      themeToggleBtn.textContent = isMoon ? "Ortam: 🌕 Ay (Referans)" : "Ortam: 🪐 Mars"
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
  const fullScreenButton = el("scene-fullscreen")
  fullScreenButton?.addEventListener("click", async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await viewport.requestFullscreen()
  })

  const resizeObserver = new ResizeObserver(() => {
    if (!viewport.clientWidth || !viewport.clientHeight) return
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false)
    camera.aspect = viewport.clientWidth / viewport.clientHeight
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(viewport)

  let lastTime = performance.now()
  renderer.setAnimationLoop(time => {
    const realDelta = Math.max(0, (time - lastTime) / 1000)
    const delta = Math.min(0.05, realDelta)
    lastTime = time

    // Slow Earth rotation
    earthMesh.rotation.y += delta * 0.04
    atmosphereMesh.rotation.y += delta * 0.05

    if (fpsActive) {
      updateAirlock(Math.min(.60,realDelta))
      fps.update(delta)
    } else {
      controls.update()
    }

    for (const system of systems) system.frame(time/1000,delta)
    renderer.render(scene, camera)
  })

  // Clear loading status
  const statusEl = el("scene-status")
  if (statusEl) statusEl.textContent = ""
}

// Start application
initMarsEnvironment().catch(err => {
  console.error("3D Init Error:", err)
  const st = el("scene-status")
  if (st) st.textContent = "3B sahne yüklenemedi: " + err.message
})
