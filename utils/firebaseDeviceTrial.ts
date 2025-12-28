/**
 * Firebase Device Trial Tracking
 * Lưu device ID và lượt sử dụng vào Firebase - không thể hack bằng xóa localStorage
 */
import { database } from './firebaseConfig';
import { ref, get, set, runTransaction } from 'firebase/database';

const DEVICE_TRIALS_REF = 'deviceTrials';

export interface DeviceTrialInfo {
    deviceId: string;
    videoPlays: number;      // Lượt dùng Video tương tác (max 3)
    beeGamePlays: number;    // Lượt dùng Ong về tổ (max 5)
    emails: string[];        // Danh sách email đã dùng
    lastUsed: string;
    createdAt: string;
    isPro: boolean;          // Nếu 1 trong các email là Pro
}

/**
 * Tạo device fingerprint mạnh
 */
export const generateStrongDeviceId = (): string => {
    const nav = window.navigator;
    const screen = window.screen;

    const fingerprint = [
        nav.userAgent,
        nav.language,
        nav.languages?.join(',') || '',
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        screen.availWidth + 'x' + screen.availHeight,
        new Date().getTimezoneOffset(),
        nav.hardwareConcurrency || 'unknown',
        (nav as any).deviceMemory || 'unknown',
        nav.platform || 'unknown',
        nav.maxTouchPoints || 0,
        // Canvas fingerprint
        getCanvasFingerprint(),
    ].join('|');

    // Strong hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return 'fdev_' + Math.abs(hash).toString(16);
};

/**
 * Canvas fingerprint - unique per device
 */
const getCanvasFingerprint = (): string => {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint 🎨', 2, 2);

        return canvas.toDataURL().slice(-50);
    } catch {
        return 'canvas-error';
    }
};

/**
 * Lấy hoặc tạo device ID (cache trong localStorage, sync với Firebase)
 */
export const getOrCreateDeviceId = (): string => {
    const cached = localStorage.getItem('ntd_firebase_device_id');
    if (cached) return cached;

    const newId = generateStrongDeviceId();
    localStorage.setItem('ntd_firebase_device_id', newId);
    return newId;
};

/**
 * Lấy thông tin trial của device từ Firebase
 */
export const getDeviceTrialFromFirebase = async (deviceId: string): Promise<DeviceTrialInfo | null> => {
    try {
        const deviceRef = ref(database, `${DEVICE_TRIALS_REF}/${deviceId}`);
        const snapshot = await get(deviceRef);

        if (snapshot.exists()) {
            return snapshot.val() as DeviceTrialInfo;
        }
        return null;
    } catch (error) {
        console.error('Error getting device trial from Firebase:', error);
        return null;
    }
};

/**
 * Kiểm tra device có thể dùng Video trial (max 3)
 */
export const canUseVideoTrialByDevice = async (email: string): Promise<boolean> => {
    const deviceId = getOrCreateDeviceId();
    const deviceInfo = await getDeviceTrialFromFirebase(deviceId);

    if (!deviceInfo) return true; // Device mới
    if (deviceInfo.isPro) return true; // Đã Pro

    return deviceInfo.videoPlays < 3;
};

/**
 * Kiểm tra device có thể dùng BeeGame trial (max 5)
 */
export const canUseBeeGameTrialByDevice = async (email: string): Promise<boolean> => {
    const deviceId = getOrCreateDeviceId();
    const deviceInfo = await getDeviceTrialFromFirebase(deviceId);

    if (!deviceInfo) return true; // Device mới
    if (deviceInfo.isPro) return true; // Đã Pro

    return deviceInfo.beeGamePlays < 5;
};

/**
 * Sử dụng 1 lượt Video trial
 */
