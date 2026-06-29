import {
    BALLOON_TYPES,
    PARTICLE_LIFETIME,
    POWERUP_MIN_LEVEL,
    POWERUP_SPAWN_CHANCE,
    ROOM_DEPTH,
    ROOM_HEIGHT,
    ROOM_WIDTH,
} from './constants.js';
import { maybePromoteToPowerUp, pickBalloonType } from './gameLogic.js';
import { getParticleCount } from './effects.js';
import { state } from './state.js';
import {
    createBrickWallTexture,
    createWoodFloorTexture,
    debugLog,
} from './utils.js';
import { createTouchControls, isTouchDevice } from './touch.js';

const PARTICLE_GEOMETRY = new THREE.SphereGeometry(0.1, 8, 8);
const PARTICLE_MATERIALS = {
    NORMAL: new THREE.MeshBasicMaterial({ color: 0xff4081 }),
    SPECIAL: new THREE.MeshBasicMaterial({ color: 0xffeb3b }),
    PENALTY: new THREE.MeshBasicMaterial({ color: 0x000000 }),
};
const particlePool = [];

function getParticleMaterialKey(type) {
    if (type === 'SPECIAL') {
        return 'SPECIAL';
    }
    if (type === 'PENALTY') {
        return 'PENALTY';
    }
    return 'NORMAL';
}

function acquireParticle(type) {
    const materialKey = getParticleMaterialKey(type);
    let particle = particlePool.pop();

    if (!particle) {
        particle = new THREE.Mesh(PARTICLE_GEOMETRY, PARTICLE_MATERIALS[materialKey]);
    } else {
        particle.material = PARTICLE_MATERIALS[materialKey];
        particle.visible = true;
    }

    particle.scale.setScalar(1);
    particle.userData = {
        velocity: new THREE.Vector3(),
        lifetime: 0,
    };

    return particle;
}

function releaseParticle(particle) {
    particle.visible = false;
    particle.userData.lifetime = 0;
    state.scene.remove(particle);
    particlePool.push(particle);
}

export function initRenderer() {
    if (typeof THREE === 'undefined') {
        throw new Error('Three.js failed to load.');
    }

    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
        throw new Error('WebGL is not available in this browser.');
    }

    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x87ceeb);

    state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 1.6, 0);

    try {
        state.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (error) {
        throw new Error(
            `Failed to create WebGL renderer: ${error instanceof Error ? error.message : 'unknown error'}`,
            { cause: error },
        );
    }

    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;

    const mount = document.getElementById('game-canvas') ?? document.body;
    mount.appendChild(state.renderer.domElement);
}

export function setupControls() {
    if (isTouchDevice()) {
        state.controls = createTouchControls();
        debugLog('Using touch-only controls');
        return;
    }

    try {
        state.controls = new THREE.PointerLockControls(state.camera, document.body);
        debugLog('Using THREE.PointerLockControls');
    } catch (error) {
        console.error('Error creating PointerLockControls:', error);
        debugLog('Falling back to custom controls');
        setupCustomControls();
    }
}

export function addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    state.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    state.scene.add(directionalLight);

    const colors = [0x4e00ff, 0x00ff9e, 0xff7700];
    colors.forEach((color, index) => {
        const pointLight = new THREE.PointLight(color, 0.5, 15);
        const x = Math.sin(index * Math.PI * 2 / colors.length) * ROOM_WIDTH * 0.4;
        const z = Math.cos(index * Math.PI * 2 / colors.length) * ROOM_DEPTH * 0.4;
        pointLight.position.set(x, ROOM_HEIGHT * 0.8, z);
        state.scene.add(pointLight);
    });
}

