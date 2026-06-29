import { state } from './state.js';

export const TOUCH_TAP_THRESHOLD_PX = 18;
export const TOUCH_AIM_SENSITIVITY = 0.004;

export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function clampPitch(rotationX) {
    return Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));
}

export function computeAimRotation(rotation, deltaX, deltaY, sensitivity = TOUCH_AIM_SENSITIVITY) {
    return {
        x: clampPitch(rotation.x - deltaY * sensitivity),
        y: rotation.y - deltaX * sensitivity,
    };
}

export function isTapGesture(totalMovement, threshold = TOUCH_TAP_THRESHOLD_PX) {
    return totalMovement < threshold;
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
        if (touchStart && isTapGesture(totalMovement)) {
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
    const next = computeAimRotation(state.camera.rotation, deltaX, deltaY);
    state.camera.rotation.x = next.x;
    state.camera.rotation.y = next.y;
}
