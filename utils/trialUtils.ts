// Hệ thống quản lý lượt dùng thử theo Email + Device ID
const TRIAL_STORAGE_KEY = 'ntd_trial_emails';
const DEVICE_TRIAL_KEY = 'ntd_device_trial';
const DEVICE_ID_KEY = 'ntd_device_id';
const MAX_FREE_USES = 3;

export interface TrialStatus {
    usesRemaining: number;
    totalUses: number;
    isPro: boolean;
    email?: string;
}

interface TrialData {
    [email: string]: {
        totalUses: number;
        isPro: boolean;
        createdAt: string;
    };
}

interface DeviceTrialData {
    plays: number;
    lastUsed: string;
    emails: string[]; // Danh sách email đã dùng trên device này
}

// Tạo device fingerprint
const generateDeviceFingerprint = (): string => {
    const nav = window.navigator;
    const screen = window.screen;

    const fingerprint = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        nav.hardwareConcurrency || 'unknown',
        (nav as any).deviceMemory || 'unknown',
        nav.platform || 'unknown',
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return 'dev_' + Math.abs(hash).toString(16);
};

// Lấy hoặc tạo device ID
const getDeviceIdMain = (): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = generateDeviceFingerprint();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

// Lấy dữ liệu trial của device
const getDeviceTrialData = (): DeviceTrialData => {
    const deviceId = getDeviceIdMain();
    const saved = localStorage.getItem(DEVICE_TRIAL_KEY + '_' + deviceId);
    if (!saved) return { plays: 0, lastUsed: '', emails: [] };
    return JSON.parse(saved);
};

// Lưu dữ liệu trial của device
const saveDeviceTrialData = (data: DeviceTrialData): void => {
    const deviceId = getDeviceIdMain();
    localStorage.setItem(DEVICE_TRIAL_KEY + '_' + deviceId, JSON.stringify(data));
};

// Lấy tất cả dữ liệu trial
const getAllTrialData = (): TrialData => {
    const saved = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!saved) return {};
    return JSON.parse(saved);
};

// Lưu dữ liệu trial
const saveTrialData = (data: TrialData): void => {
    localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(data));
};

// Chuẩn hoá email (lowercase, trim)
const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
};

// Kiểm tra email hợp lệ
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

// Kiểm tra mã truy cập hợp lệ (từ Admin tạo hoặc mã cố định)
const isValidAccessCode = (code: string): boolean => {
    const ADMIN_SECRET_CODE = 'ADMIN-NTD-2024';
    const FIXED_KEYS = ['PRO-DEMO-2024'];
    const inputCode = code.toUpperCase().trim();

    if (inputCode === ADMIN_SECRET_CODE) return true;
    if (FIXED_KEYS.includes(inputCode)) return true;

    const savedKeys = localStorage.getItem('ntd_admin_keys');
    if (!savedKeys) return false;

    const keys: { key: string }[] = JSON.parse(savedKeys);
    return keys.some(k => k.key.toUpperCase() === inputCode);
};

// Lấy trạng thái trial theo email
export const getTrialStatusByEmail = (email: string): TrialStatus => {
    const normalizedEmail = normalizeEmail(email);
    const data = getAllTrialData();
    const userData = data[normalizedEmail];

    if (!userData) {
        return { usesRemaining: MAX_FREE_USES, totalUses: 0, isPro: false, email: normalizedEmail };
    }

    const usesRemaining = Math.max(0, MAX_FREE_USES - (userData.totalUses || 0));

    return {
        usesRemaining,
        totalUses: userData.totalUses || 0,
        isPro: userData.isPro || false,
        email: normalizedEmail,
    };
};

// Lấy trạng thái trial (dựa trên email đã lưu trong session)
export const getTrialStatus = (): TrialStatus => {
    const currentEmail = localStorage.getItem('ntd_current_email');
    if (currentEmail) {
        return getTrialStatusByEmail(currentEmail);
    }
    return { usesRemaining: MAX_FREE_USES, totalUses: 0, isPro: false };
};

