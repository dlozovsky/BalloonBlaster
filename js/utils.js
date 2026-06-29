import { CONFIG } from './config.js';

export function debugLog(...args) {
    if (CONFIG.debugMode) {
        // eslint-disable-next-line no-console -- intentional debug output behind CONFIG flag
        console.log(...args);
    }
}

export function isPointerLocked() {
    return document.pointerLockElement === document.body ||
        document.mozPointerLockElement === document.body ||
        document.webkitPointerLockElement === document.body;
}

export function createPatternTexture(drawPattern, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    drawPattern(context, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function createWoodFloorTexture() {
    return createPatternTexture((context, width, height) => {
        const plankHeight = 32;
        for (let y = 0; y < height; y += plankHeight) {
            const shade = 110 + ((y / plankHeight) % 2) * 25;
            context.fillStyle = `rgb(${shade + 25}, ${shade}, ${shade - 35})`;
            context.fillRect(0, y, width, plankHeight);
            context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
    }, 256, 256);
}

export function createBrickWallTexture() {
    return createPatternTexture((context, width, height) => {
        const brickWidth = 64;
        const brickHeight = 32;
        context.fillStyle = '#8f4a3d';
        context.fillRect(0, 0, width, height);

        for (let row = 0; row < height / brickHeight; row++) {
            const offset = row % 2 === 0 ? 0 : brickWidth / 2;
            for (let col = -1; col < width / brickWidth + 1; col++) {
                const x = col * brickWidth + offset;
                const y = row * brickHeight;
                context.fillStyle = row % 2 === 0 ? '#b85c4a' : '#a05040';
                context.fillRect(x + 2, y + 2, brickWidth - 4, brickHeight - 4);
                context.strokeStyle = 'rgba(0, 0, 0, 0.25)';
                context.strokeRect(x + 2, y + 2, brickWidth - 4, brickHeight - 4);
            }
        }
    }, 256, 128);
}
