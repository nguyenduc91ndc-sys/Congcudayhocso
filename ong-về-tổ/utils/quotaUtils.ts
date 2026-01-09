/**
 * Quota Utils for Ong Về Tổ - Quản lý giới hạn lượt tạo quiz và Pro code
 * Uses SEPARATE Firebase paths: bee_pro_codes/
 */
import { database } from '../../utils/firebaseConfig';
import { ref, get, set } from 'firebase/database';

// Constants
const FREE_QUOTA_LIMIT = 5; // Số quiz miễn phí
const STORAGE_KEY_QUOTA = 'bee_quiz_count';
const STORAGE_KEY_USER_ID = 'bee_anonymous_user_id';
const STORAGE_KEY_PRO = 'bee_pro_status';

// Firebase path prefix - UNIQUE FOR THIS GAME
const PRO_CODES_PATH = 'bee_pro_codes';

/**
 * Tạo UUID ngẫu nhiên
 */
const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Lấy hoặc tạo Anonymous User ID
 */
export const getAnonymousUserId = (): string => {
    let id = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (!id) {
        id = 'BEE_ANON_' + generateUUID();
        localStorage.setItem(STORAGE_KEY_USER_ID, id);
    }
    return id;
};

/**
 * Lấy số quiz đã tạo
 */
export const getQuizCount = (): number => {
    const count = localStorage.getItem(STORAGE_KEY_QUOTA);
    return count ? parseInt(count, 10) : 0;
};

/**
 * Tăng số quiz đã tạo
 */
export const incrementQuizCount = (): void => {
    const current = getQuizCount();
    localStorage.setItem(STORAGE_KEY_QUOTA, (current + 1).toString());
};

/**
 * Kiểm tra xem có phải Pro user không
 */
export const isPro = (): boolean => {
    return localStorage.getItem(STORAGE_KEY_PRO) === 'true';
};

/**
 * Lấy thông tin quota
 */
export const getQuotaInfo = (): { used: number; limit: number; remaining: number; isPro: boolean } => {
    const used = getQuizCount();
    const proStatus = isPro();
    return {
        used,
        limit: FREE_QUOTA_LIMIT,
        remaining: proStatus ? Infinity : Math.max(0, FREE_QUOTA_LIMIT - used),
        isPro: proStatus,
    };
};

/**
 * Kiểm tra có thể tạo quiz không
 */
export const canCreateQuiz = (): boolean => {
    if (isPro()) return true;
    return getQuizCount() < FREE_QUOTA_LIMIT;
};

/**
 * Kích hoạt Pro code
 */
export const activateProCode = async (code: string): Promise<boolean> => {
    try {
        // Use bee_pro_codes path - UNIQUE FOR THIS GAME
        const codeRef = ref(database, `${PRO_CODES_PATH}/${code.toUpperCase()}`);
        const snapshot = await get(codeRef);

        if (!snapshot.exists()) {
            throw new Error('Mã không tồn tại');
        }

        const data = snapshot.val();
        if (data.usedBy) {
            throw new Error('Mã đã được sử dụng');
        }

        // Đánh dấu mã đã được sử dụng
        const userId = getAnonymousUserId();
        await set(codeRef, {
            ...data,
            usedBy: userId,
            usedAt: Date.now(),
        });

        // Lưu Pro status vào localStorage
        localStorage.setItem(STORAGE_KEY_PRO, 'true');

        return true;
    } catch (error: any) {
        console.error('Pro code activation error:', error);
        throw error;
    }
};

/**
 * Export constant for use in UI
 */
export const QUOTA_LIMIT = FREE_QUOTA_LIMIT;
