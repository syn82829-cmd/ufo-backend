const prisma = require("../lib/prisma")
const {
  CRASH_WAITING_MS,
  CRASH_CRASHED_MS,
  getRandomCrashPoint,
  getMultiplierByElapsedMs,
  getNow,
  getMsLeft,
} = require("./crashMath")
const {
  getCrashRound,
  setCrashRound,
  clearLiveBets,
  getLiveBets,
  updateLiveBet,
} = require("./crashStore")

let crashSyncPromise = null

async function getLatestCrashRound(db = prisma) {
  return db.crashRound.findFirst({
    orderBy: { round_number: "desc" },
  })
}

async function createCrashWaitingRound(roundNumber, db = prisma) {
  const round = await db.crashRound.create({
    data: {
      round_number: roundNumber,
      status: "waiting",
      countdown_started_at: getNow(),
      current_multiplier: 1.0,
    },
  })

  clearLiveBets()
  setCrashRound(round)

  return round
}

async function markActiveCrashBetsLost(roundId, db = prisma) {
  await db.crashBet.updateMany({
    where: {
      roundId,
      status: "active",
    },
    data: {
      status: "lost",
    },
  })
}

async function ensureCrashRoundLoaded() {
  let round = getCrashRound()

  if (round) {
    return round
  }

  round = await getLatestCrashRound()

  if (!round) {
    round = await createCrashWaitingRound(1)
  } else {
    setCrashRound(round)
  }

  return round
}

function persistCrashAsync(round) {
  prisma.crashRound.update({
    where: { id: round.id },
    data: {
      status: "crashed",
      crashed_at: round.crashed_at,
      current_multiplier: Number(round.crash_point || 1),
      is_settled: true,
    },
  }).catch((error) => {
    console.error("PERSIST CRASH ROUND ERROR:", error)
  })

  markActiveCrashBetsLost(round.id).catch((error) => {
    console.error("MARK ACTIVE CRASH BETS LOST ERROR:", error)
  })

  const liveBets = getLiveBets()
  for (const bet of liveBets) {
    if (bet.status === "active") {
      updateLiveBet(bet.id, { status: "lost" })
    }
  }
}

async function syncCrashStateInternal() {
  let round = await ensureCrashRoundLoaded()

  if (!round) {
    round = await createCrashWaitingRound(1)
    return round
  }

  if (round.status === "waiting") {
    const waitingEndsAt = new Date(round.countdown_started_at.getTime() + CRASH_WAITING_MS)

    if (Date.now() >= waitingEndsAt.getTime()) {
      const flyingStartedAt = getNow()

      round = {
        ...round,
        status: "flying",
        flying_started_at: flyingStartedAt,
        crash_point: getRandomCrashPoint(),
        current_multiplier: 1.0,
      }

      setCrashRound(round)

      prisma.crashRound.update({
        where: { id: round.id },
        data: {
          status: "flying",
          flying_started_at: flyingStartedAt,
          crash_point: round.crash_point,
          current_multiplier: 1.0,
        },
      }).catch((error) => {
        console.error("PERSIST FLYING ROUND ERROR:", error)
      })

      return round
    }

    return round
  }

  if (round.status === "flying") {
    const elapsedMs = Date.now() - round.flying_started_at.getTime()
    const liveMultiplier = getMultiplierByElapsedMs(elapsedMs)
    const crashPoint = Number(round.crash_point || 1)

    if (liveMultiplier >= crashPoint) {
      round = {
        ...round,
        status: "crashed",
        crashed_at: getNow(),
        current_multiplier: crashPoint,
      }

      setCrashRound(round)
      persistCrashAsync(round)

      return round
    }

    round = {
      ...round,
      current_multiplier: liveMultiplier,
    }

    setCrashRound(round)
    return round
  }

  if (round.status === "crashed") {
    const crashedEndsAt = new Date(round.crashed_at.getTime() + CRASH_CRASHED_MS)

    if (Date.now() >= crashedEndsAt.getTime()) {
      round = await createCrashWaitingRound(round.round_number + 1)
      return round
    }

    return round
  }

  return round
}

async function syncCrashState() {
  if (crashSyncPromise) {
    return crashSyncPromise
  }

  crashSyncPromise = (async () => {
    try {
      const round = await syncCrashStateInternal()
      return round
    } finally {
      crashSyncPromise = null
    }
  })()

  return crashSyncPromise
}

function buildCrashState(round) {
  const serverTime = new Date().toISOString()

  if (!round) {
    return {
      status: "waiting",
      roundId: null,
      roundNumber: 0,
      multiplier: 1.0,
      countdown: 5,
      crashPoint: null,
      serverTime,
      countdownStartedAt: null,
      flyingStartedAt: null,
      crashedAt: null,
    }
  }

  if (round.status === "waiting") {
    const waitingEndsAt = new Date(round.countdown_started_at.getTime() + CRASH_WAITING_MS)

    return {
      status: "waiting",
      roundId: round.id,
      roundNumber: round.round_number,
      multiplier: 1.0,
      countdown: Math.max(0, Math.ceil(getMsLeft(waitingEndsAt) / 1000)),
      crashPoint: null,
      serverTime,
      countdownStartedAt: round.countdown_started_at?.toISOString() || null,
      flyingStartedAt: null,
      crashedAt: null,
    }
  }

  if (round.status === "flying") {
    const multiplier =
      Number(round.current_multiplier || 1) ||
      getMultiplierByElapsedMs(Date.now() - round.flying_started_at.getTime())

    return {
      status: "flying",
      roundId: round.id,
      roundNumber: round.round_number,
      multiplier,
      countdown: null,
      crashPoint: null,
      serverTime,
      countdownStartedAt: round.countdown_started_at?.toISOString() || null,
      flyingStartedAt: round.flying_started_at?.toISOString() || null,
      crashedAt: null,
    }
  }

  return {
    status: "crashed",
    roundId: round.id,
    roundNumber: round.round_number,
    multiplier: Number(round.crash_point || round.current_multiplier || 1),
    countdown: null,
    crashPoint: Number(round.crash_point || round.current_multiplier || 1),
    serverTime,
    countdownStartedAt: round.countdown_started_at?.toISOString() || null,
    flyingStartedAt: round.flying_started_at?.toISOString() || null,
    crashedAt: round.crashed_at?.toISOString() || null,
  }
}

module.exports = {
  syncCrashState,
  buildCrashState,
}
