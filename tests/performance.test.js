import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAverageFrameMs, isFrameBudgetHealthy } from '../js/performance.js';

test('computeAverageFrameMs returns zero when no samples exist', () => {
    assert.equal(computeAverageFrameMs(0, 0), 0);
    assert.equal(computeAverageFrameMs(120, 0), 0);
});

test('computeAverageFrameMs averages accumulated frame time', () => {
    assert.equal(computeAverageFrameMs(300, 3), 100);
});

test('isFrameBudgetHealthy enforces a maximum average frame time', () => {
    assert.equal(isFrameBudgetHealthy(16.6, 100), true);
    assert.equal(isFrameBudgetHealthy(120, 100), false);
    assert.equal(isFrameBudgetHealthy(0, 100), false);
});
