import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateComboMultiplier,
    calculateEarnedPoints,
    getActiveScoreMultiplier,
    getDifficultyForLevel,
    getPointsEarnedInLevel,
    getResetComboState,
    getSurvivalDifficulty,
    getTargetScoreForLevel,
    hasMetLevelTarget,
    isNewHighScore,
    maybePromoteToPowerUp,
    nextComboState,
    pickBalloonType,
} from '../js/gameLogic.js';

test('calculateComboMultiplier caps at 4x', () => {
    assert.equal(calculateComboMultiplier(1), 1);
    assert.equal(calculateComboMultiplier(2), 2);
    assert.equal(calculateComboMultiplier(4), 4);
    assert.equal(calculateComboMultiplier(10), 4);
});

test('nextComboState builds combo within reset window', () => {
    const first = nextComboState(getResetComboState(), 1000, 2000);
    assert.deepEqual(first, { comboCount: 1, comboMultiplier: 1, lastHitTime: 1000 });

    const second = nextComboState(first, 1500, 2000);
    assert.deepEqual(second, { comboCount: 2, comboMultiplier: 2, lastHitTime: 1500 });
});

test('nextComboState resets combo after reset window', () => {
    const stale = nextComboState({ comboCount: 5, comboMultiplier: 4, lastHitTime: 1000 }, 4000, 2000);
    assert.deepEqual(stale, { comboCount: 1, comboMultiplier: 1, lastHitTime: 4000 });
});

test('calculateEarnedPoints applies combo only to non-penalty balloons', () => {
    assert.equal(calculateEarnedPoints('NORMAL', 1, 4), 4);
    assert.equal(calculateEarnedPoints('SPECIAL', 5, 3), 15);
    assert.equal(calculateEarnedPoints('PENALTY', -3, 4), -3);
    assert.equal(calculateEarnedPoints('NORMAL', 1, 2, 2), 4);
    assert.equal(calculateEarnedPoints('POWERUP', 0, 4, 2), 0);
});

test('getActiveScoreMultiplier expires after deadline', () => {
    assert.equal(getActiveScoreMultiplier(1000, 2, 2000), 2);
    assert.equal(getActiveScoreMultiplier(2500, 2, 2000), 1);
});

test('getSurvivalDifficulty ramps every 15 seconds', () => {
    assert.equal(getSurvivalDifficulty(0).balloonCount, 10);
    assert.equal(getSurvivalDifficulty(30).balloonCount, 14);
});

test('maybePromoteToPowerUp only upgrades normal balloons', () => {
    assert.equal(maybePromoteToPowerUp('NORMAL', 3, 0.01, 3, 0.05), 'POWERUP');
    assert.equal(maybePromoteToPowerUp('SPECIAL', 3, 0.01, 3, 0.05), 'SPECIAL');
    assert.equal(maybePromoteToPowerUp('NORMAL', 2, 0.01, 3, 0.05), 'NORMAL');
});

test('getDifficultyForLevel scales with level', () => {
    const level1 = getDifficultyForLevel(1);
    const level5 = getDifficultyForLevel(5);

    assert.equal(level1.balloonCount, 10);
    assert.equal(level1.penaltyBalloonChance, 0);
    assert.equal(level5.balloonCount, 18);
    assert.equal(level5.penaltyBalloonChance, 0.2);
});

test('getTargetScoreForLevel increases by 15 per level', () => {
    assert.equal(getTargetScoreForLevel(1), 15);
    assert.equal(getTargetScoreForLevel(3), 45);
});

test('level progression uses per-level points only', () => {
    const totalScore = 40;
    const levelScoreAtStart = 25;
    const pointsEarned = getPointsEarnedInLevel(totalScore, levelScoreAtStart);

    assert.equal(pointsEarned, 15);
    assert.equal(hasMetLevelTarget(pointsEarned, 15), true);
    assert.equal(hasMetLevelTarget(pointsEarned, 16), false);
});

test('isNewHighScore compares score then level', () => {
    assert.equal(isNewHighScore(100, 3, 90, 5), true);
    assert.equal(isNewHighScore(100, 3, 100, 5), false);
    assert.equal(isNewHighScore(100, 6, 100, 5), true);
    assert.equal(isNewHighScore(50, 10, 100, 5), false);
});

test('pickBalloonType respects difficulty chances', () => {
    const difficulty = getDifficultyForLevel(3);
    assert.equal(pickBalloonType(0.01, 3, difficulty), 'PENALTY');
    assert.equal(pickBalloonType(0.2, 3, difficulty), 'SPECIAL');
    assert.equal(pickBalloonType(0.9, 3, difficulty), 'NORMAL');
    assert.equal(pickBalloonType(0.01, 1, getDifficultyForLevel(1)), 'SPECIAL');
});
