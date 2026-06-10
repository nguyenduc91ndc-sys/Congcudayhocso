import { get, onValue, ref, remove, runTransaction, set, update } from 'firebase/database';
import { database } from './firebaseConfig';
import { getOrCreateDeviceId } from './firebaseDeviceTrial';

export const INTERACTIVE_VIDEO_TRIAL_CODE = 'VIDEO-TRIAL-2026';
export const INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT = 3;

const TRIALS_REF = 'interactive_video_trials';
const EMAILS_REF = 'interactive_video_trial_emails';

export interface InteractiveVideoTrial {
    deviceId: string;
    trialCode: string;
    primaryEmail: string;
    emails: string[];
    startedAt: string;
    expiresAt?: string;
    active: boolean;
    exportUsageCount?: number;
    usageCount?: number;
    dailyUsage?: Record<string, number>;
    lastUsedAt?: string;
}

export interface InteractiveVideoTrialEmail {
    email: string;
    deviceId: string;
    trialCode: string;
    startedAt: string;
    expiresAt?: string;
    lastUsedAt?: string;
    exportUsageCount?: number;
}

export interface InteractiveVideoTrialStatus {
    deviceId: string;
    hasTrial: boolean;
    active: boolean;
    expired: boolean;
    blockedByEmail: boolean;
    todayKey: string;
    todayUsed: number;
    todayRemaining: number;
    daysLeft: number;
    primaryEmail?: string;
    emails: string[];
    expiresAt?: string;
    usageCount: number;
    remainingCount: number;
    trialLimit: number;
    message?: string;
}

export interface InteractiveVideoTrialAction {
    success: boolean;
    status: InteractiveVideoTrialStatus;
    message?: string;
}

const normalizeEmail = (email: string): string => email.toLowerCase().trim();

