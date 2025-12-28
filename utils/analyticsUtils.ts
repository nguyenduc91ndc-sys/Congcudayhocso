/**
 * Utility theo dõi thống kê sử dụng ứng dụng
 */

export interface VisitorLog {
    id: string;
    name: string;
    avatar: string;
    loginTime: string;
    device: string;
}

export interface Analytics {
    totalVisits: number;
    uniqueVisitors: number;
    todayVisits: number;
    recentVisitors: VisitorLog[];
}

const STORAGE_KEY = 'ntd_analytics';
const MAX_RECENT_VISITORS = 50;

/**
 * Lấy thống kê hiện tại
 */
export const getAnalytics = (): Analytics => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        totalVisits: 0,
        uniqueVisitors: 0,
        todayVisits: 0,
        recentVisitors: [],
    };
};

/**
 * Ghi nhận lượt truy cập mới
 */
export const logVisit = (userId: string, userName: string, userAvatar: string): void => {
    const analytics = getAnalytics();
    const today = new Date().toLocaleDateString('vi-VN');

    // Tăng tổng lượt truy cập
    analytics.totalVisits++;

    // Kiểm tra unique visitor
    const existingVisitor = analytics.recentVisitors.find(v => v.id === userId);
    if (!existingVisitor) {
        analytics.uniqueVisitors++;
    }

    // Đếm lượt truy cập hôm nay
    const todayVisits = analytics.recentVisitors.filter(v =>
        v.loginTime.includes(today)
    ).length + 1;
    analytics.todayVisits = todayVisits;

    // Thêm vào danh sách gần đây
    const newVisitor: VisitorLog = {
        id: userId,
        name: userName,
        avatar: userAvatar,
        loginTime: new Date().toLocaleString('vi-VN'),
        device: getDeviceInfo(),
    };

    // Thêm vào đầu danh sách, giới hạn số lượng
    analytics.recentVisitors = [newVisitor, ...analytics.recentVisitors].slice(0, MAX_RECENT_VISITORS);

    // Lưu lại
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analytics));
};

/**
 * Lấy thông tin thiết bị đơn giản
 */
const getDeviceInfo = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'Mac';
    return 'Khác';
};

/**
 * Xóa toàn bộ thống kê
 */
export const clearAnalytics = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};
