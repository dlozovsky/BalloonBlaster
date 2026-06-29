export function computeAverageFrameMs(frameTimeTotal, frameTimeSamples) {
    if (frameTimeSamples <= 0) {
        return 0;
    }
    return frameTimeTotal / frameTimeSamples;
}

export function isFrameBudgetHealthy(avgFrameMs, maxFrameMs = 100) {
    return avgFrameMs > 0 && avgFrameMs <= maxFrameMs;
}
