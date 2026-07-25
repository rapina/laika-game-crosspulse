import {
    Application,
    Container,
    DisplacementFilter,
    Graphics,
    Sprite,
    Text,
    Texture,
} from 'pixi.js'
import i18n from '../i18n'
import type { GameCallbacks, GameRuntime } from './types'
import {
    FAILURE_BUDGET,
    STEP_MS,
    TOTAL_DROPS,
    createState,
    queueInput,
    renderModel,
    step,
    type CrosspulseState,
    type Grade,
    type Judgment,
} from './crosspulse/rules'
import { CrosspulseAudio } from './crosspulse/CrosspulseAudio'

const W = 390
const H = 844
const OVER_RESTART_TICKS = 42

function titleKeyUrl(): string {
    if (__DISTRIBUTION__ === 'arcade') {
        try { return new URL('art/title-key.png', new URL('.', import.meta.url)).href }
        catch { return 'art/title-key.png' }
    }
    return '/art/title-key.png'
}

function loadTexture(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => {
            try { resolve(Texture.from(image)) } catch (error) { reject(error) }
        }
        image.onerror = () => reject(new Error(`failed to load texture: ${url}`))
        image.src = url
    })
}

type Copy = {
    precise: string
    rupture: string
    guide: string
    teacher: string
    labels: Record<Grade, string>
    causes: Record<string, string>
    end: string
    restart: string
    nextEarly: string
    nextLate: string
    nextIdle: string
}

const COPY: Record<'ko' | 'en', Copy> = {
    ko: {
        precise: '정밀', rupture: '파열',
        guide: '탭 → 파동\n예측점이 흰 선일 때\n12개 · 파열 3회 종료',
        teacher: '예측점을 흰 선에 탭',
        labels: { precise: '정밀', hit: '성공', fail: '실패' },
        causes: { early: '너무 일찍 · 높은 충돌', late: '너무 늦게 · 낮은 충돌', idle: '무입력 · 파열선 도달' },
        end: '끝', restart: '화면을 탭해 재시작',
        nextEarly: '다음: 조금 늦게 탭', nextLate: '다음: 조금 일찍 탭', nextIdle: '다음: 예측점이 흰 선일 때 탭',
    },
    en: {
        precise: 'PRECISE', rupture: 'RUPTURE',
        guide: 'TAP → WAVE\nWHEN MARKER MEETS WHITE\n12 DROPS · 3 RUPTURES END',
        teacher: 'TAP WHEN THE MARKER MEETS WHITE',
        labels: { precise: 'PRECISE', hit: 'HIT', fail: 'FAIL' },
        causes: { early: 'TOO EARLY · HIGH COLLISION', late: 'TOO LATE · LOW COLLISION', idle: 'NO INPUT · RUPTURE LINE' },
        end: 'END', restart: 'TAP SCREEN TO RESTART',
        nextEarly: 'NEXT: TAP A LITTLE LATER', nextLate: 'NEXT: TAP A LITTLE EARLIER', nextIdle: 'NEXT: TAP WHEN MARKER MEETS WHITE',
    },
}

function makeDisplacementTexture(): Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const image = ctx.createImageData(canvas.width, canvas.height)
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4
            const radial = Math.sin((x / canvas.width) * Math.PI * 4 + y * 0.08)
            const vertical = Math.sin(y * 0.19 + x * 0.04)
            image.data[index] = Math.round(128 + radial * 70)
            image.data[index + 1] = Math.round(128 + vertical * 62)
            image.data[index + 2] = 128
            image.data[index + 3] = 255
        }
    }
    ctx.putImageData(image, 0, 0)
    return Texture.from(canvas)
}

function seededUnit(seed: number): number {
    let x = seed >>> 0
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 4294967296
}

export class CrosspulseGame implements GameRuntime {
    private app: Application | null = null
    private callbacks: GameCallbacks | null = null
    private state: CrosspulseState
    private scene = new Container()
    private textureLayer: Sprite | null = null
    private displacement: Sprite | null = null
    private displacementFilter: DisplacementFilter | null = null
    private gel = new Graphics()
    private action = new Graphics()
    private effects = new Graphics()
    private hud = new Text({ text: '', style: {} })
    private progress = new Text({ text: '', style: {} })
    private teacher = new Text({ text: '', style: {} })
    private reaction = new Text({ text: '', style: {} })
    private error = new Text({ text: '', style: {} })
    private guide = new Text({ text: '', style: {} })
    private result = new Text({ text: '', style: {} })
    private destroyed = false
    private paused = false
    private resultSent = false
    private accumulator = 0
    private lastNow = 0
    private lastJudgmentSerial = 0
    private resizeObs: ResizeObserver | null = null
    private audio = new CrosspulseAudio()
    private seed: number

