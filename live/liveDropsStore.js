const liveDrops = []

function addLiveDrop(drop) {
  liveDrops.unshift(drop)

  if (liveDrops.length > 20) {
    liveDrops.length = 20
  }
}

function getLiveDrops() {
  return liveDrops
}

module.exports = {
  addLiveDrop,
  getLiveDrops,
}
