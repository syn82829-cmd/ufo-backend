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
          where: { telegram_id: BigInt(telegram_id) },
          select: { id: true },
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

  router.get("/crash/history", async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit || 14), 1), 24)

      const rounds = await prisma.crashRound.findMany({
        where: {
          status: "crashed",
          crash_point: { not: null },
        },
        orderBy: { round_number: "desc" },
        take: limit,
        select: {
          id: true,
          round_number: true,
          crash_point: true,
          crashed_at: true,
        },
      })

      res.json(rounds.map((round) => ({
        id: round.id,
        roundNumber: round.round_number,
        multiplier: Number(round.crash_point || 1),
        crashedAt: round.crashed_at?.toISOString?.() || null,
      })))
    } catch (error) {
      console.error("CRASH HISTORY ERROR:", error)
      res.status(500).json({ error: error.message || "crash history error" })
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
      const numericAmount = Math.floor(Number(amount))

      if (!telegram_id || !numericAmount || numericAmount <= 0) {
        return res.status(400).json({ error: "telegram_id and valid amount are required" })
      }

      const round = await syncCrashState()

      if (!round || round.status !== "waiting") {
        return res.status(400).json({ error: "betting is closed" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) },
          select: {
            id: true,
            telegram_id: true,
            username: true,
            balance: true,
            cases_opened: true,
            crash_games: true,
            crash_wins: true,
          }
        })

        if (!user) {
          throw new Error("User not found")
        }

        const debit = await tx.user.updateMany({
          where: {
            id: user.id,
            balance: { gte: numericAmount },
          },
          data: {
            balance: { decrement: numericAmount },
            crash_games: { increment: 1 },
          }
        })

        if (debit.count !== 1) {
          throw new Error("Insufficient balance")
        }

        const bet = await tx.crashBet.create({
          data: {
            roundId: round.id,
            userId: user.id,
            amount: numericAmount,
            status: "active",
          }
        })

        return {
          user,
          bet,
          balance: Number(user.balance) - numericAmount,
        }
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
          crashGamesPlayed: (result.user.crash_games ?? 0) + 1,
          crashWins: result.user.crash_wins ?? 0,
        },
      })

      res.json({
        balance: result.balance,
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

      if (error?.code === "P2002") {
        return res.status(409).json({ error: "Bet already placed for this round" })
      }

      const message = error.message || "crash bet error"
      const statusCode =
        message === "Insufficient balance" ||
        message === "User not found"
          ? 400
          : 500

      res.status(statusCode).json({ error: message })
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
        const bet = await tx.crashBet.findFirst({
          where: {
            roundId: round.id,
            status: "active",
            user: {
              telegram_id: BigInt(telegram_id),
            },
          },
          include: {
            user: {
              select: { id: true },
            },
          },
        })

        if (!bet) {
          throw new Error("Active bet not found")
        }

        const payout = Math.floor(Number(bet.amount) * liveMultiplier)
        const profit = Math.max(payout - Number(bet.amount), 0)
        const cashedOutAt = getNow()

        const cashout = await tx.crashBet.updateMany({
          where: {
            id: bet.id,
            status: "active",
          },
          data: {
            status: "cashed_out",
            cashout_multiplier: liveMultiplier,
            payout,
            profit,
            cashed_out_at: cashedOutAt,
          }
        })

        if (cashout.count !== 1) {
          throw new Error("Bet is already closed")
        }

        const updatedUser = await tx.user.update({
          where: { id: bet.user.id },
          data: {
            balance: { increment: payout },
            crash_wins: { increment: 1 },
          },
          select: {
            balance: true,
          },
        })

        const updatedBet = {
          ...bet,
          user: undefined,
          status: "cashed_out",
          cashout_multiplier: liveMultiplier,
          payout,
          profit,
          cashed_out_at: cashedOutAt,
        }

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

      const message = error.message || "crash cashout error"
      const statusCode =
        message === "Active bet not found" ||
        message === "cashout is not available now" ||
        message === "too late to cash out"
          ? 400
          : 500

      res.status(statusCode).json({ error: message })
    }
  })

  return router
}

module.exports = {
  createCrashRoutes,
}
