import { ref, remove, runTransaction, set, onValue, get } from 'firebase/database';
import { database } from './firebaseConfig';

const VIDEO_EXPORT_CODES_REF = 'interactive_video_export_codes';

export interface VideoExportCode {
    key: string;
    createdAt: string;
    note: string;
    active: boolean;
    usedBy?: string;
    usedAt?: string;
    usageCount?: number;
    exportCount: number;
    exportLimit: number;
    lastExportAt?: string;
    lastExportBy?: string;
    lastExportTitle?: string;
    lastExportType?: string;
    lastExportReservationId?: string;
}

export interface VideoExportReservation {
    code: string;
    email: string;
    reservationId: string;
    exportCount: number;
    exportLimit: number;
}

const normalizeCode = (code: string): string => code.toUpperCase().replace(/\s+/g, '').trim();
const normalizeEmail = (email: string): string => email.toLowerCase().trim();

export const isValidVideoExportEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

export const generateVideoExportCode = (): string => {
    const chars = 'ACDEFGHJKMNPQRTUVWXY34679';
    let code = 'VIDX-';
    for (let i = 0; i < 8; i += 1) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const VISUALLY_SIMILAR_CHARS: Record<string, string[]> = {
    '2': ['Z'],
    '5': ['S'],
    '8': ['B'],
    B: ['8'],
    S: ['5'],
    Z: ['2'],
};

const getVisualCodeVariants = (code: string): string[] => {
    const variants = new Set<string>();
    const queue = [code];

    for (let i = 0; i < code.length; i += 1) {
        const next: string[] = [];
        for (const current of queue) {
            const replacements = VISUALLY_SIMILAR_CHARS[current[i]] || [];
            for (const replacement of replacements) {
                const chars = current.split('');
                chars[i] = replacement;
                const variant = chars.join('');
                if (variant !== code) {
                    variants.add(variant);
                    next.push(variant);
                }
            }
        }
        queue.push(...next);
    }

    return Array.from(variants);
};

const resolveExistingVideoExportCode = async (normalizedCode: string): Promise<string | null> => {
    const exactSnapshot = await get(ref(database, `${VIDEO_EXPORT_CODES_REF}/${normalizedCode}`));
    if (exactSnapshot.exists()) return normalizedCode;

    const matchedCodes: string[] = [];
    for (const candidate of getVisualCodeVariants(normalizedCode)) {
        const snapshot = await get(ref(database, `${VIDEO_EXPORT_CODES_REF}/${candidate}`));
        if (snapshot.exists()) matchedCodes.push(candidate);
        if (matchedCodes.length > 1) break;
    }

    return matchedCodes.length === 1 ? matchedCodes[0] : null;
};

export const saveVideoExportCode = async (key: string, note: string, exportLimit: number): Promise<boolean> => {
    const normalizedKey = normalizeCode(key);
    const safeLimit = Math.max(1, Math.floor(Number(exportLimit) || 1));
    try {
        await set(ref(database, `${VIDEO_EXPORT_CODES_REF}/${normalizedKey}`), {
            key: normalizedKey,
            createdAt: new Date().toISOString(),
            note: note || `Mã xuất video ${safeLimit} lượt`,
            active: true,
            usageCount: 0,
            exportCount: 0,
            exportLimit: safeLimit,
        });
        return true;
    } catch (error) {
        console.error('Error saving video export code:', error);
        return false;
    }
};

export const deleteVideoExportCode = async (key: string): Promise<boolean> => {
    try {
        await remove(ref(database, `${VIDEO_EXPORT_CODES_REF}/${normalizeCode(key)}`));
        return true;
    } catch (error) {
        console.error('Error deleting video export code:', error);
        return false;
    }
};

export const setVideoExportCodeActive = async (key: string, active: boolean): Promise<boolean> => {
    const normalizedKey = normalizeCode(key);
    try {
        let exists = false;
        const result = await runTransaction(ref(database, `${VIDEO_EXPORT_CODES_REF}/${normalizedKey}`), (currentCode) => {
            if (!currentCode) return;
            exists = true;
            return { ...currentCode, active };
        }, { applyLocally: false });
        return exists && result.committed;
    } catch (error) {
        console.error('Error toggling video export code:', error);
        return false;
    }
};

export const subscribeToVideoExportCodes = (callback: (codes: VideoExportCode[]) => void): (() => void) => {
    const unsubscribe = onValue(ref(database, VIDEO_EXPORT_CODES_REF), (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        const codes = Object.values(snapshot.val()) as VideoExportCode[];
        codes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(codes);
    });
    return unsubscribe;
};

const makeReservationId = () => {
    const bytes = new Uint8Array(6);
    if (window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return `${Date.now().toString(36)}-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
};

export const reserveVideoExportTurn = async (
    code: string,
    email: string,
    title: string,
    exportType: string
): Promise<{ ok: true; reservation: VideoExportReservation } | { ok: false; reason: string }> => {
    const normalizedCode = normalizeCode(code);
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedCode.startsWith('VIDX-')) {
        return { ok: false, reason: 'Mã xuất video phải bắt đầu bằng VIDX-.' };
    }
    if (!isValidVideoExportEmail(normalizedEmail)) {
        return { ok: false, reason: 'Vui lòng nhập đúng Gmail dùng mã xuất video.' };
    }

    const reservationId = makeReservationId();
    let failureReason = '';
    let reservation: VideoExportReservation | null = null;
    const now = new Date().toISOString();

    try {
        const resolvedCode = await resolveExistingVideoExportCode(normalizedCode);
        if (!resolvedCode) {
            return { ok: false, reason: 'Mã không tồn tại hoặc đã nhập sai.' };
        }

        const result = await runTransaction(ref(database, `${VIDEO_EXPORT_CODES_REF}/${resolvedCode}`), (currentCode) => {
            if (!currentCode) {
                failureReason = 'Mã không tồn tại hoặc đã nhập sai.';
                return;
            }

            const codeData = currentCode as VideoExportCode;
            if (codeData.active === false) {
                failureReason = 'Mã này đã bị thu hồi. Vui lòng liên hệ admin.';
                return;
            }

            const assignedEmail = codeData.usedBy ? normalizeEmail(codeData.usedBy) : '';
            if (assignedEmail && assignedEmail !== normalizedEmail) {
                failureReason = 'Mã này đã được gắn với Gmail khác. Mỗi mã chỉ dùng cho 1 Gmail.';
                return;
            }

            const exportLimit = Math.max(1, Number(codeData.exportLimit) || 1);
            const exportCount = Math.max(0, Number(codeData.exportCount) || 0);
            if (exportCount >= exportLimit) {
                failureReason = `Mã ${resolvedCode} đã hết lượt xuất (${exportCount}/${exportLimit}). Vui lòng mua thêm gói lượt.`;
                return;
            }

            reservation = {
                code: resolvedCode,
                email: normalizedEmail,
                reservationId,
                exportCount: exportCount + 1,
                exportLimit,
            };

            return {
                ...codeData,
                key: codeData.key || resolvedCode,
                usedBy: assignedEmail || normalizedEmail,
                usedAt: codeData.usedAt || now,
                usageCount: assignedEmail === normalizedEmail ? (Number(codeData.usageCount) || 1) : (Number(codeData.usageCount) || 0) + 1,
                exportCount: exportCount + 1,
                exportLimit,
                lastExportAt: now,
                lastExportBy: normalizedEmail,
                lastExportTitle: title || '',
                lastExportType: exportType,
                lastExportReservationId: reservationId,
            };
        }, { applyLocally: false });

        if (!result.committed || !reservation) {
            return { ok: false, reason: failureReason || 'Không giữ được lượt xuất. Vui lòng thử lại.' };
        }

        return { ok: true, reservation };
    } catch (error) {
        console.error('Error reserving video export turn:', error);
        return { ok: false, reason: 'Không kiểm tra được mã xuất. Vui lòng kiểm tra mạng hoặc liên hệ admin.' };
    }
};

export const rollbackVideoExportTurn = async (reservation: VideoExportReservation): Promise<void> => {
    if (!reservation?.code || !reservation?.reservationId) return;
    try {
        await runTransaction(ref(database, `${VIDEO_EXPORT_CODES_REF}/${normalizeCode(reservation.code)}`), (currentCode) => {
            if (!currentCode) return;
            const codeData = currentCode as VideoExportCode;
            if (codeData.lastExportReservationId !== reservation.reservationId) return;
            return {
                ...codeData,
                exportCount: Math.max((Number(codeData.exportCount) || 1) - 1, 0),
                lastExportReservationId: '',
            };
        }, { applyLocally: false });
    } catch (error) {
        console.error('Error rolling back video export turn:', error);
    }
};
