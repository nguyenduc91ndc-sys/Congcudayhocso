// Web Audio API Sound Effects
// No external files needed — all sounds generated programmatically

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    delay: number = 0
): void {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
}

/** Tick-tock sound (clock movement) */
export function playTick(): void {
    playTone(800, 0.05, 'square', 0.08);
}

/** Clear per-second timer beep */
export function playSecondBeep(): void {
    playTone(920, 0.045, 'triangle', 0.11);
}

/** Timer completion alert */
export function playTimerFinish(): void {
    playTone(660, 0.16, 'sine', 0.24, 0);
    playTone(880, 0.16, 'sine', 0.24, 0.16);
    playTone(1108, 0.22, 'sine', 0.22, 0.32);
    playTone(523, 0.42, 'triangle', 0.16, 0.58);
}

/** Click UI feedback */
export function playClick(): void {
    playTone(600, 0.08, 'sine', 0.15);
}

/** Correct answer — ascending two-note chime */
export function playCorrect(): void {
    playTone(523, 0.15, 'sine', 0.25, 0);      // C5
    playTone(659, 0.2, 'sine', 0.25, 0.12);     // E5
    playTone(784, 0.3, 'sine', 0.2, 0.24);      // G5
}

/** Wrong answer — low buzz */
export function playWrong(): void {
    playTone(200, 0.15, 'sawtooth', 0.12, 0);
    playTone(180, 0.2, 'sawtooth', 0.1, 0.1);
}

/** Celebration fanfare — short victorious melody */
export function playFanfare(): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        playTone(freq, 0.25, 'sine', 0.2, i * 0.15);
    });
    // Add sparkle on top
    playTone(1568, 0.4, 'sine', 0.1, 0.6);  // G6
    playTone(2093, 0.5, 'sine', 0.08, 0.75); // C7
}

/** Level up / transition sound */
export function playLevelUp(): void {
    playTone(440, 0.1, 'sine', 0.2, 0);
    playTone(554, 0.1, 'sine', 0.2, 0.1);
    playTone(659, 0.15, 'sine', 0.2, 0.2);
    playTone(880, 0.3, 'sine', 0.25, 0.3);
}

/** Whoosh sound for transitions */
export function playWhoosh(): void {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
}
