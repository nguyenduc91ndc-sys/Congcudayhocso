/**
 * Firebase SKKN PRO Keys Management
 * Quản lý mã PRO riêng cho ứng dụng "Viết SKKN & Báo Cáo"
 * Firebase paths: skkn_pro_codes/ và skkn_pro_users/
 */
import { database } from './firebaseConfig';
import { ref, get, set, remove, onValue } from 'firebase/database';

const SKKN_PRO_KEYS_REF = 'skkn_pro_codes';
const SKKN_PRO_USERS_REF = 'skkn_pro_users';

// Trial key config
const TRIAL_KEYS = ['SKKN-DUNGTHU'];
export const TRIAL_DAYS = 3;

export interface SKKNProKey {
    key: string;
    createdAt: string;
    note: string;
    usedBy?: string;
    usedAt?: string;
}

export interface SKKNProUser {
    email: string;
    activatedAt: string;
    activatedByKey: string;
    expiresAt?: string; // ISO string, only for trial keys
}

/** Lưu mã SKKN PRO mới lên Firebase */
export const saveSKKNProKey = async (key: string, note: string): Promise<boolean> => {
    try {
        const keyRef = ref(database, `${SKKN_PRO_KEYS_REF}/${key}`);
        await set(keyRef, {
            key,
            createdAt: new Date().toISOString(),
            note: note || 'Khách hàng mới'
        });
        return true;
    } catch (error) {
        console.error('Error saving SKKN PRO key:', error);
        return false;
    }
};

/** Xóa mã SKKN PRO */
export const deleteSKKNProKey = async (key: string): Promise<boolean> => {
    try {
        const keyRef = ref(database, `${SKKN_PRO_KEYS_REF}/${key}`);
        await remove(keyRef);
        return true;
    } catch (error) {
        console.error('Error deleting SKKN PRO key:', error);
        return false;
    }
};

/** Subscribe real-time danh sách mã SKKN PRO */
export const subscribeToSKKNProKeys = (callback: (keys: SKKNProKey[]) => void): (() => void) => {
    const keysRef = ref(database, SKKN_PRO_KEYS_REF);
    const unsubscribe = onValue(keysRef, (snapshot) => {
        if (!snapshot.exists()) { callback([]); return; }
        const data = snapshot.val();
        const keys = Object.values(data) as SKKNProKey[];
        keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(keys);
    });
    return unsubscribe;
};

/** Kiểm tra mã SKKN PRO có hợp lệ không */
export const validateSKKNProKey = async (code: string): Promise<{ valid: boolean; key?: SKKNProKey; trial?: boolean }> => {
    const inputCode = code.toUpperCase().trim();

    // Mã cố định admin
    const FIXED_KEYS = ['SKKN-ADMIN-2024', 'SKKN-DEMO-2024'];
    if (FIXED_KEYS.includes(inputCode)) return { valid: true };

    // Mã dùng thử chung
    if (TRIAL_KEYS.includes(inputCode)) return { valid: true, trial: true };

    // Kiểm tra prefix
    if (!inputCode.startsWith('SKKN-')) return { valid: false };

    try {
        const keyRef = ref(database, `${SKKN_PRO_KEYS_REF}/${inputCode}`);
        const snapshot = await get(keyRef);
        if (!snapshot.exists()) return { valid: false };
        return { valid: true, key: snapshot.val() as SKKNProKey };
    } catch (error) {
        console.error('Error validating SKKN PRO key:', error);
        return { valid: false };
    }
};

/** Kích hoạt Pro cho email */
export const activateSKKNProForEmail = async (email: string, keyUsed: string, isTrial = false): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        // Lưu user Pro
        const userRef = ref(database, `${SKKN_PRO_USERS_REF}/${emailKey}`);
        const userData: any = {
            email: normalizedEmail,
            activatedAt: new Date().toISOString(),
            activatedByKey: keyUsed.toUpperCase()
        };

        // Nếu là mã trial → thêm ngày hết hạn
        if (isTrial) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);
            userData.expiresAt = expiresAt.toISOString();
        }

        await set(userRef, userData);

        // Cập nhật mã đã sử dụng (không áp dụng cho trial vì dùng chung)
        if (!isTrial) {
            const keyRef = ref(database, `${SKKN_PRO_KEYS_REF}/${keyUsed.toUpperCase()}`);
            const keySnapshot = await get(keyRef);
            if (keySnapshot.exists()) {
                const keyData = keySnapshot.val() as SKKNProKey;
                keyData.usedBy = normalizedEmail;
                keyData.usedAt = new Date().toISOString();
                await set(keyRef, keyData);
            }
        }

        return true;
    } catch (error) {
        console.error('Error activating SKKN PRO:', error);
        return false;
    }
};

/** Kiểm tra email đã là SKKN Pro chưa (kiểm tra cả hết hạn trial) */
export const isEmailSKKNPro = async (email: string): Promise<boolean> => {
    const status = await getSKKNProStatus(email);
    return status.isPro;
};

/** Lấy chi tiết trạng thái Pro (bao gồm trial info) */
export const getSKKNProStatus = async (email: string): Promise<{ isPro: boolean; isTrial?: boolean; daysLeft?: number; expiresAt?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        const userRef = ref(database, `${SKKN_PRO_USERS_REF}/${emailKey}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) return { isPro: false };

        const userData = snapshot.val() as SKKNProUser;

        // Kiểm tra trial hết hạn
        if (userData.expiresAt) {
            const expiresAt = new Date(userData.expiresAt);
            const now = new Date();
            if (now > expiresAt) {
                // Hết hạn trial → xóa record
                await remove(userRef);
                return { isPro: false };
            }
            const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return { isPro: true, isTrial: true, daysLeft, expiresAt: userData.expiresAt };
        }

        return { isPro: true };
    } catch (error) {
        console.error('Error checking SKKN PRO status:', error);
        return { isPro: false };
    }
};

/** Thu hồi Pro của email (Admin) */
export const revokeSKKNProForEmail = async (email: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        const userRef = ref(database, `${SKKN_PRO_USERS_REF}/${emailKey}`);
        await remove(userRef);
        return true;
    } catch (error) {
        console.error('Error revoking SKKN PRO:', error);
        return false;
    }
};

/** Generate mã SKKN Pro mới */
export const generateSKKNProCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SKKN-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
