/**
 * Firebase Visitor Logs
 * Lưu danh sách người dùng gần đây trên Firebase
 */
import { database } from './firebaseConfig';
import { ref, get, set, push, query, orderByChild, limitToLast, startAt } from 'firebase/database';

const VISITORS_REF = 'visitorLogs';

export interface FirebaseVisitor {
    id: string;
    name: string;
    avatar: string;
    email?: string;
    loginTime: string;
    device: string;
}

/**
 * Lấy thông tin thiết bị
 */
const getDeviceInfo = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'MacOS';
    return 'Unknown';
};

/**
 * Ghi log visitor mới vào Firebase
 */
export const logVisitorToFirebase = async (
    userId: string,
    userName: string,
    userAvatar: string,
    userEmail?: string
): Promise<void> => {
    try {
        const visitorRef = ref(database, VISITORS_REF);
        const newVisitorRef = push(visitorRef);

        const visitor: FirebaseVisitor = {
            id: userId,
            name: userName,
            avatar: userAvatar,
            email: userEmail || '',
            loginTime: new Date().toISOString(),
            device: getDeviceInfo(),
        };

        await set(newVisitorRef, visitor);
    } catch (error) {
        console.error('Error logging visitor to Firebase:', error);
    }
};

/**
 * Lấy danh sách visitor gần đây (giới hạn 50)
 */
export const getRecentVisitors = async (limit: number = 50): Promise<FirebaseVisitor[]> => {
    try {
        const visitorsRef = ref(database, VISITORS_REF);
        const snapshot = await get(visitorsRef);

        if (!snapshot.exists()) {
            return [];
        }

        const visitors: FirebaseVisitor[] = [];
        snapshot.forEach((child) => {
            visitors.push(child.val() as FirebaseVisitor);
        });

        // Sắp xếp theo thời gian mới nhất và giới hạn
        return visitors
            .sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime())
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting recent visitors:', error);
        return [];
    }
};

/**
 * Đếm tổng số unique visitors
 */
export const getUniqueVisitorCount = async (): Promise<number> => {
    try {
        const visitors = await getRecentVisitors(1000);
        const uniqueIds = new Set(visitors.map(v => v.id));
        return uniqueIds.size;
    } catch (error) {
        console.error('Error counting unique visitors:', error);
        return 0;
    }
};

// ===============================
// LỊCH SỬ ĐĂNG NHẬP LÂU DÀI (1 NĂM)
// ===============================

const LOGIN_HISTORY_REF = 'loginHistory';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000; // 1 năm tính bằng milliseconds

export interface LoginHistoryEntry {
    id: string;
    name: string;
    email: string;
    avatar: string;
    loginTime: number; // timestamp
    device: string;
}

/**
 * Ghi log đăng nhập vào lịch sử lâu dài
 */
export const logLoginHistory = async (
    userId: string,
    userName: string,
    userEmail: string,
    userAvatar: string
): Promise<void> => {
    try {
        const historyRef = ref(database, LOGIN_HISTORY_REF);
        const newEntryRef = push(historyRef);

        const entry: LoginHistoryEntry = {
            id: userId,
            name: userName,
            email: userEmail || '',
            avatar: userAvatar,
            loginTime: Date.now(),
            device: getDeviceInfo(),
        };

        await set(newEntryRef, entry);
    } catch (error) {
        console.error('Error logging to login history:', error);
    }
};

/**
 * Lấy lịch sử đăng nhập (phân trang)
 */
export const getLoginHistory = async (limit: number = 100): Promise<LoginHistoryEntry[]> => {
    try {
        const historyRef = ref(database, LOGIN_HISTORY_REF);
        const snapshot = await get(historyRef);

        if (!snapshot.exists()) {
            return [];
        }

        const entries: LoginHistoryEntry[] = [];
        const oneYearAgo = Date.now() - ONE_YEAR_MS;

        snapshot.forEach((child) => {
            const entry = child.val() as LoginHistoryEntry;
            // Chỉ lấy entries trong vòng 1 năm
            if (entry.loginTime >= oneYearAgo) {
                entries.push(entry);
            }
        });

        // Sắp xếp theo thời gian mới nhất
        return entries
            .sort((a, b) => b.loginTime - a.loginTime)
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting login history:', error);
        return [];
    }
};

/**
 * Tìm kiếm lịch sử đăng nhập theo tên hoặc email
 */
export const searchLoginHistory = async (
    searchTerm: string,
    limit: number = 100
): Promise<LoginHistoryEntry[]> => {
    try {
        const allHistory = await getLoginHistory(1000); // Lấy nhiều để search
        const lowerSearch = searchTerm.toLowerCase().trim();

        if (!lowerSearch) {
            return allHistory.slice(0, limit);
        }

        return allHistory
            .filter(entry =>
                entry.name.toLowerCase().includes(lowerSearch) ||
                entry.email.toLowerCase().includes(lowerSearch)
            )
            .slice(0, limit);
    } catch (error) {
        console.error('Error searching login history:', error);
        return [];
    }
};

/**
 * Xóa các records quá 1 năm (gọi định kỳ hoặc khi cần)
 */
