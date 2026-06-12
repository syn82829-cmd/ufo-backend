const FAKE_DROPS = [
  { image: "/drops/Baklajan.png", weight: 100 },
  { image: "/drops/Dog.png", weight: 90 },
  { image: "/drops/Fen.png", weight: 80 },
  { image: "/drops/HeroicHelmet.png", weight: 15 },
  { image: "/drops/IonicDryer.png", weight: 10 },
  { image: "/drops/Klever.png", weight: 5 },
  { image: "/drops/Kosak.png", weight: 5 },
  // 👉 сюда потом добавишь остальные
]

let lastDrops = []

function getWeightedDrop(drops) {
  const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0)
  let random = Math.random() * totalWeight

  for (const drop of drops) {
    random -= drop.weight
    if (random <= 0) return drop.image
  }
  return drops[0].image
}

function addDrop(image, fake = true) {
  const drop = { image, fake, timestamp: Date.now() }
  lastDrops = [drop, ...lastDrops.slice(0, 5)] // всегда последние 6
  return drop
}

function emitFakeDrop(io) {
  const image = getWeightedDrop(FAKE_DROPS)
  const drop = addDrop(image, true)
  io.emit("liveDrops:update", drop)
}

// можно использовать для реального дропа после открытия кейса
function emitRealDrop(io, image) {
  const drop = addDrop(image, false)
  io.emit("liveDrops:update", drop)
}

function attachLiveDropsSocket(io) {
  io.on("connection", (socket) => {
    console.log("LiveDrops socket connected:", socket.id)
    // отправляем историю последних 6 дропов
    socket.emit("liveDrops:history", lastDrops)
  })

  // фейковые дропы каждые 2–5 минут
  setInterval(() => {
    emitFakeDrop(io)
  }, 120_000 + Math.random() * 180_000) // 2–5 минут
}

module.exports = {
  attachLiveDropsSocket,
  emitRealDrop,
  emitFakeDrop,
}
