const FAKE_DROPS = [
  { image: "/drops/Baklajan.png", weight: 1 },
  { image: "/drops/Dog.png", weight: 2 },
  { image: "/drops/Fen.png", weight: 2 },
  { image: "/drops/HeroicHelmet.png", weight: 0.4 },
  { image: "/drops/IonicDryer.png", weight: 1 },
  { image: "/drops/Klever.png", weight: 0.8 },

  // остальные сюда
]

let ioInstance = null

function randomFakeDrop() {
  const totalWeight = FAKE_DROPS.reduce(
    (sum, item) => sum + item.weight,
    0
  )

  let random = Math.random() * totalWeight

  for (const item of FAKE_DROPS) {
    if (random < item.weight) {
      return item.image
    }

    random -= item.weight
  }

  return FAKE_DROPS[0].image
}

let liveDrops = Array.from(
  { length: 6 },
  () => randomFakeDrop()
)

function pushDrop(dropImage) {
  liveDrops = [
    dropImage,
    ...liveDrops.slice(0, 5),
  ]

  if (ioInstance) {
    ioInstance.emit("live:drops", liveDrops)
  }
}

function scheduleFakeDrop() {
  const timeout =
    2 * 60 * 1000 +
    Math.random() * 3 * 60 * 1000

  setTimeout(() => {
    pushDrop(randomFakeDrop())
    scheduleFakeDrop()
  }, timeout)
}

function attachLiveDropsSocket(io) {
  ioInstance = io

  io.on("connection", (socket) => {
    socket.emit("live:drops", liveDrops)
  })

  scheduleFakeDrop()
}

function emitRealDrop(dropImage) {
  pushDrop(dropImage)
}

module.exports = {
  attachLiveDropsSocket,
  emitRealDrop,
}
