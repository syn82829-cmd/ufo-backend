const { addLiveDrop, getLiveDrops } = require("./liveDropsStore")

let ioInstance = null

function initLiveDrops(io) {
  ioInstance = io
}

function emitLiveDrop(drop) {
  addLiveDrop(drop)

  if (!ioInstance) {
    return
  }

  ioInstance.emit("live:drops", getLiveDrops())
}

module.exports = {
  initLiveDrops,
  emitLiveDrop,
}
