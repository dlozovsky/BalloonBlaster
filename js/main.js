import { initGame, pauseGame, quitGame, restartGame, resumeGame, startGame } from './gameController.js';
import { toggleAudio } from './audio.js';
import { hideFatalError, setFatalErrorRetryHandler, setupGlobalErrorHandlers, showFatalError } from './errors.js';
import { teardownAll } from './lifecycle.js';
import { initMenuState } from './menuState.js';
import { downloadScoreCard, shareScore } from './ui.js';

document.body.classList.add('menu-open');

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

let actionLockUntil = 0;

function runLockedAction(handler) {
    const now = Date.now();
    if (now < actionLockUntil) {
        return;
    }
    actionLockUntil = now + 500;
    handler();
}

function bindActionButton(element, handler) {
    if (!element) {
        return;
    }

    const invoke = (event) => {
        event.preventDefault();
        event.stopPropagation();
        runLockedAction(() => handler(event));
    };

    element.addEventListener('pointerup', invoke);
    element.addEventListener('click', invoke);
}

function bindUiControls() {
    const start = () => runLockedAction(startGame);
    window.__bbStartGame = start;

    bindActionButton(document.getElementById('start-button'), startGame);
    bindActionButton(document.getElementById('restart-button'), restartGame);
    bindActionButton(document.getElementById('resume-button'), resumeGame);
    bindActionButton(document.getElementById('pause-quit-button'), quitGame);
    bindActionButton(document.getElementById('mute-button'), toggleAudio);
    bindActionButton(document.getElementById('mobile-pause-button'), pauseGame);
    bindActionButton(document.getElementById('share-button'), shareScore);
    bindActionButton(document.getElementById('download-card-button'), downloadScoreCard);

    const startScreen = document.getElementById('start-screen');
    startScreen?.addEventListener('pointerup', (event) => {
        const button = event.target.closest('#start-button');
        if (!button) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        runLockedAction(startGame);
    }, true);
}

bindUiControls();
initMenuState();
window.addEventListener('load', bootstrap);
