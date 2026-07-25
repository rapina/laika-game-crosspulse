export type Locale = 'ko' | 'en'

/**
 * Shell UI strings. Game content strings (rules, dialog, item names, …)
 * belong in separate per-domain files merged in i18n/index.ts — see how
 * DEAD HAND split codex/dialog/gameUi translations.
 */
export const translations: Record<Locale, Record<string, string>> = {
    ko: {
        'title.name': '교차파',
        'title.tagline': '다가오는 두 움직임의 한가운데',
        'title.play': '시작',
        'game.exit': '나가기',
    },
    en: {
        'title.name': 'CROSSPULSE',
        'title.tagline': 'Meet two motions at the center',
        'title.play': 'PLAY',
        'game.exit': 'EXIT',
    },
}
