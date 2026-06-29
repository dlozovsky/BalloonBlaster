import { unlockAchievement, updateAchievementsDisplay } from './achievementsStorage.js';
import {
    applyAudioState,
    playBackgroundMusic,
    playPenaltySound,
    playSound,
    resumeAudioOnGesture,
    setupAudio,
    setupAudioBanner,
    stopBackgroundMusic,
} from './audio.js';
import { checkCapabilities } from './capability.js';
import { CONFIG } from './config.js';
import { DOUBLE_SCORE_DURATION_MS } from './constants.js';
import {
    detectReducedMotion,
    showComboMilestone,
    showPowerUpMessage,
    triggerScreenShake,
} from './effects.js';
import { showFatalError } from './errors.js';
import {
    calculateEarnedPoints,
    computeTimeRemaining,
    createTimerDeadline,
    getActiveScoreMultiplier,
    getDifficultyForLevel,
    getPointsEarnedInLevel,
    getResetComboState,
    getSurvivalDifficulty,
    getTargetScoreForLevel,
    hasMetLevelTarget,
    nextComboState,
} from './gameLogic.js';
import {
    addGameplayListener,
    addManagedListener,
    clearGameplayTimers,
    registerTouchCleanup,
    teardownGameplay,
} from './lifecycle.js';
import { initMenuState, syncMenuState } from './menuState.js';
import { initStorage, saveHighScoreIfNeeded, saveSurvivalHighScoreIfNeeded } from './storage.js';
import { installTestHooks } from './testHooks.js';
import { loadAudioPreference, state } from './state.js';
import {
    applyConfig,
    getSelectedGameMode,
    setMobileUiVisible,
    showLevelMessage,
    showPointsIndicator,
    updateComboDisplay,
    updateFpsCounter,
    updateHighScoreDisplay,
    updateLevelDisplay,
    updateScoreDisplay,
    updateScoreMultiplierDisplay,
    updateTimerDisplay,
} from './ui.js';
import { applyTouchAim, isTouchDevice, setupTouchControls } from './touch.js';
import { debugLog, isPointerLocked } from './utils.js';
import {
    addLights,
    clearBalloons,
    clearParticles,
    createPopEffect,
    createRoom,
    getPoolStats,
    initRenderer,
    onWindowResize,
    removeBalloon,
    setupControls,
    spawnBalloons,
    updateBalloons,
    updateParticles,
} from './world.js';

let animationFrameId = null;

function resetLevelStats() {
    state.hitsThisLevel = 0;
    state.penaltyHitsThisLevel = 0;
}

function updateDifficultyParams() {
    if (state.gameMode === 'survival') {
        state.difficultyParams = getSurvivalDifficulty(state.survivalElapsed);
        state.targetScore = 0;
        return;
    }

    state.difficultyParams = getDifficultyForLevel(state.currentLevel);
    state.targetScore = getTargetScoreForLevel(state.currentLevel);
    debugLog(`Level ${state.currentLevel} difficulty: ${JSON.stringify(state.difficultyParams)}, Target Score: ${state.targetScore}`);
}

function resetCombo() {
    const reset = getResetComboState();
    state.comboCount = reset.comboCount;
    state.comboMultiplier = reset.comboMultiplier;
    state.lastHitTime = reset.lastHitTime;
    if (state.comboTimer) {
        clearTimeout(state.comboTimer);
        state.comboTimer = null;
    }
    updateComboDisplay();
}

function updateCombo() {
    const now = Date.now();
    const previousMultiplier = state.comboMultiplier;
    const next = nextComboState(
        {
            comboCount: state.comboCount,
            comboMultiplier: state.comboMultiplier,
            lastHitTime: state.lastHitTime,
        },
        now,
        state.comboResetDelay,
    );

    state.comboCount = next.comboCount;
    state.comboMultiplier = next.comboMultiplier;
    state.lastHitTime = next.lastHitTime;
    updateComboDisplay();

    if (state.comboMultiplier > previousMultiplier && state.comboMultiplier >= 2) {
        showComboMilestone(state.comboMultiplier);
    }
    if (state.comboMultiplier >= 4) {
        unlockAchievement('combo_master');
    }

    if (state.comboTimer) {
        clearTimeout(state.comboTimer);
    }
    state.comboTimer = setTimeout(resetCombo, state.comboResetDelay);
}

