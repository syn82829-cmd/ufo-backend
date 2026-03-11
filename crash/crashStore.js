const crashStore = {
  round: null,
  liveBets: new Map(), // key: betId, value: live item
}

function getCrashRound() {
  return crashStore.round
}

function setCrashRound(round) {
  crashStore.round = round
  return crashStore.round
}

function clearCrashRound() {
  crashStore.round = null
}

function getLiveBets() {
  return Array.from(crashStore.liveBets.values()).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function setLiveBet(bet) {
  crashStore.liveBets.set(bet.id, bet)
}

function removeLiveBet(betId) {
  crashStore.liveBets.delete(betId)
}

function clearLiveBets() {
  crashStore.liveBets.clear()
}

function updateLiveBet(betId, patch) {
  const current = crashStore.liveBets.get(betId)
  if (!current) return null

  const next = {
    ...current,
    ...patch,
  }

  crashStore.liveBets.set(betId, next)
  return next
}

module.exports = {
  getCrashRound,
  setCrashRound,
  clearCrashRound,
  getLiveBets,
  setLiveBet,
  removeLiveBet,
  clearLiveBets,
  updateLiveBet,
}
