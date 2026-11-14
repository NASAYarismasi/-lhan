import { loadCraterAssets } from "./dev-assets.js"

try {
  await loadCraterAssets()
  await import("./crater-ecosystem.mjs")
} catch (error) {
  console.error(error)
  document.getElementById("scene-status").textContent = "3B varlıklar yüklenemedi: " + error.message
}
