import { loadMarsAssets } from "./dev-assets.js"

try {
  await loadMarsAssets()
  await import("./mars-demo.mjs")
} catch (error) {
  console.error(error)
  const notice = document.createElement("p")
  notice.style.cssText = "margin:16px;padding:12px;border:1px solid #a33;border-radius:8px;background:#2a1517;color:#ffd9d9"
  notice.textContent = "3B varlıklar yüklenemedi: " + error.message
  document.body.prepend(notice)
}
