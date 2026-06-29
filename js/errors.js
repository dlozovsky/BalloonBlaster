let retryHandler = null;

export function showFatalError(message, details = '') {
    const screen = document.getElementById('fatal-error-screen');
    const messageEl = document.getElementById('fatal-error-message');
    const detailsEl = document.getElementById('fatal-error-details');

    if (!screen || !messageEl) {
        return;
    }

    messageEl.textContent = message;
    if (detailsEl) {
        detailsEl.textContent = details;
        detailsEl.style.display = details ? 'block' : 'none';
    }

    screen.classList.remove('hidden');
    document.getElementById('ui-container')?.classList.add('hidden');
}

export function hideFatalError() {
    document.getElementById('fatal-error-screen')?.classList.add('hidden');
    document.getElementById('ui-container')?.classList.remove('hidden');
}

export function setFatalErrorRetryHandler(handler) {
    retryHandler = handler;
}

export function setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error ?? event.message);
        showFatalError(
            'Something went wrong while running the game.',
            event.error?.message || event.message || 'Unknown error',
        );
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event.reason);
        const message = event.reason instanceof Error
            ? event.reason.message
            : String(event.reason);
        showFatalError('Something went wrong while running the game.', message);
    });

    document.getElementById('fatal-error-retry')?.addEventListener('click', () => {
        hideFatalError();
        retryHandler?.();
    });
}
