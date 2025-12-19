// Hệ thống quản lý lượt dùng thử theo Email
const TRIAL_STORAGE_KEY = 'ntd_trial_emails';
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

// Sử dụng 1 lượt dùng thử
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

    const data = getAllTrialData();
    const currentData = data[normalizedEmail] || { totalUses: 0, isPro: false, createdAt: new Date().toISOString() };

    currentData.totalUses = (currentData.totalUses || 0) + 1;
    data[normalizedEmail] = currentData;
    saveTrialData(data);

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

// Kiểm tra còn lượt dùng thử không
export const canUseTrialByEmail = (email: string): boolean => {
    const status = getTrialStatusByEmail(email);
    return status.isPro || status.usesRemaining > 0;
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

// Lấy danh sách tất cả email đã đăng ký trial (cho Admin)
export const getAllTrialEmails = (): { email: string; totalUses: number; isPro: boolean; createdAt: string }[] => {
    const data = getAllTrialData();
    return Object.entries(data).map(([email, info]) => ({
        email,
        totalUses: info.totalUses,
        isPro: info.isPro,
        createdAt: info.createdAt,
    }));
};
