/**
 * Sound utilities for Giải Mã Bức Tranh game
 * Uses sounds from King project
 */


// Đường dẫn âm thanh - sử dụng đường dẫn tuyệt đối từ gốc
const SOUND_PATHS = {
    correct: '/king_game/music/am-thanh-tra-loi-dung.mp3',
    wrong: '/king_game/music/am-thanh-tra-loi-sai.mp3',
    victory: '/king_game/music/am-thanh-duoc-chon.mp3',
};

// Cache các Audio object để tái sử dụng
const audioCache: { [key: string]: HTMLAudioElement } = {};

// AudioContext cho âm thanh tự tạo (hover/click)
let audioContext: AudioContext | null = null;

// Hàm tạo âm thanh nhẹ nhàng (Click/Hover)
const playGentleClick = () => {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Resume context if suspended (browser requirements)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Cấu hình âm thanh: Sine wave, tần số cao nhẹ nhàng
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);

        // Hiệu ứng fade-out nhanh để tạo tiếng "bip" nhẹ
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime); // Âm lượng nhỏ (0.15)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.error('Web Audio API error:', e);
    }
};

/**
 * Phát âm thanh
 * @param soundKey - Loại âm thanh: 'click' | 'correct' | 'wrong' | 'hover' | 'victory'
 */
export const playSound = (soundKey: 'click' | 'correct' | 'wrong' | 'hover' | 'victory'): void => {
    try {
        // Nếu là click hoặc hover => Dùng âm thanh tự tạo
        if (soundKey === 'click' || soundKey === 'hover') {
            playGentleClick();
            return;
        }

        const path = (SOUND_PATHS as any)[soundKey];
        if (!path) return;

        // Tạo hoặc lấy từ cache truyền thống cho file mp3
        if (!audioCache[soundKey]) {
            audioCache[soundKey] = new Audio(path);
        }

        const audio = audioCache[soundKey];
        audio.currentTime = 0;
        audio.volume = 0.5;

        audio.play().catch((err) => {
            console.log('Sound play blocked:', err.message);
        });
    } catch (error) {
        console.log('Sound error:', error);
    }
};

/**
 * Preload sounds (cho các file mp3)
 */
export const preloadSounds = (): void => {
    Object.keys(SOUND_PATHS).forEach((key) => {
        const soundKey = key as 'correct' | 'wrong' | 'victory';
        const path = (SOUND_PATHS as any)[soundKey];
        if (!audioCache[soundKey]) {
            audioCache[soundKey] = new Audio(path);
            audioCache[soundKey].load();
        }
    });
};
