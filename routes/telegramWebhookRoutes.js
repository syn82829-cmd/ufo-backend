const express = require("express")
const prisma = require("../lib/prisma")
const {
  normalizeReferralCode,
  createUniqueReferralCode,
} = require("../utils/referralCode")

function createTelegramWebhookRoutes() {
  const router = express.Router()

  const BOT_TOKEN = process.env.BOT_TOKEN
  const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
  const MINI_APP_URL =
    process.env.MINI_APP_URL ||
    process.env.TELEGRAM_MINI_APP_URL ||
    process.env.FRONTEND_URL ||
    ""
  const TELEGRAM_CHANNEL_URL = process.env.TELEGRAM_CHANNEL_URL || ""
  const BOT_USERNAME = String(
    process.env.BOT_USERNAME ||
    process.env.TELEGRAM_BOT_USERNAME ||
    "giftsonbot"
  ).replace(/^@/, "")
  const DEFAULT_SHARE_IMAGE_URL = (() => {
    try {
      return MINI_APP_URL ? new URL("/ui/pod.JPG", MINI_APP_URL).toString() : ""
    } catch {
      return ""
    }
  })()
  const BOT_WELCOME_IMAGE_URL = process.env.BOT_WELCOME_IMAGE_URL || ""
  const BOT_SHARE_IMAGE_URL = process.env.BOT_SHARE_IMAGE_URL || BOT_WELCOME_IMAGE_URL || DEFAULT_SHARE_IMAGE_URL

  async function callTelegram(method, body) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    return response.json()
  }

  async function callTelegramGet(method) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`)
    return response.json()
  }

  function isValidWebhookRequest(req) {
    if (!WEBHOOK_SECRET) return true

    return req.get("X-Telegram-Bot-Api-Secret-Token") === WEBHOOK_SECRET
  }

  function getStartPayload(text) {
    const value = String(text || "").trim()
    if (!value.startsWith("/start")) return ""

    return value.split(/\s+/)[1] || ""
  }

  function getReferralCodeFromStartPayload(payload) {
    const raw = String(payload || "").trim()
    if (!raw) return ""

    return normalizeReferralCode(
      raw
        .replace(/^ref[_-]/i, "")
        .replace(/^r[_-]/i, "")
    )
  }

  function getDisplayName(from) {
    return from?.first_name || from?.username || "друг"
  }

  function buildBotReferralLink(referralCode) {
    const code = normalizeReferralCode(referralCode)
    if (!BOT_USERNAME || !code) return ""

    return `https://t.me/${BOT_USERNAME}?start=ref_${code}`
  }

  function buildAppUrl(referralCode = "") {
    if (!MINI_APP_URL) return ""

    const code = normalizeReferralCode(referralCode)
    if (!code) return MINI_APP_URL

    try {
      const url = new URL(MINI_APP_URL)
      url.searchParams.set("startapp", `ref_${code}`)
      return url.toString()
    } catch {
      return MINI_APP_URL
    }
  }

  function buildWelcomeKeyboard(referralCode = "") {
    const rows = []
    const appUrl = buildAppUrl(referralCode)

    if (appUrl) {
      rows.push([
        {
          text: "🚀 Открыть приложение",
          web_app: { url: appUrl },
        },
      ])
    }

    if (TELEGRAM_CHANNEL_URL) {
      rows.push([
        {
          text: "💙 Открыть канал",
          url: TELEGRAM_CHANNEL_URL,
        },
      ])
    }

    return rows.length ? { inline_keyboard: rows } : undefined
  }

  function buildShareKeyboard(referralLink) {
    const rows = []

    if (referralLink) {
      rows.push([
        {
          text: "🎁 Забрать подарок",
          url: referralLink,
        },
      ])
    }

    if (TELEGRAM_CHANNEL_URL) {
      rows.push([
        {
          text: "💙 Открыть канал",
          url: TELEGRAM_CHANNEL_URL,
        },
      ])
    }

    return rows.length ? { inline_keyboard: rows } : undefined
  }

  async function ensureTelegramUser(from) {
    const telegramId = from?.id
    if (!telegramId) return null

    const username = from?.username || [from?.first_name, from?.last_name].filter(Boolean).join(" ") || null

    return prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { telegram_id: BigInt(telegramId) },
      })

      if (!user) {
        const referralCode = await createUniqueReferralCode(tx)

        user = await tx.user.create({
          data: {
            telegram_id: BigInt(telegramId),
            username,
            balance: 0,
            referral_code: referralCode,
          },
        })
      } else if (username && user.username !== username) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { username },
        })
      }

      return user
    })
  }

  async function applyReferralFromStart({ user, referralCode }) {
    if (!user || !referralCode || user.referred_by_id) return null

    return prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
      })

      if (!currentUser || currentUser.referred_by_id) {
        return { ok: true, alreadyApplied: true }
      }

      const referrer = await tx.user.findFirst({
        where: { referral_code: referralCode },
      })

      if (!referrer || referrer.id === currentUser.id) {
        return { ok: false }
      }

      const linked = await tx.user.updateMany({
        where: {
          id: currentUser.id,
          referred_by_id: null,
        },
        data: {
          referred_by_id: referrer.id,
          referred_at: new Date(),
        },
      })

      if (linked.count !== 1) {
        return { ok: true, alreadyApplied: true }
      }

      await tx.user.update({
        where: { id: referrer.id },
        data: {
          bonus_friend_invited: true,
        },
      })

      return { ok: true, alreadyApplied: false, referrerId: referrer.id }
    })
  }

  async function sendStartMessage({ chatId, from, referralApplied }) {
    const name = getDisplayName(from)
    const keyboard = buildWelcomeKeyboard()
    const referralLine = referralApplied?.ok && !referralApplied?.alreadyApplied
      ? "\n\n🎁 Приглашение засчитано. Открывай приложение и забирай бонусы."
      : ""

    const text =
      `👋 <b>Привет, ${name}!</b>\n\n` +
      `🚀 Добро пожаловать в <b>GIFTON</b> — открывай кейсы, забирай подарки и собирай звёзды каждый день.\n\n` +
      `🎁 Заходи в приложение, получай ежедневный подарок и приглашай друзей.${referralLine}`

    if (BOT_WELCOME_IMAGE_URL) {
      const photoResult = await callTelegram("sendPhoto", {
        chat_id: chatId,
        photo: BOT_WELCOME_IMAGE_URL,
        caption: text,
        parse_mode: "HTML",
        reply_markup: keyboard,
      })

      if (photoResult?.ok) return photoResult

      console.error("TELEGRAM SEND PHOTO ERROR:", photoResult)
    }

    return callTelegram("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: keyboard,
    })
  }

  router.get("/telegram/webhook-status", async (req, res) => {
    try {
      if (!BOT_TOKEN) {
        return res.status(500).json({
          ok: false,
          error: "BOT_TOKEN is not configured",
          configured: {
            botToken: false,
            webhookUrl: Boolean(WEBHOOK_URL),
            webhookSecret: Boolean(WEBHOOK_SECRET),
          },
        })
      }

      const info = await callTelegramGet("getWebhookInfo")

      return res.json({
        ok: true,
        configured: {
          botToken: true,
          webhookUrl: Boolean(WEBHOOK_URL),
          webhookSecret: Boolean(WEBHOOK_SECRET),
          expectedWebhookUrl: WEBHOOK_URL || null,
          miniAppUrl: Boolean(MINI_APP_URL),
          channelUrl: Boolean(TELEGRAM_CHANNEL_URL),
          botUsername: BOT_USERNAME || null,
          welcomeImage: Boolean(BOT_WELCOME_IMAGE_URL),
          shareImage: Boolean(BOT_SHARE_IMAGE_URL),
          shareImageUrl: BOT_SHARE_IMAGE_URL || null,
        },
        telegram: info,
      })
    } catch (error) {
      console.error("TELEGRAM WEBHOOK STATUS ERROR:", error)
      return res.status(500).json({
        ok: false,
        error: error.message || "Webhook status error",
      })
    }
  })

  router.post("/telegram/share/referral", async (req, res) => {
    try {
      const { telegram_id, referral_code } = req.body || {}

      if (!BOT_TOKEN || !telegram_id) {
        return res.status(400).json({ error: "telegram_id is required" })
      }

      const user = await prisma.user.findUnique({
        where: { telegram_id: BigInt(telegram_id) },
      })

      if (!user) {
        return res.status(404).json({ error: "user not found" })
      }

      const referralCode = normalizeReferralCode(referral_code || user.referral_code)
      const referralLink = buildBotReferralLink(referralCode)

      if (!referralCode || !referralLink) {
        return res.status(400).json({ error: "referral link is not available" })
      }

      const title = "Забирай бесплатный подарок каждый день!"
      const description = "Открывай кейсы и выигрывай NFT💙"
      const shareText = `${referralLink}\n\n${title}\n\n${description}`
      const replyMarkup = buildShareKeyboard(referralLink)

      const result = BOT_SHARE_IMAGE_URL
        ? {
            type: "photo",
            id: `gifton_ref_${referralCode}_${Date.now()}`,
            photo_url: BOT_SHARE_IMAGE_URL,
            thumbnail_url: BOT_SHARE_IMAGE_URL,
            caption: shareText,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          }
        : {
            type: "article",
            id: `gifton_ref_${referralCode}_${Date.now()}`,
            title,
            description,
            input_message_content: {
              message_text: shareText,
              disable_web_page_preview: false,
            },
            reply_markup: replyMarkup,
          }

      const prepared = await callTelegram("savePreparedInlineMessage", {
        user_id: Number(telegram_id),
        result,
        allow_user_chats: true,
        allow_bot_chats: true,
        allow_group_chats: true,
        allow_channel_chats: false,
      })

      if (!prepared?.ok || !prepared?.result?.id) {
        console.error("TELEGRAM PREPARE REFERRAL SHARE ERROR:", prepared)
        return res.json({
          ok: false,
          referralLink,
          fallbackText: shareText,
          error: prepared?.description || "prepare share failed",
        })
      }

      return res.json({
        ok: true,
        preparedInlineMessageId: prepared.result.id,
        referralLink,
        fallbackText: shareText,
      })
    } catch (error) {
      console.error("TELEGRAM REFERRAL SHARE ERROR:", error)
      return res.status(500).json({ error: error.message || "referral share error" })
    }
  })

  router.post("/telegram/register-webhook", async (req, res) => {
    try {
      if (!BOT_TOKEN || !WEBHOOK_URL) {
        return res.status(500).json({
          ok: false,
          error: "BOT_TOKEN or TELEGRAM_WEBHOOK_URL is not configured",
          configured: {
            botToken: Boolean(BOT_TOKEN),
            webhookUrl: Boolean(WEBHOOK_URL),
            webhookSecret: Boolean(WEBHOOK_SECRET),
          },
        })
      }

      const result = await callTelegram("setWebhook", {
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET || undefined,
        allowed_updates: ["message", "pre_checkout_query"],
        drop_pending_updates: false,
      })

      return res.json({
        ok: Boolean(result?.ok),
        result,
      })
    } catch (error) {
      console.error("TELEGRAM WEBHOOK MANUAL REGISTER ERROR:", error)
      return res.status(500).json({
        ok: false,
        error: error.message || "Webhook register error",
      })
    }
  })

  router.post("/telegram/webhook", async (req, res) => {
    try {
      if (!isValidWebhookRequest(req)) {
        console.error("TELEGRAM WEBHOOK SECRET MISMATCH")
        return res.sendStatus(403)
      }

      const update = req.body || {}

      if (update.pre_checkout_query) {
        console.log("PRE CHECKOUT QUERY RECEIVED", {
          id: update.pre_checkout_query.id,
          from: update.pre_checkout_query.from?.id,
          currency: update.pre_checkout_query.currency,
          total_amount: update.pre_checkout_query.total_amount,
          payload: update.pre_checkout_query.invoice_payload,
        })

        const result = await callTelegram("answerPreCheckoutQuery", {
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        })

        if (!result?.ok) {
          console.error("PRE CHECKOUT ANSWER ERROR:", result)
        } else {
          console.log("PRE CHECKOUT QUERY ANSWERED")
        }

        return res.sendStatus(200)
      }

      const messageText = String(update.message?.text || "").trim()

      if (messageText.startsWith("/start")) {
        const from = update.message?.from
        const chatId = update.message?.chat?.id

        if (!from?.id || !chatId) {
          return res.sendStatus(200)
        }

        const user = await ensureTelegramUser(from)
        const referralCode = getReferralCodeFromStartPayload(getStartPayload(messageText))
        const referralApplied = referralCode
          ? await applyReferralFromStart({ user, referralCode })
          : null

        const result = await sendStartMessage({
          chatId,
          from,
          referralApplied,
        })

        if (!result?.ok) {
          console.error("TELEGRAM START MESSAGE ERROR:", result)
        }

        return res.sendStatus(200)
      }

      const successfulPayment = update.message?.successful_payment

      if (successfulPayment) {
        console.log("SUCCESSFUL PAYMENT RECEIVED", {
          from: update.message?.from?.id,
          currency: successfulPayment.currency,
          total_amount: successfulPayment.total_amount,
          payload: successfulPayment.invoice_payload,
          telegram_payment_charge_id: successfulPayment.telegram_payment_charge_id,
        })

        if (successfulPayment.currency !== "XTR") {
          return res.sendStatus(200)
        }

        const fromId = update.message?.from?.id
        const payload = String(successfulPayment.invoice_payload || "")
        const amountFromPayment = Number(successfulPayment.total_amount || 0)
        const paymentChargeId = String(successfulPayment.telegram_payment_charge_id || "")
        const externalId = paymentChargeId ? `telegram_stars:${paymentChargeId}` : null

        if (!fromId || amountFromPayment <= 0 || !externalId) {
          return res.sendStatus(200)
        }

        const alreadyProcessed = await prisma.transaction.findFirst({
          where: { externalId },
        })

        if (alreadyProcessed) {
          console.log("PAYMENT ALREADY PROCESSED", { externalId })
          return res.sendStatus(200)
        }

        const payloadParts = payload.split(":")
        const payloadTelegramId = payloadParts[1] ? String(payloadParts[1]) : null
        const targetTelegramId = payloadTelegramId || String(fromId)

        const user = await prisma.user.findUnique({
          where: { telegram_id: BigInt(targetTelegramId) },
        })

        if (!user) {
          console.error("PAYMENT USER NOT FOUND:", targetTelegramId)
          return res.sendStatus(200)
        }

        await prisma.$transaction(async (tx) => {
          const duplicate = await tx.transaction.findFirst({
            where: { externalId },
          })

          if (duplicate) return

          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: { increment: amountFromPayment },
            },
          })

          await tx.transaction.create({
            data: {
              userId: user.id,
              amount: amountFromPayment,
              type: "deposit",
              externalId,
            },
          })
        })

        console.log("PAYMENT BALANCE CREDITED", {
          telegram_id: targetTelegramId,
          amount: amountFromPayment,
          externalId,
        })

        return res.sendStatus(200)
      }

      return res.sendStatus(200)
    } catch (error) {
      console.error("TELEGRAM WEBHOOK ERROR:", error)
      return res.sendStatus(200)
    }
  })

  return router
}

module.exports = {
  createTelegramWebhookRoutes,
}
