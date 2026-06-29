import test from 'node:test';
import assert from 'node:assert/strict';
import {
    TOUCH_TAP_THRESHOLD_PX,
    clampPitch,
    computeAimRotation,
    isTapGesture,
} from '../js/touch.js';

test('clampPitch limits vertical look to ±90 degrees', () => {
    assert.equal(clampPitch(0), 0);
    assert.equal(clampPitch(Math.PI / 2), Math.PI / 2);
    assert.equal(clampPitch(-Math.PI / 2), -Math.PI / 2);
    assert.equal(clampPitch(Math.PI), Math.PI / 2);
    assert.equal(clampPitch(-Math.PI), -Math.PI / 2);
});

test('computeAimRotation applies drag deltas with pitch clamping', () => {
    const rotation = { x: 0, y: 0.5 };
    const next = computeAimRotation(rotation, 100, 50);

    assert.equal(next.y, 0.5 - 100 * 0.004);
    assert.equal(next.x, -50 * 0.004);
});

test('computeAimRotation clamps pitch when dragging past limits', () => {
    const rotation = { x: Math.PI / 2 - 0.01, y: 0 };
    const next = computeAimRotation(rotation, 0, -500);

    assert.equal(next.x, Math.PI / 2);
    assert.equal(next.y, 0);
});

test('isTapGesture treats small movement as a tap', () => {
    assert.equal(isTapGesture(0), true);
    assert.equal(isTapGesture(TOUCH_TAP_THRESHOLD_PX - 1), true);
    assert.equal(isTapGesture(TOUCH_TAP_THRESHOLD_PX), false);
    assert.equal(isTapGesture(TOUCH_TAP_THRESHOLD_PX + 5), false);
});
