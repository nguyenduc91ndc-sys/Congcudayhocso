/**
 * Utility để phát âm thanh trong ứng dụng
 * Sử dụng cả file MP3 bên ngoài và Web Audio API để tạo âm thanh tổng hợp
 */

// Audio Context singleton
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

// ============ HỆ THỐNG PHÁT ÂM THANH TỪ FILE MP3 ============

// Cache các Audio objects để tối ưu hiệu suất
const audioCache: { [key: string]: HTMLAudioElement } = {};

/**
 * Tạo hoặc lấy Audio element từ cache
 */
const getAudioElement = (src: string): HTMLAudioElement => {
    if (!audioCache[src]) {
        audioCache[src] = new Audio(src);
        audioCache[src].preload = 'auto';
    }
    return audioCache[src];
};

/**
 * Phát âm thanh từ file MP3
 * @param src - Đường dẫn đến file âm thanh
 * @param volume - Âm lượng (0.0 - 1.0), mặc định 1.0
 */
export const playExternalSound = (src: string, volume: number = 1.0): void => {
    try {
        const audio = getAudioElement(src);
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.currentTime = 0; // Reset về đầu để có thể phát lại
        audio.play().catch(e => {
            console.warn('Could not play external sound:', e);
        });
    } catch (e) {
        console.warn('Error playing external sound:', e);
    }
};

// Đường dẫn các file âm thanh
const SOUND_PATHS = {
    victory: '/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3',
    incorrect: '/sounds/Am_thanh_tra_loi_sai-www_tiengdong_com.mp3',
};

// Pre-load các file âm thanh khi module được import
if (typeof window !== 'undefined') {
    Object.values(SOUND_PATHS).forEach(path => {
        getAudioElement(path);
    });
}

/**
 * Phát âm thanh "Đúng rồi!" - tone vui vẻ, cao dần
 */
export const playCorrectSound = (): void => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Tạo oscillator cho giai điệu vui
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (hợp âm C major)

        frequencies.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            // Envelope: attack nhanh, decay mượt
            gainNode.gain.setValueAtTime(0, now + i * 0.1);
            gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);

            oscillator.start(now + i * 0.1);
            oscillator.stop(now + i * 0.1 + 0.5);
        });

        // Thêm một note cao cuối cùng để kết thúc
        const finalOsc = ctx.createOscillator();
        const finalGain = ctx.createGain();
        finalOsc.connect(finalGain);
        finalGain.connect(ctx.destination);
        finalOsc.type = 'sine';
        finalOsc.frequency.value = 1046.5; // C6
        finalGain.gain.setValueAtTime(0, now + 0.35);
        finalGain.gain.linearRampToValueAtTime(0.25, now + 0.4);
        finalGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        finalOsc.start(now + 0.35);
        finalOsc.stop(now + 0.9);

    } catch (e) {
        console.warn('Could not play correct sound:', e);
    }
};

/**
 * Phát âm thanh "Sai rồi!" - sử dụng file MP3 bên ngoài
 */
export const playIncorrectSound = (): void => {
    playExternalSound(SOUND_PATHS.incorrect, 0.8);
};

/**
 * Phát âm thanh thông báo (ding nhẹ)
 */
export const playNotificationSound = (): void => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 880; // A5

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.4);

    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
};

/**
 * Phát âm thanh "Phải xem lại!" - tone thất bại mạnh hơn, như buzzer
 */
export const playMustRewatchSound = (): void => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Âm thanh buzzer thất bại - 3 note xuống dần
        const frequencies = [392, 311.13, 233.08]; // G4, Eb4, Bb3

        frequencies.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sawtooth'; // Âm thanh "cứng" hơn
            oscillator.frequency.value = freq;

            const start = now + i * 0.15;
            gainNode.gain.setValueAtTime(0, start);
            gainNode.gain.linearRampToValueAtTime(0.25, start + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.01, start + 0.3);

            oscillator.start(start);
            oscillator.stop(start + 0.35);
        });

        // Thêm âm "buzz" cuối
        const buzzOsc = ctx.createOscillator();
        const buzzGain = ctx.createGain();
        buzzOsc.connect(buzzGain);
        buzzGain.connect(ctx.destination);
        buzzOsc.type = 'square';
        buzzOsc.frequency.value = 150; // Âm trầm
        buzzGain.gain.setValueAtTime(0, now + 0.5);
        buzzGain.gain.linearRampToValueAtTime(0.15, now + 0.55);
        buzzGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        buzzOsc.start(now + 0.5);
        buzzOsc.stop(now + 1);

    } catch (e) {
        console.warn('Could not play must rewatch sound:', e);
    }
};

/**
 * Phát âm thanh chiến thắng hoành tráng - sử dụng file MP3 bên ngoài
 */
export const playVictorySound = (): void => {
    playExternalSound(SOUND_PATHS.victory, 1.0);
};

/**
 * [LEGACY] Phát âm thanh chiến thắng bằng Web Audio API (backup)
 */
export const playVictorySoundSynthesized = (): void => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Fanfare chiến thắng - C E G C (cao) E G
        const fanfare = [
            { freq: 523.25, time: 0, duration: 0.15 },     // C5
            { freq: 659.25, time: 0.15, duration: 0.15 },  // E5
            { freq: 783.99, time: 0.3, duration: 0.15 },   // G5
            { freq: 1046.5, time: 0.45, duration: 0.3 },   // C6 (giữ lâu hơn)
            { freq: 1318.5, time: 0.75, duration: 0.15 },  // E6
            { freq: 1567.98, time: 0.9, duration: 0.4 },   // G6 (kết thúc)
        ];

        fanfare.forEach(({ freq, time, duration }) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0, now + time);
            gainNode.gain.linearRampToValueAtTime(0.35, now + time + 0.03);
            gainNode.gain.setValueAtTime(0.35, now + time + duration * 0.7);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

            oscillator.start(now + time);
            oscillator.stop(now + time + duration + 0.1);
        });

        // Thêm note hòa âm (harmony)
        const harmony = [
            { freq: 392, time: 0.45, duration: 0.3 },   // G4 (harmony cho C6)
            { freq: 523.25, time: 0.75, duration: 0.15 }, // C5 (harmony cho E6)
            { freq: 783.99, time: 0.9, duration: 0.4 },   // G5 (harmony cho G6)
        ];

        harmony.forEach(({ freq, time, duration }) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'triangle';
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0, now + time);
            gainNode.gain.linearRampToValueAtTime(0.15, now + time + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

            oscillator.start(now + time);
            oscillator.stop(now + time + duration + 0.1);
        });

    } catch (e) {
        console.warn('Could not play victory sound:', e);
    }
};
/**
 * Phát âm thanh hover (tick nhẹ)
 */
export const playHoverSound = (): void => {
    try {
        const ctx = getAudioContext();

        // Resume context nếu bị suspended (do autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }

        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Sound characteristics for a "tick"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now); // Tần số cao hơn chút
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.05);

        // Volume envelope - tăng âm lượng để nghe rõ hơn
        gainNode.gain.setValueAtTime(0.15, now); // Volume rõ hơn
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);
    } catch (e) {
        // Ignore errors
    }
};
