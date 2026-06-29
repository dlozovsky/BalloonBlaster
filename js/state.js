import { CONFIG } from './config.js';
import { COMBO_RESET_DELAY, DEFAULT_DIFFICULTY, MAX_LEVEL, SURVIVAL_DURATION } from './constants.js';
import { getAudioPreference } from './storage.js';

export function createInitialState() {
    return {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        balloons: [],
        particles: [],
        lastFrameTime: performance.now(),
        score: 0,
        timeRemaining: 60,
        gameActive: false,
        gamePaused: false,
        gameMode: 'arcade',
        comboCount: 0,
        comboMultiplier: 1,
        comboTimer: null,
        lastHitTime: 0,
        comboResetDelay: COMBO_RESET_DELAY,
        currentLevel: 1,
        levelTimer: null,
        levelEndAt: null,
        targetScore: 0,
        maxLevel: MAX_LEVEL,
        levelScoreAtStart: 0,
        difficultyParams: { ...DEFAULT_DIFFICULTY },
        shootSound: null,
        popSound: null,
        specialPopSound: null,
        bgMusic: null,
        listener: null,
        audioEnabled: true,
        fpsFrames: 0,
        fpsLastSample: performance.now(),
        fpsDisplay: 0,
        isTouchDevice: false,
        scoreMultiplier: 1,
        scoreMultiplierExpiresAt: 0,
        hitsThisLevel: 0,
        penaltyHitsThisLevel: 0,
        reducedMotion: false,
        survivalElapsed: 0,
        survivalDuration: SURVIVAL_DURATION,
        frameCount: 0,
        webglContextLost: false,
        frameTimeTotal: 0,
        frameTimeSamples: 0,
    };
}

export const state = createInitialState();

export function resetComboState() {
    state.comboCount = 0;
    state.comboMultiplier = 1;
    state.lastHitTime = 0;
    if (state.comboTimer) {
        clearTimeout(state.comboTimer);
        state.comboTimer = null;
    }
}

export function loadAudioPreference() {
    return getAudioPreference(CONFIG.audioEnabled !== false);
}
