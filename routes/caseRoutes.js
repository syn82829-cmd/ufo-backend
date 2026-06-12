const express = require("express")
const prisma = require("../lib/prisma")
const { casesData, pickWeightedDrop } = require("../data/casesData")
const { emitLiveDrop } = require("../live/liveDropsEmitter")

const router = express.Router()

router.post("/case/open", async (req, res) => {
  try {
    const { telegram_id, caseId } = req.body

    if (!telegram_id || !caseId) {
      return res.status(400).json({ error: "telegram_id and caseId are required" })
    }

    const caseConfig = casesData[caseId]
    if (!caseConfig) {
      return res.status(404).json({ error: "case not found" })
    }

    const winner = pickWeightedDrop(caseConfig.drops)
    if (!winner) {
      return res.status(400).json({ error: "no drops available in case" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      })

      if (!user) {
        throw new Error("User not found")
      }

      if (user.balance < caseConfig.price) {
        throw new Error("Insufficient balance")
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: caseConfig.price }
        }
      })

      const inventoryItem = await tx.inventoryItem.create({
        data: {
          userId: user.id,
          dropId: winner.id,
          dropName: winner.name,
          caseId: caseConfig.id,
          priceStars: Number(winner.priceStars || 0),
          priceGems: winner.priceGems || null,
          png: winner.png,
          lottie: winner.lottie || null,
        }
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: caseConfig.price,
          type: "case"
        }
      })

      return {
        balance: updatedUser.balance,
        inventoryItem,
      }
    })

    console.log("LIVE PNG:", result.inventoryItem.png)

    emitLiveDrop({
      image: result.inventoryItem.png,
      name: result.inventoryItem.dropName,
      price: result.inventoryItem.priceStars || 0,
    })

    res.json({
      balance: result.balance,
      drop: result.inventoryItem,
    })
  } catch (error) {
    console.error("OPEN CASE ERROR:", error)
    res.status(500).json({ error: error.message || "open case error" })
  }
})

module.exports = router
