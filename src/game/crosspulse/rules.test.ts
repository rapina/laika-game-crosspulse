import { describe, expect, it } from 'vitest'
import {
    BAND_CONFIGS,
    FAILURE_BUDGET,
    STEP_SECONDS,
    TOTAL_DROPS,
    createState,
    gradeCollision,
    queueInput,
    renderModel,
    step,
} from './rules'

function advanceUntil(state: ReturnType<typeof createState>, predicate: () => boolean, maxTicks = 20_000) {
    for (let i = 0; i < maxTicks && !predicate(); i++) step(state)
    if (!predicate()) throw new Error(`condition not reached after ${maxTicks} ticks`)
}

function tapAtPrediction(state: ReturnType<typeof createState>, offsetPx = 0) {
    advanceUntil(state, () => {
        const model = renderModel(state)
        return model.predictedCollisionY !== null
            && model.predictedCollisionY >= model.bandCenter + offsetPx
    })
    queueInput(state)
    advanceUntil(state, () => state.lastJudgment !== null)
}

describe('Crosspulse deterministic rules', () => {
    it('consumes input before advancing the fixed 1/60 tick', () => {
        const state = createState(7)
        const initialDropY = state.dropY
        queueInput(state)
        step(state)

        expect(STEP_SECONDS).toBe(1 / 60)
        expect(state.inputQueued).toBe(false)
        expect(state.waveY).not.toBeNull()
        expect(state.waveY).toBeCloseTo(724 - BAND_CONFIGS[0].waveSpeed * STEP_SECONDS, 8)
        expect(state.dropY).toBeCloseTo(initialDropY! + BAND_CONFIGS[0].dropSpeed * STEP_SECONDS, 8)
    })

    it('uses the visible prediction point in the real collision path', () => {
        const state = createState(11)
        advanceUntil(state, () => {
            const y = renderModel(state).predictedCollisionY
            return y !== null && y >= BAND_CONFIGS[0].center
        })
        const shown = renderModel(state).predictedCollisionY!
        queueInput(state)
        advanceUntil(state, () => state.lastJudgment !== null)

        expect(state.lastJudgment!.collisionY).toBeCloseTo(shown, 5)
        expect(Math.abs(state.lastJudgment!.error)).toBeLessThanOrEqual(BAND_CONFIGS[0].precise)
        expect(state.lastJudgment!.grade).toBe('precise')
    })

    it('keeps all four precision and success boundaries exact', () => {
        for (const [band, config] of BAND_CONFIGS.entries()) {
            expect(gradeCollision(config.center + config.precise, band)).toBe('precise')
            expect(gradeCollision(config.center - config.precise, band)).toBe('precise')
            expect(gradeCollision(config.center + config.precise + 0.001, band)).toBe('hit')
            expect(gradeCollision(config.center + config.success, band)).toBe('hit')
            expect(gradeCollision(config.center - config.success, band)).toBe('hit')
            expect(gradeCollision(config.center + config.success + 0.001, band)).toBe('fail')
        }
    })

    it('ends an idle run by three rupture-line failures in about 18 seconds', () => {
        const state = createState(19)
        advanceUntil(state, () => state.over)

        expect(state.failures).toBe(FAILURE_BUDGET)
        expect(state.judged).toBe(FAILURE_BUDGET)
        expect(state.tick * STEP_SECONDS).toBeGreaterThan(17)
        expect(state.tick * STEP_SECONDS).toBeLessThan(20)
        expect(state.lastJudgment?.cause).toBe('idle')
    })

    it('ends after twelve judged droplets when the failure budget remains', () => {
        const state = createState(23)
        while (!state.over) {
            const previousJudged = state.judged
            tapAtPrediction(state)
            expect(state.judged).toBe(previousJudged + 1)
        }

        expect(state.judged).toBe(TOTAL_DROPS)
        expect(state.precise).toBe(TOTAL_DROPS)
        expect(state.failures).toBe(0)
    })

    it('keeps the guide through two successes, hides it, then restores it after two failures', () => {
        const state = createState(29)
        expect(renderModel(state).guideVisible).toBe(true)
        tapAtPrediction(state)
        advanceUntil(state, () => state.dropY !== null)
        expect(renderModel(state).guideVisible).toBe(true)
        tapAtPrediction(state)
        advanceUntil(state, () => state.dropY !== null)
        expect(renderModel(state).guideVisible).toBe(false)

        queueInput(state)
        advanceUntil(state, () => state.judged === 3)
        advanceUntil(state, () => state.dropY !== null)
        expect(renderModel(state).guideVisible).toBe(false)
        queueInput(state)
        advanceUntil(state, () => state.judged === 4)
        expect(renderModel(state).guideVisible).toBe(true)
    })

    it('replays identical state from the same seed and input ticks', () => {
        const a = createState(101)
        const b = createState(101)
        const taps = new Set([20, 310, 640, 900, 1240, 1610])
        for (let tick = 0; tick < 2_000; tick++) {
            if (taps.has(tick)) {
                queueInput(a)
                queueInput(b)
            }
            step(a)
            step(b)
        }
        expect(b).toEqual(a)
    })
})
