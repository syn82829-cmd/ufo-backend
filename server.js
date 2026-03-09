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

app.get("/", (req, res) => {
  res.send("Backend works");
});

/* ============================= */
/* CASES DATA */
/* ============================= */

const casesData = {
  firstpepe: {
    id: "firstpepe",
    price: 9999,
    drops: [
      { id: "pepe", name: "Plush Pepe Spectrum", chance: 10, priceStars: 2235953, priceGems: "25.555", png: "pepe", lottie: "/animations/firstpepe/pepe.json" },
      { id: "ninja", name: "Heart Locket Turtles", chance: 10, priceStars: 1445963, priceGems: "15.595", png: "ninja", lottie: "/animations/firstpepe/ninja.json" },
      { id: "pepebr", name: "Nail Bracelet Pepe Band", chance: 10, priceStars: 86823, priceGems: "1.000", png: "pepebr", lottie: "/animations/firstpepe/pepebr.json" },
      { id: "cupidpepe", name: "Cupid Charm Peaked Cap", chance: 10, priceStars: 43358, priceGems: "500", png: "cupidpepe", lottie: "/animations/firstpepe/cupidpepe.json" },
      { id: "bitsushka", name: "Mighty Arm Xeno Grip", chance: 10, priceStars: 38759, priceGems: "444", png: "bitsushka", lottie: "/animations/firstpepe/bitsushka.json" },
      { id: "pepecat", name: "Scared Cat Pepe Paws", chance: 10, priceStars: 35000, priceGems: "473", png: "pepecat", lottie: "/animations/firstpepe/pepecat.json" },
      { id: "brick", name: "Artisan Brick VHS Tape", chance: 10, priceStars: 17249, priceGems: "200", png: "brick", lottie: "/animations/firstpepe/brick.json" },
      { id: "music", name: "Record Player High-End", chance: 10, priceStars: 13372, priceGems: "149", png: "music", lottie: "/animations/firstpepe/music.json" },
      { id: "bookpepe", name: "Star Notepad Pepe Diary", chance: 10, priceStars: 8746, priceGems: "99,99", png: "bookpepe", lottie: "/animations/firstpepe/bookpepe.json" },
      { id: "beer", name: "Toy Bear", chance: 10, priceStars: 4341, priceGems: "50", png: "beer", lottie: "/animations/firstpepe/beer.json" },
      { id: "shlem", name: "Neko Helmet Silver Surfer", chance: 10, priceStars: 3785, priceGems: "43,6", png: "shlem", lottie: "/animations/firstpepe/shlem.json" },
      { id: "shlapa", name: "Witch Hat Alchemy", chance: 10, priceStars: 2160, priceGems: "24,89", png: "shlapa", lottie: "/animations/firstpepe/shlapa.json" },
    ],
  },

  crash: {
    id: "crash",
    price: 7999,
    drops: [
      { id: "pepe2", name: "Plush Pepe Yellow Purp", chance: 10, priceStars: 994156, priceGems: "11.111", png: "pepe2", lottie: "/animations/crash/pepe2.json" },
      { id: "cl2", name: "Clover Pin Kelly Green", chance: 10, priceStars: 1695, priceGems: "18,99", png: "cl2", lottie: "/animations/crash/cl2.json" },
      { id: "cl3", name: "Clover Pin Moon Power", chance: 10, priceStars: 1331, priceGems: "14,9", png: "cl3", lottie: "/animations/crash/cl3.json" },
      { id: "cl9", name: "Clover Pin Peacock", chance: 10, priceStars: 893, priceGems: "10", png: "cl9", lottie: "/animations/crash/cl9.json" },
      { id: "cl5", name: "Clover Pin Four Wishes", chance: 10, priceStars: 889, priceGems: "10", png: "cl5", lottie: "/animations/crash/cl5.json" },
      { id: "cl11", name: "Clover Pin Verdant Plaid", chance: 10, priceStars: 804, priceGems: "9", png: "cl11", lottie: "/animations/crash/cl11.json" },
      { id: "cl8", name: "Clover Pin Nebula", chance: 10, priceStars: 789, priceGems: "8,85", png: "cl8", lottie: "/animations/crash/cl8.json" },
      { id: "cl1", name: "Clover Pin Emo", chance: 10, priceStars: 760, priceGems: "8,5", png: "cl1", lottie: "/animations/crash/cl1.json" },
      { id: "cl10", name: "Clover Pin Crystal Hearts", chance: 10, priceStars: 711, priceGems: "7,96", png: "cl10", lottie: "/animations/crash/cl10.json" },
      { id: "cl4", name: "Clover Pin Fabulous", chance: 10, priceStars: 645, priceGems: "7,2", png: "cl4", lottie: "/animations/crash/cl4.json" },
      { id: "cl6", name: "Clover Pin Butterfly", chance: 10, priceStars: 625, priceGems: "7,15", png: "cl6", lottie: "/animations/crash/cl6.json" },
      { id: "cl7", name: "Clover Pin Matrix", chance: 10, priceStars: 614, priceGems: "7", png: "cl7", lottie: "/animations/crash/cl7.json" },
    ],
  },

  darkmatter: {
    id: "darkmatter",
    price: 5999,
    drops: [
      { id: "gift", name: "Loot Bag Crypto Punk", chance: 10, priceStars: 73800, priceGems: "680", png: "LootBag", lottie: "/animations/darkmatter/gift.json" },
      { id: "darkhelmet", name: "Heroic Helmet Biker Warrior", chance: 5, priceStars: 39300, priceGems: "200", png: "HeroicHelmet", lottie: "/animations/darkmatter/darkhelmet.json" },
      { id: "westside", name: "Westside Bible Of Love", chance: 15, priceStars: 19651, priceGems: "225", png: "WestsideSign", lottie: "/animations/darkmatter/westside.json" },
      { id: "lowrider", name: "Low Rider LA Noir", chance: 20, priceStars: 8358, priceGems: "85", png: "Lowrider", lottie: "/animations/darkmatter/lowrider.json" },
      { id: "watch", name: "Swiss Secret Agent", chance: 20, priceStars: 7483, priceGems: "80", png: "SwissWatch", lottie: "/animations/darkmatter/watch.json" },
      { id: "skull", name: "Electric Skull Deadman", chance: 25, priceStars: 3720, priceGems: "40", png: "skull", lottie: "/animations/darkmatter/skull.json" },
      { id: "dyson", name: "Ionic Dryer Noir Vape", chance: 30, priceStars: 2370, priceGems: "26", png: "IonicDryer", lottie: "/animations/darkmatter/dyson.json" },
      { id: "poizon", name: "Love Potion Spades", chance: 18, priceStars: 2196, priceGems: "25", png: "poison", lottie: "/animations/darkmatter/poizon.json" },
      { id: "ball", name: "Crystal Ball Inkwell", chance: 35, priceStars: 1757, priceGems: "20", png: "ball", lottie: "/animations/darkmatter/ball.json" },
      { id: "metla", name: "Flying Broom Finish Line", chance: 22, priceStars: 1581, priceGems: "18", png: "metla", lottie: "/animations/darkmatter/metla.json" },
      { id: "batman", name: "Stellar Rocket Black Wing", chance: 8, priceStars: 1370, priceGems: "15", png: "batman", lottie: "/animations/darkmatter/batman.json" },
      { id: "book", name: "Star Notepad Spellbook", chance: 40, priceStars: 963, priceGems: "10", png: "book", lottie: "/animations/darkmatter/book.json" },
    ],
  },

  godparticle: {
    id: "godparticle",
    price: 4999,
    drops: [
      { id: "astral", name: "Astral Shard Crystal Punk", chance: 10, priceStars: 29203, priceGems: "333", png: "astral", lottie: "/animations/godparticle/astral.json" },
      { id: "ring", name: "Gem Signet Neon", chance: 10, priceStars: 12274, priceGems: "140", png: "ring", lottie: "/animations/godparticle/ring.json" },
      { id: "vodo", name: "Voodoo Doll Broken Hope", chance: 10, priceStars: 10967, priceGems: "125", png: "vodo", lottie: "/animations/godparticle/vodo.json" },
      { id: "qksl", name: "Magic Potion Quick Silver", chance: 10, priceStars: 10265, priceGems: "123", png: "qksl", lottie: "/animations/godparticle/qksl.json" },
      { id: "dracarys", name: "Rare Bird Dark Prince", chance: 10, priceStars: 8775, priceGems: "99,99", png: "dracarys", lottie: "/animations/godparticle/dracarys.json" },
      { id: "dragon", name: "Bow Tie Dracarys", chance: 10, priceStars: 8428, priceGems: "96", png: "dragon", lottie: "/animations/godparticle/dragon.json" },
      { id: "gybi", name: "Sharp Tongue Frostbite", chance: 10, priceStars: 7458, priceGems: "85", png: "gybi", lottie: "/animations/godparticle/gybi.json" },
      { id: "tikva", name: "Mad Pumpkin Frostbite", chance: 10, priceStars: 6765, priceGems: "77", png: "tikva", lottie: "/animations/godparticle/tikva.json" },
      { id: "flower", name: "Skull Flower Soft Puff", chance: 10, priceStars: 3077, priceGems: "35", png: "flower", lottie: "/animations/godparticle/flower.json" },
      { id: "cdskull", name: "Cupid Charm Cursed Room", chance: 10, priceStars: 2820, priceGems: "32", png: "cdskull", lottie: "/animations/godparticle/cdskull.json" },
      { id: "eye", name: "Evil Eye Seeing Stars", chance: 10, priceStars: 1759, priceGems: "20", png: "eye", lottie: "/animations/godparticle/eye.json" },
      { id: "lps", name: "Hypno Lollipop", chance: 10, priceStars: 977, priceGems: "11,11", png: "lps", lottie: "/animations/godparticle/lps.json" },
    ],
  },

  purplehole: {
    id: "purplehole",
    price: 2299,
    drops: [
      { id: "cat", name: "Scared Cat Purrlion", chance: 10, priceStars: 19499, priceGems: "222", png: "cat", lottie: "/animations/purplehole/cat.json" },
      { id: "kalendar", name: "Voodoo Doll Far Galaxy", chance: 10, priceStars: 5393, priceGems: "59", png: "kalendar", lottie: "/animations/purplehole/kalendar.json" },
      { id: "Baklajan", name: "Stellar Rocket Space Veggie", chance: 10, priceStars: 2200, priceGems: "25", png: "Baklajan", lottie: "/animations/purplehole/Baklajan.json" },
      { id: "Fen", name: "Ionic Dryer Cyber Prism", chance: 10, priceStars: 1861, priceGems: "21", png: "Fen", lottie: "/animations/purplehole/Fen.json" },
      { id: "Kosak", name: "Snoop Cigar Mirage", chance: 10, priceStars: 1316, priceGems: "15", png: "Kosak", lottie: "/animations/purplehole/Kosak.json" },
      { id: "Runa", name: "Input Key Raido Rune", chance: 10, priceStars: 959, priceGems: "11", png: "Runa", lottie: "/animations/purplehole/Runa.json" },
      { id: "Mokey", name: "Jolly Chimp Clash Elixir", chance: 10, priceStars: 774, priceGems: "8", png: "Mokey", lottie: "/animations/purplehole/Mokey.json" },
      { id: "ily", name: "Joyful Bundle Pacman", chance: 10, priceStars: 700, priceGems: "8", png: "ily", lottie: "/animations/purplehole/ily.json" },
      { id: "Dog", name: "Snoop Dog Black Diamond", chance: 10, priceStars: 659, priceGems: "7", png: "Dog", lottie: "/animations/purplehole/Dog.json" },
      { id: "Klever", name: "Clover Pin Nebula", chance: 10, priceStars: 630, priceGems: "7", png: "Klever", lottie: "/animations/purplehole/Klever.json" },
      { id: "Poo", name: "Happy Brownie Amethyst", chance: 10, priceStars: 615, priceGems: "7", png: "Poo", lottie: "/animations/purplehole/Poo.json" },
      { id: "Moon", name: "Faith Amulet Moonlight", chance: 10, priceStars: 600, priceGems: "7", png: "Moon", lottie: "/animations/purplehole/Moon.json" },
    ],
  },

  spacetrash: {
    id: "spacetrash",
    price: 799,
    drops: [
      { id: "soska", name: "Bling Binky Star Fighter", chance: 10, priceStars: 22203, priceGems: "250", png: "soska", lottie: "/animations/spacetrash/soska.json" },
      { id: "froggo", name: "Kissed Frog Tesla", chance: 10, priceStars: 13425, priceGems: "150", png: "froggo", lottie: "/animations/spacetrash/froggo.json" },
      { id: "box1", name: "Jack-in-the-Box Aliens", chance: 10, priceStars: 805, priceGems: "9", png: "box1", lottie: "/animations/spacetrash/box1.json" },
      { id: "egg", name: "Easter Egg Omeletron", chance: 10, priceStars: 744, priceGems: "8", png: "egg", lottie: "/animations/spacetrash/egg.json" },
      { id: "metch", name: "Light Sword Prismatic", chance: 10, priceStars: 734, priceGems: "8", png: "metch", lottie: "/animations/spacetrash/metch.json" },
      { id: "raketa", name: "Stellar Rocket First Step", chance: 10, priceStars: 626, priceGems: "7", png: "raketa", lottie: "/animations/spacetrash/raketa.json" },
      { id: "ufopoo", name: "Happy Brownie Alien", chance: 10, priceStars: 600, priceGems: "6,9", png: "ufopoo", lottie: "/animations/spacetrash/ufopoo.json" },
      { id: "diamond", name: "Diamond", chance: 10, priceStars: 100, priceGems: "0,8", png: "diamond", lottie: "/animations/spacetrash/diamond.json" },
      { id: "dring", name: "Ring", chance: 10, priceStars: 100, priceGems: "0,8", png: "dring", lottie: "/animations/spacetrash/dring.json" },
      { id: "cup", name: "Cup", chance: 10, priceStars: 100, priceGems: "0,8", png: "cup", lottie: "/animations/spacetrash/cup.json" },
      { id: "rock", name: "Rocket", chance: 10, priceStars: 50, priceGems: "0,3", png: "rock", lottie: "/animations/spacetrash/rock.json" },
      { id: "podarok", name: "Gift", chance: 10, priceStars: 25, priceGems: "0,15", png: "podarok", lottie: "/animations/spacetrash/podarok.json" },
    ],
  },

  starfall: {
    id: "starfall",
    price: 499,
    drops: [
      { id: "stars_100", name: "100 Stars", chance: 26, priceStars: 100, priceGems: null, png: "star", lottie: null },
      { id: "stars_150", name: "150 Stars", chance: 22, priceStars: 150, priceGems: null, png: "star", lottie: null },
      { id: "stars_250", name: "250 Stars", chance: 18, priceStars: 250, priceGems: null, png: "star", lottie: null },
      { id: "stars_350", name: "350 Stars", chance: 12, priceStars: 350, priceGems: null, png: "star", lottie: null },
      { id: "stars_500", name: "500 Stars", chance: 8, priceStars: 500, priceGems: null, png: "star", lottie: null },
      { id: "stars_750", name: "750 Stars", chance: 5, priceStars: 750, priceGems: null, png: "star", lottie: null },
      { id: "stars_1000", name: "1000 Stars", chance: 4, priceStars: 1000, priceGems: null, png: "star", lottie: null },
      { id: "stars_1500", name: "1500 Stars", chance: 2, priceStars: 1500, priceGems: null, png: "star", lottie: null },
      { id: "stars_2500", name: "2500 Stars", chance: 1, priceStars: 2500, priceGems: null, png: "star", lottie: null },
      { id: "stars_5000", name: "5000 Stars", chance: 1, priceStars: 5000, priceGems: null, png: "star", lottie: null },
    ],
  },

  randomcase: {
    id: "randomcase",
    price: 999,
    drops: [
      { id: "case_firstpepe", name: "Pepe Case", chance: 10, priceStars: 9999, priceGems: null, png: "case1", lottie: null },
      { id: "case_crash", name: "All or Nothing", chance: 10, priceStars: 7999, priceGems: null, png: "case2", lottie: null },
      { id: "case_darkmatter", name: "Dark Matter", chance: 10, priceStars: 5999, priceGems: null, png: "case3", lottie: null },
      { id: "case_godparticle", name: "God Particle", chance: 10, priceStars: 4599, priceGems: null, png: "case4", lottie: null },
      { id: "case_purplehole", name: "Purple Hole", chance: 15, priceStars: 2299, priceGems: null, png: "case5", lottie: null },
      { id: "case_spacetrash", name: "Space Trash", chance: 20, priceStars: 799, priceGems: null, png: "case6", lottie: null },
      { id: "case_starfall", name: "Starfall", chance: 15, priceStars: 499, priceGems: null, png: "case7", lottie: null },
    ],
  },
};

