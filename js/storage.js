import {
    ACHIEVEMENTS_KEY,
    AUDIO_ENABLED_KEY,
    HIGH_SCORE_KEY,
    SAVE_DATA_KEY,
    SAVE_DATA_VERSION,
    SURVIVAL_HIGH_SCORE_KEY,
} from './constants.js';
import { isNewHighScore } from './gameLogic.js';
import { state } from './state.js';

const DEFAULT_SAVE = {
    version: SAVE_DATA_VERSION,
    arcadeHighScore: { bestScore: 0, bestLevel: 1 },
    survivalHighScore: 0,
    audioEnabled: true,
    achievements: [],
};

let cachedSave = null;

function normalizeSaveData(raw) {
    return {
        version: SAVE_DATA_VERSION,
        arcadeHighScore: {
            bestScore: Number(raw?.arcadeHighScore?.bestScore) || 0,
            bestLevel: Number(raw?.arcadeHighScore?.bestLevel) || 1,
        },
        survivalHighScore: Number(raw?.survivalHighScore) || 0,
        audioEnabled: raw?.audioEnabled !== false,
        achievements: Array.isArray(raw?.achievements)
            ? raw.achievements.filter((id) => typeof id === 'string')
            : [],
    };
}

export function migrateLegacyStorage(readItem = (key) => localStorage.getItem(key)) {
    const save = { ...DEFAULT_SAVE, arcadeHighScore: { ...DEFAULT_SAVE.arcadeHighScore } };

    try {
        const arcadeRaw = readItem(HIGH_SCORE_KEY);
        if (arcadeRaw) {
            const parsed = JSON.parse(arcadeRaw);
            save.arcadeHighScore = {
                bestScore: Number(parsed.bestScore) || 0,
                bestLevel: Number(parsed.bestLevel) || 1,
            };
        }
    } catch {
        // Ignore corrupt legacy arcade score.
    }

    try {
        const survivalRaw = readItem(SURVIVAL_HIGH_SCORE_KEY);
        if (survivalRaw !== null) {
            save.survivalHighScore = Number(survivalRaw) || 0;
        }
    } catch {
        // Ignore corrupt legacy survival score.
    }

    try {
        const audioRaw = readItem(AUDIO_ENABLED_KEY);
        if (audioRaw !== null) {
            save.audioEnabled = audioRaw === 'true';
        }
    } catch {
        // Ignore corrupt legacy audio preference.
    }

    try {
        const achievementsRaw = readItem(ACHIEVEMENTS_KEY);
        if (achievementsRaw) {
            const parsed = JSON.parse(achievementsRaw);
            if (Array.isArray(parsed)) {
                save.achievements = parsed.filter((id) => typeof id === 'string');
            }
        }
    } catch {
        // Ignore corrupt legacy achievements.
    }

    return save;
}

export function loadSaveData(readItem = (key) => localStorage.getItem(key)) {
    try {
        const stored = readItem(SAVE_DATA_KEY);
        if (stored) {
            return normalizeSaveData(JSON.parse(stored));
        }
    } catch {
        // Fall through to legacy migration.
    }

    return migrateLegacyStorage(readItem);
}

export function persistSaveData(
    data,
    writeItem = (key, value) => localStorage.setItem(key, value),
) {
    const normalized = normalizeSaveData(data);

    try {
        writeItem(SAVE_DATA_KEY, JSON.stringify(normalized));
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('Save data could not be written: storage quota exceeded.');
            return normalized;
        }
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.warn('Save data could not be written: storage quota exceeded.');
            return normalized;
        }
        throw error;
    }

    return normalized;
}

export function initStorage() {
    cachedSave = loadSaveData();
    cachedSave = persistSaveData(cachedSave);
    return cachedSave;
}

function getSaveData() {
    if (!cachedSave) {
        initStorage();
    }
    return cachedSave;
}

function updateSaveData(updater) {
    const next = updater(getSaveData());
    cachedSave = persistSaveData(next);
    return cachedSave;
}

export function getHighScore() {
    return { ...getSaveData().arcadeHighScore };
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
        updateSaveData((save) => ({
            ...save,
            arcadeHighScore: {
                bestScore: state.score,
                bestLevel: state.currentLevel,
            },
        }));
    }

    return isRecord;
}

export function persistAudioPreference(enabled) {
    updateSaveData((save) => ({
        ...save,
        audioEnabled: enabled,
    }));
}

export function getAudioPreference(defaultEnabled = true) {
    if (!cachedSave) {
        initStorage();
    }
    if (cachedSave.audioEnabled === undefined) {
        return defaultEnabled;
    }
    return cachedSave.audioEnabled;
}

export function getSurvivalHighScore() {
    return getSaveData().survivalHighScore;
}

export function saveSurvivalHighScoreIfNeeded() {
    const currentBest = getSurvivalHighScore();
    if (state.score > currentBest) {
        updateSaveData((save) => ({
            ...save,
            survivalHighScore: state.score,
        }));
        return true;
    }
    return false;
}

export function getStoredAchievements() {
    return new Set(getSaveData().achievements);
}

export function persistAchievements(achievementIds) {
    updateSaveData((save) => ({
        ...save,
        achievements: [...achievementIds],
    }));
}