// Đặt email hiện tại
export const setCurrentEmail = (email: string): void => {
    localStorage.setItem('ntd_current_email', normalizeEmail(email));
};

// Sử dụng 1 lượt dùng thử (tăng cả EMAIL và DEVICE)
export const useTrialPlay = (email?: string): TrialStatus => {
    const targetEmail = email || localStorage.getItem('ntd_current_email');
    if (!targetEmail) {
        return { usesRemaining: 0, totalUses: 0, isPro: false };
    }

    const normalizedEmail = normalizeEmail(targetEmail);
    const status = getTrialStatusByEmail(normalizedEmail);

    // Người dùng Pro không bị giới hạn
    if (status.isPro) {
        return status;
    }

    // Tăng lượt sử dụng của EMAIL
    const data = getAllTrialData();
    const currentData = data[normalizedEmail] || { totalUses: 0, isPro: false, createdAt: new Date().toISOString() };

    currentData.totalUses = (currentData.totalUses || 0) + 1;
    data[normalizedEmail] = currentData;
    saveTrialData(data);

    // Tăng lượt sử dụng của DEVICE (chống đổi email)
    const deviceData = getDeviceTrialData();
    deviceData.plays = (deviceData.plays || 0) + 1;
    deviceData.lastUsed = new Date().toISOString();
    if (!deviceData.emails.includes(normalizedEmail)) {
        deviceData.emails.push(normalizedEmail);
    }
    saveDeviceTrialData(deviceData);

    return {
        usesRemaining: Math.max(0, MAX_FREE_USES - currentData.totalUses),
        totalUses: currentData.totalUses,
        isPro: false,
        email: normalizedEmail,
    };
};

// Nâng cấp lên Pro theo email
export const upgradeToProByEmail = (email: string): void => {
    const normalizedEmail = normalizeEmail(email);
    const data = getAllTrialData();
    const currentData = data[normalizedEmail] || { totalUses: 0, isPro: false, createdAt: new Date().toISOString() };

    currentData.isPro = true;
    data[normalizedEmail] = currentData;
    saveTrialData(data);
};

// Nâng cấp lên Pro (dựa trên email hiện tại)
export const upgradeToPro = (): void => {
    const currentEmail = localStorage.getItem('ntd_current_email');
    if (currentEmail) {
        upgradeToProByEmail(currentEmail);
    }
};

// Kiểm tra còn lượt dùng thử không (kiểm tra cả EMAIL và DEVICE)
export const canUseTrialByEmail = (email: string): boolean => {
    const emailStatus = getTrialStatusByEmail(email);

    // Nếu email đã là Pro thì cho phép
    if (emailStatus.isPro) return true;

    // Kiểm tra device - nếu device đã hết lượt thì chặn dù đổi email
    const deviceData = getDeviceTrialData();
    const devicePlaysRemaining = MAX_FREE_USES - deviceData.plays;

    // Nếu device đã hết lượt
    if (devicePlaysRemaining <= 0) {
        return false;
    }

    // Nếu email đã hết lượt
    if (emailStatus.usesRemaining <= 0) {
        return false;
    }

    return true;
};

export const canUseTrial = (): boolean => {
    const status = getTrialStatus();
    return status.isPro || status.usesRemaining > 0;
};

// Kiểm tra và kích hoạt Pro bằng mã
export const activateWithCode = (code: string): boolean => {
    if (isValidAccessCode(code)) {
        upgradeToPro();
        return true;
    }
    return false;
};

export const getAllTrialEmails = (): { email: string; totalUses: number; isPro: boolean; createdAt: string }[] => {
    const data = getAllTrialData();
    return Object.entries(data).map(([email, info]) => ({
        email,
        totalUses: info.totalUses,
        isPro: info.isPro,
        createdAt: info.createdAt,
    }));
};

// =========================================================
// BEE GAME TRIAL SYSTEM - Theo dõi theo DEVICE (không thể bypass bằng đổi tài khoản)
// =========================================================
const BEE_GAME_TRIAL_KEY = 'ntd_bee_game_device_trial';
const BEE_GAME_DEVICE_KEY = 'ntd_bee_game_device_id';
const BEE_GAME_PRO_KEY = 'ntd_bee_game_pro_emails';
const BEE_GAME_MAX_FREE_USES = 5;

