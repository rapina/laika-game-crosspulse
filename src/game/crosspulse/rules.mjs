export const STEP_SECONDS = 1 / 60
export const STEP_MS = 1000 / 60
export const TOTAL_DROPS = 12
export const FAILURE_BUDGET = 3
export const WAVE_START_Y = 724
export const RUPTURE_LINE_Y = 590

export const BAND_CONFIGS = Object.freeze([
    { precise: 21, success: 54, dropSpeed: 70, waveSpeed: 330, center: 380, waits: [1.8] },
    { precise: 17, success: 45, dropSpeed: 78, waveSpeed: 300, center: 398, waits: [1.7] },
    { precise: 13, success: 36, dropSpeed: 88, waveSpeed: 270, center: 366, waits: [1.2, 2.2] },
    { precise: 9, success: 28, dropSpeed: 100, waveSpeed: 240, center: 392, waits: [0.9, 1.9] },
])

const FREEZE_TICKS = { precise: 5, hit: 2, fail: 8 }
const FAIL_RESPAWN_TICKS = 21

function bandIndexFor(dropIndex) {
    return Math.min(3, Math.floor(dropIndex / 3))
}

function configFor(state) {
    return BAND_CONFIGS[bandIndexFor(state.dropIndex)]
}

function hash32(value) {
    let x = value >>> 0
    x ^= x >>> 16
    x = Math.imul(x, 0x7feb352d)
    x ^= x >>> 15
    x = Math.imul(x, 0x846ca68b)
    return (x ^ (x >>> 16)) >>> 0
}

export function createState(seed = 1) {
    return {
        seed: (Number(seed) >>> 0) || 1,
        tick: 0,
        dropIndex: 0,
        judged: 0,
        precise: 0,
        hits: 0,
        failures: 0,
        score: 0,
        dropY: 270,
        waveY: null,
        previousWaveY: null,
        inputQueued: false,
        waitTicks: 0,
        freezeTicks: 0,
        effectAgeTicks: 999,
        eventSerial: 0,
        over: false,
        overTick: null,
        started: false,
        guideSuccesses: 0,
        consecutiveFailures: 0,
        guideVisible: true,
        lastJudgment: null,
    }
}

export function queueInput(state) {
    if (state.over || state.dropY === null || state.waveY !== null) return false
    state.inputQueued = true
    return true
}

export function gradeCollision(collisionY, bandIndex) {
    const config = BAND_CONFIGS[Math.max(0, Math.min(3, bandIndex))]
    const distance = Math.abs(collisionY - config.center)
    if (distance <= config.precise) return 'precise'
    if (distance <= config.success) return 'hit'
    return 'fail'
}

function waitTicksAfter(state, grade) {
    if (grade === 'fail') return FAIL_RESPAWN_TICKS
    const config = configFor(state)
    const wait = config.waits[state.dropIndex % config.waits.length]
    return Math.round(wait * 60)
}

function resolveJudgment(state, grade, collisionY, cause) {
    const config = configFor(state)
    const error = collisionY === null ? RUPTURE_LINE_Y - config.center : collisionY - config.center
    state.eventSerial += 1
    state.judged += 1
    if (grade === 'precise') {
        state.precise += 1
        state.score += 100
        state.guideSuccesses += 1
        state.consecutiveFailures = 0
        if (state.guideSuccesses >= 2) state.guideVisible = false
    } else if (grade === 'hit') {
        state.hits += 1
        state.score += 55
        state.guideSuccesses += 1
        state.consecutiveFailures = 0
        if (state.guideSuccesses >= 2) state.guideVisible = false
    } else {
        state.failures += 1
        state.consecutiveFailures += 1
        if (state.consecutiveFailures >= 2) state.guideVisible = true
    }

    state.lastJudgment = {
        grade,
        cause,
        collisionY,
        error,
        tick: state.tick,
        serial: state.eventSerial,
        burstSeed: hash32(state.seed ^ Math.imul(state.eventSerial, 0x9e3779b1)),
        band: bandIndexFor(state.dropIndex),
    }
    state.effectAgeTicks = 0
    state.waveY = null
    state.previousWaveY = null
    state.dropY = null
    state.freezeTicks = FREEZE_TICKS[grade]

    if (state.judged >= TOTAL_DROPS || state.failures >= FAILURE_BUDGET) {
        state.over = true
        state.overTick = state.tick
        state.waitTicks = 0
        return
    }

    state.waitTicks = waitTicksAfter(state, grade)
    state.dropIndex += 1
}

export function step(state) {
    if (state.over) {
        state.tick += 1
        state.effectAgeTicks += 1
        return state
    }

    // Input is consumed before the tick's physical time advances.
    if (state.inputQueued) {
        state.inputQueued = false
        if (state.dropY !== null && state.waveY === null) {
            state.started = true
            state.waveY = WAVE_START_Y
            state.previousWaveY = WAVE_START_Y
        }
    }

    state.tick += 1
    state.effectAgeTicks += 1

    if (state.freezeTicks > 0) {
        state.freezeTicks -= 1
        return state
    }

    if (state.dropY === null) {
        if (state.waitTicks > 0) {
            state.waitTicks -= 1
            return state
        }
        state.dropY = 120
        state.lastJudgment = null
        return state
    }

    const config = configFor(state)
    const oldDropY = state.dropY
    const nextDropY = oldDropY + config.dropSpeed * STEP_SECONDS

    if (state.waveY !== null) {
        const oldWaveY = state.waveY
        const nextWaveY = oldWaveY - config.waveSpeed * STEP_SECONDS
        state.previousWaveY = oldWaveY
        state.waveY = nextWaveY

        const separation = oldWaveY - oldDropY
        const closingSpeed = config.waveSpeed + config.dropSpeed
        const crossSeconds = separation / closingSpeed
        if (crossSeconds >= 0 && crossSeconds <= STEP_SECONDS) {
            const collisionY = oldDropY + config.dropSpeed * crossSeconds
            const grade = gradeCollision(collisionY, bandIndexFor(state.dropIndex))
            const cause = grade === 'fail' ? (collisionY < config.center ? 'early' : 'late') : grade
            resolveJudgment(state, grade, collisionY, cause)
            return state
        }
    }

    state.dropY = nextDropY
    if (nextDropY >= RUPTURE_LINE_Y) {
        resolveJudgment(state, 'fail', null, 'idle')
    }
    return state
}

export function renderModel(state) {
    const band = bandIndexFor(state.dropIndex)
    const config = BAND_CONFIGS[band]
    let predictedCollisionY = null
    if (!state.over && state.dropY !== null && state.waveY === null) {
        predictedCollisionY = (
            WAVE_START_Y * config.dropSpeed + state.dropY * config.waveSpeed
        ) / (config.waveSpeed + config.dropSpeed)
    }
    return {
        tick: state.tick,
        over: state.over,
        dropY: state.dropY,
        waveY: state.waveY,
        predictedCollisionY,
        band,
        bandCenter: config.center,
        preciseHalfWidth: config.precise,
        successHalfWidth: config.success,
        judged: state.judged,
        currentNumber: Math.min(TOTAL_DROPS, state.judged + 1),
        precise: state.precise,
        hits: state.hits,
        failures: state.failures,
        score: state.score,
        guideVisible: state.guideVisible,
        effectAgeTicks: state.effectAgeTicks,
        freezeTicks: state.freezeTicks,
        lastJudgment: state.lastJudgment,
    }
}
