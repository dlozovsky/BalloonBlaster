import { state } from './state.js';

const managedListeners = [];
let removeTouchControlsFn = null;

export function addManagedListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    managedListeners.push({ target, event, handler, options });
}

export function registerTouchCleanup(fn) {
    removeTouchControlsFn = fn;
}

export function clearGameplayTimers() {
    if (state.levelTimer) {
        clearInterval(state.levelTimer);
        state.levelTimer = null;
    }
    state.levelEndAt = null;

    if (state.comboTimer) {
        clearTimeout(state.comboTimer);
        state.comboTimer = null;
    }
}

export function teardownGameplay() {
    clearGameplayTimers();

    for (let i = managedListeners.length - 1; i >= 0; i -= 1) {
        const entry = managedListeners[i];
        if (entry.gameplayOnly) {
            entry.target.removeEventListener(entry.event, entry.handler, entry.options);
            managedListeners.splice(i, 1);
        }
    }

    removeTouchControlsFn?.();
    removeTouchControlsFn = null;
}

export function teardownAll() {
    clearGameplayTimers();
    teardownGameplay();

    while (managedListeners.length > 0) {
        const entry = managedListeners.pop();
        entry.target.removeEventListener(entry.event, entry.handler, entry.options);
    }

    if (state.controls?.unlock) {
        try {
            state.controls.unlock();
        } catch {
            // Pointer lock may already be released.
        }
    }

    if (state.renderer?.domElement?.parentNode) {
        state.renderer.domElement.parentNode.removeChild(state.renderer.domElement);
    }

    state.renderer?.dispose?.();
    state.renderer = null;
}

export function addGameplayListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    managedListeners.push({ target, event, handler, options, gameplayOnly: true });
}