export const cleanupOldHistory = async (): Promise<number> => {
    try {
        const historyRef = ref(database, LOGIN_HISTORY_REF);
        const snapshot = await get(historyRef);

        if (!snapshot.exists()) {
            return 0;
        }

        const oneYearAgo = Date.now() - ONE_YEAR_MS;
        let deletedCount = 0;

        const updates: { [key: string]: null } = {};
        snapshot.forEach((child) => {
            const entry = child.val() as LoginHistoryEntry;
            if (entry.loginTime < oneYearAgo) {
                updates[child.key!] = null;
                deletedCount++;
            }
        });

        if (Object.keys(updates).length > 0) {
            const { update } = await import('firebase/database');
            await update(historyRef, updates);
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning up old history:', error);
        return 0;
    }
};

/**
 * Đếm số lượt đăng nhập hôm nay
 */
export const getTodayLoginCount = async (): Promise<number> => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTimestamp = startOfDay.getTime();

        const loginRef = ref(database, 'loginHistory');
        // Lấy 500 login gần nhất để filter client-side
        // Điều này giúp tránh vấn đề index nếu chưa được cấu hình
        const recentLoginsQuery = query(
            loginRef,
            orderByChild('loginTime'),
            limitToLast(500)
        );

        const snapshot = await get(recentLoginsQuery);

        if (!snapshot.exists()) return 0;

        let todayCount = 0;
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        snapshot.forEach((child) => {
            const entry = child.val();
            const entryDate = new Date(entry.loginTime);
            if (
                entryDate.getDate() === todayDate &&
                entryDate.getMonth() === todayMonth &&
                entryDate.getFullYear() === todayYear
            ) {
                todayCount++;
            }
        });

        return todayCount;
    } catch (error) {
        console.error('Error getting today login count:', error);
        return 0;
    }
};

/**
 * Đếm số người dùng duy nhất (Unique Visitors)
 */
export const getUniqueUserCount = async (): Promise<number> => {
    try {
        const loginRef = ref(database, 'loginHistory');
        // Lưu ý: Lấy toàn bộ history để đếm unique user có thể tốn kém nếu dữ liệu lớn
        // Có thể tối ưu bằng cách duy trì một node riêng đếm unique users sau này
        const snapshot = await get(loginRef);

        if (!snapshot.exists()) return 0;

        const uniqueUsers = new Set<string>();
        snapshot.forEach((child) => {
            const val = child.val();
            // Ưu tiên dùng email làm định danh, nếu không có thì dùng tên
            const identifier = val.email || val.name;
            if (identifier) {
                uniqueUsers.add(identifier);
            }
        });

        return uniqueUsers.size;
    } catch (error) {
        console.error('Error getting unique user count:', error);
        return 0;
    }
};

/**
 * Đếm tổng số lượt đăng nhập trong lịch sử
 */
export const getLoginHistoryCount = async (): Promise<number> => {
    try {
        const history = await getLoginHistory(10000);
        return history.length;
    } catch (error) {
        console.error('Error counting login history:', error);
        return 0;
    }
};

/**
 * Migration: Copy dữ liệu từ visitorLogs (cũ) sang loginHistory (mới)
 * Chỉ chạy 1 lần để import dữ liệu lịch sử
 */
export const migrateVisitorLogsToHistory = async (): Promise<number> => {
    try {
        // Kiểm tra xem đã migrate chưa
        const migrationFlagRef = ref(database, 'migrations/visitorLogsToHistory');
        const flagSnapshot = await get(migrationFlagRef);
        if (flagSnapshot.exists() && flagSnapshot.val() === true) {
            console.log('Migration already completed.');
            return 0;
        }

        // Lấy tất cả visitor logs
        const visitorsRef = ref(database, VISITORS_REF);
        const snapshot = await get(visitorsRef);

        if (!snapshot.exists()) {
            console.log('No visitor logs to migrate.');
            await set(migrationFlagRef, true);
            return 0;
        }

        const historyRef = ref(database, LOGIN_HISTORY_REF);
        let migratedCount = 0;

        // Duyệt qua từng visitor và copy sang loginHistory
        const promises: Promise<void>[] = [];
        snapshot.forEach((child) => {
            const visitor = child.val() as FirebaseVisitor;
            const newEntryRef = push(historyRef);

            // Chuyển đổi format từ FirebaseVisitor sang LoginHistoryEntry
            const entry: LoginHistoryEntry = {
                id: visitor.id,
                name: visitor.name,
                email: visitor.email || '',
                avatar: visitor.avatar,
                loginTime: new Date(visitor.loginTime).getTime(), // Convert ISO string to timestamp
                device: visitor.device,
            };

            promises.push(set(newEntryRef, entry));
            migratedCount++;
        });

        await Promise.all(promises);

        // Đánh dấu đã migrate
        await set(migrationFlagRef, true);
        console.log(`Migration completed: ${migratedCount} records migrated.`);

        return migratedCount;
    } catch (error) {
        console.error('Error migrating visitor logs:', error);
        return 0;
    }
};

/**
 * Tự động kiểm tra và migrate nếu cần (gọi 1 lần khi app khởi động)
 */
export const checkAndMigrateIfNeeded = async (): Promise<void> => {
    try {
        const migrationFlagRef = ref(database, 'migrations/visitorLogsToHistory');
        const flagSnapshot = await get(migrationFlagRef);

        if (!flagSnapshot.exists() || flagSnapshot.val() !== true) {
            console.log('Starting migration...');
            const count = await migrateVisitorLogsToHistory();
            console.log(`Migrated ${count} records.`);
        }
    } catch (error) {
        console.error('Error checking migration status:', error);
    }
};
