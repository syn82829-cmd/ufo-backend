const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json());
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend works");
});


// СОЗДАТЬ ИЛИ ПОЛУЧИТЬ USER
app.post("/user", async (req, res) => {
  try {

    const { id, username } = req.body;

    console.log("Incoming TG user:", id, username);

    let user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(id) }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegram_id: BigInt(id),
          username,
          balance: 0
        }
      });

      console.log("User created");
    } else {
      console.log("User exists");
    }

    res.json({
      id: user.id,
      telegram_id: user.telegram_id.toString(),
      username: user.username,
      balance: user.balance
    });

  } catch (error) {

    console.error("USER ERROR:", error);
    res.status(500).json({ error: "user error" });

  }
});


// БАЛАНС
app.get("/balance/:id", async (req, res) => {
  try {

    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(req.params.id) }
    });

    if (!user) return res.json({ balance: 0 });

    res.json({ balance: user.balance });

  } catch (error) {

    console.error("BALANCE ERROR:", error);
    res.status(500).json({ error: "balance error" });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