export function createRoom() {
    const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorTexture = createWoodFloorTexture();
    floorTexture.repeat.set(4, 4);
    const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ map: floorTexture }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    state.scene.add(floor);

    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
        new THREE.MeshStandardMaterial({ color: 0xcccccc }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    ceiling.receiveShadow = true;
    state.scene.add(ceiling);

    const wallTexture = createBrickWallTexture();
    wallTexture.repeat.set(2, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT), wallMaterial);
    backWall.position.z = -ROOM_DEPTH / 2;
    backWall.position.y = ROOM_HEIGHT / 2;
    backWall.receiveShadow = true;
    state.scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT), wallMaterial);
    frontWall.position.z = ROOM_DEPTH / 2;
    frontWall.position.y = ROOM_HEIGHT / 2;
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    state.scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT), wallMaterial);
    leftWall.position.x = -ROOM_WIDTH / 2;
    leftWall.position.y = ROOM_HEIGHT / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    state.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT), wallMaterial);
    rightWall.position.x = ROOM_WIDTH / 2;
    rightWall.position.y = ROOM_HEIGHT / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    state.scene.add(rightWall);
}

function resolveBalloonType(type) {
    if (type === 'SPECIAL') return BALLOON_TYPES.SPECIAL;
    if (type === 'PENALTY') return BALLOON_TYPES.PENALTY;
    if (type === 'POWERUP') return BALLOON_TYPES.POWERUP;
    return BALLOON_TYPES.NORMAL;
}

function createBalloon(type) {
    const balloonType = resolveBalloonType(type);

    const material = type === 'POWERUP'
        ? new THREE.MeshPhongMaterial({
            color: balloonType.color,
            emissive: 0x00bcd4,
            emissiveIntensity: 0.6,
            shininess: 120,
        })
        : new THREE.MeshPhongMaterial({
            color: balloonType.color,
            shininess: 100,
            specular: 0x111111,
        });

    const balloon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material);

    balloon.scale.set(balloonType.scale, balloonType.scale * 1.2, balloonType.scale);

    const string = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 1, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    string.position.y = -0.5 * balloonType.scale - 0.5;
    balloon.add(string);

    balloon.position.set(
        (Math.random() - 0.5) * (ROOM_WIDTH - 2),
        ROOM_HEIGHT * 0.3 + Math.random() * ROOM_HEIGHT * 0.5,
        (Math.random() - 0.5) * (ROOM_DEPTH - 2),
    );

    balloon.userData = {
        type,
        points: balloonType.points,
        speed: balloonType.baseSpeed * state.difficultyParams.balloonSpeed,
        direction: new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 2,
        ).normalize(),
    };

    balloon.castShadow = true;
    state.scene.add(balloon);
    state.balloons.push(balloon);
    return balloon;
}

export function spawnBalloons() {
    const targetBalloonCount = Math.floor(state.difficultyParams.balloonCount);
    const balloonsToSpawn = targetBalloonCount - state.balloons.length;

    if (balloonsToSpawn <= 0) {
        return;
    }

    for (let i = 0; i < balloonsToSpawn; i++) {
        let type = pickBalloonType(
            Math.random(),
            state.currentLevel,
            state.difficultyParams,
        );
        type = maybePromoteToPowerUp(
            type,
            state.currentLevel,
            Math.random(),
            POWERUP_MIN_LEVEL,
            POWERUP_SPAWN_CHANCE,
        );
        createBalloon(type);
    }

    debugLog(`Spawned ${balloonsToSpawn} new balloons. Total: ${state.balloons.length}`);
}

export function updateBalloons() {
    const halfWidth = ROOM_WIDTH / 2 - 1;
    const halfDepth = ROOM_DEPTH / 2 - 1;
    const minHeight = 1;
    const maxHeight = ROOM_HEIGHT - 1;

    state.balloons.forEach((balloon) => {
        balloon.position.addScaledVector(balloon.userData.direction, balloon.userData.speed);

        if (balloon.position.x < -halfWidth || balloon.position.x > halfWidth) {
            balloon.userData.direction.x *= -1;
        }
        if (balloon.position.y < minHeight || balloon.position.y > maxHeight) {
            balloon.userData.direction.y *= -1;
        }
        if (balloon.position.z < -halfDepth || balloon.position.z > halfDepth) {
            balloon.userData.direction.z *= -1;
        }

        balloon.position.x = Math.max(-halfWidth, Math.min(halfWidth, balloon.position.x));
        balloon.position.y = Math.max(minHeight, Math.min(maxHeight, balloon.position.y));
        balloon.position.z = Math.max(-halfDepth, Math.min(halfDepth, balloon.position.z));
    });
}

