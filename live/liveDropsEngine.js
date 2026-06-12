let ioRef = null

const FAKE_DROPS = [
  { image: "/drops/Baklajan.png", weight: 5 },
  { image: "/drops/Dog.png", weight: 10 },
  { image: "/drops/Fen.png", weight: 10 },
  { image: "/drops/HeroicHelmet.png", weight: 1 },
  { image: "/drops/IonicDryer.png", weight: 4 },
  { image: "/drops/Klever.png", weight: 2 },
]

let liveDrops = []

function randomWeightedDrop() {
  const total = FAKE_DROPS.reduce((s, d) => s + d.weight, 0)
  let r = Math.random() * total

  for (const d of FAKE_DROPS) {
    if (r < d.weight) return d.image
    r -= d.weight
  }

  return FAKE_DROPS[0].image
}

function emit() {
  if (!ioRef) return
  ioRef.emit("live:drops", liveDrops)
}

function pushDrop(image) {
  liveDrops = [image, ...liveDrops.slice(0, 5)]
  emit()
}

function startFakeLoop() {
  const tick = () => {
    const drop = randomWeightedDrop()
    pushDrop(drop)

    const delay = 120000 + Math.random() * 180000 // 2–5 min
    setTimeout(tick, delay)
  }

  setTimeout(tick, 5000)
}

function attachLiveDropsSocket(io) {
  ioRef = io

  liveDrops = Array.from({ length: 6 }, randomWeightedDrop)

  io.on("connection", (socket) => {
    socket.emit("live:drops", liveDrops)
  })

  startFakeLoop()
}

function emitRealDrop(image) {
  pushDrop(image)
}

module.exports = {
  attachLiveDropsSocket,
  emitRealDrop,
}
