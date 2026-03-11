const express = require("express")
const prisma = require("../lib/prisma")

const router = express.Router()

router.post("/user", async (req, res) => {
  try {
    const { id, username } = req.body

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
    }

    res.json({
      id: user.id,
      telegram_id: user.telegram_id.toString(),
      username: user.username,
      balance: user.balance
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
    const { telegram_id, amount } = req.body

    if (!telegram_id || !amount || amount <= 0) {
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
          balance: { increment: amount }
        }
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: "deposit"
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

    if (!telegram_id || !amount || amount <= 0) {
      return res.status(400).json({ error: "invalid data" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      })

      if (!user) throw new Error("User not found")
      if (user.balance < amount) throw new Error("Insufficient balance")

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: amount }
        }
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
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
