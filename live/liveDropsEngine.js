const FAKE_DROPS = [
  { image: "/drops/Baklajan.png", weight: 1 },
  { image: "/drops/Dog.png", weight: 2 },
  { image: "/drops/Fen.png", weight: 2 },
  { image: "/drops/HeroicHelmet.png", weight: 0.5 },
  { image: "/drops/IonicDryer.png", weight: 1 },
  { image: "/drops/Klever.png", weight: 0.8 },
  // остальные дропы с весами
]

let liveDrops = Array.from({ length: 6 }, () => randomFakeDrop())

function randomFakeDrop() {
  const totalWeight = FAKE_DROPS.reduce((sum, d) => sum + d.weight, 0)
  let r = Math.random() * totalWeight
  for (const drop of FAKE_DROPS) {
    if (r < drop.weight) return drop.image
    r -= drop.weight
  }
  return FAKE_DROPS[0].image
}

function attachLiveDropsSocket(io) {
  io.on("connection", (socket) => {
    socket.emit("live:drops", liveDrops)
  })

  // фейковые дропы каждые 2–5 минут
  setInterval(() => {
    const drop = randomFakeDrop()
    liveDrops = [drop, ...liveDrops.slice(0, 5)]
    io.emit("live:drops", liveDrops)
  }, 2 * 60 * 1000 + Math.random() * 3 * 60 * 1000)
}

// пуш реального дропа при открытии кейса
function emitRealDrop(io, dropImage) {
  liveDrops = [dropImage, ...liveDrops.slice(0, 5)]
  io.emit("live:drops", liveDrops)
}

module.exports = {
  attachLiveDropsSocket,
  emitRealDrop,
}
