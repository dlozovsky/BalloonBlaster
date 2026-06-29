import { state } from './state.js';
import { persistAudioPreference } from './storage.js';
import { debugLog } from './utils.js';
import { updateMuteButton } from './ui.js';

function createLaserSound(audioContext) {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);
    const startFreq = 880;
    const endFreq = 220;

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = i / numSamples;
        const freq = startFreq - (startFreq - endFreq) * progress;
        const amplitude = 0.5 * (1 - progress);
        channelData[i] = amplitude * Math.sin(2 * Math.PI * freq * t);
    }

    return buffer;
}

function createPopSound(audioContext) {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.2;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = i / numSamples;
        let amplitude;
        if (progress < 0.1) {
            amplitude = progress * 10;
        } else {
            amplitude = 1 - ((progress - 0.1) / 0.9);
        }
        const freq = 300 + 200 * (1 - progress);
        channelData[i] = amplitude * Math.sin(2 * Math.PI * freq * t);
    }

    return buffer;
}

function createSpecialPopSound(audioContext) {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.4;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const progress = i / numSamples;
        let amplitude;
        if (progress < 0.05) {
            amplitude = progress * 20;
        } else {
            amplitude = 1 - ((progress - 0.05) / 0.95);
        }

        channelData[i] = amplitude * (
            0.6 * Math.sin(2 * Math.PI * 440 * t) +
            0.3 * Math.sin(2 * Math.PI * 660 * t) +
            0.1 * Math.sin(2 * Math.PI * 880 * t)
        );
    }

    return buffer;
}

function createBackgroundMusic(audioContext) {
    const sampleRate = audioContext.sampleRate;
    const duration = 10;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);
    const chords = [
        [220, 277.18, 329.63],
        [246.94, 311.13, 370],
        [261.63, 329.63, 392],
        [220, 277.18, 329.63],
    ];
    const samplesPerChord = numSamples / chords.length;

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const chordIndex = Math.floor(i / samplesPerChord);
        const chord = chords[chordIndex];
        const chordProgress = (i % samplesPerChord) / samplesPerChord;
        let amplitude;
        if (chordProgress < 0.1) {
            amplitude = chordProgress * 10;
        } else if (chordProgress > 0.9) {
            amplitude = 1 - ((chordProgress - 0.9) * 10);
        }

        let sample = 0;
        for (let j = 0; j < chord.length; j++) {
            sample += Math.sin(2 * Math.PI * chord[j] * t) / chord.length;
        }

        channelData[i] = amplitude * sample;
    }

    return buffer;
}

export function setupAudio() {
    state.listener = new THREE.AudioListener();
    state.camera.add(state.listener);

    state.shootSound = new THREE.Audio(state.listener);
    state.popSound = new THREE.Audio(state.listener);
    state.specialPopSound = new THREE.Audio(state.listener);
    state.bgMusic = new THREE.Audio(state.listener);

    const audioContext = state.listener.context;
    state.shootSound.setBuffer(createLaserSound(audioContext));
    state.shootSound.setVolume(0.5);
    state.popSound.setBuffer(createPopSound(audioContext));
    state.popSound.setVolume(0.5);
    state.specialPopSound.setBuffer(createSpecialPopSound(audioContext));
    state.specialPopSound.setVolume(0.7);
    state.bgMusic.setBuffer(createBackgroundMusic(audioContext));
    state.bgMusic.setLoop(true);
    state.bgMusic.setVolume(0.3);

    applyAudioState();
    debugLog('Audio setup complete');
}

export function applyAudioState() {
    if (!state.shootSound) {
        return;
    }

    const sfxVolume = state.audioEnabled ? 1 : 0;
    state.shootSound.setVolume(0.5 * sfxVolume);
    state.popSound.setVolume(0.5 * sfxVolume);
    state.specialPopSound.setVolume(0.7 * sfxVolume);
    state.bgMusic.setVolume(0.3 * sfxVolume);

    if (!state.audioEnabled && state.bgMusic.isPlaying) {
        state.bgMusic.stop();
    }

    updateMuteButton();
}

export function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    persistAudioPreference(state.audioEnabled);
    applyAudioState();
}

export function playSound(sound) {
    if (!state.audioEnabled || !sound?.buffer) {
        return;
    }
    sound.play();
}

export function playBackgroundMusic() {
    if (!state.audioEnabled || !state.bgMusic?.buffer || state.bgMusic.isPlaying) {
        return;
    }
    state.bgMusic.play();
}

export function playPenaltySound() {
    if (!state.audioEnabled || !state.shootSound?.buffer) {
        return;
    }
    const penaltySound = state.shootSound.clone();
    penaltySound.setVolume(0.5);
    penaltySound.setPlaybackRate(0.5);
    penaltySound.play();
}

export function stopBackgroundMusic() {
    if (state.bgMusic?.isPlaying) {
        state.bgMusic.stop();
    }
}
