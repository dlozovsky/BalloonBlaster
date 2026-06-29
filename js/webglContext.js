import { clearGameplayTimers } from './lifecycle.js';
import { syncMenuState } from './menuState.js';
import { state } from './state.js';

let contextHandlersInstalled = false;

function showWebGLRecoveryBanner() {
    if (typeof document === 'undefined') {
        return;
    }
    document.getElementById('webgl-recovery-banner')?.classList.remove('hidden');
}

export function hideWebGLRecoveryBanner() {
    if (typeof document === 'undefined') {
        return;
    }
    document.getElementById('webgl-recovery-banner')?.classList.add('hidden');
}

function pauseForContextLoss() {
    if (!state.gameActive || state.gamePaused) {
        return;
    }

    state.gamePaused = true;
    clearGameplayTimers();

    if (typeof document !== 'undefined') {
        document.getElementById('pause-screen').style.display = 'none';
        syncMenuState();
    }
}

export function handleWebGLContextLost() {
    state.webglContextLost = true;
    pauseForContextLoss();
    showWebGLRecoveryBanner();
}

export function handleWebGLContextRestored(onResize) {
    state.webglContextLost = false;
    hideWebGLRecoveryBanner();
    onResize?.();
    if (typeof document !== 'undefined') {
        syncMenuState();
    }
}

export function setupWebGLContextHandlers(canvas, { onContextRestored } = {}) {
    if (!canvas || contextHandlersInstalled) {
        return;
    }

    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        handleWebGLContextLost();
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
        handleWebGLContextRestored(onContextRestored);
    }, false);

    contextHandlersInstalled = true;
}

export function resetWebGLContextHandlersForTests() {
    contextHandlersInstalled = false;
}
