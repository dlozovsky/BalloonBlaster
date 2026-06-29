export const ROOM_WIDTH = 20;
export const ROOM_HEIGHT = 10;
export const ROOM_DEPTH = 20;
export const MAX_LEVEL = 10;
export const COMBO_RESET_DELAY = 2000;
export const PARTICLE_LIFETIME = 0.5;
export const SAVE_DATA_KEY = 'balloonBlasterSave';
export const SAVE_DATA_VERSION = 1;

/** @deprecated Legacy keys — migrated into SAVE_DATA_KEY on first load */
export const HIGH_SCORE_KEY = 'balloonBlasterHighScore';
export const SURVIVAL_HIGH_SCORE_KEY = 'balloonBlasterSurvivalHighScore';
export const AUDIO_ENABLED_KEY = 'balloonBlasterAudioEnabled';
export const ACHIEVEMENTS_KEY = 'balloonBlasterAchievements';
export const SURVIVAL_DURATION = 90;
export const DOUBLE_SCORE_DURATION_MS = 8000;
export const POWERUP_MIN_LEVEL = 3;
export const POWERUP_SPAWN_CHANCE = 0.05;

export const BALLOON_TYPES = {
    NORMAL: {
        color: 0xff4081,
        scale: 0.5,
        points: 1,
        baseSpeed: 0.02,
    },
    SPECIAL: {
        color: 0xffeb3b,
        scale: 0.7,
        points: 5,
        baseSpeed: 0.03,
    },
    PENALTY: {
        color: 0x000000,
        scale: 0.4,
        points: -3,
        baseSpeed: 0.04,
    },
    POWERUP: {
        color: 0x00e5ff,
        scale: 0.55,
        points: 0,
        baseSpeed: 0.025,
    },
};

export const DEFAULT_DIFFICULTY = {
    balloonCount: 10,
    specialBalloonChance: 0.2,
    penaltyBalloonChance: 0,
    balloonSpeed: 1.0,
    levelDuration: 60,
};
