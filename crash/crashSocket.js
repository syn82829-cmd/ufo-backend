const { syncCrashState, buildCrashState } = require("./crashEngine")
const { getLiveBets } = require("./crashStore")
const { getLiveDrops } = require("../live/liveDropsStore")

function createCrashSocket(io) {
  let lastRoundId = null

  async function emitCrashState() {
    try {
      const round = await syncCrashState()
      const state = buildCrashState(round)

      io.emit("crash:state", state)

      const currentRoundId = round?.id || null

      if (currentRoundId !== lastRoundId) {
        lastRoundId = currentRoundId
        await emitCrashLive()
      }

      return { round, state }
    } catch (error) {
      console.error("EMIT CRASH STATE ERROR:", error)
      return null
    }
  }

  async function emitCrashLive() {
    try {
      const live = getLiveBets()
      io.emit("crash:live", live)
    } catch (error) {
      console.error("EMIT CRASH LIVE ERROR:", error)
    }
  }

  async function emitLiveDrops() {
    try {
      const drops = getLiveDrops()
      io.emit("live:drops", drops)
    } catch (error) {
      console.error("EMIT LIVE DROPS ERROR:", error)
    }
  }

  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id)

    await emitCrashState()
    await emitCrashLive()
    await emitLiveDrops()

    socket.on("live:drops:get", () => {
      socket.emit("live:drops", getLiveDrops())
    })

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id)
    })
  })

  const interval = setInterval(async () => {
    try {
      await emitCrashState()
    } catch (error) {
      console.error("CRASH SYNC ERROR:", error)
    }
  }, 120)

  return {
    emitCrashState,
    emitCrashLive,
    emitLiveDrops,

    stop() {
      clearInterval(interval)
    },
  }
}

module.exports = {
  createCrashSocket,
}
