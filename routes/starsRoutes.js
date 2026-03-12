const express = require("express")

function createStarsRoutes({ botToken }) {
  const router = express.Router()

  router.post("/stars/invoice", async (req, res) => {
    try {
      const { telegram_id, amount } = req.body

      if (!telegram_id || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "telegram_id and valid amount are required" })
      }

      const numericAmount = Number(amount)
      const payload = `stars:${telegram_id}:${numericAmount}:${Date.now()}`

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Пополнение баланса UFOmo",
            description: `Пополнение баланса на ${numericAmount} ⭐`,
            payload,
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

      const data = await response.json()

      if (!response.ok || !data?.ok || !data?.result) {
        console.error("CREATE STARS INVOICE ERROR:", data)
        return res.status(500).json({
          error: data?.description || "failed to create stars invoice link",
        })
      }

      res.json({
        invoiceLink: data.result,
      })
    } catch (error) {
      console.error("STARS INVOICE ROUTE ERROR:", error)
      res.status(500).json({ error: error.message || "stars invoice error" })
    }
  })

  return router
}

module.exports = {
  createStarsRoutes,
}
