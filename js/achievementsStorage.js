import { ACHIEVEMENTS_KEY } from './constants.js';
import { ACHIEVEMENTS } from './achievements.js';
import { showAchievementToast } from './ui.js';

export function getUnlockedAchievements() {
    try {
        const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (!stored) {
            return new Set();
        }
        return new Set(JSON.parse(stored));
    } catch {
        return new Set();
    }
}

function saveUnlockedAchievements(unlocked) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlocked]));
}

export function unlockAchievement(achievementId) {
    const unlocked = getUnlockedAchievements();
    if (unlocked.has(achievementId) || !ACHIEVEMENTS[achievementId]) {
        return false;
    }

    unlocked.add(achievementId);
    saveUnlockedAchievements(unlocked);
    showAchievementToast(ACHIEVEMENTS[achievementId]);
    updateAchievementsDisplay();
    return true;
}

export function updateAchievementsDisplay() {
    const container = document.getElementById('achievements-list');
    if (!container) {
        return;
    }

    const unlocked = getUnlockedAchievements();
    container.innerHTML = Object.values(ACHIEVEMENTS).map((achievement) => {
        const earned = unlocked.has(achievement.id);
        return `<li class="${earned ? 'earned' : 'locked'}">${earned ? '✓' : '○'} ${achievement.name}</li>`;
    }).join('');
}

export function getAchievementProgressText() {
    const unlocked = getUnlockedAchievements();
    return `${unlocked.size}/${Object.keys(ACHIEVEMENTS).length} achievements`;
}
