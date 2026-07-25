import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameResult } from '../game/types'
import { CrosspulseGame } from '../game/CrosspulseGame'
import { getLocale, setLocale } from '../i18n'
import { loadAudioSettings, saveAudioSettings } from '../audio/audioSettings'

interface Props {
    onGameOver(result: GameResult): void
    onExit(): void
}

/** Mounts Crosspulse and forwards its lifecycle to the shell. */
export default function GameScreen({ onGameOver, onExit }: Props) {
    const { t } = useTranslation()
    const hostRef = useRef<HTMLDivElement>(null)
    const gameRef = useRef<CrosspulseGame | null>(null)
    const [muted, setMuted] = useState(() => loadAudioSettings().sfxMuted)

    useEffect(() => {
        const host = hostRef.current
        if (!host) return

        const game = new CrosspulseGame()
        gameRef.current = game
        game.setMuted(muted)
        game.mount(host, {
            onGameOver: (result) => {
                onGameOver(result)
            },
        })

        // Expose runtime state for scripts/smoke.mjs and agent debugging.
        const poll = setInterval(() => {
            ;(globalThis as unknown as Record<string, unknown>).__gameState = game.getDebugState()
        }, 250)

        return () => {
            clearInterval(poll)
            game.destroy()
            gameRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleMute = () => {
        const next = !muted
        setMuted(next)
        gameRef.current?.setMuted(next)
        const settings = loadAudioSettings()
        saveAudioSettings({ ...settings, sfxMuted: next })
    }

    const toggleLocale = () => setLocale(getLocale() === 'ko' ? 'en' : 'ko')

    return (
        <div className="screen game-screen">
            <div ref={hostRef} className="game-host" />
            <div className="game-tools">
                <button className="game-tool-btn" data-testid="mute" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                    {muted ? '×♪' : '♪'}
                </button>
                <button className="game-tool-btn" data-testid="language" onClick={toggleLocale}>
                    {getLocale().toUpperCase()}
                </button>
            </div>
            <button className="game-exit-btn" onClick={onExit}>
                {t('game.exit')}
            </button>
        </div>
    )
}
