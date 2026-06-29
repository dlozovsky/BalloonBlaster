import {
    applyAudioState,
    playBackgroundMusic,
    playPenaltySound,
    playSound,
    setupAudio,
    stopBackgroundMusic,
    toggleAudio,
} from './audio.js';
import {
    calculateEarnedPoints,
    getDifficultyForLevel,
    getPointsEarnedInLevel,
    getResetComboState,
    getTargetScoreForLevel,
    hasMetLevelTarget,
    nextComboState,
} from './gameLogic.js';
import { saveHighScoreIfNeeded } from './storage.js';
import { loadAudioPreference, state } from './state.js';
import {
    applyConfig,
    showLevelMessage,
    showPointsIndicator,
    updateComboDisplay,
    updateFpsCounter,
    updateHighScoreDisplay,
    updateLevelDisplay,
    updateScoreDisplay,
    updateTimerDisplay,
} from './ui.js';
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

function updateDifficultyParams() {
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

    if (state.comboTimer) {
        clearTimeout(state.comboTimer);
    }
    state.comboTimer = setTimeout(resetCombo, state.comboResetDelay);
}

function hitBalloon(balloon) {
    const balloonType = balloon.userData.type;
    const basePoints = balloon.userData.points;
    let earnedPoints = basePoints;

    if (balloonType === 'PENALTY') {
        resetCombo();
    } else {
        updateCombo();
        earnedPoints = calculateEarnedPoints(balloonType, basePoints, state.comboMultiplier);
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

function onShoot(event) {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    if (event?.type === 'click') {
        if (!isPointerLocked() || event.target !== state.renderer.domElement) {
            return;
        }
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

        if (state.timeRemaining <= 0) {
            clearInterval(state.levelTimer);
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
    state.currentLevel += 1;
    state.levelScoreAtStart = state.score;
    updateLevelDisplay();
    updateDifficultyParams();
    state.timeRemaining = state.difficultyParams.levelDuration;
    updateTimerDisplay();
    clearBalloons();
    spawnBalloons();
    showLevelMessage();
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

    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-title').style.color = title === 'CONGRATULATIONS!' ? '#ffeb3b' : '#ff4081';
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('final-level').textContent = state.currentLevel;

    const isNewRecord = saveHighScoreIfNeeded();
    if (isNewRecord) {
        updateHighScoreDisplay();
    }
    document.getElementById('new-high-score').style.display = isNewRecord ? 'block' : 'none';
    document.getElementById('game-over-screen').classList.remove('hidden');

    state.controls.unlock();
    clearBalloons();
    clearParticles();
    stopBackgroundMusic();
    removeGameplayListeners();
}

export function startGame() {
    state.controls.lock();
    document.getElementById('start-screen').classList.add('hidden');

    state.score = 0;
    state.levelScoreAtStart = 0;
    state.currentLevel = 1;
    updateScoreDisplay();
    updateLevelDisplay();
    updateDifficultyParams();
    state.timeRemaining = state.difficultyParams.levelDuration;
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

    document.exitPointerLock = document.exitPointerLock ||
        document.mozExitPointerLock ||
        document.webkitExitPointerLock;
    document.exitPointerLock?.();
}

export function resumeGame() {
    if (!state.gameActive || !state.gamePaused) {
        return;
    }

    state.gamePaused = false;
    document.getElementById('pause-screen').style.display = 'none';
    startLevelTimer();
    document.body.requestPointerLock?.();
    playBackgroundMusic();
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
        onShoot();
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
    removeGameplayListeners();
}

export function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('new-high-score').style.display = 'none';
    startGame();
}

function onPointerLockChange() {
    if (!isPointerLocked() && state.gameActive && !state.gamePaused) {
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
    updateHighScoreDisplay();

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

    animate();

    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('resume-button').addEventListener('click', resumeGame);
    document.getElementById('pause-quit-button').addEventListener('click', quitGame);
    document.getElementById('mute-button').addEventListener('click', toggleAudio);
    applyAudioState();
}
