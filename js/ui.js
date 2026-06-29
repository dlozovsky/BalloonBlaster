import { CONFIG } from './config.js';
import { state } from './state.js';
import { getHighScore } from './storage.js';

export function applyConfig() {
    document.title = CONFIG.gameTitle;
    document.getElementById('game-title').textContent = CONFIG.gameTitle.toUpperCase();

    const fpsContainer = document.getElementById('fps-container');
    if (CONFIG.showFPS) {
        fpsContainer.classList.remove('hidden');
    } else {
        fpsContainer.classList.add('hidden');
    }
}

export function updateFpsCounter(now) {
    if (!CONFIG.showFPS) {
        return;
    }

    state.fpsFrames += 1;
    if (now - state.fpsLastSample >= 1000) {
        state.fpsDisplay = state.fpsFrames;
        state.fpsFrames = 0;
        state.fpsLastSample = now;
        document.getElementById('fps-container').textContent = `FPS: ${state.fpsDisplay}`;
    }
}

export function updateHighScoreDisplay() {
    const { bestScore, bestLevel } = getHighScore();
    document.getElementById('best-score').textContent = bestScore;
    document.getElementById('best-level').textContent = bestLevel;
}

export function updateScoreDisplay() {
    document.getElementById('score').textContent = state.score;
}

export function updateLevelDisplay() {
    document.getElementById('level').textContent = state.currentLevel;
}

export function updateTimerDisplay() {
    document.getElementById('timer').textContent = state.timeRemaining;
}

export function updateComboDisplay() {
    document.getElementById('combo').textContent = `x${state.comboMultiplier}`;
}

export function updateMuteButton() {
    const button = document.getElementById('mute-button');
    button.textContent = state.audioEnabled ? '🔊' : '🔇';
    button.setAttribute('aria-label', state.audioEnabled ? 'Mute sound' : 'Unmute sound');
}

export function showLevelMessage() {
    const levelMessage = document.createElement('div');
    levelMessage.style.position = 'absolute';
    levelMessage.style.top = '50%';
    levelMessage.style.left = '50%';
    levelMessage.style.transform = 'translate(-50%, -50%)';
    levelMessage.style.color = 'white';
    levelMessage.style.fontSize = '48px';
    levelMessage.style.fontWeight = 'bold';
    levelMessage.style.textShadow = '3px 3px 6px rgba(0, 0, 0, 0.5)';
    levelMessage.style.zIndex = '1000';
    levelMessage.style.textAlign = 'center';
    levelMessage.textContent = `LEVEL ${state.currentLevel}`;

    const targetScoreInfo = document.createElement('div');
    targetScoreInfo.style.fontSize = '24px';
    targetScoreInfo.style.marginTop = '10px';
    targetScoreInfo.textContent = `Target Score: +${state.targetScore} points`;
    levelMessage.appendChild(targetScoreInfo);

    if (state.currentLevel === 2) {
        const penaltyWarning = document.createElement('div');
        penaltyWarning.style.fontSize = '20px';
        penaltyWarning.style.marginTop = '10px';
        penaltyWarning.style.color = '#ff0000';
        penaltyWarning.textContent = 'Warning: Black balloons will deduct 3 points!';
        levelMessage.appendChild(penaltyWarning);
    }

    document.getElementById('ui-container').appendChild(levelMessage);

    setTimeout(() => {
        if (document.getElementById('ui-container').contains(levelMessage)) {
            document.getElementById('ui-container').removeChild(levelMessage);
        }
    }, 3000);
}

export function showPointsIndicator(points, position, camera, color, isNegative = false) {
    const vector = position.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const indicator = document.createElement('div');
    indicator.textContent = points > 0 ? `+${points}` : `${points}`;
    indicator.style.position = 'absolute';
    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
    indicator.style.color = color;
    indicator.style.fontSize = isNegative ? '32px' : '24px';
    indicator.style.fontWeight = 'bold';
    indicator.style.textShadow = isNegative ?
        '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' :
        '2px 2px 4px rgba(0, 0, 0, 0.5)';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '100';
    indicator.style.opacity = '1';
    indicator.style.transition = 'all 1s ease-out';

    document.getElementById('ui-container').appendChild(indicator);

    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = isNegative ?
            'translateY(-80px) scale(1.2)' :
            'translateY(-50px)';

        setTimeout(() => {
            if (document.getElementById('ui-container').contains(indicator)) {
                document.getElementById('ui-container').removeChild(indicator);
            }
        }, 1000);
    }, 10);
}

export function showShareConfirmation() {
    const confirmationMsg = document.createElement('div');
    confirmationMsg.style.position = 'fixed';
    confirmationMsg.style.top = '50%';
    confirmationMsg.style.left = '50%';
    confirmationMsg.style.transform = 'translate(-50%, -50%)';
    confirmationMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    confirmationMsg.style.color = 'white';
    confirmationMsg.style.padding = '20px';
    confirmationMsg.style.borderRadius = '10px';
    confirmationMsg.style.zIndex = '1000';
    confirmationMsg.style.textAlign = 'center';
    confirmationMsg.innerHTML = `
        <p>Score message copied to clipboard!</p>
        <p>Share it with your friends on social media.</p>
        <p><small>You can now paste the message anywhere.</small></p>
    `;
    document.body.appendChild(confirmationMsg);

    setTimeout(() => {
        document.body.removeChild(confirmationMsg);
    }, 3000);
}

export async function copyShareText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

export async function shareScore() {
    const shareText = `I scored ${state.score} points and reached level ${state.currentLevel} in ${CONFIG.gameTitle}! Can you beat my score? Play now at: ${CONFIG.shareUrl}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: CONFIG.shareTitle,
                text: shareText,
                url: CONFIG.shareUrl,
            });
            return;
        }

        await copyShareText(shareText);
        showShareConfirmation();
    } catch (error) {
        if (error?.name !== 'AbortError') {
            console.error('Share failed:', error);
        }
    }
}
