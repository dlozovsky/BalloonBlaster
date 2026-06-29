import { MAX_LEVEL } from './constants.js';

export function calculateComboMultiplier(comboCount) {
    return Math.min(comboCount, 4);
}

export function nextComboState(comboState, now, comboResetDelay) {
    if (now - comboState.lastHitTime < comboResetDelay) {
        const comboCount = comboState.comboCount + 1;
        return {
            comboCount,
            comboMultiplier: calculateComboMultiplier(comboCount),
            lastHitTime: now,
        };
    }

    return {
        comboCount: 1,
        comboMultiplier: 1,
        lastHitTime: now,
    };
}

export function getResetComboState() {
    return {
        comboCount: 0,
        comboMultiplier: 1,
        lastHitTime: 0,
    };
}

export function getActiveScoreMultiplier(now, multiplier, expiresAt) {
    return expiresAt > now ? multiplier : 1;
}

export function calculateEarnedPoints(balloonType, basePoints, comboMultiplier, scoreMultiplier = 1) {
    if (balloonType === 'PENALTY' || balloonType === 'POWERUP') {
        return basePoints;
    }
    return basePoints * comboMultiplier * scoreMultiplier;
}

export function getDifficultyForLevel(level) {
    return {
        balloonCount: Math.min(10 + (level - 1) * 2, 30),
        specialBalloonChance: Math.min(0.2 + (level - 1) * 0.03, 0.5),
        penaltyBalloonChance: level >= 2 ? Math.min((level - 1) * 0.05, 0.3) : 0,
        balloonSpeed: 1.0 + (level - 1) * 0.15,
        levelDuration: 60,
    };
}

export function getSurvivalDifficulty(elapsedSeconds) {
    const tier = Math.floor(elapsedSeconds / 15) + 1;
    return getDifficultyForLevel(Math.min(tier, MAX_LEVEL));
}

export function getTargetScoreForLevel(level) {
    return level * 15;
}

export function getPointsEarnedInLevel(totalScore, levelScoreAtStart) {
    return totalScore - levelScoreAtStart;
}

export function hasMetLevelTarget(pointsEarnedInLevel, targetScore) {
    return pointsEarnedInLevel >= targetScore;
}

export function isNewHighScore(score, level, bestScore, bestLevel) {
    return score > bestScore || (score === bestScore && level > bestLevel);
}

export function pickBalloonType(randomValue, level, difficultyParams) {
    if (level >= 2 && randomValue < difficultyParams.penaltyBalloonChance) {
        return 'PENALTY';
    }
    if (randomValue < difficultyParams.specialBalloonChance) {
        return 'SPECIAL';
    }
    return 'NORMAL';
}

export function maybePromoteToPowerUp(type, level, randomValue, minLevel, chance) {
    if (type === 'NORMAL' && level >= minLevel && randomValue < chance) {
        return 'POWERUP';
    }
    return type;
}

export function createTimerDeadline(nowMs, secondsRemaining) {
    return nowMs + secondsRemaining * 1000;
}

export function computeTimeRemaining(endAtMs, nowMs) {
    return Math.max(0, Math.ceil((endAtMs - nowMs) / 1000));
}
