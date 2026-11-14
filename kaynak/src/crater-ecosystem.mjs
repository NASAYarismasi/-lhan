import * as T from "three"
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

// Accurate height formula at any (x, z) coordinate
export function getTerrainHeight(x, z) {
  // 1. Regional mare / highland slope
  let y = 4.2 * Math.sin(x * 0.016 + z * 0.012) +
          2.8 * Math.cos(x * 0.009 - z * 0.021) +
          1.1 * Math.sin(x * 0.038 - z * 0.031)

  // 2. Accumulate impact crater morphologies
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i]
    const dx = x - c.cx
    const dz = z - c.cz
    const d = Math.hypot(dx, dz)
    const rho = d / c.r

    if (rho < 2.8) {
      if (rho < 1.0) {
        // Inside the crater bowl:
        // Deep parabolic depression with steep inner slope near the rim
        const innerSlope = Math.pow(Math.max(0, 1.0 - rho * rho), 0.72)
        const bowl = -c.depth * innerSlope
        
        // Raised rim crest contribution peaking at rim
        const rimInfluence = c.rimH * Math.exp(-Math.pow((rho - 1.0) / 0.15, 2))
        
        let peakH = 0
        if (c.peak && rho < 0.28) {
          // Central rebound peak inside major impact basins
          peakH = (c.depth * 0.42) * Math.exp(-Math.pow(rho / 0.09, 2))
        }
        
        y += bowl + rimInfluence + peakH
      } else {
        // Outside the crater rim:
        // Decaying ejecta blanket with scalloped radial lobes
        const delta = rho - 1.0
        const angle = Math.atan2(dz, dx)
        const lobeNoise = 1.0 + 0.14 * Math.cos((c.rays || 7) * angle) +
                          0.07 * Math.sin((c.rays ? c.rays * 2 : 13) * angle)
        
        const ejecta = c.rimH * Math.exp(-3.2 * delta) * lobeNoise
        y += ejecta
      }
    }
  }

  // 3. Fine fractal regolith roughness
  const microNoise = 0.28 * Math.sin(x * 0.95 + z * 0.52) * Math.cos(z * 0.81 - x * 0.44) +
                     0.14 * Math.sin(x * 2.1 - z * 1.7) * Math.sin(z * 2.4 + x * 1.3) +
                     0.06 * Math.sin(x * 4.8 + z * 5.1)
  y += microNoise

  return y
}

