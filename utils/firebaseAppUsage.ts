import { get, push, ref, set } from 'firebase/database';
import { database } from './firebaseConfig';
import { AppId, APP_INFO } from './firebaseAppVisibility';

const APP_USAGE_REF = 'appUsageLogs';

export interface AppUsageLog {
    id?: string;
    appId: AppId;
    appName: string;
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: number;
    date: string;
    device: string;
}

export interface AppUsageSummary {
    appId: AppId;
    appName: string;
    section: string;
    total: number;
    today: number;
    last7Days: number;
    uniqueUsers: number;
    lastUsedAt?: number;
    recentUsers?: AppUsageRecentUser[];
}

export interface AppUsageRecentUser {
    userName: string;
    userEmail: string;
    userId: string;
    lastUsedAt: number;
    device: string;
}

const getDeviceInfo = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'MacOS';
    return 'Unknown';
};

const getDateKey = (time = Date.now()) => new Date(time).toISOString().slice(0, 10);

export const logAppUsage = async (
    appId: AppId,
    user: { id?: string; name?: string; email?: string } | null
): Promise<void> => {
    try {
        const now = Date.now();
        const itemRef = push(ref(database, APP_USAGE_REF));
        const info = APP_INFO[appId];
        const log: AppUsageLog = {
            appId,
            appName: info?.name || appId,
            userId: user?.id || user?.email || 'guest',
            userName: user?.name || 'Khách',
            userEmail: user?.email || '',
            timestamp: now,
            date: getDateKey(now),
            device: getDeviceInfo(),
        };

        await set(itemRef, log);
    } catch (error) {
        console.error('Error logging app usage:', error);
    }
};

export const getAppUsageSummaries = async (): Promise<AppUsageSummary[]> => {
    try {
        const snapshot = await get(ref(database, APP_USAGE_REF));
        const today = getDateKey();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const summaryMap = new Map<AppId, AppUsageSummary & { users: Set<string> }>();

        Object.keys(APP_INFO).forEach((id) => {
            const appId = id as AppId;
            const info = APP_INFO[appId];
            summaryMap.set(appId, {
                appId,
                appName: info.name,
                section: info.section,
                total: 0,
                today: 0,
                last7Days: 0,
                uniqueUsers: 0,
                lastUsedAt: undefined,
                recentUsers: [],
                users: new Set<string>(),
            });
        });

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const log = child.val() as AppUsageLog;
                if (!log.appId) return;

                const appId = log.appId;
                const info = APP_INFO[appId];
                if (!info) return;

                const current = summaryMap.get(appId) || {
                    appId,
                    appName: info.name,
                    section: info.section,
                    total: 0,
                    today: 0,
                    last7Days: 0,
                    uniqueUsers: 0,
                    lastUsedAt: undefined,
                    recentUsers: [],
                    users: new Set<string>(),
                };

                const timestamp = Number(log.timestamp || 0);
                current.total += 1;
                if (log.date === today) current.today += 1;
                if (timestamp >= sevenDaysAgo) current.last7Days += 1;
                if (!current.lastUsedAt || timestamp > current.lastUsedAt) current.lastUsedAt = timestamp;
                current.users.add(log.userEmail || log.userId || log.userName);
                current.recentUsers = [
                    ...(current.recentUsers || []),
                    {
                        userName: log.userName || 'Khách',
                        userEmail: log.userEmail || '',
                        userId: log.userId || 'guest',
                        lastUsedAt: timestamp,
                        device: log.device || 'Unknown',
                    }
                ];
                summaryMap.set(appId, current);
            });
        }

        return Array.from(summaryMap.values())
            .map(({ users, ...item }) => {
                const seen = new Set<string>();
                const recentUsers = (item.recentUsers || [])
                    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
                    .filter(user => {
                        const key = user.userEmail || user.userId || user.userName;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    })
                    .slice(0, 3);

                return { ...item, uniqueUsers: users.size, recentUsers };
            })
            .sort((a, b) => b.total - a.total);
    } catch (error) {
        console.error('Error getting app usage summaries:', error);
        return [];
    }
};
