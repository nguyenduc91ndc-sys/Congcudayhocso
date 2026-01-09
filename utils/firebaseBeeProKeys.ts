/**
 * Firebase BEE PRO Keys Management
 * Quản lý mã PRO riêng cho game "Ong về Tổ (Tự soạn)"
 * Sử dụng path riêng biệt: bee_pro_codes/ và bee_pro_users/
 */
import { database } from './firebaseConfig';
import { ref, get, set, remove, onValue } from 'firebase/database';

// Firebase paths riêng cho game Bee
const BEE_PRO_KEYS_REF = 'bee_pro_codes';
const BEE_PRO_USERS_REF = 'bee_pro_users';

export interface BeeProKey {
    key: string;
    createdAt: string;
    note: string;
    usedBy?: string;  // Email đã sử dụng mã này
    usedAt?: string;
}

export interface BeeProUser {
    email: string;
    activatedAt: string;
    activatedByKey: string;
}

/**
 * Lưu mã PRO mới lên Firebase cho game Bee
 */
export const saveBeeProKey = async (key: string, note: string): Promise<boolean> => {
    try {
        const keyRef = ref(database, `${BEE_PRO_KEYS_REF}/${key}`);
        await set(keyRef, {
            key,
            createdAt: new Date().toISOString(),
            note: note || 'Khách hàng mới'
        });
        return true;
    } catch (error) {
        console.error('Error saving BEE PRO key to Firebase:', error);
        return false;
    }
};

/**
 * Xóa mã PRO khỏi Firebase
 */
export const deleteBeeProKey = async (key: string): Promise<boolean> => {
    try {
        const keyRef = ref(database, `${BEE_PRO_KEYS_REF}/${key}`);
        await remove(keyRef);
        return true;
    } catch (error) {
        console.error('Error deleting BEE PRO key from Firebase:', error);
        return false;
    }
};

/**
 * Lấy tất cả mã PRO (cho Admin)
 */
export const getAllBeeProKeys = async (): Promise<BeeProKey[]> => {
    try {
        const keysRef = ref(database, BEE_PRO_KEYS_REF);
        const snapshot = await get(keysRef);

        if (!snapshot.exists()) return [];

        const data = snapshot.val();
        return Object.values(data) as BeeProKey[];
    } catch (error) {
        console.error('Error getting BEE PRO keys from Firebase:', error);
        return [];
    }
};

/**
 * Subscribe to PRO keys (real-time updates)
 */
export const subscribeToBeeProKeys = (callback: (keys: BeeProKey[]) => void): (() => void) => {
    const keysRef = ref(database, BEE_PRO_KEYS_REF);
    const unsubscribe = onValue(keysRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        const data = snapshot.val();
        const keys = Object.values(data) as BeeProKey[];
        // Sắp xếp theo thời gian tạo mới nhất
        keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(keys);
    });
    return unsubscribe;
};

/**
 * Kiểm tra mã PRO có hợp lệ không (chỉ mã BEE-)
 */
export const validateBeeProKey = async (code: string): Promise<{ valid: boolean; key?: BeeProKey }> => {
    const inputCode = code.toUpperCase().trim();

    // Kiểm tra mã cố định (admin/demo) - chỉ chấp nhận mã BEE-
    const FIXED_KEYS = ['BEE-PRO-2024', 'BEE-ADMIN-2024'];
    if (FIXED_KEYS.includes(inputCode)) {
        return { valid: true };
    }

    // Kiểm tra mã phải bắt đầu bằng BEE-
    if (!inputCode.startsWith('BEE-')) {
        return { valid: false };
    }

    try {
        const keyRef = ref(database, `${BEE_PRO_KEYS_REF}/${inputCode}`);
        const snapshot = await get(keyRef);

        if (!snapshot.exists()) {
            return { valid: false };
        }

        const keyData = snapshot.val() as BeeProKey;
        return { valid: true, key: keyData };
    } catch (error) {
        console.error('Error validating BEE PRO key:', error);
        return { valid: false };
    }
};

/**
 * Kích hoạt PRO cho email Gmail (game Bee)
 */
export const activateBeeProForEmail = async (email: string, keyUsed: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        // 1. Lưu user vào danh sách Bee Pro Users
        const userRef = ref(database, `${BEE_PRO_USERS_REF}/${emailKey}`);
        await set(userRef, {
            email: normalizedEmail,
            activatedAt: new Date().toISOString(),
            activatedByKey: keyUsed.toUpperCase()
        });

        // 2. Cập nhật mã đã được sử dụng
        const keyRef = ref(database, `${BEE_PRO_KEYS_REF}/${keyUsed.toUpperCase()}`);
        const keySnapshot = await get(keyRef);
        if (keySnapshot.exists()) {
            const keyData = keySnapshot.val() as BeeProKey;
            keyData.usedBy = normalizedEmail;
            keyData.usedAt = new Date().toISOString();
            await set(keyRef, keyData);
        }

        return true;
    } catch (error) {
        console.error('Error activating BEE PRO for email:', error);
        return false;
    }
};

/**
 * Kiểm tra email đã là PRO của game Bee chưa
 * Kiểm tra CẢ path mới (bee_pro_users) VÀ path cũ (proUsers) để backward compatible
 */
export const isEmailBeePro = async (email: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        // 1. Kiểm tra path mới trước
        const newUserRef = ref(database, `${BEE_PRO_USERS_REF}/${emailKey}`);
        const newSnapshot = await get(newUserRef);
        if (newSnapshot.exists()) {
            return true;
        }

        // 2. Fallback: Kiểm tra path cũ (proUsers) cho những user đã kích hoạt trước đây
        const oldUserRef = ref(database, `proUsers/${emailKey}`);
        const oldSnapshot = await get(oldUserRef);
        return oldSnapshot.exists();
    } catch (error) {
        console.error('Error checking BEE PRO status:', error);
        return false;
    }
};

/**
 * Lấy thông tin PRO của email
 */
export const getBeeProUserInfo = async (email: string): Promise<BeeProUser | null> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        const userRef = ref(database, `${BEE_PRO_USERS_REF}/${emailKey}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) return null;
        return snapshot.val() as BeeProUser;
    } catch (error) {
        console.error('Error getting BEE PRO user info:', error);
        return null;
    }
};

/**
 * Generate mã Pro mới cho Admin
 */
export const generateBeeProCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BEE-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
