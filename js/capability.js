export function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(
            canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
        );
    } catch {
        return false;
    }
}

export function checkCapabilities() {
    if (typeof THREE === 'undefined') {
        return {
            ok: false,
            reason: 'The 3D engine failed to load.',
            details: 'Three.js could not be loaded. Check your network connection or try refreshing the page.',
        };
    }

    if (typeof PointerLockControls === 'undefined') {
        return {
            ok: false,
            reason: 'Required game controls failed to load.',
            details: 'PointerLockControls could not be loaded. Try refreshing the page.',
        };
    }

    if (!isWebGLAvailable()) {
        return {
            ok: false,
            reason: 'WebGL is not available in this browser.',
            details: 'Balloon Blaster needs WebGL for 3D graphics. Try updating your browser or enabling hardware acceleration.',
        };
    }

    return { ok: true };
}