function pickWeightedDrop(drops) {
  const totalWeight = drops.reduce((sum, drop) => sum + (drop.chance || 0), 0);
  if (!totalWeight) return null;

  let roll = Math.random() * totalWeight;

  for (const drop of drops) {
    roll -= drop.chance || 0;
    if (roll <= 0) return drop;
  }

  return drops[drops.length - 1] || null;
}

/* ============================= */
/* СОЗДАТЬ ИЛИ ПОЛУЧИТЬ USER */
/* ============================= */

app.post("/user", async (req, res) => {
  try {
    const { id, username } = req.body;

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

/* ============================= */
/* ПОЛУЧИТЬ БАЛАНС */
/* ============================= */

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

/* ============================= */
/* DEPOSIT */
/* ============================= */

app.post("/deposit", async (req, res) => {
  try {
    const { telegram_id, amount } = req.body;

    if (!telegram_id || !amount || amount <= 0) {
      return res.status(400).json({ error: "invalid data" });
    }

    const result = await prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      });

      if (!user) throw new Error("User not found");

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: amount }
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: "deposit"
        }
      });

      return updatedUser;
    });

    res.json({ balance: result.balance });

  } catch (error) {
    console.error("DEPOSIT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================= */
/* WITHDRAW */
/* ============================= */

app.post("/withdraw", async (req, res) => {
  try {
    const { telegram_id, amount } = req.body;

    if (!telegram_id || !amount || amount <= 0) {
      return res.status(400).json({ error: "invalid data" });
    }

    const result = await prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      });

      if (!user) throw new Error("User not found");
      if (user.balance < amount) throw new Error("Insufficient balance");

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: amount }
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: "withdraw"
        }
      });

      return updatedUser;
    });

    res.json({ balance: result.balance });

  } catch (error) {
    console.error("WITHDRAW ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================= */
/* OPEN CASE */
/* ============================= */

app.post("/case/open", async (req, res) => {
  try {
    const { telegram_id, caseId } = req.body;

    if (!telegram_id || !caseId) {
      return res.status(400).json({ error: "telegram_id and caseId are required" });
    }

    const caseConfig = casesData[caseId];
    if (!caseConfig) {
      return res.status(404).json({ error: "case not found" });
    }

    const winner = pickWeightedDrop(caseConfig.drops);
    if (!winner) {
      return res.status(400).json({ error: "no drops available in case" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.balance < caseConfig.price) {
        throw new Error("Insufficient balance");
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: caseConfig.price }
        }
      });

      const inventoryItem = await tx.inventoryItem.create({
        data: {
          userId: user.id,
          dropId: winner.id,
          dropName: winner.name,
          caseId: caseConfig.id,
          priceStars: Number(winner.priceStars || 0),
          priceGems: winner.priceGems || null,
          png: winner.png,
          lottie: winner.lottie || null,
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: caseConfig.price,
          type: "case"
        }
      });

      return {
        balance: updatedUser.balance,
        inventoryItem,
      };
    });

    res.json({
      balance: result.balance,
      drop: result.inventoryItem,
    });

  } catch (error) {
    console.error("OPEN CASE ERROR:", error);
    res.status(500).json({ error: error.message || "open case error" });
  }
});

