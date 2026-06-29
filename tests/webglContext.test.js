import test from 'node:test';
import assert from 'node:assert/strict';
import {
    handleWebGLContextLost,
    handleWebGLContextRestored,
    resetWebGLContextHandlersForTests,
} from '../js/webglContext.js';
import { state, createInitialState } from '../js/state.js';

test('handleWebGLContextLost pauses active gameplay and flags context loss', () => {
    Object.assign(state, createInitialState(), {
        gameActive: true,
        gamePaused: false,
        levelTimer: setInterval(() => {}, 10_000),
        levelEndAt: Date.now() + 30_000,
    });

    handleWebGLContextLost();

    assert.equal(state.webglContextLost, true);
    assert.equal(state.gamePaused, true);
    assert.equal(state.levelTimer, null);
    assert.equal(state.levelEndAt, null);

    resetWebGLContextHandlersForTests();
});

test('handleWebGLContextLost is a no-op when the game is idle', () => {
    Object.assign(state, createInitialState(), {
        gameActive: false,
        gamePaused: false,
    });

    handleWebGLContextLost();

    assert.equal(state.webglContextLost, true);
    assert.equal(state.gamePaused, false);

    resetWebGLContextHandlersForTests();
});

test('handleWebGLContextRestored clears flag and runs resize callback', () => {
    state.webglContextLost = true;
    let resized = false;

    handleWebGLContextRestored(() => {
        resized = true;
    });

    assert.equal(state.webglContextLost, false);
    assert.equal(resized, true);

    resetWebGLContextHandlersForTests();
});
