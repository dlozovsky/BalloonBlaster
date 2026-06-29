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

export function calculateEarnedPoints(balloonType, basePoints, comboMultiplier) {
    if (balloonType === 'PENALTY') {
        return basePoints;
    }
    return basePoints * comboMultiplier;
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
