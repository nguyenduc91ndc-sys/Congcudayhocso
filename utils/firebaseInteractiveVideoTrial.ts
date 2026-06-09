import { get, onValue, ref, runTransaction, set, update } from 'firebase/database';
import { database } from './firebaseConfig';
import { getOrCreateDeviceId } from './firebaseDeviceTrial';

export const INTERACTIVE_VIDEO_TRIAL_CODE = 'VIDEO-TRIAL-2026';
export const INTERACTIVE_VIDEO_TRIAL_DAYS = 3;
export const INTERACTIVE_VIDEO_DAILY_LIMIT = 3;

const TRIALS_REF = 'interactive_video_trials';
const EMAILS_REF = 'interactive_video_trial_emails';

export interface InteractiveVideoTrial {
    deviceId: string;
    trialCode: string;
    primaryEmail: string;
    emails: string[];
    startedAt: string;
    expiresAt: string;
    active: boolean;
    dailyUsage: Record<string, number>;
    lastUsedAt?: string;
}

export interface InteractiveVideoTrialEmail {
    email: string;
    deviceId: string;
    trialCode: string;
    startedAt: string;
    expiresAt: string;
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

const addDays = (date: Date, days: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const isExpired = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= Date.now();
};

const calculateDaysLeft = (expiresAt?: string): number => {
    if (!expiresAt) return 0;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

const buildStatus = (
    deviceId: string,
    trial: InteractiveVideoTrial | null,
    options: Partial<InteractiveVideoTrialStatus> = {}
): InteractiveVideoTrialStatus => {
    const todayKey = getVietnamDateKey();
    const todayUsed = trial?.dailyUsage?.[todayKey] || 0;
    const expired = isExpired(trial?.expiresAt);
    const active = Boolean(trial && trial.active !== false && !expired);

    return {
        deviceId,
        hasTrial: Boolean(trial),
        active,
        expired,
        blockedByEmail: false,
        todayKey,
        todayUsed,
        todayRemaining: active ? Math.max(0, INTERACTIVE_VIDEO_DAILY_LIMIT - todayUsed) : 0,
        daysLeft: calculateDaysLeft(trial?.expiresAt),
        primaryEmail: trial?.primaryEmail,
        emails: trial?.emails || [],
        expiresAt: trial?.expiresAt,
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

        if (isExpired(currentTrial.expiresAt)) {
            return {
                success: false,
                status: buildStatus(deviceId, currentTrial),
                message: 'Thiết bị này đã hết 3 ngày dùng thử.',
            };
        }

        const emails = Array.from(new Set([...(currentTrial.emails || []), normalizedEmail]));
        await update(ref(database, `${TRIALS_REF}/${deviceId}`), { emails });
        await set(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`), {
            email: normalizedEmail,
            deviceId,
            trialCode: currentTrial.trialCode,
            startedAt: currentTrial.startedAt,
            expiresAt: currentTrial.expiresAt,
        });

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
        expiresAt: addDays(now, INTERACTIVE_VIDEO_TRIAL_DAYS).toISOString(),
        active: true,
        dailyUsage: {},
    };

    await Promise.all([
        set(ref(database, `${TRIALS_REF}/${deviceId}`), trial),
        set(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`), {
            email: normalizedEmail,
            deviceId,
            trialCode: trial.trialCode,
            startedAt: trial.startedAt,
            expiresAt: trial.expiresAt,
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

        if (isExpired(currentData.expiresAt)) {
            message = 'Thiết bị này đã hết 3 ngày dùng thử.';
            return currentData;
        }

        const todayKey = getVietnamDateKey();
        const dailyUsage = currentData.dailyUsage || {};
        const todayUsed = dailyUsage[todayKey] || 0;

        if (todayUsed >= INTERACTIVE_VIDEO_DAILY_LIMIT) {
            message = 'Hôm nay thiết bị này đã dùng hết 3 lượt Video tương tác.';
            return currentData;
        }

        success = true;
        message = 'Đã trừ 1 lượt dùng thử.';

        return {
            ...currentData,
            emails: Array.from(new Set([...(currentData.emails || []), normalizedEmail])),
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
            await set(ref(database, `${EMAILS_REF}/${getEmailKey(normalizedEmail)}`), {
                email: normalizedEmail,
                deviceId,
                trialCode: trial.trialCode,
                startedAt: trial.startedAt,
                expiresAt: trial.expiresAt,
            });
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

export const setInteractiveVideoTrialActive = async (deviceId: string, active: boolean): Promise<void> => {
    await update(ref(database, `${TRIALS_REF}/${deviceId}`), { active });
};

export const extendInteractiveVideoTrial = async (deviceId: string, days = INTERACTIVE_VIDEO_TRIAL_DAYS): Promise<void> => {
    const trial = await getDeviceTrial(deviceId);
    if (!trial) return;

    const baseDate = isExpired(trial.expiresAt) ? new Date() : new Date(trial.expiresAt);
    const expiresAt = addDays(baseDate, days).toISOString();

    await update(ref(database, `${TRIALS_REF}/${deviceId}`), {
        expiresAt,
        active: true,
    });

    await Promise.all((trial.emails || []).map((email) => (
        update(ref(database, `${EMAILS_REF}/${getEmailKey(email)}`), { expiresAt })
    )));
};

export const resetInteractiveVideoTrialToday = async (deviceId: string): Promise<void> => {
    const trial = await getDeviceTrial(deviceId);
    if (!trial) return;

    await update(ref(database, `${TRIALS_REF}/${deviceId}`), {
        dailyUsage: {
            ...(trial.dailyUsage || {}),
            [getVietnamDateKey()]: 0,
        },
    });
};
