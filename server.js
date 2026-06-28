const express = require("express")
const cors = require("cors")
const http = require("http")
const { Server } = require("socket.io")

const userRoutes = require("./routes/userRoutes")
const caseRoutes = require("./routes/caseRoutes")
const inventoryRoutes = require("./routes/inventoryRoutes")
const transactionRoutes = require("./routes/transactionRoutes")
const { createCrashRoutes } = require("./routes/crashRoutes")
const { createCrashSocket } = require("./crash/crashSocket")
const { createStarsRoutes } = require("./routes/starsRoutes")
const { createTelegramWebhookRoutes } = require("./routes/telegramWebhookRoutes")
const { createBonusRoutes } = require("./routes/bonusRoutes")
const { createTelegramAuthMiddleware } = require("./middleware/telegramAuth")

const { initLiveDrops } = require("./live/liveDropsEmitter")
const { scheduleFakeDrop } = require("./live/fakeDrops")

const app = express()
const server = http.createServer(app)

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-Telegram-Init-Data", "X-Dev-Deposit-Secret"],
}))

app.use(express.json())
app.use(createTelegramAuthMiddleware())

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

initLiveDrops(io)
scheduleFakeDrop()

const crashSocket = createCrashSocket(io)

app.get("/", (req, res) => {
  res.send("Backend works")
})

app.use(userRoutes)
app.use(caseRoutes)
app.use(inventoryRoutes)
app.use(transactionRoutes)
app.use(createStarsRoutes())
app.use(createTelegramWebhookRoutes())
app.use(createBonusRoutes())
app.use(createCrashRoutes({
  emitCrashState: crashSocket.emitCrashState,
  emitCrashLive: crashSocket.emitCrashLive,
}))

async function registerTelegramWebhook() {
  const BOT_TOKEN = process.env.BOT_TOKEN
  const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!BOT_TOKEN || !WEBHOOK_URL) {
    console.log("Telegram webhook auto-register skipped")
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET || undefined,
        allowed_updates: ["message", "pre_checkout_query"],
        drop_pending_updates: false,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data?.ok) {
      console.error("TELEGRAM WEBHOOK REGISTER ERROR:", data)
      return
    }

    console.log("Telegram webhook registered:", WEBHOOK_URL)
  } catch (err) {
    console.error("TELEGRAM WEBHOOK REGISTER FAILED:", err)
  }
}

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log("Server started on port", PORT)
  registerTelegramWebhook()
})
