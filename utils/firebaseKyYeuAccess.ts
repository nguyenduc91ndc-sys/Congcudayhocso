import { ref, get, set, remove, onValue, runTransaction } from 'firebase/database';
import { database } from './firebaseConfig';

const KYYEU_CODES_REF = 'kyyeu_access_codes';
const KYYEU_USERS_REF = 'kyyeu_access_users';

export const KYYEU_ZALO_GROUP_URL = 'https://zalo.me/g/uafjqjcpskahgt6xa9gh';

export interface KyYeuAccessCode {
    key: string;
    createdAt: string;
    note: string;
    active: boolean;
    usedBy?: string;
    usedAt?: string;
    usageCount?: number;
}

export interface KyYeuAccessUser {
    email: string;
    activatedAt: string;
    activatedByKey: string;
}

const normalizeCode = (code: string): string => code.toUpperCase().replace(/\s+/g, '').trim();

const normalizeEmail = (email: string): string => email.toLowerCase().trim();

const emailToKey = (email: string): string =>
    email.toLowerCase().trim().replace(/\./g, '_').replace(/@/g, '_at_');

export const generateKyYeuAccessCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'KYYEU-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const saveKyYeuAccessCode = async (key: string, note: string): Promise<boolean> => {
    const normalizedKey = normalizeCode(key);
    try {
        await set(ref(database, `${KYYEU_CODES_REF}/${normalizedKey}`), {
            key: normalizedKey,
            createdAt: new Date().toISOString(),
            note: note || 'Mã Kỷ Yếu cộng đồng',
            active: true,
            usageCount: 0
        });
        return true;
    } catch (error) {
        console.error('Error saving KyYeu access code:', error);
        return false;
    }
};

export const deleteKyYeuAccessCode = async (key: string): Promise<boolean> => {
    try {
        await remove(ref(database, `${KYYEU_CODES_REF}/${normalizeCode(key)}`));
        return true;
    } catch (error) {
        console.error('Error deleting KyYeu access code:', error);
        return false;
    }
};

export const setKyYeuAccessCodeActive = async (key: string, active: boolean): Promise<boolean> => {
    const normalizedKey = normalizeCode(key);
    try {
        const keyRef = ref(database, `${KYYEU_CODES_REF}/${normalizedKey}`);
        const snapshot = await get(keyRef);
        if (!snapshot.exists()) return false;
        await set(keyRef, { ...snapshot.val(), active });
        return true;
    } catch (error) {
        console.error('Error updating KyYeu access code:', error);
        return false;
    }
};

export const subscribeToKyYeuAccessCodes = (callback: (codes: KyYeuAccessCode[]) => void): (() => void) => {
    const codesRef = ref(database, KYYEU_CODES_REF);
    const unsubscribe = onValue(codesRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        const codes = Object.values(snapshot.val()) as KyYeuAccessCode[];
        codes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(codes);
    });
    return unsubscribe;
};

export const validateKyYeuAccessCode = async (code: string): Promise<{ valid: boolean; reason?: string; code?: KyYeuAccessCode }> => {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode.startsWith('KYYEU-')) {
        return { valid: false, reason: 'Mã Kỷ Yếu thường bắt đầu bằng KYYEU-' };
    }

    try {
        const snapshot = await get(ref(database, `${KYYEU_CODES_REF}/${normalizedCode}`));
        if (!snapshot.exists()) return { valid: false, reason: 'Mã không tồn tại hoặc đã nhập sai.' };

        const codeData = snapshot.val() as KyYeuAccessCode;
        if (codeData.active === false) return { valid: false, reason: 'Mã này đã bị thu hồi. Vui lòng liên hệ nhóm hỗ trợ.' };

        return { valid: true, code: codeData };
    } catch (error) {
        console.error('Error validating KyYeu access code:', error);
        return { valid: false, reason: 'Không kiểm tra được mã. Vui lòng thử lại.' };
    }
};

export const activateKyYeuAccessForEmail = async (email: string, code: string): Promise<{ success: boolean; reason?: string }> => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode.startsWith('KYYEU-')) {
        return { success: false, reason: 'Ma Ky Yeu thuong bat dau bang KYYEU-' };
    }

    try {
        const now = new Date().toISOString();
        let failureReason = '';

        const transactionResult = await runTransaction(ref(database, `${KYYEU_CODES_REF}/${normalizedCode}`), (currentCode) => {
            if (currentCode === null) {
                failureReason = 'Ma khong ton tai hoac da nhap sai.';
                return;
            }

            const codeData = currentCode as KyYeuAccessCode;
            if (codeData.active === false) {
                failureReason = 'Ma nay da bi thu hoi. Vui long lien he nhom ho tro.';
                return;
            }

            const assignedEmail = codeData.usedBy ? normalizeEmail(codeData.usedBy) : '';
            if (assignedEmail && assignedEmail !== normalizedEmail) {
                failureReason = 'Ma nay da duoc kich hoat boi tai khoan khac. Vui long lien he admin de duoc cap ma rieng.';
                return;
            }

            return {
                ...codeData,
                key: codeData.key || normalizedCode,
                usedBy: normalizedEmail,
                usedAt: codeData.usedAt || now,
                usageCount: assignedEmail === normalizedEmail ? (codeData.usageCount || 1) : (codeData.usageCount || 0) + 1
            };
        }, { applyLocally: false });

        if (!transactionResult.committed) {
            return { success: false, reason: failureReason || 'Khong kich hoat duoc ma. Vui long thu lai.' };
        }

        await set(ref(database, `${KYYEU_USERS_REF}/${emailToKey(normalizedEmail)}`), {
            email: normalizedEmail,
            activatedAt: now,
            activatedByKey: normalizedCode
        });

        return { success: true };
    } catch (error) {
        console.error('Error activating KyYeu access:', error);
        return { success: false, reason: 'Không kích hoạt được mã. Vui lòng thử lại.' };
    }
};

export const hasActiveKyYeuAccess = async (email: string): Promise<boolean> => {
    const normalizedEmail = normalizeEmail(email);
    try {
        const userSnapshot = await get(ref(database, `${KYYEU_USERS_REF}/${emailToKey(normalizedEmail)}`));
        if (!userSnapshot.exists()) return false;

        const userData = userSnapshot.val() as KyYeuAccessUser;
        const codeSnapshot = await get(ref(database, `${KYYEU_CODES_REF}/${normalizeCode(userData.activatedByKey)}`));
        if (!codeSnapshot.exists()) return false;

        const codeData = codeSnapshot.val() as KyYeuAccessCode;
        const assignedEmail = codeData.usedBy ? normalizeEmail(codeData.usedBy) : '';
        return codeData.active !== false && (!assignedEmail || assignedEmail === normalizedEmail);
    } catch (error) {
        console.error('Error checking KyYeu access:', error);
        return false;
    }
};

export const revokeKyYeuAccessForEmail = async (email: string): Promise<boolean> => {
    try {
        await remove(ref(database, `${KYYEU_USERS_REF}/${emailToKey(email)}`));
        return true;
    } catch (error) {
        console.error('Error revoking KyYeu access for email:', error);
        return false;
    }
};
