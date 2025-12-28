/**
 * Firebase Visitor Logs
 * Lưu danh sách người dùng gần đây trên Firebase
 */
import { database } from './firebaseConfig';
import { ref, get, set, push, query, orderByChild, limitToLast } from 'firebase/database';

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
