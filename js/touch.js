import { resumeAudioOnGesture } from './audio.js';
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

export function resetTouchCamera() {
    if (!state.camera) {
        return;
    }
    state.camera.rotation.order = 'YXZ';
    state.camera.rotation.set(0, 0, 0);
}

export function applyTouchAim(deltaX, deltaY) {
    state.camera.rotation.order = 'YXZ';
    const sensitivity = 0.004;
    state.camera.rotation.y -= deltaX * sensitivity;
    state.camera.rotation.x -= deltaY * sensitivity;
    state.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.camera.rotation.x));
    state.camera.rotation.z = 0;
}

export function setupTouchControls(surface, handlers) {
    let touchStart = null;
    let totalMovement = 0;
    let touchId = null;

    const onTouchStart = (event) => {
        if (!state.gameActive || state.gamePaused || event.touches.length !== 1) {
            return;
        }

        if (event.target.closest('#mobile-fire-button, #mobile-pause-button, #mute-button, #audio-blocked-banner')) {
            return;
        }

        void resumeAudioOnGesture();

        touchId = event.touches[0].identifier;
        touchStart = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
        totalMovement = 0;
    };

    const onTouchMove = (event) => {
        if (!touchStart || touchId === null) {
            return;
        }

        const touch = Array.from(event.touches).find((entry) => entry.identifier === touchId);
        if (!touch) {
            return;
        }

        event.preventDefault();
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        totalMovement += Math.abs(dx) + Math.abs(dy);
        handlers.onAim(dx, dy);
        touchStart = {
            x: touch.clientX,
            y: touch.clientY,
        };
    };

    const onTouchEnd = (event) => {
        const endedTouch = Array.from(event.changedTouches).find((entry) => entry.identifier === touchId);
        if (!endedTouch || !touchStart) {
            return;
        }

        if (totalMovement < 12) {
            handlers.onShoot();
        }

        touchStart = null;
        touchId = null;
        totalMovement = 0;
    };

    surface.addEventListener('touchstart', onTouchStart, { passive: true });
    surface.addEventListener('touchmove', onTouchMove, { passive: false });
    surface.addEventListener('touchend', onTouchEnd, { passive: true });
    surface.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
        surface.removeEventListener('touchstart', onTouchStart);
        surface.removeEventListener('touchmove', onTouchMove);
        surface.removeEventListener('touchend', onTouchEnd);
        surface.removeEventListener('touchcancel', onTouchEnd);
    };
}
