const express = require("express")
const prisma = require("../lib/prisma")
const {
  normalizeReferralCode,
  ensureUserReferralCode,
} = require("../utils/referralCode")

function createReferralRoutes() {
  const router = express.Router()

  router.get("/referral/state/:telegram_id", async (req, res) => {
    try {
      const telegramId = req.params.telegram_id

      if (!telegramId) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegramId) },
        })

        if (!user) {
          throw new Error("User not found")
        }

        const referralCode = await ensureUserReferralCode(tx, user)

        const referralsCount = await tx.user.count({
          where: { referred_by_id: user.id },
        })

        return {
          referralCode,
          referralsCount,
          referredById: user.referred_by_id || null,
          totalEarned: Number(user.referral_earned || 0),
          withdrawn: Number(user.referral_withdrawn || 0),
          available: Math.max(Number(user.referral_earned || 0) - Number(user.referral_withdrawn || 0), 0),
        }
      })

      return res.json(result)
    } catch (error) {
      console.error("REFERRAL STATE ERROR:", error)
      return res.status(500).json({ error: error.message || "referral state error" })
    }
  })

  router.post("/referral/apply", async (req, res) => {
    try {
      const { telegram_id, code } = req.body
      const referralCode = normalizeReferralCode(code)

      if (!telegram_id || !referralCode) {
        return res.status(400).json({ error: "telegram_id and code are required" })
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { telegram_id: BigInt(telegram_id) },
        })

        if (!user) {
          throw new Error("User not found")
        }

        if (user.referred_by_id) {
          return {
            ok: true,
            alreadyApplied: true,
            referredById: user.referred_by_id,
          }
        }

        await ensureUserReferralCode(tx, user)

        const referrer = await tx.user.findFirst({
          where: { referral_code: referralCode },
        })

        if (!referrer) {
          throw new Error("Referral code not found")
        }

        if (referrer.id === user.id) {
          throw new Error("Cannot use your own referral code")
        }

        const linked = await tx.user.updateMany({
          where: {
            id: user.id,
            referred_by_id: null,
          },
          data: {
            referred_by_id: referrer.id,
            referred_at: new Date(),
          },
        })

        if (linked.count !== 1) {
          return {
            ok: true,
            alreadyApplied: true,
            referredById: user.referred_by_id || referrer.id,
          }
        }

        await tx.user.update({
          where: { id: referrer.id },
          data: {
            bonus_friend_invited: true,
          },
        })

        return {
          ok: true,
          alreadyApplied: false,
          referredById: referrer.id,
        }
      })

      return res.json(result)
    } catch (error) {
      console.error("REFERRAL APPLY ERROR:", error)
      return res.status(500).json({ error: error.message || "referral apply error" })
    }
  })

  return router
}

module.exports = {
  createReferralRoutes,
}