const getEmailKey = (email: string): string => {
    return normalizeEmail(email)
        .replace(/\./g, '_dot_')
        .replace(/@/g, '_at_')
        .replace(/[#$[\]/]/g, '_');
};

export const getVietnamDateKey = (date = new Date()): string => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

const getTrialUsageCount = (trial?: InteractiveVideoTrial | null): number => {
    if (!trial) return 0;
    return Math.max(0, Number(trial.exportUsageCount) || 0);
};

const buildStatus = (
    deviceId: string,
    trial: InteractiveVideoTrial | null,
    options: Partial<InteractiveVideoTrialStatus> = {}
): InteractiveVideoTrialStatus => {
    const todayKey = getVietnamDateKey();
    const usageCount = getTrialUsageCount(trial);
    const remainingCount = Math.max(0, INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT - usageCount);
    const expired = Boolean(trial && remainingCount <= 0);
    const active = Boolean(trial && trial.active !== false && !expired);

    return {
        deviceId,
        hasTrial: Boolean(trial),
        active,
        expired,
        blockedByEmail: false,
        todayKey,
        todayUsed: usageCount,
        todayRemaining: active ? remainingCount : 0,
        daysLeft: 0,
        primaryEmail: trial?.primaryEmail,
        emails: trial?.emails || [],
        expiresAt: trial?.expiresAt,
        usageCount,
        remainingCount: active ? remainingCount : 0,
        trialLimit: INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT,
        ...options,
    };
};

const getDeviceTrial = async (deviceId: string): Promise<InteractiveVideoTrial | null> => {
    const snapshot = await get(ref(database, `${TRIALS_REF}/${deviceId}`));
    return snapshot.exists() ? snapshot.val() as InteractiveVideoTrial : null;
};

const getEmailTrial = async (email: string): Promise<InteractiveVideoTrialEmail | null> => {
    const snapshot = await get(ref(database, `${EMAILS_REF}/${getEmailKey(email)}`));
    return snapshot.exists() ? snapshot.val() as InteractiveVideoTrialEmail : null;
};

const buildEmailTrialRecord = (email: string, trial: InteractiveVideoTrial): InteractiveVideoTrialEmail => {
    const record: InteractiveVideoTrialEmail = {
        email: normalizeEmail(email),
        deviceId: trial.deviceId,
        trialCode: trial.trialCode,
        startedAt: trial.startedAt,
        exportUsageCount: getTrialUsageCount(trial),
    };

    if (trial.expiresAt) record.expiresAt = trial.expiresAt;
    if (trial.lastUsedAt) record.lastUsedAt = trial.lastUsedAt;

    return record;
};

export const getInteractiveVideoTrialStatus = async (email?: string): Promise<InteractiveVideoTrialStatus> => {
    const deviceId = getOrCreateDeviceId();
    const trial = await getDeviceTrial(deviceId);

    if (email) {
        const normalizedEmail = normalizeEmail(email);
        const emailTrial = await getEmailTrial(normalizedEmail);

        if (emailTrial && emailTrial.deviceId !== deviceId) {
            return buildStatus(deviceId, trial, {
                active: false,
                blockedByEmail: true,
                todayRemaining: 0,
                message: 'Gmail này đã kích hoạt dùng thử trên thiết bị khác.',
            });
        }
    }

    return buildStatus(deviceId, trial);
};

export const activateInteractiveVideoTrial = async (email: string, code: string): Promise<InteractiveVideoTrialAction> => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.toUpperCase().trim();
    const deviceId = getOrCreateDeviceId();

    if (normalizedCode !== INTERACTIVE_VIDEO_TRIAL_CODE) {
        return {
            success: false,
            status: await getInteractiveVideoTrialStatus(normalizedEmail),
            message: 'Mã dùng thử chưa đúng.',
        };
    }

    const [currentTrial, emailTrial] = await Promise.all([
        getDeviceTrial(deviceId),
        getEmailTrial(normalizedEmail),
    ]);

    if (emailTrial && emailTrial.deviceId !== deviceId) {
        return {
            success: false,
            status: await getInteractiveVideoTrialStatus(normalizedEmail),
            message: 'Gmail này đã kích hoạt dùng thử trên thiết bị khác.',
        };
    }

    if (currentTrial) {
        if (currentTrial.active === false) {
            return {
                success: false,
                status: buildStatus(deviceId, currentTrial, { active: false }),
                message: 'Thiết bị này đã bị thu hồi quyền dùng thử. Vui lòng liên hệ admin.',
            };
        }

        if (getTrialUsageCount(currentTrial) >= INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT) {
            return {
                success: false,
                status: buildStatus(deviceId, currentTrial),
                message: 'Thiết bị này đã dùng hết 3 lần xuất thử.',
            };
        }

        const emails = Array.from(new Set([...(currentTrial.emails || []), normalizedEmail]));
        await update(ref(database, `${TRIALS_REF}/${deviceId}`), { emails });
        await set(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`), buildEmailTrialRecord(normalizedEmail, {
            ...currentTrial,
            emails,
        }));

        return {
            success: true,
            status: await getInteractiveVideoTrialStatus(normalizedEmail),
            message: 'Thiết bị này đã có dùng thử, hệ thống tiếp tục dùng số lượt còn lại.',
        };
    }

    const now = new Date();
    const trial: InteractiveVideoTrial = {
        deviceId,
        trialCode: INTERACTIVE_VIDEO_TRIAL_CODE,
        primaryEmail: normalizedEmail,
        emails: [normalizedEmail],
        startedAt: now.toISOString(),
        active: true,
        exportUsageCount: 0,
        usageCount: 0,
        dailyUsage: {},
    };

    await Promise.all([
        set(ref(database, `${TRIALS_REF}/${deviceId}`), trial),
        set(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`), {
            email: normalizedEmail,
            deviceId,
            trialCode: trial.trialCode,
            startedAt: trial.startedAt,
            exportUsageCount: trial.exportUsageCount,
        }),
    ]);

    return {
        success: true,
        status: await getInteractiveVideoTrialStatus(normalizedEmail),
        message: 'Đã kích hoạt dùng thử Video tương tác.',
    };
};

