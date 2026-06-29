import { CONFIG } from './config.js';
import { state } from './state.js';
import { getHighScore, getSurvivalHighScore } from './storage.js';

export function getSelectedGameMode() {
    const selected = document.querySelector('input[name="game-mode"]:checked');
    return selected?.value === 'survival' ? 'survival' : 'arcade';
}

export function applyConfig() {
    document.title = CONFIG.gameTitle;
    document.getElementById('game-title').textContent = CONFIG.gameTitle.toUpperCase();

    const fpsContainer = document.getElementById('fps-container');
    if (CONFIG.showFPS) {
        fpsContainer.classList.remove('hidden');
    } else {
        fpsContainer.classList.add('hidden');
    }

    document.body.classList.toggle('reduced-motion', CONFIG.reducedMotion);
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
    const survivalBest = getSurvivalHighScore();
    document.getElementById('best-score').textContent = bestScore;
    document.getElementById('best-level').textContent = bestLevel;
    document.getElementById('best-survival-score').textContent = survivalBest;
}

export function updateScoreDisplay() {
    document.getElementById('score').textContent = state.score;
}

export function updateLevelDisplay() {
    const levelLabel = state.gameMode === 'survival' ? 'SURVIVAL' : state.currentLevel;
    document.getElementById('level').textContent = levelLabel;
}

export function updateTimerDisplay() {
    document.getElementById('timer').textContent = state.timeRemaining;
}

export function updateComboDisplay() {
    document.getElementById('combo').textContent = `x${state.comboMultiplier}`;
}

export function updateScoreMultiplierDisplay(active) {
    const container = document.getElementById('multiplier-container');
    if (!container) {
        return;
    }
    container.classList.toggle('hidden', !active);
}

export function updateMuteButton() {
    const button = document.getElementById('mute-button');
    button.textContent = state.audioEnabled ? '🔊' : '🔇';
    button.setAttribute('aria-label', state.audioEnabled ? 'Mute sound' : 'Unmute sound');
}

export function showAchievementToast(achievement) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<strong>Achievement unlocked!</strong><br>${achievement.name}`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2800);
}

export function showLevelMessage() {
    if (state.gameMode === 'survival') {
        const message = document.createElement('div');
        message.className = 'level-banner';
        message.innerHTML = 'SURVIVAL MODE<br><span class="level-banner-sub">Pop as many balloons as you can in 90 seconds!</span>';
        document.getElementById('ui-container').appendChild(message);
        window.setTimeout(() => message.remove(), 3000);
        return;
    }

    const levelMessage = document.createElement('div');
    levelMessage.className = 'level-banner';
    levelMessage.innerHTML = `LEVEL ${state.currentLevel}`;

    const targetScoreInfo = document.createElement('div');
    targetScoreInfo.className = 'level-banner-sub';
    targetScoreInfo.textContent = `Target Score: +${state.targetScore} points`;
    levelMessage.appendChild(targetScoreInfo);

    if (state.currentLevel === 2) {
        const penaltyWarning = document.createElement('div');
        penaltyWarning.className = 'level-banner-warning';
        penaltyWarning.textContent = 'Warning: Black balloons will deduct 3 points!';
        levelMessage.appendChild(penaltyWarning);
    }

    document.getElementById('ui-container').appendChild(levelMessage);
    window.setTimeout(() => levelMessage.remove(), 3000);
}

export function showPointsIndicator(points, position, camera, color, isNegative = false) {
    const vector = position.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const indicator = document.createElement('div');
    indicator.textContent = points > 0 ? `+${points}` : `${points}`;
    indicator.className = isNegative ? 'points-indicator negative' : 'points-indicator';
    indicator.style.left = `${x}px`;
    indicator.style.top = `${y}px`;
    indicator.style.color = color;

    document.getElementById('ui-container').appendChild(indicator);

    window.setTimeout(() => {
        indicator.classList.add('fade-out');
        window.setTimeout(() => indicator.remove(), 1000);
    }, 10);
}

export function showShareConfirmation() {
    const confirmationMsg = document.createElement('div');
    confirmationMsg.className = 'share-confirmation';
    confirmationMsg.setAttribute('role', 'status');
    confirmationMsg.innerHTML = `
        <p>Score message copied to clipboard!</p>
        <p>Share it with your friends on social media.</p>
    `;
    document.body.appendChild(confirmationMsg);
    window.setTimeout(() => confirmationMsg.remove(), 3000);
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
    const modeLabel = state.gameMode === 'survival' ? 'Survival' : `level ${state.currentLevel}`;
    const shareText = `I scored ${state.score} points in ${modeLabel} on ${CONFIG.gameTitle}! Can you beat my score? Play now at: ${CONFIG.shareUrl}`;

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

export function downloadScoreCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const context = canvas.getContext('2d');

    const gradient = context.createLinearGradient(0, 0, 800, 450);
    gradient.addColorStop(0, '#ff4081');
    gradient.addColorStop(1, '#311b92');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 800, 450);

    context.fillStyle = '#ffffff';
    context.font = 'bold 48px Arial';
    context.fillText(CONFIG.gameTitle, 50, 80);

    context.font = '32px Arial';
    context.fillText(`Score: ${state.score}`, 50, 170);
    context.fillText(`Mode: ${state.gameMode === 'survival' ? 'Survival' : 'Arcade'}`, 50, 220);

    if (state.gameMode === 'arcade') {
        context.fillText(`Level reached: ${state.currentLevel}`, 50, 270);
    }

    context.font = '24px Arial';
    context.fillText('Can you beat this score?', 50, 360);

    const link = document.createElement('a');
    link.download = 'balloon-blaster-score.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function setMobileUiVisible(visible) {
    document.getElementById('mobile-pause-button').classList.toggle('hidden', !visible);
    document.getElementById('mobile-hint').classList.toggle('hidden', !visible);
}
