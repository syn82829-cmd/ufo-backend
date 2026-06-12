const express = require("express")
const cors = require("cors")
const http = require("http")
const { Server } = require("socket.io")

const userRoutes = require("./routes/userRoutes")
const caseRoutesFactory = require("./routes/caseRoutes")
const inventoryRoutes = require("./routes/inventoryRoutes")
const transactionRoutes = require("./routes/transactionRoutes")

const { createCrashSocket } = require("./crash/crashSocket")
const { attachLiveDropsSocket } = require("./live/liveDropsEngine")

const app = express()
const server = http.createServer(app)

app.use(cors({ origin: "*", methods: ["GET", "POST"] }))
app.use(express.json())

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
})

// sockets
const crashSocket = createCrashSocket(io)
attachLiveDropsSocket(io)

// routes
app.use(userRoutes)
app.use(inventoryRoutes)
app.use(transactionRoutes)
app.use(caseRoutesFactory(io))

app.get("/", (req, res) => res.send("Backend works"))

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log("Server started", PORT))