export const useInteractiveVideoTrialTurn = async (email: string): Promise<InteractiveVideoTrialAction> => {
    const normalizedEmail = normalizeEmail(email);
    const deviceId = getOrCreateDeviceId();
    const emailTrial = await getEmailTrial(normalizedEmail);

    if (emailTrial && emailTrial.deviceId !== deviceId) {
        return {
            success: false,
            status: await getInteractiveVideoTrialStatus(normalizedEmail),
            message: 'Gmail này đã kích hoạt dùng thử trên thiết bị khác.',
        };
    }

    let message = '';
    let success = false;

    await runTransaction(ref(database, `${TRIALS_REF}/${deviceId}`), (currentData: InteractiveVideoTrial | null) => {
        if (!currentData) {
            message = 'Bạn cần nhập mã dùng thử trước.';
            return currentData;
        }

        if (currentData.active === false) {
            message = 'Quyền dùng thử của thiết bị này đã bị thu hồi.';
            return currentData;
        }

        const todayKey = getVietnamDateKey();
        const dailyUsage = currentData.dailyUsage || {};
        const todayUsed = dailyUsage[todayKey] || 0;
        const usageCount = getTrialUsageCount(currentData);

        if (usageCount >= INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT) {
            message = 'Thiết bị này đã dùng hết 3 lần xuất thử.';
            return currentData;
        }

        success = true;
        message = 'Đã trừ 1 lượt dùng thử.';

        return {
            ...currentData,
            emails: Array.from(new Set([...(currentData.emails || []), normalizedEmail])),
            exportUsageCount: usageCount + 1,
            usageCount: usageCount + 1,
            dailyUsage: {
                ...dailyUsage,
                [todayKey]: todayUsed + 1,
            },
            lastUsedAt: new Date().toISOString(),
        };
    });

    if (success) {
        const trial = await getDeviceTrial(deviceId);
        if (trial) {
            await set(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`), buildEmailTrialRecord(normalizedEmail, trial));
        }
    }

    return {
        success,
        status: await getInteractiveVideoTrialStatus(normalizedEmail),
        message,
    };
};

export const subscribeToInteractiveVideoTrials = (callback: (trials: InteractiveVideoTrial[]) => void) => {
    return onValue(ref(database, TRIALS_REF), (snapshot) => {
        const value = snapshot.val() || {};
        const trials = Object.values(value) as InteractiveVideoTrial[];
        trials.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        callback(trials);
    });
};

export const subscribeToInteractiveVideoTrialEmails = (callback: (accounts: InteractiveVideoTrialEmail[]) => void) => {
    return onValue(ref(database, EMAILS_REF), (snapshot) => {
        const value = snapshot.val() || {};
        const accounts = Object.values(value) as InteractiveVideoTrialEmail[];
        accounts.sort((a, b) => {
            const dateA = a.lastUsedAt || a.startedAt;
            const dateB = b.lastUsedAt || b.startedAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        callback(accounts);
    });
};

export const setInteractiveVideoTrialActive = async (deviceId: string, active: boolean): Promise<void> => {
    await update(ref(database, `${TRIALS_REF}/${deviceId}`), { active });
};

export const deleteInteractiveVideoTrialAccount = async (email: string, deviceId: string): Promise<void> => {
    const normalizedEmail = normalizeEmail(email);
    const trial = await getDeviceTrial(deviceId);

    await remove(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`));

    if (!trial || trial.deviceId !== deviceId) return;

    const remainingEmails = (trial.emails || []).filter((item) => normalizeEmail(item) !== normalizedEmail);
    if (remainingEmails.length === 0) {
        await remove(ref(database, `${TRIALS_REF}/${deviceId}`));
        return;
    }

    await update(ref(database, `${TRIALS_REF}/${deviceId}`), {
        emails: remainingEmails,
        primaryEmail: normalizeEmail(trial.primaryEmail) === normalizedEmail ? remainingEmails[0] : trial.primaryEmail,
    });
};

export const extendInteractiveVideoTrial = async (deviceId: string): Promise<void> => {
    const trial = await getDeviceTrial(deviceId);
    if (!trial) return;

    await update(ref(database, `${TRIALS_REF}/${deviceId}`), {
        active: true,
        exportUsageCount: 0,
        usageCount: 0,
        dailyUsage: {},
    });

    await Promise.all((trial.emails || []).map((email) => (
        update(ref(database, `${EMAILS_REF}/${getEmailKey(email)}`), { deviceId, exportUsageCount: 0 })
    )));
};

export const resetInteractiveVideoTrialToday = async (deviceId: string): Promise<void> => {
    const trial = await getDeviceTrial(deviceId);
    if (!trial) return;

    await update(ref(database, `${TRIALS_REF}/${deviceId}`), {
        exportUsageCount: 0,
        usageCount: 0,
        dailyUsage: {},
        active: true,
    });

    await Promise.all((trial.emails || []).map((email) => (
        update(ref(database, `${EMAILS_REF}/${getEmailKey(email)}`), { exportUsageCount: 0 })
    )));
};
