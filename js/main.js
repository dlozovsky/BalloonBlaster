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

function bindActionButton(element, handler) {
    if (!element) {
        return;
    }

    let lastInvokeAt = 0;

    const invoke = (event) => {
        const now = Date.now();
        if (now - lastInvokeAt < 400) {
            event.preventDefault();
            return;
        }
        lastInvokeAt = now;
        event.preventDefault();
        event.stopPropagation();
        handler(event);
    };

    element.addEventListener('click', invoke);
    element.addEventListener('touchend', invoke, { passive: false });
}

function bindUiControls() {
    bindActionButton(document.getElementById('start-button'), startGame);
    bindActionButton(document.getElementById('restart-button'), restartGame);
    bindActionButton(document.getElementById('resume-button'), resumeGame);
    bindActionButton(document.getElementById('pause-quit-button'), quitGame);
    bindActionButton(document.getElementById('mute-button'), toggleAudio);
    bindActionButton(document.getElementById('mobile-pause-button'), pauseGame);
    bindActionButton(document.getElementById('share-button'), shareScore);
    bindActionButton(document.getElementById('download-card-button'), downloadScoreCard);
}

bindUiControls();
window.addEventListener('load', bootstrap);
