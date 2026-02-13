import { ref, get, set, onValue, off } from 'firebase/database';
import { database } from './firebaseConfig';

// Danh sách tất cả app IDs
export const ALL_APP_IDS = [
    'interactiveVideo', 'beeGame', 'beeGameEditable', 'bacteriaGame',
    'geometry3D', 'vongQuay', 'kingGame', 'luckyWheel', 'starWheel',
    'videoStore', 'ngheNghiep', 'puzzleGame', 'treasureHunt', 'virtualExperiment',
    'aiCourseStore', 'canvaBasics', 'communityResources',
    'heartSystem3D', 'geometry3DTools', 'vietnamMap', 'chucTet', 'denHung3D'
] as const;

export type AppId = typeof ALL_APP_IDS[number];

// Thông tin hiển thị app
export const APP_INFO: Record<AppId, { name: string; icon: string; section: string }> = {
    interactiveVideo: { name: 'Video tương tác', icon: '🎥', section: 'Công cụ dạy học' },
    beeGame: { name: 'Ong về Tổ', icon: '🐝', section: 'Công cụ dạy học' },
    beeGameEditable: { name: 'Ong về Tổ (Tự soạn)', icon: '🐝📝', section: 'Công cụ dạy học' },
    bacteriaGame: { name: 'Vi Khuẩn Phiêu Lưu', icon: '🦠', section: 'Công cụ dạy học' },
    geometry3D: { name: 'Hình học 3D', icon: '📐', section: 'Công cụ dạy học' },
    vongQuay: { name: 'Vòng quay', icon: '🔄', section: 'Công cụ dạy học' },
    kingGame: { name: 'Đường đến Ngôi Vua', icon: '👑', section: 'Công cụ dạy học' },
    luckyWheel: { name: 'Vòng quay may mắn', icon: '🎡', section: 'Công cụ dạy học' },
    starWheel: { name: 'Vòng Xoay Ngôi Sao', icon: '⭐', section: 'Công cụ dạy học' },
    videoStore: { name: 'Kho Video AI', icon: '🎬', section: 'Công cụ dạy học' },
    ngheNghiep: { name: 'Nghề Nghiệp Tương Lai', icon: '👨‍🚀', section: 'Công cụ dạy học' },
    puzzleGame: { name: 'Giải Mã Bức Tranh', icon: '🧩', section: 'Công cụ dạy học' },
    treasureHunt: { name: 'Truy Tìm Kho Báu', icon: '🏴‍☠️', section: 'Công cụ dạy học' },
    virtualExperiment: { name: 'Thí nghiệm ảo', icon: '🧪', section: 'Công cụ dạy học' },
    aiCourseStore: { name: 'Kho Khóa học AI', icon: '🎓', section: 'Khóa học AI' },
    canvaBasics: { name: 'Canva cơ bản', icon: '🎨', section: 'Khóa học AI' },
    communityResources: { name: 'Kho tài nguyên cộng đồng', icon: '👥', section: 'Khóa học AI' },
    heartSystem3D: { name: 'Hệ tuần hoàn 3D', icon: '❤️', section: 'Ứng dụng 3D' },
    geometry3DTools: { name: 'Bộ công cụ Hình học 3D', icon: '📦', section: 'Ứng dụng 3D' },
    vietnamMap: { name: 'Bản đồ Việt Nam', icon: '🗺️', section: 'Ứng dụng 3D' },
    chucTet: { name: 'Mẫu Chúc Tết', icon: '🎊', section: 'Ứng dụng 3D' },
    denHung3D: { name: 'Phòng Tranh 3D - Đền Hùng', icon: '🏛️', section: 'Ứng dụng 3D' },
};

export interface AppVisibilityState {
    apps: Record<string, boolean>; // appId -> visible
    maintenanceMode: boolean;
    maintenanceMessage: string;
}

const DEFAULT_STATE: AppVisibilityState = {
    apps: Object.fromEntries(ALL_APP_IDS.map(id => [id, true])),
    maintenanceMode: false,
    maintenanceMessage: '🔧 Website đang bảo trì, vui lòng quay lại sau. Xin cảm ơn!',
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
            });
        } else {
            callback(DEFAULT_STATE);
        }
    });

    return () => off(dbRef);
};