function activateDoubleScore() {
    const now = Date.now();
    state.scoreMultiplier = 2;
    state.scoreMultiplierExpiresAt = now + DOUBLE_SCORE_DURATION_MS;
    updateScoreMultiplierDisplay(true);
    showPowerUpMessage('DOUBLE SCORE!');
    unlockAchievement('double_down');
}

function refreshScoreMultiplier() {
    const now = Date.now();
    const active = getActiveScoreMultiplier(now, state.scoreMultiplier, state.scoreMultiplierExpiresAt);
    updateScoreMultiplierDisplay(active > 1);
    return active;
}

function handlePowerUpHit(balloon) {
    activateDoubleScore();
    updateCombo();
    void playSound(state.specialPopSound);
    createPopEffect(balloon.position, 'SPECIAL');
    removeBalloon(balloon);
}

function hitBalloon(balloon) {
    const balloonType = balloon.userData.type;

    if (balloonType === 'POWERUP') {
        handlePowerUpHit(balloon);
        return;
    }

    const basePoints = balloon.userData.points;
    const scoreMultiplier = refreshScoreMultiplier();
    let earnedPoints = basePoints;

    if (balloonType === 'PENALTY') {
        resetCombo();
        state.penaltyHitsThisLevel += 1;
        triggerScreenShake();
    } else {
        updateCombo();
        earnedPoints = calculateEarnedPoints(
            balloonType,
            basePoints,
            state.comboMultiplier,
            scoreMultiplier,
        );
        state.hitsThisLevel += 1;
        unlockAchievement('first_pop');
    }

    state.score += earnedPoints;
    updateScoreDisplay();

    if (balloonType === 'SPECIAL') {
        void playSound(state.specialPopSound);
        showPointsIndicator(earnedPoints, balloon.position, state.camera, '#ffeb3b');
    } else if (balloonType === 'PENALTY') {
        void playPenaltySound();
        showPointsIndicator(earnedPoints, balloon.position, state.camera, '#ff0000', true);
    } else {
        void playSound(state.popSound);
        showPointsIndicator(earnedPoints, balloon.position, state.camera, '#ffffff');
    }

    createPopEffect(balloon.position, balloonType);
    removeBalloon(balloon);
}

function shoot() {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    void playSound(state.shootSound);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
    const intersects = raycaster.intersectObjects(state.balloons);

    if (intersects.length > 0) {
        hitBalloon(intersects[0].object);
    } else {
        resetCombo();
    }
}

function onShoot(event) {
    if (event?.type === 'click') {
        if (!isPointerLocked() || event.target !== state.renderer.domElement) {
            return;
        }
    }
    shoot();
}

function checkLevelAchievements() {
    if (state.penaltyHitsThisLevel === 0 && state.hitsThisLevel > 0) {
        unlockAchievement('clean_slate');
    }
}

function syncTimerFromDeadline() {
    if (!state.levelEndAt) {
        return;
    }

    const now = Date.now();
    const remaining = computeTimeRemaining(state.levelEndAt, now);
    if (remaining !== state.timeRemaining) {
        state.timeRemaining = remaining;
        updateTimerDisplay();
    }
    refreshScoreMultiplier();

    if (state.gameMode === 'survival') {
        state.survivalElapsed = state.survivalDuration - state.timeRemaining;
        state.difficultyParams = getSurvivalDifficulty(state.survivalElapsed);
    }
}

function handleTimerExpired() {
    if (state.gameMode === 'survival') {
        endGame('TIME UP!', `Survival complete! You scored ${state.score} points.`);
        return;
    }

    const pointsEarnedInLevel = getPointsEarnedInLevel(state.score, state.levelScoreAtStart);

    if (hasMetLevelTarget(pointsEarnedInLevel, state.targetScore)) {
        if (state.currentLevel < state.maxLevel) {
            nextLevel();
        } else {
            endGame('CONGRATULATIONS!', `You completed all ${state.maxLevel} levels with a score of ${state.score}!`);
        }
    } else {
        endGame(
            'LEVEL FAILED',
            `You needed ${state.targetScore - pointsEarnedInLevel} more points to advance to level ${state.currentLevel + 1}. Final score: ${state.score}`,
        );
    }
}

