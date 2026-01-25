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

// Helper for new sounds (optional reuse)
const playTone = (freq, type, duration, vol = 0.1, dom = 0) => {
    try {
        const ctx = getContext();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        // 🔹 Cleanup after sound finishes (prevents memory leaks)
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };

        osc.start(ctx.currentTime + dom);
        osc.stop(ctx.currentTime + duration + dom);

    } catch (e) {
        console.error("Audio error", e);
    }
};

export const playMessageSentSound = () => {
    // "Pop" sound: High sine wave, short decay
    playTone(2000, 'sine', 0.1, 0.8);
};

export const playMessageReceivedSound = () => {
    // "Ding" sound: Two tones
    playTone(800, 'sine', 0.15, 0.1);
    playTone(1200, 'sine', 0.3, 0.05, 0.05); // Delayed high note
};

// Mood submit sounds
export const playSuccessSound = () => {
    playTone(1318.51, 'sine', 0.4, 0.8);
};

export const playErrorSound = () => {
    playTone(150, 'sawtooth', 0.2, 0.6);
};


