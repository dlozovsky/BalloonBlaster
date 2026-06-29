import { initGame, pauseGame, quitGame, restartGame, resumeGame, startGame } from './gameController.js';
import { toggleAudio } from './audio.js';
import { hideFatalError, setFatalErrorRetryHandler, setupGlobalErrorHandlers, showFatalError } from './errors.js';
import { teardownAll } from './lifecycle.js';
import { downloadScoreCard, shareScore } from './ui.js';

function bootstrap() {
    try {
        hideFatalError();
        initGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showFatalError(
            'Unable to start Balloon Blaster.',
            error instanceof Error ? error.message : 'Unknown initialization error',
        );
    }
}

setFatalErrorRetryHandler(() => {
    teardownAll();
    bootstrap();
});

setupGlobalErrorHandlers();
window.addEventListener('beforeunload', teardownAll);

function bindUiControls() {
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('resume-button').addEventListener('click', resumeGame);
    document.getElementById('pause-quit-button').addEventListener('click', quitGame);
    document.getElementById('mute-button').addEventListener('click', toggleAudio);
    document.getElementById('mobile-pause-button').addEventListener('click', pauseGame);
    document.getElementById('share-button').addEventListener('click', shareScore);
    document.getElementById('download-card-button').addEventListener('click', downloadScoreCard);
}

bindUiControls();
window.addEventListener('load', bootstrap);
