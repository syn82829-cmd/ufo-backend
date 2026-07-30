const express = require("express")
const prisma = require("../lib/prisma")
const { getStarsDepositCredit } = require("../utils/starsDepositBonus")

function createStarsPaymentWebhookRoutes() {
  const router = express.Router()
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

  router.post("/telegram/webhook", async (req, res, next) => {
    const successfulPayment = req.body?.message?.successful_payment

    if (!successfulPayment) {
      return next()
    }

    try {
      if (
        WEBHOOK_SECRET &&
        req.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET
      ) {
        return res.sendStatus(403)
      }

      if (successfulPayment.currency !== "XTR") {
        return res.sendStatus(200)
      }

      const fromId = req.body?.message?.from?.id
      const payload = String(successfulPayment.invoice_payload || "")
      const paidAmount = Math.floor(Number(successfulPayment.total_amount || 0))
      const paymentChargeId = String(successfulPayment.telegram_payment_charge_id || "")
      const externalId = paymentChargeId ? `telegram_stars:${paymentChargeId}` : null

      if (!fromId || paidAmount <= 0 || !externalId) {
        return res.sendStatus(200)
      }

      const payloadParts = payload.split(":")
      const payloadTelegramId = payloadParts[1] ? String(payloadParts[1]) : null
      const targetTelegramId = payloadTelegramId || String(fromId)
      const credit = getStarsDepositCredit(paidAmount)

      const user = await prisma.user.findUnique({
        where: { telegram_id: BigInt(targetTelegramId) },
        select: { id: true },
      })

      if (!user) {
        console.error("PAYMENT USER NOT FOUND:", targetTelegramId)
        return res.sendStatus(200)
      }

      let credited = false

      await prisma.$transaction(async (tx) => {
        const duplicate = await tx.transaction.findFirst({
          where: { externalId },
          select: { id: true },
        })

        if (duplicate) return

        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: credit.creditAmount },
          },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: credit.creditAmount,
            type: "deposit",
            externalId,
          },
        })

        credited = true
      })

      console.log("PAYMENT BALANCE CREDITED", {
        telegram_id: targetTelegramId,
        paidAmount: credit.paidAmount,
        bonusPercent: credit.bonusPercent,
        bonusAmount: credit.bonusAmount,
        creditAmount: credit.creditAmount,
        externalId,
        credited,
      })

      return res.sendStatus(200)
    } catch (error) {
      console.error("STARS PAYMENT WEBHOOK ERROR:", error)
      return res.sendStatus(200)
    }
  })

  return router
}

module.exports = {
  createStarsPaymentWebhookRoutes,
}
