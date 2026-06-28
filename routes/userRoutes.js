const express = require("express")
const prisma = require("../lib/prisma")

const router = express.Router()

function isValidDevDepositRequest(req) {
  const secret = process.env.DEV_DEPOSIT_SECRET

  if (!secret) return false

  return req.get("X-Dev-Deposit-Secret") === secret
}

router.post("/user", async (req, res) => {
  try {
    const { id, username } = req.body

    if (!id) {
      return res.status(400).json({ error: "id is required" })
    }

    let user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(id) }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegram_id: BigInt(id),
          username,
          balance: 0
        }
      })
    } else if (username && user.username !== username) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { username }
      })
    }

    res.json({
      id: user.id,
      telegram_id: user.telegram_id.toString(),
      username: user.username,
      balance: user.balance,
      casesOpened: user.cases_opened ?? 0,
      crashGamesPlayed: user.crash_games ?? 0,
      crashWins: user.crash_wins ?? 0,
    })
  } catch (error) {
    console.error("USER ERROR:", error)
    res.status(500).json({ error: "user error" })
  }
})

router.get("/balance/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(req.params.id) }
    })

    if (!user) return res.json({ balance: 0 })

    res.json({ balance: user.balance })
  } catch (error) {
    console.error("BALANCE ERROR:", error)
    res.status(500).json({ error: "balance error" })
  }
})

router.post("/deposit", async (req, res) => {
  try {
    if (!isValidDevDepositRequest(req)) {
      return res.status(403).json({ error: "deposit endpoint is disabled" })
    }

    const { telegram_id, amount } = req.body
    const numericAmount = Number(amount)

    if (!telegram_id || !numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: "invalid data" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      })

      if (!user) throw new Error("User not found")

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: numericAmount }
        }
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: numericAmount,
          type: "deposit",
          externalId: `dev_deposit:${user.id}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
        }
      })

      return updatedUser
    })

    res.json({ balance: result.balance })
  } catch (error) {
    console.error("DEPOSIT ERROR:", error)
    res.status(500).json({ error: error.message })
  }
})

router.post("/withdraw", async (req, res) => {
  try {
    const { telegram_id, amount } = req.body
    const numericAmount = Number(amount)

    if (!telegram_id || !numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: "invalid data" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      })

      if (!user) throw new Error("User not found")

      const debit = await tx.user.updateMany({
        where: {
          id: user.id,
          balance: { gte: numericAmount },
        },
        data: {
          balance: { decrement: numericAmount }
        }
      })

      if (debit.count !== 1) {
        throw new Error("Insufficient balance")
      }

      const updatedUser = await tx.user.findUnique({
        where: { id: user.id },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: numericAmount,
          type: "withdraw"
        }
      })

      return updatedUser
    })

    res.json({ balance: result.balance })
  } catch (error) {
    console.error("WITHDRAW ERROR:", error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
