const prisma = require("../lib/prisma")
const { syncCrashState, buildCrashState } = require("./crashEngine")

function createCrashSocket(io) {
  async function emitCrashState() {
    try {
      const round = await syncCrashState()
      const state = buildCrashState(round)

      io.emit("crash:state", state)

      if (round?.id) {
        const bets = await prisma.crashBet.findMany({
          where: { roundId: round.id },
          orderBy: { created_at: "desc" },
          include: { user: true },
        })

        const live = bets.map((bet) => ({
          id: bet.id,
          amount: bet.amount,
          status: bet.status,
          cashout_multiplier: bet.cashout_multiplier,
          payout: bet.payout,
          profit: bet.profit,
          created_at: bet.created_at,
          user: {
            id: bet.user.id,
            telegram_id: bet.user.telegram_id.toString(),
            username: bet.user.username,
            casesOpened: bet.user.cases_opened ?? 0,
            crashGamesPlayed: bet.user.crash_games ?? 0,
            crashWins: bet.user.crash_wins ?? 0,
          }
        }))

        io.emit("crash:live", live)
      } else {
        io.emit("crash:live", [])
      }
    } catch (error) {
      console.error("EMIT CRASH STATE ERROR:", error)
    }
  }

  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id)

    await emitCrashState()

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
  }, 300)

  return {
    emitCrashState,
    stop() {
      clearInterval(interval)
    },
  }
}

module.exports = {
  createCrashSocket,
}
