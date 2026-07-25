import { useTranslation } from 'react-i18next'
import { setLocale, getLocale, SUPPORTED } from '../i18n'

interface Props {
    onPlay(): void
}

export default function TitleScreen({ onPlay }: Props) {
    const { t } = useTranslation()

    const cycleLocale = () => {
        const cur = SUPPORTED.indexOf(getLocale())
        setLocale(SUPPORTED[(cur + 1) % SUPPORTED.length])
    }

    return (
        <div className="screen title-screen">
            <div className="title-key" aria-hidden="true" />
            <div className="title-logo">
                <h1>{t('title.name')}</h1>
                <p className="title-tagline">{t('title.tagline')}</p>
            </div>
            <div className="title-menu">
                <button className="btn btn-primary title-btn" onClick={onPlay}>
                    {t('title.play')}
                </button>
                <button className="title-language" data-testid="title-language" onClick={cycleLocale}>
                    {getLocale().toUpperCase()}
                </button>
            </div>
        </div>
    )
}