/* ============================= */
/* INVENTORY */
/* ============================= */

app.get("/inventory/:telegram_id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(req.params.telegram_id) }
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        userId: user.id,
        isSold: false
      },
      orderBy: {
        obtained_at: "desc"
      }
    });

    res.json(items);

  } catch (error) {
    console.error("INVENTORY ERROR:", error);
    res.status(500).json({ error: "inventory error" });
  }
});

/* ============================= */
/* SELL INVENTORY ITEM */
/* ============================= */

app.post("/inventory/sell", async (req, res) => {
  try {
    const { telegram_id, inventoryItemId } = req.body;

    if (!telegram_id || !inventoryItemId) {
      return res.status(400).json({ error: "telegram_id and inventoryItemId are required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) }
      });

      if (!user) {
        throw new Error("User not found");
      }

      const item = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId }
      });

      if (!item) {
        throw new Error("Inventory item not found");
      }

      if (item.userId !== user.id) {
        throw new Error("Inventory item does not belong to this user");
      }

      if (item.isSold) {
        throw new Error("Inventory item already sold");
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: item.priceStars }
        }
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          isSold: true,
          sold_at: new Date()
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: item.priceStars,
          type: "sale"
        }
      });

      return updatedUser;
    });

    res.json({ balance: result.balance });

  } catch (error) {
    console.error("SELL INVENTORY ITEM ERROR:", error);
    res.status(500).json({ error: error.message || "sell inventory item error" });
  }
});

/* ============================= */
/* TRANSACTIONS HISTORY */
/* ============================= */

app.get("/transactions/:telegram_id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(req.params.telegram_id) },
      include: {
        transactions: {
          orderBy: { created_at: "desc" }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json(user.transactions);

  } catch (error) {
    console.error("TRANSACTIONS ERROR:", error);
    res.status(500).json({ error: "transactions error" });
  }
});

/* ============================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
