const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend works");
});


// CREATE OR GET USER
app.post("/user", async (req, res) => {
  try {

    const { id, username } = req.body;

    console.log("Incoming TG user:", id, username);

    let user = await prisma.user.findUnique({
      where: {
        telegram_id: BigInt(id)
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegram_id: BigInt(id),
          username: username || null
        }
      });

      console.log("User created in DB");
    } else {
      console.log("User already exists");
    }

    res.json({
      id: user.id,
      telegram_id: user.telegram_id.toString(),
      username: user.username,
      balance: user.balance
    });

  } catch (error) {

    console.error("POST /user error:", error);
    res.status(500).json({ error: "error creating user" });

  }
});


// GET BALANCE
app.get("/balance/:telegramId", async (req, res) => {
  try {

    const user = await prisma.user.findUnique({
      where: {
        telegram_id: BigInt(req.params.telegramId)
      }
    });

    if (!user) {
      return res.json({ balance: 0 });
    }

    res.json({ balance: user.balance });

  } catch (error) {

    console.error("GET balance error:", error);
    res.status(500).json({ error: "error" });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
