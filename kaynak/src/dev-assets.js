// Geliştirme (dev) ortamı varlık yükleyici.
//
// Tek dosya HTML çıktılarında 3B modeller base64 olarak sayfanın içine gömülür.
// Kaynak projede ise modeller public/models klasöründe durur; bu modül onları
// yükleyip sayfadaki <script id="..."> etiketlerine base64 metni olarak yazar.
// Böylece demo kodu (mars-demo.mjs / jezero-ecosystem.mjs) hiç değişmeden çalışır.

import dracoDecoderJs from "three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js?raw"
import dracoDecoderWasmUrl from "three/examples/jsm/libs/draco/gltf/draco_decoder.wasm?url"

const modelUrl = name => import.meta.env.BASE_URL + "models/" + name

async function base64(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(url + " yüklenemedi (" + response.status + ")")
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ""
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function fill(id, value) {
  const node = document.getElementById(id)
  if (node) node.textContent = value
  return Boolean(node)
}

const MARS = {
  "rover-data": "perseverance.glb",
  "habitat-data": "habitat-nasa.glb",
  "insight-data": "insight.glb",
  "ingenuity-data": "ingenuity.glb",
  "ortho-data": "jezero-ortho.webp",
  "face-data": "astronot-portre.png",
  "team-crew-data": "team-astronaut.glb",
  "team-wrist-data": "team-astronaut.stl",
}

const JEZERO = {
  ortho: "jezero-ortho.webp",
  habitat: "habitat-nasa.glb",
  rover: "perseverance.glb",
}

async function fillModels(map) {
  await Promise.all(Object.entries(map).map(async ([id, file]) => {
    fill(id, await base64(modelUrl(file)))
  }))
  fill("decoder", dracoDecoderJs)
  fill("decoder-binary", await base64(dracoDecoderWasmUrl))
  fill("wasm", await base64(dracoDecoderWasmUrl))
}

export function loadMarsAssets() {
  return fillModels(MARS)
}

export function loadJezeroAssets() {
  return fillModels(JEZERO)
}
