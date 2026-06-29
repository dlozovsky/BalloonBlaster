import { AUDIO_ENABLED_KEY, HIGH_SCORE_KEY } from './constants.js';
import { isNewHighScore } from './gameLogic.js';
import { state } from './state.js';

export function getHighScore() {
    try {
        const stored = localStorage.getItem(HIGH_SCORE_KEY);
        if (!stored) {
            return { bestScore: 0, bestLevel: 1 };
        }
        const parsed = JSON.parse(stored);
        return {
            bestScore: Number(parsed.bestScore) || 0,
            bestLevel: Number(parsed.bestLevel) || 1,
        };
    } catch {
        return { bestScore: 0, bestLevel: 1 };
    }
}

export function saveHighScoreIfNeeded() {
    const current = getHighScore();
    const isRecord = isNewHighScore(
        state.score,
        state.currentLevel,
        current.bestScore,
        current.bestLevel,
    );

    if (isRecord) {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify({
            bestScore: state.score,
            bestLevel: state.currentLevel,
        }));
    }

    return isRecord;
}

export function persistAudioPreference(enabled) {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
}
