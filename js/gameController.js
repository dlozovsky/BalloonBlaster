import { unlockAchievement, updateAchievementsDisplay } from './achievementsStorage.js';
import {
    applyAudioState,
    playBackgroundMusic,
    playPenaltySound,
    playSound,
    setupAudio,
    stopBackgroundMusic,
    toggleAudio,
} from './audio.js';
import { CONFIG } from './config.js';
import { DOUBLE_SCORE_DURATION_MS } from './constants.js';
import {
    detectReducedMotion,
    showComboMilestone,
    showPowerUpMessage,
    triggerScreenShake,
} from './effects.js';
import {
    calculateEarnedPoints,
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
    saveHighScoreIfNeeded,
    saveSurvivalHighScoreIfNeeded,
} from './storage.js';
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
    initRenderer,
    onWindowResize,
    removeBalloon,
    setupControls,
    spawnBalloons,
    updateBalloons,
    updateParticles,
} from './world.js';

let removeTouchControls = null;

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
    playSound(state.specialPopSound);
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
        playSound(state.specialPopSound);
        showPointsIndicator(earnedPoints, balloon.position, state.camera, '#ffeb3b');
    } else if (balloonType === 'PENALTY') {
        playPenaltySound();
        showPointsIndicator(earnedPoints, balloon.position, state.camera, '#ff0000', true);
    } else {
        playSound(state.popSound);
        showPointsIndicator(earnedPoints, balloon.position, state.camera, '#ffffff');
    }

    createPopEffect(balloon.position, balloonType);
    removeBalloon(balloon);
}

function shoot() {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    playSound(state.shootSound);

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

function startLevelTimer() {
    if (state.levelTimer) {
        clearInterval(state.levelTimer);
    }

    state.levelTimer = setInterval(() => {
        if (state.gamePaused) {
            return;
        }

        state.timeRemaining -= 1;
        updateTimerDisplay();
        refreshScoreMultiplier();

        if (state.gameMode === 'survival') {
            state.survivalElapsed = state.survivalDuration - state.timeRemaining;
            state.difficultyParams = getSurvivalDifficulty(state.survivalElapsed);
        }

        if (state.timeRemaining <= 0) {
            clearInterval(state.levelTimer);

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
    }, 1000);
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
    playSound(state.specialPopSound);
    startLevelTimer();
}

function removeGameplayListeners() {
    window.removeEventListener('blur', pauseGame);
    document.removeEventListener('keydown', handleKeyDown);
}

function endGame(title, message) {
    state.gameActive = false;
    stopBackgroundMusic();

    if (state.levelTimer) {
        clearInterval(state.levelTimer);
        state.levelTimer = null;
    }

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
    removeGameplayListeners();
}

export function startGame() {
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

    playBackgroundMusic();
    spawnBalloons();
    showLevelMessage();
    startLevelTimer();

    window.addEventListener('blur', pauseGame);
    document.addEventListener('keydown', handleKeyDown);

    if (state.isTouchDevice) {
        setMobileUiVisible(true);
        return;
    }

    document.body.requestPointerLock = document.body.requestPointerLock ||
        document.body.mozRequestPointerLock ||
        document.body.webkitRequestPointerLock;
    document.body.requestPointerLock?.();
}

export function pauseGame() {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    state.gamePaused = true;
    clearInterval(state.levelTimer);
    document.getElementById('pause-screen').style.display = 'flex';

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
    startLevelTimer();
    playBackgroundMusic();

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
    clearInterval(state.levelTimer);
    state.gameActive = false;
    state.gamePaused = false;
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('start-screen').classList.remove('hidden');
    clearBalloons();
    clearParticles();
    stopBackgroundMusic();
    setMobileUiVisible(false);
    removeGameplayListeners();
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
    requestAnimationFrame(animate);

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

export function initGame() {
    applyConfig();
    state.audioEnabled = loadAudioPreference();
    state.reducedMotion = CONFIG.reducedMotion || detectReducedMotion();
    document.body.classList.toggle('reduced-motion', state.reducedMotion);
    updateHighScoreDisplay();
    updateAchievementsDisplay();

    initRenderer();
    setupControls();

    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);

    setupAudio();
    addLights();
    createRoom();

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('click', onShoot);

    removeTouchControls = setupTouchControls(state.renderer.domElement, {
        onAim: applyTouchAim,
        onShoot: shoot,
    });

    animate();

    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('resume-button').addEventListener('click', resumeGame);
    document.getElementById('pause-quit-button').addEventListener('click', quitGame);
    document.getElementById('mute-button').addEventListener('click', toggleAudio);
    document.getElementById('mobile-pause-button').addEventListener('click', pauseGame);
    applyAudioState();
}
