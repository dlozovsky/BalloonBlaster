import { state } from './state.js';
import { isTouchDevice } from './touch.js';

function isMenuVisible() {
    const startOpen = !document.getElementById('start-screen')?.classList.contains('hidden');
    const gameOverOpen = !document.getElementById('game-over-screen')?.classList.contains('hidden');
    const pauseOpen = document.getElementById('pause-screen')?.style.display === 'flex';
    return startOpen || gameOverOpen || pauseOpen;
}

export function syncMenuState() {
    const touchDevice = state.isTouchDevice || isTouchDevice();
    document.body.classList.toggle('menu-open', isMenuVisible());
    document.body.classList.toggle('game-active', state.gameActive);
    document.body.classList.toggle('touch-device', touchDevice);
}

export function initMenuState() {
    syncMenuState();
}