    constructor(seed?: number) {
        const fromQuery = Number(new URLSearchParams(window.location.search).get('seed'))
        this.seed = Number.isFinite(seed) ? Number(seed) : (Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : 1)
        this.state = createState(this.seed)
    }

    async mount(container: HTMLElement, callbacks: GameCallbacks): Promise<void> {
        this.callbacks = callbacks
        const app = new Application()
        const dpr = Math.max(1, window.devicePixelRatio || 1)
        await app.init({
            width: W,
            height: H,
            backgroundColor: 0x09060c,
            antialias: true,
            resolution: dpr * 1.25,
            autoDensity: true,
            preference: 'webgl',
        })
        if (this.destroyed) {
            app.destroy(true, { children: true })
            return
        }
        this.app = app
        container.appendChild(app.canvas)
        app.canvas.setAttribute('aria-label', 'Crosspulse game canvas')

        const fit = () => {
            const scale = Math.min(container.clientWidth / W, container.clientHeight / H)
            if (!(scale > 0)) return
            app.canvas.style.width = `${W * scale}px`
            app.canvas.style.height = `${H * scale}px`
        }
        fit()
        this.resizeObs = new ResizeObserver(fit)
        this.resizeObs.observe(container)

        await this.buildScene()
        if (this.destroyed) return
        this.bindInput()
        this.lastNow = performance.now()
        app.ticker.add(() => this.frame())
        this.render()

        ;(globalThis as unknown as Record<string, unknown>).__gameDesignSize = { w: W, h: H }
        ;(globalThis as unknown as Record<string, unknown>).__gameOverUiBoxes = []
        ;(globalThis as unknown as Record<string, unknown>).__forceGameOver = () => this.forceGameOver()
        ;(globalThis as unknown as Record<string, unknown>).__setGamePaused = (paused: boolean) => this.setPaused(paused)
    }

    private async buildScene(): Promise<void> {
        if (!this.app) return
        // Use an Image element instead of Pixi's fetch-based Assets loader.
        // The portal's sandboxed opaque origin permits the released image via
        // img-src/CORS, while connect-src would reject a fetch from Pixi.
        const texture = await loadTexture(titleKeyUrl())
        if (this.destroyed || !this.app) return

        const background = new Sprite(texture)
        background.width = W
        background.height = H
        background.alpha = 0.22
        background.tint = 0x6f5360
        this.scene.addChild(background)

        this.textureLayer = new Sprite(texture)
        this.textureLayer.width = 256
        this.textureLayer.height = 730
        this.textureLayer.position.set(67, 64)
        this.textureLayer.alpha = 0.42

        const mask = new Graphics().roundRect(72, 64, 246, 704, 112).fill(0xffffff)
        this.textureLayer.mask = mask
        this.scene.addChild(this.textureLayer, mask)

        const mapTexture = makeDisplacementTexture()
        this.displacement = new Sprite(mapTexture)
        this.displacement.width = W
        this.displacement.height = H * 2
        this.displacement.alpha = 0.001
        this.displacementFilter = new DisplacementFilter({
            sprite: this.displacement,
            scale: { x: 10, y: 5 },
            resolution: 'inherit',
        })
        this.textureLayer.filters = [this.displacementFilter]
        this.scene.addChild(this.displacement)

        this.scene.addChild(this.gel, this.action, this.effects)
        this.setupText()
        this.scene.addChild(this.hud, this.progress, this.teacher, this.reaction, this.error, this.guide, this.result)
        this.app.stage.addChild(this.scene)
        this.app.stage.eventMode = 'static'
        this.app.stage.hitArea = this.app.screen
    }

    private setupText(): void {
        const font = 'Galmuri11, monospace'
        this.hud.style = { fill: 0xf8f2eb, fontSize: 14, fontFamily: font, letterSpacing: 0.5 }
        this.hud.position.set(18, 19)
        this.progress.style = { fill: 0xffffff, fontSize: 18, fontFamily: font, fontWeight: 'bold' }
        this.progress.anchor.set(0.5, 0)
        this.progress.position.set(W / 2, 17)
        this.teacher.style = { fill: 0xf7efe9, fontSize: 12, fontFamily: font, letterSpacing: 0.4 }
        this.teacher.anchor.set(0.5)
        this.teacher.position.set(W / 2, 104)
        this.reaction.style = { fill: 0xffffff, fontSize: 25, fontFamily: font, fontWeight: 'bold', letterSpacing: 1.5 }
        this.reaction.anchor.set(0.5)
        this.error.style = { fill: 0xffa054, fontSize: 12, fontFamily: font, align: 'center' }
        this.error.anchor.set(0.5, 0)
        this.guide.style = { fill: 0xf8f0ea, fontSize: 12, fontFamily: font, align: 'center', lineHeight: 20, letterSpacing: 0.5 }
        this.guide.anchor.set(0.5, 1)
        this.guide.position.set(W / 2, 816)
        this.result.style = { fill: 0xffffff, fontSize: 18, fontFamily: font, align: 'center', lineHeight: 34, letterSpacing: 1 }
        this.result.anchor.set(0.5)
        this.result.position.set(W / 2, 500)
    }

