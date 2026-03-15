import { ref, get, set, onValue, off } from 'firebase/database';
import { database } from './firebaseConfig';

// Danh sách tất cả app IDs
export const ALL_APP_IDS = [
    'interactiveVideo', 'beeGame', 'beeGameEditable', 'bacteriaGame',
    'vongQuay', 'kingGame', 'luckyWheel', 'starWheel',
    'videoStore', 'ngheNghiep', 'puzzleGame', 'treasureHunt', 'virtualExperiment',
    'clockExperiment', 'yogurtExperiment', 'earthSeasons',
    'aiCourseStore', 'canvaBasics', 'communityResources', 'kiemTraDaoVan',
    'heartSystem3D', 'geometry3DTools', 'vietnamMap', 'chucTet', 'denHung3D', 'thatLuong3D',
    'bangCuuChuong', 'gameTuongTac',
    'phongTranh3D', // Phòng Tranh 3D tùy chỉnh
    'sangKienKinhNghiem', // Viết SKKN & Báo Cáo
    'nhanXetTT27', // Nhận Xét TT27
] as const;

export type AppId = typeof ALL_APP_IDS[number];

// Thông tin hiển thị app
export const APP_INFO: Record<AppId, { name: string; icon: string; section: string }> = {
    // ── Công cụ dạy học ──
    interactiveVideo: { name: 'Video tương tác', icon: '🎥', section: 'Công cụ dạy học' },
    beeGame: { name: 'Ong về Tổ', icon: '🐝', section: 'Công cụ dạy học' },
    beeGameEditable: { name: 'Ong về Tổ (Tự soạn)', icon: '🐝📝', section: 'Công cụ dạy học' },
    bacteriaGame: { name: 'Vi Khuẩn Phiêu Lưu', icon: '🦠', section: 'Công cụ dạy học' },
    vongQuay: { name: 'Vòng quay', icon: '🔄', section: 'Công cụ dạy học' },
    kingGame: { name: 'Đường đến Ngôi Vua', icon: '👑', section: 'Công cụ dạy học' },
    luckyWheel: { name: 'Vòng quay may mắn', icon: '🎡', section: 'Công cụ dạy học' },
    starWheel: { name: 'Vòng Xoay Ngôi Sao', icon: '⭐', section: 'Công cụ dạy học' },
    puzzleGame: { name: 'Giải Mã Bức Tranh', icon: '🧩', section: 'Công cụ dạy học' },
    treasureHunt: { name: 'Truy Tìm Kho Báu', icon: '🏴‍☠️', section: 'Công cụ dạy học' },
    videoStore: { name: 'Kho Video AI', icon: '🎬', section: 'Công cụ dạy học' },
    // ── Mô phỏng khoa học ──
    virtualExperiment: { name: 'Thí nghiệm ảo tách muối', icon: '🧪', section: 'Mô phỏng khoa học' },
    clockExperiment: { name: 'Xem Giờ Trên Đồng Hồ', icon: '⏰', section: 'Mô phỏng khoa học' },
    yogurtExperiment: { name: 'Thí nghiệm làm Sữa chua', icon: '🧫', section: 'Mô phỏng khoa học' },
    earthSeasons: { name: 'Chuyển động Trái Đất', icon: '🌍', section: 'Mô phỏng khoa học' },
    // ── Khóa học & AI ──
    aiCourseStore: { name: 'Kho Khóa học AI', icon: '🎓', section: 'Khóa học & AI' },
    ngheNghiep: { name: 'Nghề Nghiệp Tương Lai', icon: '👨‍🚀', section: 'Khóa học & AI' },
    canvaBasics: { name: 'Canva cơ bản', icon: '🎨', section: 'Khóa học & AI' },
    chucTet: { name: 'Mẫu Chúc Tết', icon: '🎊', section: 'Khóa học & AI' },
    communityResources: { name: 'Kho tài nguyên cộng đồng', icon: '👥', section: 'Khóa học & AI' },
    kiemTraDaoVan: { name: 'Thẩm Văn AI', icon: '🔍', section: 'Khóa học & AI' },
    // ── Ứng dụng 3D & VR ──
    heartSystem3D: { name: 'Hệ tuần hoàn 3D', icon: '❤️', section: 'Ứng dụng 3D & VR' },
    geometry3DTools: { name: 'Bộ công cụ Hình học 3D', icon: '📦', section: 'Ứng dụng 3D & VR' },
    vietnamMap: { name: 'Bản đồ Việt Nam', icon: '🗺️', section: 'Ứng dụng 3D & VR' },
    denHung3D: { name: 'Phòng Tranh 3D - Đền Hùng', icon: '🏛️', section: 'Ứng dụng 3D & VR' },
    thatLuong3D: { name: 'Mô hình 3D - Thạt Luổng', icon: '🕍', section: 'Ứng dụng 3D & VR' },
    // ── Học liệu tương tác ──
    bangCuuChuong: { name: 'Bảng Cửu Chương Số', icon: '🔢', section: 'Học liệu tương tác' },
    gameTuongTac: { name: 'Game Tương Tác', icon: '🎮', section: 'Học liệu tương tác' },
    // ── Phòng Tranh 3D ──
    phongTranh3D: { name: 'Phòng Tranh 3D', icon: '🖼️', section: 'Ứng dụng 3D & VR' },
    sangKienKinhNghiem: { name: 'Viết SKKN & Báo Cáo', icon: '✍️', section: 'Khóa học & AI' },
    nhanXetTT27: { name: 'Nhận Xét TT27', icon: '📝', section: 'Khóa học & AI' },
};


