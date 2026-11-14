import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

const page = name => fileURLToPath(new URL(name, import.meta.url))

export default defineConfig({
  // dist klasörü göreli yollarla çalışsın diye
  base: "./",
  server: {
    port: 5173,
    open: "/",
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        index: page("index.html"),
        krater: page("ay-krater.html"),
        mars: page("mars.html"),
        jezero: page("jezero.html"),
      },
    },
  },
})
