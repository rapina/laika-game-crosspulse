import { loadAudioSettings } from '../../audio/audioSettings'
import type { Grade } from './rules'

export class CrosspulseAudio {
    private ctx: AudioContext | null = null
    private master: GainNode | null = null
    private muted = loadAudioSettings().sfxMuted

    get started(): boolean { return this.ctx !== null }
    get isMuted(): boolean { return this.muted }

    setMuted(muted: boolean): void {
        this.muted = muted
        if (this.master && this.ctx) {
            this.master.gain.setTargetAtTime(muted ? 0 : 0.18, this.ctx.currentTime, 0.012)
        }
    }

    unlock(): void {
        if (!this.ctx) {
            const AudioCtor = window.AudioContext
                || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
            if (!AudioCtor) return
            this.ctx = new AudioCtor()
            this.master = this.ctx.createGain()
            this.master.gain.value = this.muted ? 0 : 0.18
            this.master.connect(this.ctx.destination)
        }
        if (this.ctx.state === 'suspended') void this.ctx.resume()
    }

    suspend(): void { void this.ctx?.suspend() }
    resume(): void { if (this.ctx && !this.muted) void this.ctx.resume() }

    playInput(): void {
        this.tone(120, 0.045, 'sine', 0.55, 80)
    }

    playJudgment(grade: Grade): void {
        if (grade === 'precise') {
            this.tone(880, 0.10, 'sine', 0.75)
            this.tone(1175, 0.15, 'triangle', 0.68, undefined, 0.065)
        } else if (grade === 'hit') {
            this.tone(520, 0.13, 'triangle', 0.62, 660)
        } else {
            this.tone(128, 0.22, 'sawtooth', 0.78, 52)
        }
    }

    private tone(
        frequency: number,
        duration: number,
        type: OscillatorType,
        volume: number,
        endFrequency?: number,
        delay = 0,
    ): void {
        const ctx = this.ctx
        const master = this.master
        if (!ctx || !master) return
        const now = ctx.currentTime + delay
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = type
        oscillator.frequency.setValueAtTime(frequency, now)
        if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
        oscillator.connect(gain).connect(master)
        oscillator.start(now)
        oscillator.stop(now + duration + 0.02)
    }
}