export function clearBalloons() {
    while (state.balloons.length > 0) {
        const balloon = state.balloons.pop();
        state.scene.remove(balloon);
    }
}

export function clearParticles() {
    while (state.particles.length > 0) {
        releaseParticle(state.particles.pop());
    }
}

export function updateParticles(delta) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const particle = state.particles[i];
        particle.userData.lifetime += delta;

        if (particle.userData.lifetime >= PARTICLE_LIFETIME) {
            state.particles.splice(i, 1);
            releaseParticle(particle);
            continue;
        }

        particle.position.addScaledVector(particle.userData.velocity, delta * 60);
        particle.userData.velocity.y -= 0.08 * delta;

        const fade = 1 - (particle.userData.lifetime / PARTICLE_LIFETIME);
        particle.scale.setScalar(Math.max(fade, 0.1));
    }
}

export function createPopEffect(position, type) {
    const baseCount = type === 'SPECIAL' ? 20 : 10;
    const particleCount = getParticleCount(baseCount);

    for (let i = 0; i < particleCount; i++) {
        const particle = acquireParticle(type);
        particle.position.copy(position);
        particle.userData.velocity.set(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.15,
            (Math.random() - 0.5) * 0.2,
        );
        state.scene.add(particle);
        state.particles.push(particle);
    }
}

export function removeBalloon(balloon) {
    state.scene.remove(balloon);
    const balloonIndex = state.balloons.indexOf(balloon);
    if (balloonIndex > -1) {
        state.balloons.splice(balloonIndex, 1);
    }
}

export function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupCustomControls() {
    state.controls = {
        isLocked: false,
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,

        lock() {
            this.isLocked = true;
            const element = document.body;
            element.requestPointerLock = element.requestPointerLock ||
                element.mozRequestPointerLock ||
                element.webkitRequestPointerLock;
            element.requestPointerLock?.();
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('keydown', this.onKeyDown);
            document.addEventListener('keyup', this.onKeyUp);
        },

        unlock() {
            this.isLocked = false;
            document.exitPointerLock = document.exitPointerLock ||
                document.mozExitPointerLock ||
                document.webkitExitPointerLock;
            document.exitPointerLock?.();
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
        },

        onMouseMove: (event) => {
            const controls = state.controls;
            if (!controls.isLocked) return;

            const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
            state.camera.rotation.y -= movementX * 0.002;
            state.camera.rotation.x -= movementY * 0.002;
            state.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.camera.rotation.x));
        },

        onKeyDown: (event) => {
            const controls = state.controls;
            if (!controls.isLocked) return;
            switch (event.code) {
                case 'KeyW': controls.moveForward = true; break;
                case 'KeyS': controls.moveBackward = true; break;
                case 'KeyA': controls.moveLeft = true; break;
                case 'KeyD': controls.moveRight = true; break;
                default: break;
            }
        },

        onKeyUp: (event) => {
            const controls = state.controls;
            if (!controls.isLocked) return;
            switch (event.code) {
                case 'KeyW': controls.moveForward = false; break;
                case 'KeyS': controls.moveBackward = false; break;
                case 'KeyA': controls.moveLeft = false; break;
                case 'KeyD': controls.moveRight = false; break;
                default: break;
            }
        },

        update() {
            const controls = state.controls;
            if (!controls.isLocked) return;

            const speed = 0.1;
            const direction = new THREE.Vector3();
            if (controls.moveForward) direction.z -= speed;
            if (controls.moveBackward) direction.z += speed;
            if (controls.moveLeft) direction.x -= speed;
            if (controls.moveRight) direction.x += speed;
            direction.applyEuler(new THREE.Euler(0, state.camera.rotation.y, 0));
            state.camera.position.add(direction);
        },
    };
}