export const useVideoTrialByDevice = async (email: string): Promise<{ success: boolean; remaining: number }> => {
    const deviceId = getOrCreateDeviceId();
    const normalizedEmail = email.toLowerCase().trim();

    try {
        const deviceRef = ref(database, `${DEVICE_TRIALS_REF}/${deviceId}`);

        let remaining = 0;
        await runTransaction(deviceRef, (currentData: DeviceTrialInfo | null) => {
            if (!currentData) {
                // Device mới
                remaining = 2;
                return {
                    deviceId,
                    videoPlays: 1,
                    beeGamePlays: 0,
                    emails: [normalizedEmail],
                    lastUsed: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    isPro: false,
                };
            }

            if (currentData.isPro) {
                remaining = 999;
                return currentData;
            }

            if (currentData.videoPlays >= 3) {
                remaining = 0;
                return currentData;
            }

            currentData.videoPlays += 1;
            currentData.lastUsed = new Date().toISOString();
            if (!currentData.emails.includes(normalizedEmail)) {
                currentData.emails.push(normalizedEmail);
            }
            remaining = 3 - currentData.videoPlays;
            return currentData;
        });

        return { success: remaining >= 0, remaining };
    } catch (error) {
        console.error('Error using video trial:', error);
        return { success: false, remaining: 0 };
    }
};

/**
 * Sử dụng 1 lượt BeeGame trial
 */
export const useBeeGameTrialByDevice = async (email: string): Promise<{ success: boolean; remaining: number }> => {
    const deviceId = getOrCreateDeviceId();
    const normalizedEmail = email.toLowerCase().trim();

    try {
        const deviceRef = ref(database, `${DEVICE_TRIALS_REF}/${deviceId}`);

        let remaining = 0;
        await runTransaction(deviceRef, (currentData: DeviceTrialInfo | null) => {
            if (!currentData) {
                // Device mới
                remaining = 4;
                return {
                    deviceId,
                    videoPlays: 0,
                    beeGamePlays: 1,
                    emails: [normalizedEmail],
                    lastUsed: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    isPro: false,
                };
            }

            if (currentData.isPro) {
                remaining = 999;
                return currentData;
            }

            if (currentData.beeGamePlays >= 5) {
                remaining = 0;
                return currentData;
            }

            currentData.beeGamePlays += 1;
            currentData.lastUsed = new Date().toISOString();
            if (!currentData.emails.includes(normalizedEmail)) {
                currentData.emails.push(normalizedEmail);
            }
            remaining = 5 - currentData.beeGamePlays;
            return currentData;
        });

        return { success: remaining >= 0, remaining };
    } catch (error) {
        console.error('Error using bee game trial:', error);
        return { success: false, remaining: 0 };
    }
};

/**
 * Upgrade device to Pro
 */
export const upgradeDeviceToPro = async (email: string): Promise<void> => {
    const deviceId = getOrCreateDeviceId();
    const normalizedEmail = email.toLowerCase().trim();

    try {
        const deviceRef = ref(database, `${DEVICE_TRIALS_REF}/${deviceId}`);
        const snapshot = await get(deviceRef);

        if (snapshot.exists()) {
            const data = snapshot.val() as DeviceTrialInfo;
            data.isPro = true;
            if (!data.emails.includes(normalizedEmail)) {
                data.emails.push(normalizedEmail);
            }
            await set(deviceRef, data);
        } else {
            await set(deviceRef, {
                deviceId,
                videoPlays: 0,
                beeGamePlays: 0,
                emails: [normalizedEmail],
                lastUsed: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                isPro: true,
            });
        }
    } catch (error) {
        console.error('Error upgrading device to Pro:', error);
    }
};

/**
 * Lấy trạng thái trial của device
 */
export const getDeviceTrialStatus = async (email: string): Promise<{
    videoRemaining: number;
    beeGameRemaining: number;
    isPro: boolean;
}> => {
    const deviceId = getOrCreateDeviceId();
    const deviceInfo = await getDeviceTrialFromFirebase(deviceId);

    if (!deviceInfo) {
        return { videoRemaining: 3, beeGameRemaining: 5, isPro: false };
    }

    if (deviceInfo.isPro) {
        return { videoRemaining: 999, beeGameRemaining: 999, isPro: true };
    }

    return {
        videoRemaining: Math.max(0, 3 - deviceInfo.videoPlays),
        beeGameRemaining: Math.max(0, 5 - deviceInfo.beeGamePlays),
        isPro: false,
    };
};
