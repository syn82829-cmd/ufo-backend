const express = require("express")
const prisma = require("../lib/prisma")

const DAILY_BONUS_REWARD = 10
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000
const DAILY_GIFT_LIMIT = 500
const DAILY_GIFT_EXTERNAL_PREFIX = "bonus_daily_gift"

function isCooldownFinished(lastClaimAt) {
  if (!lastClaimAt) return true
  return Date.now() - new Date(lastClaimAt).getTime() >= DAILY_BONUS_COOLDOWN_MS
}

function getTimeLeftMs(lastClaimAt) {
  if (!lastClaimAt) return 0

  const nextClaimAt =
    new Date(lastClaimAt).getTime() + DAILY_BONUS_COOLDOWN_MS

  return Math.max(0, nextClaimAt - Date.now())
}

function getDailyGiftExternalId(userId, date = new Date()) {
  const dayKey = date.toISOString().slice(0, 10)
  return `${DAILY_GIFT_EXTERNAL_PREFIX}:${dayKey}:${userId}`
}

async function getDailyGiftClaimedCount(db = prisma) {
  return db.transaction.count({
    where: {
      externalId: {
        startsWith: `${DAILY_GIFT_EXTERNAL_PREFIX}:`,
      },
    },
  })
}

function createBonusRoutes() {
  const router = express.Router()
  const BOT_TOKEN = process.env.BOT_TOKEN
  const CHANNEL_USERNAME = String(
    process.env.TELEGRAM_CHANNEL_USERNAME ||
    process.env.BONUS_CHANNEL_USERNAME ||
    "@giftonchanneI"
  ).replace(/^https:\/\/t\.me\//i, "@").replace(/^t\.me\//i, "@").replace(/^@?/, "@")

  async function callTelegram(method, body) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    return response.json()
  }

  async function checkTelegramChannelMember(telegramId) {
    if (!BOT_TOKEN || !telegramId || !CHANNEL_USERNAME) return false

    const result = await callTelegram("getChatMember", {
      chat_id: CHANNEL_USERNAME,
      user_id: Number(telegramId),
    })

    if (!result?.ok) {
      console.error("TELEGRAM GET CHAT MEMBER ERROR:", result)
      return false
    }

    const status = result.result?.status
    return ["creator", "administrator", "member"].includes(status)
  }

  // ПОЛУЧИТЬ СОСТОЯНИЕ БОНУСА
  router.get("/bonus/state/:telegram_id", async (req, res) => {
    try {
      const telegramId = req.params.telegram_id

      if (!telegramId) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const [user, claimedCount] = await Promise.all([
        prisma.user.findUnique({
          where: { telegram_id: BigInt(telegramId) },
        }),
        getDailyGiftClaimedCount(),
      ])

      if (!user) {
        return res.status(404).json({ error: "user not found" })
      }

      const channelSubscribed = Boolean(user.bonus_channel_subscribed ?? false)
      const friendInvited = Boolean(user.bonus_friend_invited ?? false)
      const lastClaimAt = user.daily_bonus_last_claim_at || null
      const todayExternalId = getDailyGiftExternalId(user.id)
      const dailyGiftReservedToday = Boolean(
        await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            externalId: todayExternalId,
          },
          select: { id: true },
        })
      )

      const conditionsMet = channelSubscribed && friendInvited
      const cooldownFinished = isCooldownFinished(lastClaimAt)
      const canClaim = conditionsMet && cooldownFinished

      res.json({
        reward: DAILY_BONUS_REWARD,
        channelSubscribed,
        friendInvited,
        conditionsMet,
        canClaim,
        lastClaimAt,
        cooldownMs: DAILY_BONUS_COOLDOWN_MS,
        timeLeftMs: getTimeLeftMs(lastClaimAt),
        claimedCount,
        claimedLimit: DAILY_GIFT_LIMIT,
        dailyGiftReservedToday,
        channelUsername: CHANNEL_USERNAME,
      })
    } catch (error) {
      console.error("BONUS STATE ERROR:", error)
      res.status(500).json({ error: error.message || "bonus state error" })
    }
  })

  // ЗАСЧИТАТЬ ЕЖЕДНЕВНЫЙ ПОДАРОК В ОБЩУЮ ШКАЛУ 0/500
  router.post("/bonus/reserve-gift", async (req, res) => {
    try {
      const { telegram_id } = req.body

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) },
          select: { id: true },
        })

        if (!user) {
          throw new Error("User not found")
        }

        const claimedCount = await getDailyGiftClaimedCount(tx)
        const todayExternalId = getDailyGiftExternalId(user.id)

        const alreadyReserved = await tx.transaction.findFirst({
          where: {
            userId: user.id,
            externalId: todayExternalId,
          },
          select: { id: true },
        })

        if (alreadyReserved) {
          return {
            claimedCount,
            alreadyReserved: true,
          }
        }

        if (claimedCount >= DAILY_GIFT_LIMIT) {
          throw new Error("Daily gift limit reached")
        }

        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: 0,
            type: "deposit",
            externalId: todayExternalId,
          },
        })

        return {
          claimedCount: claimedCount + 1,
          alreadyReserved: false,
        }
      })

      res.json({
        ok: true,
        claimedCount: result.claimedCount,
        claimedLimit: DAILY_GIFT_LIMIT,
        alreadyReserved: result.alreadyReserved,
      })
    } catch (error) {
      console.error("BONUS RESERVE GIFT ERROR:", error)
      res.status(500).json({ error: error.message || "bonus reserve gift error" })
    }
  })

  // РУЧНАЯ ОТМЕТКА ПРИГЛАШЕННОГО ДРУГА
  router.post("/bonus/friend", async (req, res) => {
    try {
      const { telegram_id } = req.body

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const user = await prisma.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) },
      })

      if (!user) {
        return res.status(404).json({ error: "user not found" })
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          bonus_friend_invited: true,
        },
      })

      res.json({ ok: true })
    } catch (error) {
      console.error("BONUS FRIEND ERROR:", error)
      res.status(500).json({ error: error.message || "bonus friend error" })
    }
  })

  // ПРОВЕРКА ПОДПИСКИ НА КАНАЛ
  router.post("/bonus/check-channel", async (req, res) => {
    try {
      const { telegram_id } = req.body

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const user = await prisma.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) },
      })

      if (!user) {
        return res.status(404).json({ error: "user not found" })
      }

      const isSubscribed = await checkTelegramChannelMember(telegram_id)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          bonus_channel_subscribed: isSubscribed,
        },
      })

      res.json({
        ok: true,
        channelSubscribed: isSubscribed,
        channelUsername: CHANNEL_USERNAME,
      })
    } catch (error) {
      console.error("BONUS CHECK CHANNEL ERROR:", error)
      res.status(500).json({ error: error.message || "bonus check channel error" })
    }
  })

  // ЗАБРАТЬ БОНУС
  router.post("/bonus/claim", async (req, res) => {
    try {
      const { telegram_id } = req.body

      if (!telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) },
        })

        if (!user) {
          throw new Error("User not found")
        }

        const channelSubscribed = Boolean(user.bonus_channel_subscribed ?? false)
        const friendInvited = Boolean(user.bonus_friend_invited ?? false)

        if (!channelSubscribed || !friendInvited) {
          throw new Error("Conditions are not completed")
        }

        if (!isCooldownFinished(user.daily_bonus_last_claim_at)) {
          throw new Error("Bonus is not available yet")
        }

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: DAILY_BONUS_REWARD },
            daily_bonus_last_claim_at: new Date(),
          },
        })

        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: DAILY_BONUS_REWARD,
            type: "deposit",
          },
        })

        return updatedUser
      })

      res.json({
        ok: true,
        reward: DAILY_BONUS_REWARD,
        balance: result.balance,
      })
    } catch (error) {
      console.error("BONUS CLAIM ERROR:", error)
      res.status(500).json({ error: error.message || "bonus claim error" })
    }
  })

  return router
}

module.exports = {
  createBonusRoutes,
}