// Tạo device ID duy nhất
const generateDeviceId = (): string => {
    const nav = window.navigator;
    const screen = window.screen;

    const fingerprint = [
        nav.userAgent,
        nav.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        nav.hardwareConcurrency || 'unknown',
        (nav as any).deviceMemory || 'unknown',
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return 'device_' + Math.abs(hash).toString(16);
};

// Lấy hoặc tạo device ID
const getDeviceId = (): string => {
    let deviceId = localStorage.getItem(BEE_GAME_DEVICE_KEY);
    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem(BEE_GAME_DEVICE_KEY, deviceId);
    }
    return deviceId;
};

interface BeeGameDeviceTrialData {
    plays: number;
    lastUsed: string;
}

// Lấy dữ liệu trial của device
const getBeeGameDeviceData = (): BeeGameDeviceTrialData => {
    const deviceId = getDeviceId();
    const saved = localStorage.getItem(BEE_GAME_TRIAL_KEY + '_' + deviceId);
    if (!saved) return { plays: 0, lastUsed: '' };
    return JSON.parse(saved);
};

// Lưu dữ liệu trial của device
const saveBeeGameDeviceData = (data: BeeGameDeviceTrialData): void => {
    const deviceId = getDeviceId();
    localStorage.setItem(BEE_GAME_TRIAL_KEY + '_' + deviceId, JSON.stringify(data));
};

// Kiểm tra email có phải Pro không
const isBeeGameProEmail = (email: string): boolean => {
    const saved = localStorage.getItem(BEE_GAME_PRO_KEY);
    if (!saved) return false;
    const proEmails: string[] = JSON.parse(saved);
    return proEmails.includes(normalizeEmail(email));
};

// Thêm email vào danh sách Pro
const addBeeGameProEmail = (email: string): void => {
    const saved = localStorage.getItem(BEE_GAME_PRO_KEY);
    const proEmails: string[] = saved ? JSON.parse(saved) : [];
    const normalizedEmail = normalizeEmail(email);
    if (!proEmails.includes(normalizedEmail)) {
        proEmails.push(normalizedEmail);
        localStorage.setItem(BEE_GAME_PRO_KEY, JSON.stringify(proEmails));
    }
};

export const getBeeGameTrialStatus = (email: string): { playsRemaining: number; totalPlays: number; isPro: boolean } => {
    // Kiểm tra email Pro trước
    if (isBeeGameProEmail(email)) {
        return { playsRemaining: 999, totalPlays: 0, isPro: true };
    }

    // Lấy số lượt đã dùng của DEVICE (không phải email)
    const deviceData = getBeeGameDeviceData();

    return {
        playsRemaining: Math.max(0, BEE_GAME_MAX_FREE_USES - deviceData.plays),
        totalPlays: deviceData.plays,
        isPro: false,
    };
};

export const useBeeGameTrial = (email: string): { playsRemaining: number; totalPlays: number; isPro: boolean } => {
    // Nếu là Pro thì không trừ lượt
    if (isBeeGameProEmail(email)) {
        return { playsRemaining: 999, totalPlays: 0, isPro: true };
    }

    // Trừ lượt của DEVICE
    const deviceData = getBeeGameDeviceData();
    deviceData.plays = (deviceData.plays || 0) + 1;
    deviceData.lastUsed = new Date().toISOString();
    saveBeeGameDeviceData(deviceData);

    return {
        playsRemaining: Math.max(0, BEE_GAME_MAX_FREE_USES - deviceData.plays),
        totalPlays: deviceData.plays,
        isPro: false,
    };
};

export const canUseBeeGameTrial = (email: string): boolean => {
    const status = getBeeGameTrialStatus(email);
    return status.isPro || status.playsRemaining > 0;
};

export const upgradeBeeGameToPro = (email: string): void => {
    addBeeGameProEmail(email);
};
