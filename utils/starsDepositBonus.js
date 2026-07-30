const STARS_DEPOSIT_BONUS_TIERS = [
  { minAmount: 5000, percent: 25 },
  { minAmount: 2500, percent: 15 },
  { minAmount: 1000, percent: 10 },
  { minAmount: 500, percent: 5 },
  { minAmount: 250, percent: 2 },
]

function getStarsDepositBonusPercent(amount) {
  const numericAmount = Math.max(0, Math.floor(Number(amount) || 0))
  const tier = STARS_DEPOSIT_BONUS_TIERS.find((item) => numericAmount >= item.minAmount)
  return tier?.percent || 0
}

function getStarsDepositCredit(amount) {
  const numericAmount = Math.max(0, Math.floor(Number(amount) || 0))
  const bonusPercent = getStarsDepositBonusPercent(numericAmount)
  const bonusAmount = Math.floor((numericAmount * bonusPercent) / 100)

  return {
    paidAmount: numericAmount,
    bonusPercent,
    bonusAmount,
    creditAmount: numericAmount + bonusAmount,
  }
}

module.exports = {
  STARS_DEPOSIT_BONUS_TIERS,
  getStarsDepositBonusPercent,
  getStarsDepositCredit,
}
