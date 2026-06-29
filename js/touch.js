import { state } from './state.js';

export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function createTouchControls() {
    return {
        isLocked: false,
        lock() {
            this.isLocked = true;
        },
        unlock() {
            this.isLocked = false;
        },
        update() {
            // Aiming is handled by touch drag handlers.
        },
    };
}

export function setupTouchControls(canvas, handlers) {
    let touchStart = null;
    let totalMovement = 0;

    const onTouchStart = (event) => {
        if (!state.gameActive || state.gamePaused || event.touches.length !== 1) {
            return;
        }
        touchStart = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
        totalMovement = 0;
    };

    const onTouchMove = (event) => {
        if (!touchStart || event.touches.length !== 1) {
            return;
        }
        event.preventDefault();
        const dx = event.touches[0].clientX - touchStart.x;
        const dy = event.touches[0].clientY - touchStart.y;
        totalMovement += Math.abs(dx) + Math.abs(dy);
        handlers.onAim(dx, dy);
        touchStart = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
    };

    const onTouchEnd = () => {
        if (touchStart && totalMovement < 18) {
            handlers.onShoot();
        }
        touchStart = null;
        totalMovement = 0;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
    };
}

export function applyTouchAim(deltaX, deltaY) {
    const sensitivity = 0.004;
    state.camera.rotation.y -= deltaX * sensitivity;
    state.camera.rotation.x -= deltaY * sensitivity;
    state.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.camera.rotation.x));
}
