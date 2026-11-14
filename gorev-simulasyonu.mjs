// NASA LRO/LROC at 50 km: resolution and combined swath from the PDS.
// The remaining component values and operating limits are game parameters.
export const nasaSource =
  "https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=LRO-L-LROC-2-EDR-V1.0"

export const cameras = {
  wide: { label: "Geniş açı", resolutionM: 100, swathKm: 60, massKg: 8, watts: 14, cost: 12, mbPerImage: 18 },
  narrow: { label: "Dar açı", resolutionM: 0.5, swathKm: 5, massKg: 18, watts: 32, cost: 28, mbPerImage: 80 },
}

export const launchers = {
  shared: { label: "Paylaşımlı", limitKg: 100, cost: 22, orbits: ["low"] },
  dedicated: { label: "Özel", limitKg: 160, cost: 37, orbits: ["low", "high"] },
}

export const antennas = {
  standard: { label: "Standart", mbPerDay: 160, massKg: 6, watts: 10, cost: 8 },
  highRate: { label: "Yüksek hızlı", mbPerDay: 520, massKg: 16, watts: 21, cost: 23 },
}

export const objectives = {
  coverage: { label: "Bölgesel tarama", maxResolutionM: 100, minSwathKm: 30, minImages: 30 },
  detail: { label: "Ayrıntılı alan incelemesi", maxResolutionM: 1, minSwathKm: 0, minImages: 12 },
}

// High orbit uses a simple altitude ratio for the same optics.
// Observation and downlink windows are scenario assumptions.
export const orbits = {
  low: { label: "Alçak kutup yörüngesi", altitudeKm: 50, maxImagesPerDay: 8, downlinkFraction: 1 },
  high: { label: "Yüksek kutup yörüngesi", altitudeKm: 100, maxImagesPerDay: 6, downlinkFraction: 1.25 },
}

export const storageOptions = {
  standard: { label: "Standart", capacityMb: 640, massKg: 0, watts: 0, cost: 0 },
  expanded: { label: "Genişletilmiş", capacityMb: 1280, massKg: 2, watts: 2, cost: 5 },
}

export const limits = { budget: 110, watts: 80, storageMb: 640, maxDays: 12, maxImagesPerDay: 8 }
const spacecraft = { massKg: 78, watts: 27, cost: 22 }

export function simulateMission({
  objective = "detail",
  camera = "narrow",
  launcher = "dedicated",
  antenna = "standard",
  orbit = "low",
  storage = "standard",
  days = 6,
  imagesPerDay = 2,
} = {}) {
  const target = Object.hasOwn(objectives, objective) && objectives[objective]
  const instrument = Object.hasOwn(cameras, camera) && cameras[camera]
  const vehicle = Object.hasOwn(launchers, launcher) && launchers[launcher]
  const link = Object.hasOwn(antennas, antenna) && antennas[antenna]
  const path = Object.hasOwn(orbits, orbit) && orbits[orbit]
  const memory = Object.hasOwn(storageOptions, storage) && storageOptions[storage]
  if (!target || !instrument || !vehicle || !link || !path || !memory) {
    throw new RangeError("Görev hedefi, yörünge veya parça seçimi geçersiz.")
  }
  if (!Number.isInteger(days) || days < 1 || days > limits.maxDays ||
      !Number.isInteger(imagesPerDay) || imagesPerDay < 1 || imagesPerDay > limits.maxImagesPerDay) {
    throw new RangeError("Görev süresi 1–12 gün, çekim sayısı günde 1–8 olmalı.")
  }

  const massKg = spacecraft.massKg + instrument.massKg + link.massKg + memory.massKg
  const watts = spacecraft.watts + instrument.watts + link.watts + memory.watts
  const budgetUsed = spacecraft.cost + instrument.cost + vehicle.cost + link.cost + memory.cost
  const downlinkMbPerDay = Math.floor(link.mbPerDay * path.downlinkFraction)
  const scale = path.altitudeKm / 50
  const observation = {
    resolutionM: instrument.resolutionM * scale,
    swathKm: instrument.swathKm * scale,
    maxImagesPerDay: path.maxImagesPerDay,
    requiredImages: target.minImages,
  }
  const issues = []

  if (!vehicle.orbits.includes(orbit)) {
    issues.push(`${vehicle.label} fırlatma seçeneği bu yörüngeyi desteklemiyor.`)
  }
  if (massKg > vehicle.limitKg) {
    issues.push(`Fırlatma kapasitesi ${massKg - vehicle.limitKg} kg aşıldı.`)
  }
  if (watts > limits.watts) {
    issues.push(`Tepe güç sınırı ${watts - limits.watts} W aşıldı.`)
  }
  if (budgetUsed > limits.budget) {
    issues.push(`Bütçe ${budgetUsed - limits.budget} kredi aşıldı.`)
  }

  const resources = { massKg, massLimitKg: vehicle.limitKg, watts, powerLimitW: limits.watts,
    budgetUsed, budgetLimit: limits.budget, downlinkMbPerDay, storageMb: memory.capacityMb }
  if (issues.length) {
    return {
      status: "preflight-failed", resources, observation, timeline: [], deliveredImages: 0,
      lostImages: 0, skippedImages: 0, queuedImages: 0, issues,
    }
  }

  let storedImages = 0
  let deliveredImages = 0
  let lostImages = 0
  const opportunities = Math.min(imagesPerDay, path.maxImagesPerDay)
  const skippedPerDay = imagesPerDay - opportunities
  const maxStoredImages = Math.floor(memory.capacityMb / instrument.mbPerImage)
  const maxSentImages = Math.floor(downlinkMbPerDay / instrument.mbPerImage)
  const timeline = []

  for (let day = 1; day <= days; day += 1) {
    const captured = Math.min(opportunities, maxStoredImages - storedImages)
    const dropped = opportunities - captured
    storedImages += captured
    const sent = Math.min(storedImages, maxSentImages)
    storedImages -= sent
    deliveredImages += sent
    lostImages += dropped
    timeline.push({ day, captured, sent, dropped, skipped: skippedPerDay, queued: storedImages })
  }

  if (observation.resolutionM > target.maxResolutionM) {
    issues.push(`Hedef en fazla ${target.maxResolutionM} m/piksel çözünürlük istiyor.`)
  }
  if (observation.swathKm < target.minSwathKm) {
    issues.push(`Hedef en az ${target.minSwathKm} km genişliğinde bir çekim şeridi istiyor.`)
  }
  if (deliveredImages < target.minImages) {
    issues.push(`Hedef için ${target.minImages} görüntü gerekli. Dünya'ya ${deliveredImages} görüntü ulaştı.`)
  }

  return {
    status: issues.length ? "objective-missed" : "success",
    resources,
    observation,
    timeline,
    deliveredImages,
    lostImages,
    skippedImages: skippedPerDay * days,
    queuedImages: storedImages,
    issues,
  }
}
