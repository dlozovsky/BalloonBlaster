export const CONFIG = {
    gameTitle: 'Balloon Blaster',
    shareUrl: 'https://github.com/dlozovsky/BalloonBlaster',
    shareTitle: 'My Balloon Blaster Score',
    audioEnabled: true,
    showFPS: false,
    debugMode: false,
    reducedMotion: false,
};

if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