export interface AppVisibilityState {
    apps: Record<string, boolean>; // appId -> visible
    maintenanceMode: boolean;
    maintenanceMessage: string;
    showUpdateNotification?: boolean;
}

const DEFAULT_STATE: AppVisibilityState = {
    apps: Object.fromEntries(ALL_APP_IDS.map(id => [id, true])),
    maintenanceMode: false,
    maintenanceMessage: '🔧 Website đang bảo trì, vui lòng quay lại sau. Xin cảm ơn!',
    showUpdateNotification: false,
};

// Lấy trạng thái visibility
export const getAppVisibility = async (): Promise<AppVisibilityState> => {
    try {
        const snapshot = await get(ref(database, 'app_visibility'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return {
                apps: { ...DEFAULT_STATE.apps, ...(data.apps || {}) },
                maintenanceMode: data.maintenanceMode || false,
                maintenanceMessage: data.maintenanceMessage || DEFAULT_STATE.maintenanceMessage,
                showUpdateNotification: data.showUpdateNotification !== undefined ? data.showUpdateNotification : false,
            };
        }
        return DEFAULT_STATE;
    } catch (error) {
        console.error('Error getting app visibility:', error);
        return DEFAULT_STATE;
    }
};

// Bật/tắt 1 app
export const setAppVisible = async (appId: string, visible: boolean): Promise<void> => {
    try {
        await set(ref(database, `app_visibility/apps/${appId}`), visible);
    } catch (error) {
        console.error('Error setting app visibility:', error);
    }
};

// Bật/tắt tất cả app
export const setAllAppsVisible = async (visible: boolean): Promise<void> => {
    try {
        const apps = Object.fromEntries(ALL_APP_IDS.map(id => [id, visible]));
        await set(ref(database, 'app_visibility/apps'), apps);
    } catch (error) {
        console.error('Error setting all apps visibility:', error);
    }
};

// Bật/tắt chế độ bảo trì
export const setMaintenanceMode = async (enabled: boolean, message?: string): Promise<void> => {
    try {
        await set(ref(database, 'app_visibility/maintenanceMode'), enabled);
        if (message !== undefined) {
            await set(ref(database, 'app_visibility/maintenanceMessage'), message);
        }
    } catch (error) {
        console.error('Error setting maintenance mode:', error);
    }
};

// Subscribe realtime
export const subscribeToAppVisibility = (callback: (state: AppVisibilityState) => void): (() => void) => {
    const dbRef = ref(database, 'app_visibility');
    const listener = onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            callback({
                apps: { ...DEFAULT_STATE.apps, ...(data.apps || {}) },
                maintenanceMode: data.maintenanceMode || false,
                maintenanceMessage: data.maintenanceMessage || DEFAULT_STATE.maintenanceMessage,
                showUpdateNotification: data.showUpdateNotification !== undefined ? data.showUpdateNotification : false,
            });
        } else {
            callback(DEFAULT_STATE);
        }
    });

    return () => off(dbRef);
};

// Toggle banner cập nhật
export const setUpdateNotification = async (visible: boolean): Promise<void> => {
    try {
        await set(ref(database, 'app_visibility/showUpdateNotification'), visible);
    } catch (error) {
        console.error('Error setting update notification:', error);
    }
};
