const express = require("express")
const prisma = require("../lib/prisma")

function createTelegramWebhookRoutes() {
  const router = express.Router()

  const BOT_TOKEN = process.env.BOT_TOKEN
  const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

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

  async function callTelegramGet(method) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`)
    return response.json()
  }

  function isValidWebhookRequest(req) {
    if (!WEBHOOK_SECRET) return true

    return req.get("X-Telegram-Bot-Api-Secret-Token") === WEBHOOK_SECRET
  }

  router.get("/telegram/webhook-status", async (req, res) => {
    try {
      if (!BOT_TOKEN) {
        return res.status(500).json({
          ok: false,
          error: "BOT_TOKEN is not configured",
          configured: {
            botToken: false,
            webhookUrl: Boolean(WEBHOOK_URL),
            webhookSecret: Boolean(WEBHOOK_SECRET),
          },
        })
      }

      const info = await callTelegramGet("getWebhookInfo")

      return res.json({
        ok: true,
        configured: {
          botToken: true,
          webhookUrl: Boolean(WEBHOOK_URL),
          webhookSecret: Boolean(WEBHOOK_SECRET),
          expectedWebhookUrl: WEBHOOK_URL || null,
        },
        telegram: info,
      })
    } catch (error) {
      console.error("TELEGRAM WEBHOOK STATUS ERROR:", error)
      return res.status(500).json({
        ok: false,
        error: error.message || "Webhook status error",
      })
    }
  })

  router.post("/telegram/register-webhook", async (req, res) => {
    try {
      if (!BOT_TOKEN || !WEBHOOK_URL) {
        return res.status(500).json({
          ok: false,
          error: "BOT_TOKEN or TELEGRAM_WEBHOOK_URL is not configured",
          configured: {
            botToken: Boolean(BOT_TOKEN),
            webhookUrl: Boolean(WEBHOOK_URL),
            webhookSecret: Boolean(WEBHOOK_SECRET),
          },
        })
      }

      const result = await callTelegram("setWebhook", {
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET || undefined,
        allowed_updates: ["message", "pre_checkout_query"],
        drop_pending_updates: false,
      })

      return res.json({
        ok: Boolean(result?.ok),
        result,
      })
    } catch (error) {
      console.error("TELEGRAM WEBHOOK MANUAL REGISTER ERROR:", error)
      return res.status(500).json({
        ok: false,
        error: error.message || "Webhook register error",
      })
    }
  })

  router.post("/telegram/webhook", async (req, res) => {
    try {
      if (!isValidWebhookRequest(req)) {
        console.error("TELEGRAM WEBHOOK SECRET MISMATCH")
        return res.sendStatus(403)
      }

      const update = req.body || {}

      if (update.pre_checkout_query) {
        console.log("PRE CHECKOUT QUERY RECEIVED", {
          id: update.pre_checkout_query.id,
          from: update.pre_checkout_query.from?.id,
          currency: update.pre_checkout_query.currency,
          total_amount: update.pre_checkout_query.total_amount,
          payload: update.pre_checkout_query.invoice_payload,
        })

        const result = await callTelegram("answerPreCheckoutQuery", {
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        })

        if (!result?.ok) {
          console.error("PRE CHECKOUT ANSWER ERROR:", result)
        } else {
          console.log("PRE CHECKOUT QUERY ANSWERED")
        }

        return res.sendStatus(200)
      }

      const successfulPayment = update.message?.successful_payment

      if (successfulPayment) {
        console.log("SUCCESSFUL PAYMENT RECEIVED", {
          from: update.message?.from?.id,
          currency: successfulPayment.currency,
          total_amount: successfulPayment.total_amount,
          payload: successfulPayment.invoice_payload,
          telegram_payment_charge_id: successfulPayment.telegram_payment_charge_id,
        })

        if (successfulPayment.currency !== "XTR") {
          return res.sendStatus(200)
        }

        const fromId = update.message?.from?.id
        const payload = String(successfulPayment.invoice_payload || "")
        const amountFromPayment = Number(successfulPayment.total_amount || 0)
        const paymentChargeId = String(successfulPayment.telegram_payment_charge_id || "")
        const externalId = paymentChargeId ? `telegram_stars:${paymentChargeId}` : null

        if (!fromId || amountFromPayment <= 0 || !externalId) {
          return res.sendStatus(200)
        }

        const alreadyProcessed = await prisma.transaction.findFirst({
          where: { externalId },
        })

        if (alreadyProcessed) {
          console.log("PAYMENT ALREADY PROCESSED", { externalId })
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

        await prisma.$transaction(async (tx) => {
          const duplicate = await tx.transaction.findFirst({
            where: { externalId },
          })

          if (duplicate) return

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
              externalId,
            },
          })
        })

        console.log("PAYMENT BALANCE CREDITED", {
          telegram_id: targetTelegramId,
          amount: amountFromPayment,
          externalId,
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
