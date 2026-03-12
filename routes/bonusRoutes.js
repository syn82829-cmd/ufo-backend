const express = require("express")
const prisma = require("../lib/prisma")

const DAILY_BONUS_REWARD = 10
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000

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

function createBonusRoutes() {
  const router = express.Router()

  // ПОЛУЧИТЬ СОСТОЯНИЕ БОНУСА
  router.get("/bonus/state/:telegram_id", async (req, res) => {
    try {
      const telegramId = req.params.telegram_id

      if (!telegramId) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const user = await prisma.user.findUnique({
        where: { telegram_id: BigInt(telegramId) },
      })

      if (!user) {
        return res.status(404).json({ error: "user not found" })
      }

      const channelSubscribed = Boolean(user.bonus_channel_subscribed ?? false)
      const friendInvited = Boolean(user.bonus_friend_invited ?? false)
      const lastClaimAt = user.daily_bonus_last_claim_at || null

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
      })
    } catch (error) {
      console.error("BONUS STATE ERROR:", error)
      res.status(500).json({ error: error.message || "bonus state error" })
    }
  })

  // РУЧНАЯ ОТМЕТКА ПРИГЛАШЕННОГО ДРУГА
  // потом привяжем к реферальной системе автоматически
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

      // ВРЕМЕННО: заглушка
      // следующим шагом подключим getChatMember и реальную проверку канала
      const isSubscribed = false

      await prisma.user.update({
        where: { id: user.id },
        data: {
          bonus_channel_subscribed: isSubscribed,
        },
      })

      res.json({
        channelSubscribed: isSubscribed,
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