function onTimerTick() {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    syncTimerFromDeadline();

    if (state.timeRemaining <= 0) {
        stopLevelTimer();
        handleTimerExpired();
    }
}

function stopLevelTimer() {
    clearGameplayTimers();
}

function startLevelTimer() {
    stopLevelTimer();
    state.levelEndAt = createTimerDeadline(Date.now(), state.timeRemaining);
    state.levelTimer = setInterval(onTimerTick, 250);
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !state.gameActive || state.gamePaused) {
        return;
    }

    syncTimerFromDeadline();
    if (state.timeRemaining <= 0) {
        stopLevelTimer();
        handleTimerExpired();
    }
}

function nextLevel() {
    checkLevelAchievements();
    state.currentLevel += 1;
    state.levelScoreAtStart = state.score;
    resetLevelStats();
    updateLevelDisplay();
    updateDifficultyParams();
    state.timeRemaining = state.difficultyParams.levelDuration;
    updateTimerDisplay();
    clearBalloons();
    spawnBalloons();
    showLevelMessage();
    void playSound(state.specialPopSound);
    startLevelTimer();
}

function endGame(title, message) {
    state.gameActive = false;
    stopBackgroundMusic();
    stopLevelTimer();
    teardownGameplay();

    if (title === 'CONGRATULATIONS!') {
        unlockAchievement('champion');
    }
    if (state.gameMode === 'survival' && state.score >= 50) {
        unlockAchievement('survivalist');
    }

    const isNewRecord = state.gameMode === 'survival'
        ? saveSurvivalHighScoreIfNeeded()
        : saveHighScoreIfNeeded();

    if (isNewRecord) {
        updateHighScoreDisplay();
    }

    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-title').style.color = title === 'CONGRATULATIONS!' ? '#ffeb3b' : '#ff4081';
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('final-level').textContent = state.gameMode === 'survival' ? 'Survival' : state.currentLevel;
    document.getElementById('new-high-score').style.display = isNewRecord ? 'block' : 'none';
    document.getElementById('game-over-screen').classList.remove('hidden');

    state.controls.unlock?.();
    clearBalloons();
    clearParticles();
    setMobileUiVisible(false);
    syncMenuState();
}

export function startGame() {
    try {
        startGameInternal();
    } catch (error) {
        console.error('Failed to start game:', error);
        state.gameActive = false;
        state.gamePaused = false;
        document.getElementById('start-screen')?.classList.remove('hidden');
        showFatalError(
            'Unable to start the game.',
            error instanceof Error ? error.message : 'Unknown error',
        );
        syncMenuState();
    }
}

function startGameInternal() {
    teardownGameplay();

    state.gameMode = getSelectedGameMode();
    state.isTouchDevice = isTouchDevice();
    state.reducedMotion = CONFIG.reducedMotion || detectReducedMotion();
    document.body.classList.toggle('reduced-motion', state.reducedMotion);

    if (!state.isTouchDevice) {
        state.controls.lock();
    }

    document.getElementById('start-screen').classList.add('hidden');

    state.score = 0;
    state.levelScoreAtStart = 0;
    state.scoreMultiplier = 1;
    state.scoreMultiplierExpiresAt = 0;
    resetLevelStats();
    updateScoreMultiplierDisplay(false);

    if (state.gameMode === 'survival') {
        state.currentLevel = 1;
        state.survivalElapsed = 0;
        state.timeRemaining = state.survivalDuration;
        state.difficultyParams = getSurvivalDifficulty(0);
        state.targetScore = 0;
    } else {
        state.currentLevel = 1;
        updateDifficultyParams();
        state.timeRemaining = state.difficultyParams.levelDuration;
    }

    updateScoreDisplay();
    updateLevelDisplay();
    updateTimerDisplay();
    resetCombo();
    clearParticles();

    state.gameActive = true;
    state.gamePaused = false;

    void resumeAudioOnGesture();
    void playBackgroundMusic();
    spawnBalloons();
    showLevelMessage();
    startLevelTimer();

    addGameplayListener(window, 'blur', pauseGame);
    addGameplayListener(document, 'keydown', handleKeyDown);

    if (state.isTouchDevice) {
        registerTouchCleanup(setupTouchControls(state.renderer.domElement, {
            onAim: applyTouchAim,
            onShoot: shoot,
        }));
        setMobileUiVisible(true);
        syncMenuState();
        return;
    }

    document.body.requestPointerLock = document.body.requestPointerLock ||
        document.body.mozRequestPointerLock ||
        document.body.webkitRequestPointerLock;
    document.body.requestPointerLock?.();
    syncMenuState();
}

