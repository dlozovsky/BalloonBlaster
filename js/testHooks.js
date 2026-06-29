export function isTestModeEnabled() {
    return typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).has('test');
}

export function installTestHooks(hooks) {
    if (!isTestModeEnabled()) {
        return;
    }

    window.__bbTest = hooks;
}
