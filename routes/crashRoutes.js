const express = require("express")
const prisma = require("../lib/prisma")
const { syncCrashState, buildCrashState } = require("../crash/crashEngine")
const { getMultiplierByElapsedMs, getNow } = require("../crash/crashMath")
const { getLiveBets, setLiveBet, updateLiveBet } = require("../crash/crashStore")

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
      res.json(getLiveBets())
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

        return { updatedUser, bet, user }
      })

      setLiveBet({
        id: result.bet.id,
        amount: result.bet.amount,
        status: result.bet.status,
        cashout_multiplier: result.bet.cashout_multiplier,
        payout: result.bet.payout,
        profit: result.bet.profit,
        created_at: result.bet.created_at,
        user: {
          id: result.user.id,
          telegram_id: result.user.telegram_id.toString(),
          username: result.user.username,
          casesOpened: result.user.cases_opened ?? 0,
          crashGamesPlayed: result.user.crash_games ?? 0,
          crashWins: result.user.crash_wins ?? 0,
        },
      })

      res.json({
        balance: result.updatedUser.balance,
        bet: result.bet,
        roundId: round.id,
        roundNumber: round.round_number,
      })

      emitCrashLive().catch((error) => {
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

      updateLiveBet(result.updatedBet.id, {
        status: result.updatedBet.status,
        cashout_multiplier: result.updatedBet.cashout_multiplier,
        payout: result.updatedBet.payout,
        profit: result.updatedBet.profit,
      })

      res.json({
        balance: result.updatedUser.balance,
        payout: result.payout,
        profit: result.profit,
        multiplier: liveMultiplier,
        bet: result.updatedBet,
      })

      emitCrashLive().catch((error) => {
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
