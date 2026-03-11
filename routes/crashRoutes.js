const express = require("express")
const prisma = require("../lib/prisma")
const { syncCrashState, buildCrashState } = require("../crash/crashEngine")
const { getMultiplierByElapsedMs, getNow } = require("../crash/crashMath")

function createCrashRoutes({ emitCrashState, emitCrashLive }) {
  const router = express.Router()

  router.get("/crash/state", async (req, res) => {
    try {
      const { telegram_id } = req.query

      const round = await syncCrashState()
      const state = buildCrashState(round)

      let myBet = null

      if (telegram_id && round?.id) {
        const user = await prisma.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) }
        })

        if (user) {
          myBet = await prisma.crashBet.findFirst({
            where: {
              roundId: round.id,
              userId: user.id,
            }
          })
        }
      }

      res.json({
        ...state,
        myBet,
      })
    } catch (error) {
      console.error("CRASH STATE ERROR:", error)
      res.status(500).json({ error: error.message || "crash state error" })
    }
  })

  router.get("/crash/live", async (req, res) => {
    try {
      const round = await syncCrashState()

      if (!round?.id) {
        return res.json([])
      }

      const bets = await prisma.crashBet.findMany({
        where: {
          roundId: round.id,
        },
        orderBy: {
          created_at: "desc",
        },
        include: {
          user: true,
        },
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
        },
      }))

      res.json(live)
    } catch (error) {
      console.error("CRASH LIVE ERROR:", error)
      res.status(500).json({ error: error.message || "crash live error" })
    }
  })

  router.post("/crash/bet", async (req, res) => {
    try {
      const { telegram_id, amount } = req.body

      if (!telegram_id || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "telegram_id and valid amount are required" })
      }

      const round = await syncCrashState()

      if (!round || round.status !== "waiting") {
        return res.status(400).json({ error: "betting is closed" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) }
        })

        if (!user) {
          throw new Error("User not found")
        }

        if (user.balance < Number(amount)) {
          throw new Error("Insufficient balance")
        }

        const existingBet = await tx.crashBet.findFirst({
          where: {
            roundId: round.id,
            userId: user.id,
          }
        })

        if (existingBet) {
          throw new Error("Bet already placed for this round")
        }

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { decrement: Number(amount) },
            crash_games: { increment: 1 },
          }
        })

        const bet = await tx.crashBet.create({
          data: {
            roundId: round.id,
            userId: user.id,
            amount: Number(amount),
            status: "active",
          }
        })

        return { updatedUser, bet }
      })

      res.json({
        balance: result.updatedUser.balance,
        bet: result.bet,
        roundId: round.id,
        roundNumber: round.round_number,
      })

      emitCrashLive(round.id).catch((error) => {
        console.error("EMIT CRASH LIVE AFTER BET ERROR:", error)
      })

      emitCrashState().catch((error) => {
        console.error("EMIT CRASH STATE AFTER BET ERROR:", error)
      })
    } catch (error) {
      console.error("CRASH BET ERROR:", error)
      res.status(500).json({ error: error.message || "crash bet error" })
    }
  })

  router.post("/crash/cashout", async (req, res) => {
    try {
      const { telegram_id } = req.body

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const round = await syncCrashState()

      if (!round || round.status !== "flying") {
        return res.status(400).json({ error: "cashout is not available now" })
      }

      const elapsedMs = Date.now() - round.flying_started_at.getTime()
      const liveMultiplier = getMultiplierByElapsedMs(elapsedMs)

      if (liveMultiplier >= Number(round.crash_point || 1)) {
        return res.status(400).json({ error: "too late to cash out" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) }
        })

        if (!user) {
          throw new Error("User not found")
        }

        const bet = await tx.crashBet.findFirst({
          where: {
            roundId: round.id,
            userId: user.id,
            status: "active",
          }
        })

        if (!bet) {
          throw new Error("Active bet not found")
        }

        const payout = Math.floor(Number(bet.amount) * liveMultiplier)
        const profit = Math.max(payout - Number(bet.amount), 0)

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: payout },
            crash_wins: { increment: 1 },
          }
        })

        const updatedBet = await tx.crashBet.update({
          where: { id: bet.id },
          data: {
            status: "cashed_out",
            cashout_multiplier: liveMultiplier,
            payout,
            profit,
            cashed_out_at: getNow(),
          }
        })

        return { updatedUser, updatedBet, payout, profit }
      })

      res.json({
        balance: result.updatedUser.balance,
        payout: result.payout,
        profit: result.profit,
        multiplier: liveMultiplier,
        bet: result.updatedBet,
      })

      emitCrashLive(round.id).catch((error) => {
        console.error("EMIT CRASH LIVE AFTER CASHOUT ERROR:", error)
      })

      emitCrashState().catch((error) => {
        console.error("EMIT CRASH STATE AFTER CASHOUT ERROR:", error)
      })
    } catch (error) {
      console.error("CRASH CASHOUT ERROR:", error)
      res.status(500).json({ error: error.message || "crash cashout error" })
    }
  })

  return router
}

module.exports = {
  createCrashRoutes,
}