// ============================================================================
// DYNAMIC PROCEDURAL TEXTURE GENERATION (HIGH-RESOLUTION REGOLITH)
// ============================================================================
function generateRegolithTextures(isMoonMode = true) {
  const size = 1024
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  // Color palette definitions
  let baseR, baseG, baseB
  let rayR, rayG, rayB
  let floorR, floorG, floorB

  if (isMoonMode) {
    // Authentic Lunar Anorthosite / Basalt monochrome palette
    baseR = 142; baseG = 144; baseB = 148 // Crisp neutral silvery-grey
    rayR  = 236; rayG  = 238; rayB  = 242 // Brilliant white ejecta rays
    floorR= 64;  floorG= 66;  floorB= 70   // Dark basalt crater floor
  } else {
    // Authentic Mars Jezero Crater Palette
    baseR = 192; baseG = 118; baseB = 84
    rayR  = 228; rayG  = 164; rayB = 126
    floorR= 98;  floorG= 54;  floorB = 42
  }

  // 1. Fill base regolith
  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`
  ctx.fillRect(0, 0, size, size)

  // 2. Draw procedural ejecta rays radiating from crater positions
  const worldToTex = (wx, wz) => {
    // Map -180m..+180m world to 0..size
    return {
      u: ((wx + 180) / 360) * size,
      v: ((wz + 180) / 360) * size
    }
  }

  // Draw radial ejecta blankets and rays
  for (const c of CRATERS) {
    const pos = worldToTex(c.cx, c.cz)
    const texRadius = (c.r / 360) * size

    // Bright ejecta blanket halo around rim
    const haloGrad = ctx.createRadialGradient(pos.u, pos.v, texRadius * 0.85, pos.u, pos.v, texRadius * 2.6)
    haloGrad.addColorStop(0, `rgba(${rayR}, ${rayG}, ${rayB}, 0.55)`)
    haloGrad.addColorStop(0.35, `rgba(${rayR}, ${rayG}, ${rayB}, 0.32)`)
    haloGrad.addColorStop(1, `rgba(${rayR}, ${rayG}, ${rayB}, 0.0)`)
    ctx.fillStyle = haloGrad
    ctx.beginPath()
    ctx.arc(pos.u, pos.v, texRadius * 2.6, 0, Math.PI * 2)
    ctx.fill()

    // Distinct radial rays (like Tycho crater on the Moon)
    const rayCount = c.rays || 10
    ctx.strokeStyle = `rgba(${rayR}, ${rayG}, ${rayB}, 0.35)`
    for (let a = 0; a < rayCount; a++) {
      const angle = (a / rayCount) * Math.PI * 2 + (c.cx * 0.1)
      const rayLen = texRadius * (1.8 + 1.6 * Math.sin(a * 3.7))
      ctx.lineWidth = Math.max(2, (c.r / 12))
      ctx.beginPath()
      ctx.moveTo(pos.u + Math.cos(angle) * texRadius * 0.9, pos.v + Math.sin(angle) * texRadius * 0.9)
      ctx.lineTo(pos.u + Math.cos(angle) * rayLen, pos.v + Math.sin(angle) * rayLen)
      ctx.stroke()
    }

    // Dark crater bowl floor
    const floorGrad = ctx.createRadialGradient(pos.u, pos.v, 0, pos.u, pos.v, texRadius * 0.92)
    floorGrad.addColorStop(0, `rgba(${floorR}, ${floorG}, ${floorB}, 0.88)`)
    floorGrad.addColorStop(0.7, `rgba(${floorR}, ${floorG}, ${floorB}, 0.65)`)
    floorGrad.addColorStop(1, `rgba(${floorR}, ${floorG}, ${floorB}, 0.0)`)
    ctx.fillStyle = floorGrad
    ctx.beginPath()
    ctx.arc(pos.u, pos.v, texRadius * 0.92, 0, Math.PI * 2)
    ctx.fill()
  }

  // 3. Hundreds of procedural micro-craters pockmarking the texture
  let seed = 4921
  function rnd() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  for (let i = 0; i < 900; i++) {
    const mx = rnd() * size
    const my = rnd() * size
    const mr = 1.5 + Math.pow(rnd(), 2.8) * 12
    
    // Dark pit
    ctx.fillStyle = `rgba(${floorR}, ${floorG}, ${floorB}, ${0.4 + rnd() * 0.4})`
    ctx.beginPath()
    ctx.arc(mx, my, mr, 0, Math.PI * 2)
    ctx.fill()

    // Bright sunward rim crescent
    ctx.strokeStyle = `rgba(${rayR}, ${rayG}, ${rayB}, ${0.5 + rnd() * 0.4})`
    ctx.lineWidth = Math.max(1, mr * 0.28)
    ctx.beginPath()
    ctx.arc(mx, my, mr * 1.05, Math.PI * 0.75, Math.PI * 1.5)
    ctx.stroke()
  }

  // 4. Per-pixel granular dust noise
  const imgData = ctx.getImageData(0, 0, size, size)
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    const grain = (rnd() - 0.5) * 32
    d[i] = Math.min(255, Math.max(0, d[i] + grain))
    d[i+1] = Math.min(255, Math.max(0, d[i+1] + grain))
    d[i+2] = Math.min(255, Math.max(0, d[i+2] + grain))
  }
  ctx.putImageData(imgData, 0, 0)

  // Create Three.js textures
  const albedoTexture = new T.CanvasTexture(canvas)
  albedoTexture.colorSpace = T.SRGBColorSpace
  albedoTexture.wrapS = albedoTexture.wrapT = T.ClampToEdgeWrapping
  albedoTexture.anisotropy = 16

  // Bump/Normal texture from the canvas
  const bumpCanvas = document.createElement("canvas")
  bumpCanvas.width = bumpCanvas.height = 512
  const bCtx = bumpCanvas.getContext("2d")
  bCtx.drawImage(canvas, 0, 0, 512, 512)
  const bumpTexture = new T.CanvasTexture(bumpCanvas)
  bumpTexture.wrapS = bumpTexture.wrapT = T.ClampToEdgeWrapping
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
  renderer.toneMappingExposure = 1.35
  renderer.outputColorSpace = T.SRGBColorSpace

  const scene = new T.Scene()
  scene.background = new T.Color(0x000003) // Pitch-black space vacuum

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
  scene.add(earthGroup)

  // ==========================================================================
  // HARSH SPACE SOLAR LIGHTING & SHADOWS
  // ==========================================================================
  // 1. Directional Sun Light: Low grazing angle to cast dramatic crater shadows
  const sunLight = new T.DirectionalLight(0xffffff, 4.6)
  sunLight.position.set(-85, 34, -45)
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
  const earthshineLight = new T.HemisphereLight(0x0e1422, 0x06080e, 0.22)
  scene.add(earthshineLight)

  // ==========================================================================
  // TERRAIN MESH GENERATION (DENSE SUBDIVIDED CRATER FIELD)
  // ==========================================================================
  const terrainSize = 360 // 360m x 360m exploration area
  const segments = 200    // 40,000 finely subdivided vertices
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

  // Initial Lunar regolith textures
  let currentTheme = "moon"
  let { albedoTexture, bumpTexture } = generateRegolithTextures(true)

  const terrainMat = new T.MeshStandardMaterial({
    map: albedoTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.12,
    roughness: 0.94,
    metalness: 0.06
  })

  const terrainMesh = new T.Mesh(terrainGeo, terrainMat)
  terrainMesh.receiveShadow = true
  terrainMesh.castShadow = true
  scene.add(terrainMesh)

  // ==========================================================================
  // INSTANCED BOULDERS & IMPACT BRECCIA FIELDS
  // ==========================================================================
  const rockCount = 450
  const rockGeo = new T.DodecahedronGeometry(1.0, 1)
  const rockMat = new T.MeshStandardMaterial({
    color: 0x98989c,
    roughness: 0.96,
    metalness: 0.08
  })
  const rockMesh = new T.InstancedMesh(rockGeo, rockMat, rockCount)
  const dummy = new T.Object3D()
  
  let rSeed = 8831
  function rRnd() {
    rSeed = (Math.imul(rSeed, 1664525) + 1013904223) >>> 0
    return rSeed / 4294967296
  }

  for (let i = 0; i < rockCount; i++) {
    // Cluster boulders near crater rims
    const c = CRATERS[i % CRATERS.length]
    const angle = rRnd() * Math.PI * 2
    const dist = c.r * (0.85 + rRnd() * 0.45)
    const rx = c.cx + Math.cos(angle) * dist
    const rz = c.cz + Math.sin(angle) * dist
    const ry = getTerrainHeight(rx, rz)
    
    const scale = 0.25 + Math.pow(rRnd(), 2.5) * 1.8
    dummy.position.set(rx, ry + scale * 0.35, rz)
    dummy.rotation.set(rRnd() * Math.PI, rRnd() * Math.PI, rRnd() * Math.PI)
    dummy.scale.set(scale, scale * (0.5 + rRnd() * 0.5), scale * (0.7 + rRnd() * 0.6))
    dummy.updateMatrix()
    rockMesh.setMatrixAt(i, dummy.matrix)
  }
  rockMesh.castShadow = true
  rockMesh.receiveShadow = true
  scene.add(rockMesh)

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

  // 4. Solar Array Farm (Güneş Paneli Dizisi)
  function createSolarArray() {
    const group = new T.Group()
    
    const mast = new T.Mesh(
      new T.CylinderGeometry(0.18, 0.22, 3.6, 12),
      new T.MeshStandardMaterial({ color: 0x666b73, metalness: 0.8 })
    )
    mast.position.y = 1.8
    group.add(mast)

    // Tilted dual solar wings
    const panelGeo = new T.BoxGeometry(4.8, 0.1, 2.2)
    const panelMat = new T.MeshStandardMaterial({
      color: 0x112244,
      metalness: 0.9,
      roughness: 0.18
    })
    const panel = new T.Mesh(panelGeo, panelMat)
    panel.position.set(0, 3.6, 0)
    panel.rotation.x = 0.42 // Tilted toward solar incident vector
    panel.rotation.y = 0.55
    group.add(panel)

    return group
  }
  placeBaseItem(createSolarArray(), -10, 8, 0.1)
  placeBaseItem(createSolarArray(), -16, 12, 0.1)

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
  // CAMERA VIEWPOINTS (EXACT MATCH FOR BBC REFERENCE PHOTO)
  // ==========================================================================
  const poses = {
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
      // Spawn astronaut on terrace facing the base and horizon
      const spawnX = -2
      const spawnZ = 8
      camera.position.set(spawnX, getTerrainHeight(spawnX, spawnZ) + eyeHeight, spawnZ)
      lookAngles.yaw = -0.35
      lookAngles.pitch = -0.05
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
          panorama: "Bakış: BBC / Apollo Panoraması | Mod: Bilimsel Keşif",
          rim: "Bakış: 72m Krater Kenarı (Rim Crest) | Yükseklik: +14m",
          base: "Bakış: Yaşam Destek Üssü & Sera | Modül: ECLSS",
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
  setView("panorama")

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
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isMoon = currentTheme === "moon"
      currentTheme = isMoon ? "mars" : "moon"
      
      const newTextures = generateRegolithTextures(currentTheme === "moon")
      terrainMat.map = newTextures.albedoTexture
      terrainMat.bumpMap = newTextures.bumpTexture
      terrainMat.needsUpdate = true

      if (currentTheme === "moon") {
        themeToggleBtn.textContent = "Ortam: 🌕 Ay (Referans Görsel)";
        scene.background.set(0x000003)
        earthshineLight.color.set(0x0e1422)
        sunLight.color.set(0xffffff)
        sunLight.intensity = 4.6
        rockMat.color.set(0x98989c)
        earthGroup.visible = true
      } else {
        themeToggleBtn.textContent = "Ortam: 🪐 Mars (Jezero Krateri)";
        scene.background.set(0x1a0f0b)
        earthshineLight.color.set(0x3d2218)
        sunLight.color.set(0xffeedd)
        sunLight.intensity = 3.8
        rockMat.color.set(0x925a42)
        earthGroup.visible = false
      }
    })
  }

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
