const prisma = require("../lib/prisma")
const {
  CRASH_WAITING_MS,
  CRASH_CRASHED_MS,
  getRandomCrashPoint,
  getMultiplierByElapsedMs,
  getNow,
  getMsLeft,
} = require("./crashMath")

let crashSyncPromise = null

async function getLatestCrashRound(db = prisma) {
  return db.crashRound.findFirst({
    orderBy: { round_number: "desc" },
  })
}

async function createCrashWaitingRound(roundNumber, db = prisma) {
  return db.crashRound.create({
    data: {
      round_number: roundNumber,
      status: "waiting",
      countdown_started_at: getNow(),
      current_multiplier: 1.0,
    },
  })
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

async function syncCrashStateInternal() {
  let round = await getLatestCrashRound()

  if (!round) {
    return createCrashWaitingRound(1)
  }

  if (round.status === "waiting") {
    const waitingEndsAt = new Date(round.countdown_started_at.getTime() + CRASH_WAITING_MS)

    if (Date.now() >= waitingEndsAt.getTime()) {
      round = await prisma.crashRound.update({
        where: { id: round.id },
        data: {
          status: "flying",
          flying_started_at: getNow(),
          crash_point: getRandomCrashPoint(),
          current_multiplier: 1.0,
        },
      })
    }

    return round
  }

  if (round.status === "flying") {
    const elapsedMs = Date.now() - round.flying_started_at.getTime()
    const liveMultiplier = getMultiplierByElapsedMs(elapsedMs)

    if (liveMultiplier >= Number(round.crash_point || 1)) {
      await prisma.crashRound.update({
        where: { id: round.id },
        data: {
          status: "crashed",
          crashed_at: getNow(),
          current_multiplier: Number(round.crash_point || 1),
          is_settled: true,
        },
      })

      await markActiveCrashBetsLost(round.id)

      round = await prisma.crashRound.findUnique({
        where: { id: round.id },
      })
    }

    return round
  }

  if (round.status === "crashed") {
    const crashedEndsAt = new Date(round.crashed_at.getTime() + CRASH_CRASHED_MS)

    if (Date.now() >= crashedEndsAt.getTime()) {
      return createCrashWaitingRound(round.round_number + 1)
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
      return await syncCrashStateInternal()
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
    const elapsedMs = Date.now() - round.flying_started_at.getTime()
    const multiplier = getMultiplierByElapsedMs(elapsedMs)

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
