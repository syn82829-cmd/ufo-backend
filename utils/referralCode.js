const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const REFERRAL_CODE_LENGTH = 8

function normalizeReferralCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

function generateReferralCode() {
  let code = ""

  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)]
  }

  return code
}

async function createUniqueReferralCode(tx) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateReferralCode()
    const existing = await tx.user.findFirst({
      where: { referral_code: code },
      select: { id: true },
    })

    if (!existing) return code
  }

  return `${Date.now().toString(36).toUpperCase().slice(-8)}`
}

async function ensureUserReferralCode(tx, user) {
  if (user?.referral_code) return user.referral_code

  const referralCode = await createUniqueReferralCode(tx)

  await tx.user.update({
    where: { id: user.id },
    data: { referral_code: referralCode },
  })

  return referralCode
}

module.exports = {
  normalizeReferralCode,
  createUniqueReferralCode,
  ensureUserReferralCode,
}
