const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend works");
});


// создать или получить пользователя
app.post("/user", async (req, res) => {
  try {
    const { id, username } = req.body;

    let user = await prisma.user.findUnique({
      where: { id: BigInt(id) }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: BigInt(id),
          username,
          balance: 0
        }
      });
    }

    res.json({
      id: user.id.toString(),
      username: user.username,
      balance: user.balance
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "error creating user" });
  }
});


// получить баланс
app.get("/balance/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.params.id) }
    });

    if (!user) {
      return res.json({ balance: 0 });
    }

    res.json({ balance: user.balance });

  } catch (error) {
    res.status(500).json({ error: "error" });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
