const express = require("express")
const cors = require("cors")

const userRoutes = require("./routes/userRoutes")
const caseRoutes = require("./routes/caseRoutes")
const inventoryRoutes = require("./routes/inventoryRoutes")
const transactionRoutes = require("./routes/transactionRoutes")
const crashRoutes = require("./routes/crashRoutes")

const app = express()

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}))

app.use(express.json())

app.get("/", (req, res) => {
  res.send("Backend works")
})

app.use(userRoutes)
app.use(caseRoutes)
app.use(inventoryRoutes)
app.use(transactionRoutes)
app.use(crashRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Server started on port", PORT)
})
