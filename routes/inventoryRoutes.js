const express = require("express")
const prisma = require("../lib/prisma")

const router = express.Router()

router.get("/inventory/:telegram_id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(req.params.telegram_id) }
    })

    if (!user) {
      return res.status(404).json({ error: "user not found" })
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        userId: user.id,
        isSold: false
      },
      orderBy: {
        obtained_at: "desc"
      }
    })

    res.json(items)
  } catch (error) {
    console.error("INVENTORY ERROR:", error)
    res.status(500).json({ error: "inventory error" })
  }
})

router.post("/inventory/sell", async (req, res) => {
  try {
    const { telegram_id, inventoryItemId } = req.body

    if (!telegram_id || !inventoryItemId) {
      return res.status(400).json({ error: "telegram_id and inventoryItemId are required" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      })

      if (!user) {
        throw new Error("User not found")
      }

      const item = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId }
      })

      if (!item) {
        throw new Error("Inventory item not found")
      }

      if (item.userId !== user.id) {
        throw new Error("Inventory item does not belong to this user")
      }

      if (item.isSold) {
        throw new Error("Inventory item already sold")
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: item.priceStars }
        }
      })

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          isSold: true,
          sold_at: new Date()
        }
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: item.priceStars,
          type: "sale"
        }
      })

      return updatedUser
    })

    res.json({ balance: result.balance })
  } catch (error) {
    console.error("SELL INVENTORY ITEM ERROR:", error)
    res.status(500).json({ error: error.message || "sell inventory item error" })
  }
})

module.exports = router
