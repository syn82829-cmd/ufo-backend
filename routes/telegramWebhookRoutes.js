const express = require("express")
const prisma = require("../lib/prisma")

function createTelegramWebhookRoutes() {
  const router = express.Router()

  const BOT_TOKEN = process.env.BOT_TOKEN

  async function callTelegram(method, body) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    return response.json()
  }

  router.post("/telegram/webhook", async (req, res) => {
    try {
      const update = req.body || {}

      if (update.pre_checkout_query) {
        const result = await callTelegram("answerPreCheckoutQuery", {
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        })

        if (!result?.ok) {
          console.error("PRE CHECKOUT ANSWER ERROR:", result)
        }

        return res.sendStatus(200)
      }

      const successfulPayment = update.message?.successful_payment

      if (successfulPayment) {
        if (successfulPayment.currency !== "XTR") {
          return res.sendStatus(200)
        }

        const fromId = update.message?.from?.id
        const payload = String(successfulPayment.invoice_payload || "")
        const amountFromPayment = Number(successfulPayment.total_amount || 0)

        if (!fromId || amountFromPayment <= 0) {
          return res.sendStatus(200)
        }

        const payloadParts = payload.split(":")
        const payloadTelegramId = payloadParts[1] ? String(payloadParts[1]) : null

        const targetTelegramId = payloadTelegramId || String(fromId)

        const user = await prisma.user.findUnique({
          where: { telegram_id: BigInt(targetTelegramId) },
        })

        if (!user) {
          console.error("PAYMENT USER NOT FOUND:", targetTelegramId)
          return res.sendStatus(200)
        }

        // ВАЖНО:
        // Это MVP-вариант без защиты от дублей по telegram_payment_charge_id.
        // Для продакшена лучше добавить external_id в transaction и проверять его.
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: { increment: amountFromPayment },
            },
          })

          await tx.transaction.create({
            data: {
              userId: user.id,
              amount: amountFromPayment,
              type: "deposit",
            },
          })
        })

        return res.sendStatus(200)
      }

      return res.sendStatus(200)
    } catch (error) {
      console.error("TELEGRAM WEBHOOK ERROR:", error)
      return res.sendStatus(200)
    }
  })

  return router
}

module.exports = {
  createTelegramWebhookRoutes,
}
