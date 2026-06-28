const crypto = require("crypto")

const AUTH_MAX_AGE_SECONDS = 24 * 60 * 60

function getTelegramIdFromReq(req) {
  return (
    req.body?.telegram_id ||
    req.body?.id ||
    req.query?.telegram_id ||
    req.params?.telegram_id ||
    req.params?.id ||
    null
  )
}

function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get("hash")

  if (!hash) return null

  params.delete("hash")

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest()

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

  try {
    const expected = Buffer.from(hash, "hex")
    const actual = Buffer.from(calculatedHash, "hex")

    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      return null
    }
  } catch {
    return null
  }

  const authDate = Number(params.get("auth_date") || 0)
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (!authDate || nowSeconds - authDate > AUTH_MAX_AGE_SECONDS) {
    return null
  }

  const rawUser = params.get("user")
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

function createTelegramAuthMiddleware() {
  const isRequired = process.env.REQUIRE_TELEGRAM_AUTH === "true"
  const botToken = process.env.BOT_TOKEN

  return function telegramAuth(req, res, next) {
    if (!isRequired) return next()

    if (req.method === "OPTIONS") return next()
    if (req.path === "/") return next()
    if (req.path.startsWith("/telegram/")) return next()
    if (req.path === "/crash/live") return next()

    const initData = req.get("X-Telegram-Init-Data") || ""
    const telegramUser = verifyTelegramInitData(initData, botToken)

    if (!telegramUser?.id) {
      return res.status(401).json({ error: "invalid telegram auth" })
    }

    const requestTelegramId = getTelegramIdFromReq(req)

    if (requestTelegramId && String(requestTelegramId) !== String(telegramUser.id)) {
      return res.status(403).json({ error: "telegram id mismatch" })
    }

    req.telegramUser = telegramUser
    next()
  }
}

module.exports = {
  createTelegramAuthMiddleware,
  verifyTelegramInitData,
}
