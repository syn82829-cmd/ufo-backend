const express = require("express")
const prisma = require("../lib/prisma")

const router = express.Router()

router.get("/transactions/:telegram_id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(req.params.telegram_id) },
      include: {
        transactions: {
          orderBy: { created_at: "desc" }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: "user not found" })
    }

    res.json(user.transactions)
  } catch (error) {
    console.error("TRANSACTIONS ERROR:", error)
    res.status(500).json({ error: "transactions error" })
  }
})

module.exports = router
