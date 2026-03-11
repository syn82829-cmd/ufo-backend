const CRASH_WAITING_MS = 5000
const CRASH_CRASHED_MS = 1200

function getRandomCrashPoint() {
  const roll = Math.random()

  if (roll < 0.42) return +(1.01 + Math.random() * 0.24).toFixed(2) // x1.01 - x1.25
  if (roll < 0.72) return +(1.26 + Math.random() * 0.44).toFixed(2) // x1.26 - x1.70
  if (roll < 0.88) return +(1.71 + Math.random() * 0.79).toFixed(2) // x1.71 - x2.50
  if (roll < 0.96) return +(2.51 + Math.random() * 1.49).toFixed(2) // x2.51 - x4.00
  if (roll < 0.99) return +(4.01 + Math.random() * 3.99).toFixed(2) // x4.01 - x8.00

  return +(8.01 + Math.random() * 11.99).toFixed(2) // x8.01 - x20.00
}

const getMultiplierByElapsedMs = (elapsedMs) => {
  const elapsed = Math.max(0, elapsedMs) / 1000
  return +Math.exp(0.14 * elapsed).toFixed(2)
}

function getNow() {
  return new Date()
}

function getMsLeft(targetDate) {
  return Math.max(0, targetDate.getTime() - Date.now())
}

module.exports = {
  CRASH_WAITING_MS,
  CRASH_CRASHED_MS,
  getRandomCrashPoint,
  getMultiplierByElapsedMs,
  getNow,
  getMsLeft,
}
