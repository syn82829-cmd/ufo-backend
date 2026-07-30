const express = require("express")
const { getStarsDepositCredit } = require("../utils/starsDepositBonus")

function createStarsRoutes() {
  const router = express.Router()

  const BOT_TOKEN = process.env.BOT_TOKEN

  if (!BOT_TOKEN) {
    console.error("BOT_TOKEN is not defined in environment variables")
  }

  router.post("/stars/invoice", async (req, res) => {
    try {
      const { telegram_id, amount } = req.body

      if (!telegram_id || !amount || Number(amount) <= 0) {
        return res.status(400).json({
          error: "telegram_id and valid amount are required",
        })
      }

      if (!BOT_TOKEN) {
        return res.status(500).json({
          error: "BOT_TOKEN is not configured",
        })
      }

      const numericAmount = Math.floor(Number(amount))
      const credit = getStarsDepositCredit(numericAmount)

      const payload = `stars:${telegram_id}:${numericAmount}:${Date.now()}`
      const bonusDescription = credit.bonusPercent > 0
        ? ` с бонусом +${credit.bonusPercent}% — на баланс поступит ${credit.creditAmount} ⭐`
        : ""

      const tgRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "GIFTON Balance Top-Up",
            description: `Пополнение на ${numericAmount} ⭐${bonusDescription}`,
            payload,
            provider_token: "",
            currency: "XTR",
            prices: [
              {
                label: "Telegram Stars",
                amount: numericAmount,
              },
            ],
          }),
        }
      )

      const data = await tgRes.json()

      if (!tgRes.ok || !data?.ok || !data?.result) {
        console.error("TELEGRAM INVOICE ERROR:", data)
        return res.status(500).json({
          error: data?.description || "Failed to create invoice",
        })
      }

      res.json({
        invoiceLink: data.result,
        paidAmount: credit.paidAmount,
        bonusPercent: credit.bonusPercent,
        bonusAmount: credit.bonusAmount,
        creditAmount: credit.creditAmount,
      })
    } catch (err) {
      console.error("STARS ROUTE ERROR:", err)
      res.status(500).json({
        error: err.message || "Stars invoice error",
      })
    }
  })

  return router
}

module.exports = {
  createStarsRoutes,
}
