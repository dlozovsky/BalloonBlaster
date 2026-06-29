import { state } from './state.js';
import { isTouchDevice } from './touch.js';

function isMenuVisible() {
    const startOpen = !document.getElementById('start-screen')?.classList.contains('hidden');
    const gameOverOpen = !document.getElementById('game-over-screen')?.classList.contains('hidden');
    const pauseOpen = document.getElementById('pause-screen')?.style.display === 'flex';
    return startOpen || gameOverOpen || pauseOpen;
}

function syncCanvasInteraction(menuOpen, touchDevice, gameActive) {
    const canvas = state.renderer?.domElement;
    const gameCanvas = document.getElementById('game-canvas');
    if (!canvas) {
        return;
    }

    const allowCanvasTouch = touchDevice && gameActive && !menuOpen;
    canvas.inert = menuOpen;
    canvas.style.pointerEvents = allowCanvasTouch ? 'auto' : 'none';

    if (gameCanvas) {
        gameCanvas.inert = menuOpen;
        gameCanvas.style.pointerEvents = allowCanvasTouch ? 'auto' : 'none';
    }
}

export function syncMenuState() {
    const touchDevice = state.isTouchDevice || isTouchDevice();
    const menuOpen = isMenuVisible();

    document.body.classList.toggle('menu-open', menuOpen);
    document.body.classList.toggle('game-active', state.gameActive);
    document.body.classList.toggle('touch-device', touchDevice);

    syncCanvasInteraction(menuOpen, touchDevice, state.gameActive);
}

export function initMenuState() {
    if (isTouchDevice()) {
        document.body.classList.add('touch-device');
    }
    document.body.classList.add('menu-open');
    syncMenuState();
}
