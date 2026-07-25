import { lazy, Suspense, useState } from 'react'
import MobileFrame from './components/MobileFrame'
import TitleScreen from './screens/TitleScreen'

type Screen = 'title' | 'game'

const GameScreen = lazy(() => import('./components/GameScreen'))

export default function App() {
    const [screen, setScreen] = useState<Screen>('title')

    const renderScreen = () => {
        switch (screen) {
            case 'title':
                return (
                    <TitleScreen
                        onPlay={() => setScreen('game')}
                    />
                )

            case 'game':
                return (
                    <GameScreen
                        onGameOver={() => { /* result stays on the gel; runtime owns restart */ }}
                        onExit={() => setScreen('title')}
                    />
                )
        }
    }

    return (
        <MobileFrame>
            <Suspense fallback={<div className="screen loading-screen" aria-label="loading" />}>
                {renderScreen()}
            </Suspense>
        </MobileFrame>
    )
}