export function pauseGame() {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    syncTimerFromDeadline();
    state.gamePaused = true;
    state.levelEndAt = null;
    stopLevelTimer();
    document.getElementById('pause-screen').style.display = 'flex';
    syncMenuState();

    if (!state.isTouchDevice) {
        document.exitPointerLock = document.exitPointerLock ||
            document.mozExitPointerLock ||
            document.webkitExitPointerLock;
        document.exitPointerLock?.();
    }
}

export function resumeGame() {
    if (!state.gameActive || !state.gamePaused) {
        return;
    }

    state.gamePaused = false;
    document.getElementById('pause-screen').style.display = 'none';
    syncMenuState();
    startLevelTimer();
    void resumeAudioOnGesture();
    void playBackgroundMusic();

    if (!state.isTouchDevice) {
        document.body.requestPointerLock?.();
    }
}

function handleKeyDown(event) {
    if (event.key === 'Escape') {
        if (state.gameActive) {
            if (state.gamePaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
        return;
    }

    if (event.code === 'Space' && state.gameActive && !state.gamePaused) {
        event.preventDefault();
        shoot();
    }
}

export function quitGame() {
    teardownGameplay();
    state.gameActive = false;
    state.gamePaused = false;
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('start-screen').classList.remove('hidden');
    clearBalloons();
    clearParticles();
    stopBackgroundMusic();
    setMobileUiVisible(false);
    syncMenuState();
}

export function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('new-high-score').style.display = 'none';
    startGame();
}

function onPointerLockChange() {
    if (!isPointerLocked() && state.gameActive && !state.gamePaused && !state.isTouchDevice) {
        debugLog('Pointer lock exited');
    }
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (!state.renderer || !state.scene || !state.camera) {
        return;
    }

    const now = performance.now();
    const delta = Math.min((now - state.lastFrameTime) / 1000, 0.05);
    state.lastFrameTime = now;
    updateFpsCounter(now);

    if (state.gamePaused) {
        state.renderer.render(state.scene, state.camera);
        return;
    }

    updateParticles(delta);
    refreshScoreMultiplier();

    if (state.controls.update) {
        state.controls.update();
    }

    if (state.gameActive) {
        updateBalloons();
        spawnBalloons();
    }

    state.renderer.render(state.scene, state.camera);
}

function installGameplayTestHooks() {
    installTestHooks({
        getBalloonCount: () => state.balloons.length,
        getScore: () => state.score,
        hitFirstBalloon: () => {
            if (state.balloons[0]) {
                hitBalloon(state.balloons[0]);
            }
        },
        getPoolStats,
    });
}

export function initGame() {
    initStorage();
    state.isTouchDevice = isTouchDevice();

    const capabilities = checkCapabilities(state.isTouchDevice);
    if (!capabilities.ok) {
        showFatalError(capabilities.reason, capabilities.details);
        return;
    }

    applyConfig();
    state.audioEnabled = loadAudioPreference();
    state.reducedMotion = CONFIG.reducedMotion || detectReducedMotion();
    document.body.classList.toggle('reduced-motion', state.reducedMotion);
    updateHighScoreDisplay();
    updateAchievementsDisplay();

    initRenderer();
    syncMenuState();
    setupControls();

    if (!state.isTouchDevice) {
        addManagedListener(document, 'pointerlockchange', onPointerLockChange, false);
        addManagedListener(document, 'mozpointerlockchange', onPointerLockChange, false);
        addManagedListener(document, 'webkitpointerlockchange', onPointerLockChange, false);
    }

    setupAudio();
    setupAudioBanner();
    addLights();
    createRoom();

    addManagedListener(window, 'resize', onWindowResize, false);
    addManagedListener(document, 'click', onShoot);

    const onVisibility = () => onVisibilityChange();
    addManagedListener(document, 'visibilitychange', onVisibility);

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }
    animate();
    applyAudioState();
    initMenuState();
    installGameplayTestHooks();
}
