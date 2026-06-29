import { state } from './state.js';

export function detectReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function triggerScreenShake() {
    if (state.reducedMotion) {
        return;
    }
    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');
    window.setTimeout(() => document.body.classList.remove('screen-shake'), 300);
}

const COMBO_MESSAGES = {
    2: 'Nice!',
    3: 'Great!',
    4: 'Unstoppable!',
};

export function showComboMilestone(multiplier) {
    if (state.reducedMotion || !COMBO_MESSAGES[multiplier]) {
        return;
    }

    const message = document.createElement('div');
    message.className = 'combo-milestone';
    message.textContent = COMBO_MESSAGES[multiplier];
    document.getElementById('ui-container').appendChild(message);

    window.setTimeout(() => {
        if (message.parentElement) {
            message.remove();
        }
    }, 1200);
}

export function showPowerUpMessage(text) {
    const message = document.createElement('div');
    message.className = 'powerup-message';
    message.textContent = text;
    document.getElementById('ui-container').appendChild(message);

    window.setTimeout(() => {
        if (message.parentElement) {
            message.remove();
        }
    }, 1500);
}

export function getParticleCount(baseCount) {
    return state.reducedMotion ? Math.max(2, Math.floor(baseCount / 4)) : baseCount;
}
