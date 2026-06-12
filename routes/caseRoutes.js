const express = require("express")
const prisma = require("../lib/prisma")
const { casesData, pickWeightedDrop } = require("../data/casesData")
const { emitRealDrop } = require("../live/liveDropsEngine")

module.exports = function(io) {
  const router = express.Router()

  router.post("/open", async (req, res) => {
    try {
      const { telegram_id, caseId } = req.body

      const caseConfig = casesData[caseId]
      const winner = pickWeightedDrop(caseConfig.drops)

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) }
        })

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: caseConfig.price } }
        })

        const inventoryItem = await tx.inventoryItem.create({
          data: {
            userId: user.id,
            dropId: winner.id,
            dropName: winner.name,
            caseId: caseConfig.id,
            priceStars: Number(winner.priceStars || 0),
            png: winner.png,
          }
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: caseConfig.price,
            type: "case"
          }
        })

        return { updatedUser, inventoryItem }
      })

      // 🔥 ВАЖНО: мгновенный live push
      emitRealDrop(winner.png)

      res.json({
        balance: result.updatedUser.balance,
        drop: result.inventoryItem,
      })

    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  return router
}
