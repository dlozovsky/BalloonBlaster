import { ACHIEVEMENTS } from './achievements.js';
import { getStoredAchievements, persistAchievements } from './storage.js';
import { showAchievementToast } from './ui.js';

export function getUnlockedAchievements() {
    return getStoredAchievements();
}

export function unlockAchievement(achievementId) {
    const unlocked = getUnlockedAchievements();
    if (unlocked.has(achievementId) || !ACHIEVEMENTS[achievementId]) {
        return false;
    }

    unlocked.add(achievementId);
    persistAchievements(unlocked);
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
