/**
 * Firebase PRO Keys Management
 * Quản lý mã PRO trên Firebase - hỗ trợ kích hoạt theo Gmail
 */
import { database } from './firebaseConfig';
import { ref, get, set, remove, push, onValue, query, orderByChild, equalTo } from 'firebase/database';

const PRO_KEYS_REF = 'proKeys';
const PRO_USERS_REF = 'proUsers';

export interface ProKey {
    key: string;
    createdAt: string;
    note: string;
    usedBy?: string;  // Email đã sử dụng mã này
    usedAt?: string;
}

export interface ProUser {
    email: string;
    activatedAt: string;
    activatedByKey: string;
}

/**
 * Lưu mã PRO mới lên Firebase
 */
export const saveProKey = async (key: string, note: string): Promise<boolean> => {
    try {
        const keyRef = ref(database, `${PRO_KEYS_REF}/${key}`);
        await set(keyRef, {
            key,
            createdAt: new Date().toISOString(),
            note: note || 'Khách hàng mới'
        });
        return true;
    } catch (error) {
        console.error('Error saving PRO key to Firebase:', error);
        return false;
    }
};

/**
 * Xóa mã PRO khỏi Firebase
 */
export const deleteProKey = async (key: string): Promise<boolean> => {
    try {
        const keyRef = ref(database, `${PRO_KEYS_REF}/${key}`);
        await remove(keyRef);
        return true;
    } catch (error) {
        console.error('Error deleting PRO key from Firebase:', error);
        return false;
    }
};

/**
 * Lấy tất cả mã PRO (cho Admin)
 */
export const getAllProKeys = async (): Promise<ProKey[]> => {
    try {
        const keysRef = ref(database, PRO_KEYS_REF);
        const snapshot = await get(keysRef);

        if (!snapshot.exists()) return [];

        const data = snapshot.val();
        return Object.values(data) as ProKey[];
    } catch (error) {
        console.error('Error getting PRO keys from Firebase:', error);
        return [];
    }
};

/**
 * Subscribe to PRO keys (real-time updates)
 */
export const subscribeToProKeys = (callback: (keys: ProKey[]) => void): (() => void) => {
    const keysRef = ref(database, PRO_KEYS_REF);
    const unsubscribe = onValue(keysRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        const data = snapshot.val();
        const keys = Object.values(data) as ProKey[];
        // Sắp xếp theo thời gian tạo mới nhất
        keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(keys);
    });
    return unsubscribe;
};

/**
 * Kiểm tra mã PRO có hợp lệ không (chưa được sử dụng)
 */
export const validateProKey = async (code: string): Promise<{ valid: boolean; key?: ProKey }> => {
    const inputCode = code.toUpperCase().trim();

    // Kiểm tra mã cố định (admin/demo)
    const FIXED_KEYS = ['PRO-DEMO-2024', 'BEE-PRO-2024', 'ADMIN-NTD-2024'];
    if (FIXED_KEYS.includes(inputCode)) {
        return { valid: true };
    }

    try {
        const keyRef = ref(database, `${PRO_KEYS_REF}/${inputCode}`);
        const snapshot = await get(keyRef);

        if (!snapshot.exists()) {
            return { valid: false };
        }

        const keyData = snapshot.val() as ProKey;

        // Nếu mã đã được sử dụng → vẫn valid (cho phép nhiều lần kích hoạt với cùng mã)
        // Hoặc bạn có thể đổi logic để chỉ cho dùng 1 lần
        return { valid: true, key: keyData };
    } catch (error) {
        console.error('Error validating PRO key:', error);
        return { valid: false };
    }
};

/**
 * Kích hoạt PRO cho email Gmail
 */
export const activateProForEmail = async (email: string, keyUsed: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        // 1. Lưu user vào danh sách Pro Users
        const userRef = ref(database, `${PRO_USERS_REF}/${emailKey}`);
        await set(userRef, {
            email: normalizedEmail,
            activatedAt: new Date().toISOString(),
            activatedByKey: keyUsed.toUpperCase()
        });

        // 2. Cập nhật mã đã được sử dụng (optional - để tracking)
        const keyRef = ref(database, `${PRO_KEYS_REF}/${keyUsed.toUpperCase()}`);
        const keySnapshot = await get(keyRef);
        if (keySnapshot.exists()) {
            const keyData = keySnapshot.val() as ProKey;
            keyData.usedBy = normalizedEmail;
            keyData.usedAt = new Date().toISOString();
            await set(keyRef, keyData);
        }

        return true;
    } catch (error) {
        console.error('Error activating PRO for email:', error);
        return false;
    }
};

/**
 * Kiểm tra email đã là PRO chưa
 */
export const isEmailPro = async (email: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        const userRef = ref(database, `${PRO_USERS_REF}/${emailKey}`);
        const snapshot = await get(userRef);
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking PRO status:', error);
        return false;
    }
};

/**
 * Lấy thông tin PRO của email
 */
export const getProUserInfo = async (email: string): Promise<ProUser | null> => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/\./g, '_').replace(/@/g, '_at_');

    try {
        const userRef = ref(database, `${PRO_USERS_REF}/${emailKey}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) return null;
        return snapshot.val() as ProUser;
    } catch (error) {
        console.error('Error getting PRO user info:', error);
        return null;
    }
};