    private bindInput(): void {
        this.app?.stage.on('pointerdown', this.onPrimary)
        window.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('blur', this.onBlur)
        window.addEventListener('focus', this.onFocus)
        document.addEventListener('visibilitychange', this.onVisibility)
    }

    private onPrimary = () => { this.handlePrimary() }
    private onKeyDown = (event: KeyboardEvent) => {
        if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
            event.preventDefault()
            this.handlePrimary()
        }
    }
    private onBlur = () => this.setPaused(true)
    private onFocus = () => this.setPaused(false)
    private onVisibility = () => this.setPaused(document.hidden)

    private handlePrimary(): void {
        if (this.paused) return
        if (this.state.over) {
            if (this.state.overTick !== null && this.state.tick - this.state.overTick >= OVER_RESTART_TICKS) this.restart()
            return
        }
        if (queueInput(this.state)) {
            this.audio.unlock()
            this.audio.playInput()
        }
    }

    private frame(): void {
        const now = performance.now()
        const elapsed = Math.min(100, Math.max(0, now - this.lastNow))
        this.lastNow = now
        if (!this.paused) {
            this.accumulator += elapsed
            let steps = 0
            while (this.accumulator >= STEP_MS && steps < 6) {
                step(this.state)
                this.accumulator -= STEP_MS
                steps += 1
                this.afterStep()
            }
            if (steps === 6) this.accumulator = Math.min(this.accumulator, STEP_MS)
        }
        this.render()
    }

    private afterStep(): void {
        const judgment = this.state.lastJudgment
        if (judgment && judgment.serial !== this.lastJudgmentSerial) {
            this.lastJudgmentSerial = judgment.serial
            this.audio.playJudgment(judgment.grade)
        }
        if (this.state.over && !this.resultSent) {
            this.resultSent = true
            this.callbacks?.onGameOver({ score: this.state.score, phase: this.state.judged })
            ;(globalThis as unknown as Record<string, unknown>).__gameOverUiBoxes = [
                { name: 'result', x: 52, y: 384, w: 286, h: 260 },
                { name: 'restart', x: 54, y: 742, w: 282, h: 46 },
            ]
        }
    }

    private render(): void {
        const model = renderModel(this.state)
        const copy = COPY[i18n.language.startsWith('ko') ? 'ko' : 'en']
        this.drawGel(model.tick, model.waveY)
        this.drawAction(model.dropY, model.waveY, model.predictedCollisionY, model.bandCenter, model.successHalfWidth, model.preciseHalfWidth)
        this.drawEffects(model.lastJudgment, model.effectAgeTicks)

        this.hud.text = `${copy.precise} ${model.precise}/${TOTAL_DROPS}`
            + `                                      ${copy.rupture} ${model.failures}/${FAILURE_BUDGET}`
        this.progress.text = `${Math.min(TOTAL_DROPS, model.over ? model.judged : model.judged + 1)}/${TOTAL_DROPS}`
        this.teacher.text = !model.over && model.currentNumber <= 3 ? copy.teacher : ''
        this.guide.text = !model.over && model.guideVisible ? copy.guide : ''

        const judgment = model.lastJudgment
        const showReaction = judgment && model.effectAgeTicks < 54 && !model.over
        this.reaction.text = showReaction ? copy.labels[judgment.grade] : ''
        this.reaction.position.set(W / 2, judgment?.collisionY ?? model.bandCenter - 60)
        this.error.text = showReaction
            ? `${judgment.grade === 'fail' ? copy.causes[judgment.cause] : ''}${judgment.grade === 'fail' ? '\n' : ''}Δ ${judgment.error >= 0 ? '+' : ''}${Math.round(judgment.error)}`
            : ''
        this.error.position.set(W / 2, (judgment?.collisionY ?? model.bandCenter) + 27)

        if (model.over) {
            const clue = judgment?.cause === 'early' ? copy.nextEarly : judgment?.cause === 'idle' ? copy.nextIdle : copy.nextLate
            this.result.text = `${copy.end}\n${copy.precise} ${model.precise}/${TOTAL_DROPS} · ${copy.rupture} ${model.failures}/${FAILURE_BUDGET}\n${clue}\n\n${copy.restart}`
            this.result.visible = true
            this.teacher.text = ''
            this.guide.text = ''
            this.reaction.text = ''
            this.error.text = ''
        } else {
            this.result.visible = false
        }
    }

    private drawGel(tick: number, waveY: number | null): void {
        const pulse = waveY === null ? 0 : Math.max(0, 1 - Math.abs(waveY - 690) / 90)
        const shimmer = Math.sin(tick * 0.045) * 2
        this.gel.clear()
        this.gel.roundRect(74 - pulse * 8 + shimmer * 0.15, 64, 242 + pulse * 16, 704, 112)
            .fill({ color: 0xeadde1, alpha: 0.055 })
            .stroke({ color: 0xfff8f2, alpha: 0.28, width: 1.4 })
        this.gel.moveTo(92, 96).bezierCurveTo(70 - pulse * 7, 310, 84 + pulse * 12, 586, 108, 744)
            .stroke({ color: 0xffe9ed, alpha: 0.17, width: 2 })
        this.gel.moveTo(298, 96).bezierCurveTo(320 + pulse * 7, 310, 306 - pulse * 12, 586, 282, 744)
            .stroke({ color: 0xffe9ed, alpha: 0.17, width: 2 })

        if (this.displacement && this.displacementFilter) {
            this.displacement.y = -H + ((tick * 0.72) % H)
            this.displacement.x = Math.sin(tick * 0.031) * 9
            this.displacementFilter.scale.x = 9 + pulse * 25
            this.displacementFilter.scale.y = 4 + pulse * 10
        }
        if (this.textureLayer) this.textureLayer.alpha = 0.36 + pulse * 0.12
    }

    private drawAction(
        dropY: number | null,
        waveY: number | null,
        markerY: number | null,
        center: number,
        success: number,
        precise: number,
    ): void {
        this.action.clear()
        this.action.rect(76, center - success, 238, success * 2).fill({ color: 0xffffff, alpha: 0.052 })
        this.action.rect(76, center - precise, 238, precise * 2).fill({ color: 0xffffff, alpha: 0.065 })
        this.action.moveTo(70, center).lineTo(320, center).stroke({ color: 0xffffff, alpha: 0.96, width: 2 })
        this.action.moveTo(84, 590).lineTo(306, 590).stroke({ color: 0xff7a35, alpha: 0.35, width: 1 })

        if (dropY !== null) {
            this.action.ellipse(195, dropY, 15, 22).fill({ color: 0xa80026, alpha: 0.9 })
                .stroke({ color: 0xff8b91, alpha: 0.8, width: 1.5 })
            this.action.circle(190, dropY - 6, 4).fill({ color: 0xffd4cf, alpha: 0.38 })
        }
        if (markerY !== null) {
            this.action.circle(195, markerY, 5).fill({ color: 0xffffff, alpha: 0.95 })
            this.action.circle(195, markerY, 10).stroke({ color: 0xffffff, alpha: 0.28, width: 1 })
            this.action.moveTo(195, markerY + 8).lineTo(195, 724).stroke({ color: 0xffffff, alpha: 0.16, width: 1 })
        }
        if (waveY !== null) {
            const width = 58 + (724 - waveY) * 0.13
            this.action.ellipse(195, waveY, width, 8).stroke({ color: 0xffffff, alpha: 0.88, width: 3 })
            this.action.ellipse(195, waveY + 8, width * 0.78, 4).stroke({ color: 0xffdce3, alpha: 0.28, width: 1 })
        }
        const press = waveY !== null && waveY > 665 ? 10 : 0
        this.action.roundRect(88, 728 + press, 214, 34, 17).fill({ color: 0x241a22, alpha: 0.94 })
            .stroke({ color: 0xfff3ef, alpha: 0.55, width: 2 })
        this.action.ellipse(195, 736 + press, 72, 7).stroke({ color: 0xffffff, alpha: 0.28, width: 1.5 })
    }

    private drawEffects(judgment: Judgment | null, age: number): void {
        this.effects.clear()
        if (!judgment || age > 90) return
        const y = judgment.collisionY ?? 590
        const t = Math.min(1, age / 28)
        const fade = Math.max(0, 1 - age / 90)
        const seed = judgment.burstSeed

        if (judgment.grade === 'precise') {
            const spread = 18 + t * 78
            this.effects.ellipse(195 - spread * 0.42, y, spread, 12 + spread * 0.18)
                .stroke({ color: 0xffffff, alpha: fade * 0.9, width: 4 })
            this.effects.ellipse(195 + spread * 0.42, y, spread, 12 + spread * 0.18)
                .stroke({ color: 0xffffff, alpha: fade * 0.9, width: 4 })
            for (let i = 0; i < 18; i++) {
                const side = i % 2 === 0 ? -1 : 1
                const unit = seededUnit(seed + i * 977)
                const x = 195 + side * (16 + t * (40 + unit * 94))
                const py = y + (unit - 0.5) * (18 + t * 84)
                this.effects.circle(x, py, 1.5 + unit * 2.4).fill({ color: i % 3 ? 0xffffff : 0xc60b36, alpha: fade })
            }
        } else if (judgment.grade === 'hit') {
            this.effects.ellipse(168 - t * 24, y - t * 10, 32 + t * 30, 17 + t * 15)
                .fill({ color: 0xbd092f, alpha: fade * 0.48 })
            this.effects.ellipse(224 + t * 46, y + t * 17, 19 + t * 45, 12 + t * 28)
                .fill({ color: 0xd11539, alpha: fade * 0.62 })
            this.effects.ellipse(195, y - t * 55, 36 + t * 42, 7 + t * 8)
                .stroke({ color: 0xffffff, alpha: fade * 0.55, width: 2 })
        } else {
            const length = 24 + t * 118
            this.effects.moveTo(195, y - 16).bezierCurveTo(181, y + length * 0.25, 208, y + length * 0.6, 194, y + length)
                .stroke({ color: 0x8e001e, alpha: fade * 0.94, width: 7 })
            this.effects.moveTo(189, y).lineTo(164 - t * 22, y + length * 0.5).lineTo(148 - t * 12, y + length * 0.82)
                .stroke({ color: 0xff7a35, alpha: fade * 0.74, width: 2 })
            this.effects.moveTo(201, y).lineTo(224 + t * 20, y + length * 0.46).lineTo(238 + t * 14, y + length * 0.76)
                .stroke({ color: 0xff7a35, alpha: fade * 0.68, width: 2 })
        }
    }

    setMuted(muted: boolean): void { this.audio.setMuted(muted) }

    setPaused(paused: boolean): void {
        this.paused = paused
        this.lastNow = performance.now()
        this.accumulator = 0
        if (paused) this.audio.suspend()
        else this.audio.resume()
    }

    private forceGameOver(): void {
        while (!this.state.over) step(this.state)
        this.afterStep()
        this.render()
    }

    private restart(): void {
        this.state = createState(this.seed)
        this.resultSent = false
        this.lastJudgmentSerial = 0
        this.accumulator = 0
        ;(globalThis as unknown as Record<string, unknown>).__gameResult = null
        ;(globalThis as unknown as Record<string, unknown>).__gameOverUiBoxes = []
        this.callbacks?.onScoreChange?.(0)
        this.render()
    }

    restartRun(): void { this.restart() }

    setLocale(locale: 'ko' | 'en'): void {
        void i18n.changeLanguage(locale)
        this.render()
    }

    getDebugState(): Record<string, unknown> {
        const model = renderModel(this.state)
        return {
            over: model.over,
            score: model.score,
            judged: model.judged,
            precise: model.precise,
            failures: model.failures,
            ringOpen: model.predictedCollisionY !== null,
            predictedCollisionY: model.predictedCollisionY,
            bandCenter: model.bandCenter,
            preciseHalfWidth: model.preciseHalfWidth,
            successHalfWidth: model.successHalfWidth,
            paused: this.paused,
            audioStarted: this.audio.started,
            muted: this.audio.isMuted,
            locale: i18n.language.startsWith('ko') ? 'ko' : 'en',
            tick: model.tick,
        }
    }

    destroy(): void {
        this.destroyed = true
        this.resizeObs?.disconnect()
        this.resizeObs = null
        window.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('blur', this.onBlur)
        window.removeEventListener('focus', this.onFocus)
        document.removeEventListener('visibilitychange', this.onVisibility)
        this.app?.stage.off('pointerdown', this.onPrimary)
        this.app?.destroy(true, { children: true })
        this.app = null
        this.callbacks = null
        delete (globalThis as unknown as Record<string, unknown>).__forceGameOver
        delete (globalThis as unknown as Record<string, unknown>).__setGamePaused
    }
}
