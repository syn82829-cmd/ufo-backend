const { emitLiveDrop } = require("./liveDropsEmitter")

const fakeItems = [
  "/drops/Baklajan.png",
  "/drops/Dog.png",
  "/drops/Fen.png",
  "/drops/HeroicHelmet.png",
  "/drops/IonicDryer.png",
]

function scheduleFakeDrop() {
  const delay =
    120000 +
    Math.random() * 180000

  setTimeout(() => {
    const image =
      fakeItems[
        Math.floor(Math.random() * fakeItems.length)
      ]

    emitLiveDrop({
      image,
      fake: true,
    })

    scheduleFakeDrop()
  }, delay)
}

module.exports = {
  scheduleFakeDrop,
}
