/**
 * Web Audio API helper to play UI sounds without external assets
 */

let audioCtx = null;

const getContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
};

export const playSuccessSound = () => {
    try {
        const ctx = getContext();

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        // "Coin" / Success Chime: B5 -> E6
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(987.77, now); // B5
        oscillator.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6

        // Envelope: Attack -> Decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.05); // increased volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4); // decay

        oscillator.start(now);
        oscillator.stop(now + 0.4);

    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

export const playErrorSound = () => {
    try {
        const ctx = getContext();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        // Error "Bonk": Low Sawtooth
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.linearRampToValueAtTime(100, now + 0.2); // Pitch drop

        // Envelope
        gainNode.gain.setValueAtTime(0.6, now); // increased volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

    } catch (e) {
        console.error("Audio playback failed", e);
    }
};
