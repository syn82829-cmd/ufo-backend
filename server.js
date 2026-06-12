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

const app = express()
const server = http.createServer(app)

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}))

app.use(express.json())

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

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

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log("Server started on port", PORT)
})
