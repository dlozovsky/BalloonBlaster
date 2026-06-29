import test from 'node:test';
import assert from 'node:assert/strict';
import {
    computeTimeRemaining,
    createTimerDeadline,
} from '../js/gameLogic.js';
import {
    ACHIEVEMENTS_KEY,
    AUDIO_ENABLED_KEY,
    HIGH_SCORE_KEY,
    SAVE_DATA_KEY,
    SAVE_DATA_VERSION,
    SURVIVAL_HIGH_SCORE_KEY,
} from '../js/constants.js';
import {
    loadSaveData,
    migrateLegacyStorage,
    persistSaveData,
} from '../js/storage.js';

test('createTimerDeadline and computeTimeRemaining stay accurate across elapsed time', () => {
    const deadline = createTimerDeadline(1_000, 60);
    assert.equal(computeTimeRemaining(deadline, 1_000), 60);
    assert.equal(computeTimeRemaining(deadline, 31_500), 30);
    assert.equal(computeTimeRemaining(deadline, 61_000), 0);
});

test('computeTimeRemaining never returns negative values', () => {
    const deadline = createTimerDeadline(5_000, 10);
    assert.equal(computeTimeRemaining(deadline, 20_000), 0);
});

test('migrateLegacyStorage reads separate legacy keys', () => {
    const legacy = {
        [HIGH_SCORE_KEY]: JSON.stringify({ bestScore: 120, bestLevel: 4 }),
        [SURVIVAL_HIGH_SCORE_KEY]: '88',
        [AUDIO_ENABLED_KEY]: 'false',
        [ACHIEVEMENTS_KEY]: JSON.stringify(['first_pop', 'combo_master']),
    };

    const migrated = migrateLegacyStorage((key) => legacy[key] ?? null);
    assert.equal(migrated.version, SAVE_DATA_VERSION);
    assert.deepEqual(migrated.arcadeHighScore, { bestScore: 120, bestLevel: 4 });
    assert.equal(migrated.survivalHighScore, 88);
    assert.equal(migrated.audioEnabled, false);
    assert.deepEqual(migrated.achievements, ['first_pop', 'combo_master']);
});

test('loadSaveData prefers versioned blob over legacy keys', () => {
    const store = {
        [SAVE_DATA_KEY]: JSON.stringify({
            version: SAVE_DATA_VERSION,
            arcadeHighScore: { bestScore: 200, bestLevel: 7 },
            survivalHighScore: 150,
            audioEnabled: true,
            achievements: ['champion'],
        }),
        [HIGH_SCORE_KEY]: JSON.stringify({ bestScore: 1, bestLevel: 1 }),
    };

    const loaded = loadSaveData((key) => store[key] ?? null);
    assert.deepEqual(loaded.arcadeHighScore, { bestScore: 200, bestLevel: 7 });
    assert.equal(loaded.survivalHighScore, 150);
    assert.deepEqual(loaded.achievements, ['champion']);
});

test('persistSaveData normalizes invalid fields', () => {
    const written = {};
    const normalized = persistSaveData({
        version: 999,
        arcadeHighScore: { bestScore: '42', bestLevel: '3' },
        survivalHighScore: '17',
        audioEnabled: false,
        achievements: ['first_pop', 123, null],
    }, (key, value) => {
        written[key] = value;
    });

    assert.equal(normalized.version, SAVE_DATA_VERSION);
    assert.deepEqual(normalized.arcadeHighScore, { bestScore: 42, bestLevel: 3 });
    assert.equal(normalized.survivalHighScore, 17);
    assert.deepEqual(normalized.achievements, ['first_pop']);
    assert.ok(written[SAVE_DATA_KEY]);
});
