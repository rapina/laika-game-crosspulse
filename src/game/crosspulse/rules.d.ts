export type Grade = 'precise' | 'hit' | 'fail'
export type Cause = Grade | 'early' | 'late' | 'idle'

export interface BandConfig {
    precise: number
    success: number
    dropSpeed: number
    waveSpeed: number
    center: number
    waits: readonly number[]
}

export interface Judgment {
    grade: Grade
    cause: Cause
    collisionY: number | null
    error: number
    tick: number
    serial: number
    burstSeed: number
    band: number
}

export interface CrosspulseState {
    seed: number
    tick: number
    dropIndex: number
    judged: number
    precise: number
    hits: number
    failures: number
    score: number
    dropY: number | null
    waveY: number | null
    previousWaveY: number | null
    inputQueued: boolean
    waitTicks: number
    freezeTicks: number
    effectAgeTicks: number
    eventSerial: number
    over: boolean
    overTick: number | null
    started: boolean
    guideSuccesses: number
    consecutiveFailures: number
    guideVisible: boolean
    lastJudgment: Judgment | null
}

export interface RenderModel {
    tick: number
    over: boolean
    dropY: number | null
    waveY: number | null
    predictedCollisionY: number | null
    band: number
    bandCenter: number
    preciseHalfWidth: number
    successHalfWidth: number
    judged: number
    currentNumber: number
    precise: number
    hits: number
    failures: number
    score: number
    guideVisible: boolean
    effectAgeTicks: number
    freezeTicks: number
    lastJudgment: Judgment | null
}

export const STEP_SECONDS: number
export const STEP_MS: number
export const TOTAL_DROPS: number
export const FAILURE_BUDGET: number
export const WAVE_START_Y: number
export const RUPTURE_LINE_Y: number
export const BAND_CONFIGS: readonly BandConfig[]
export function createState(seed?: number): CrosspulseState
export function queueInput(state: CrosspulseState): boolean
export function gradeCollision(collisionY: number, bandIndex: number): Grade
export function step(state: CrosspulseState): CrosspulseState
export function renderModel(state: CrosspulseState): RenderModel
