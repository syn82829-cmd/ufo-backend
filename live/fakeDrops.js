const { casesData } = require("../data/casesData")
const { emitLiveDrop } = require("./liveDropsEmitter")

const MAX_LIVE_PRICE = 20000
const INITIAL_LIVE_ITEMS = 16
const RECENT_MEMORY = 8

let isStarted = false
const recentPngs = []

function getPrice(drop) {
  return Number(drop?.priceStars || 0)
}

function isLiveDropCandidate(drop) {
  const price = getPrice(drop)

  if (!drop?.png) return false
  if (drop.png === "placeholder") return false
  if (drop.png === "star") return false
  if (String(drop.id || "").startsWith("stars_")) return false
  if (String(drop.id || "").startsWith("case_")) return false
  if (price <= 0) return false
  if (price > MAX_LIVE_PRICE) return false

  return true
}

function getLiveDropPool() {
  const byPng = new Map()

  Object.values(casesData).forEach((caseConfig) => {
    ;(caseConfig.drops || []).forEach((drop) => {
      if (!isLiveDropCandidate(drop)) return

      const price = getPrice(drop)
      const existing = byPng.get(drop.png)

      if (!existing || price > getPrice(existing)) {
        byPng.set(drop.png, drop)
      }
    })
  })

  return Array.from(byPng.values())
}

function getLiveWeight(drop) {
  const price = getPrice(drop)

  if (price >= 1000 && price <= 5000) return 20
  if (price >= 5001 && price <= 10000) return 7
  if (price >= 10001 && price <= 15000) return 3
  if (price >= 15001 && price <= 20000) return 1
  if (price >= 500 && price <= 999) return 7
  if (price >= 100 && price <= 499) return 3

  return 0.8
}

function pickWeightedLiveDrop() {
  const pool = getLiveDropPool()
  if (!pool.length) return null

  const available = pool.filter((drop) => !recentPngs.includes(drop.png))
  const candidates = available.length ? available : pool

  const weighted = candidates.map((drop) => ({
    drop,
    weight: getLiveWeight(drop) * (0.75 + Math.random() * 0.5),
  }))

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * totalWeight

  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) return item.drop
  }

  return weighted[weighted.length - 1]?.drop || null
}

function rememberDrop(drop) {
  if (!drop?.png) return

  recentPngs.unshift(drop.png)

  if (recentPngs.length > RECENT_MEMORY) {
    recentPngs.length = RECENT_MEMORY
  }
}

function emitFakeLiveDrop() {
  const drop = pickWeightedLiveDrop()
  if (!drop) return

  rememberDrop(drop)

  emitLiveDrop({
    image: `/drops/${drop.png}.webp`,
    name: drop.name || drop.id,
    price: getPrice(drop),
    fake: true,
  })
}

function scheduleNextFakeDrop() {
  const delay = 18000 + Math.random() * 42000

  setTimeout(() => {
    emitFakeLiveDrop()
    scheduleNextFakeDrop()
  }, delay)
}

function seedInitialLiveDrops() {
  for (let i = 0; i < INITIAL_LIVE_ITEMS; i += 1) {
    setTimeout(() => {
      emitFakeLiveDrop()
    }, 250 + i * 160)
  }
}

function scheduleFakeDrop() {
  if (isStarted) return

  isStarted = true
  seedInitialLiveDrops()
  scheduleNextFakeDrop()
}

module.exports = {
  scheduleFakeDrop,
}
