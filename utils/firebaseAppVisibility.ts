import { ref, get, set, onValue, off } from 'firebase/database';
import { database } from './firebaseConfig';

// Danh sách tất cả app IDs
export const ALL_APP_IDS = [
    'interactiveVideo', 'beeGame', 'beeGameEditable', 'bacteriaGame',
    'vongQuay', 'luckyWheel', 'starWheel',
    'videoStore', 'ngheNghiep', 'puzzleGame', 'treasureHunt', 'virtualExperiment',
    'clockExperiment', 'sensesExplorer', 'yogurtExperiment', 'earthSeasons',
    'phetForcesMotion', 'phetCircuitDc', 'phetStaticElectricity', 'phetMatterStates', 'phetDensity', 'phetBuildAtom',
    'aiCourseStore', 'soanGiaoAnNangLucSo', 'canvaBasics', 'communityResources', 'kiemTraDaoVan',
    'heartSystem3D', 'geometry3DTools', 'vietnamMap', 'phongTranh3D', 'chucTet', 'denHung3D', 'thatLuong3D',
    'dinhDocLap3D', 'solarSystem', 'hue360', 'hoiAn360', 'phongNha360', 'haLong360', 'ninhBinh360', 'kimLien360',
    'bangCuuChuong', 'soSanhSo', 'keoThaPhanLoai', 'gameTuongTac', 'gameTuyChinh', 'kyYeuCuoiNam', 'thiepMoiOnline',
    'qrGenerator',
    'nhayBaoBo', 'keoCoTriTue',
    'sangKienKinhNghiem', // Viết SKKN & Báo Cáo
    'nhanXetTT27', // Nhận Xét TT27
    'thuMoiTuongTac', // Thư Mời Tương Tác
    'thuMoiDauNam', // Thư Mời Họp Phụ Huynh Đầu Năm
] as const;

export type AppId = typeof ALL_APP_IDS[number];

// Thông tin hiển thị app
export const APP_INFO: Record<AppId, { name: string; icon: string; section: string }> = {
    qrGenerator: { name: 'Tạo mã QR', icon: '▦', section: 'Học liệu tương tác' },
    nhayBaoBo: { name: 'Nhảy Bao Bố', icon: '🏁', section: 'Công cụ dạy học' },
    keoCoTriTue: { name: 'Kéo Co Trí Tuệ', icon: '✊🖐️', section: 'Công cụ dạy học' },
    solarSystem: { name: 'Hệ Mặt Trời', icon: '🪐', section: 'Ứng dụng 3D & VR' },
    // ── Công cụ dạy học ──
    interactiveVideo: { name: 'Video tương tác', icon: '🎥', section: 'Công cụ dạy học' },
    beeGame: { name: 'Ong về Tổ', icon: '🐝', section: 'Công cụ dạy học' },
    beeGameEditable: { name: 'Ong về Tổ (Tự soạn)', icon: '🐝📝', section: 'Công cụ dạy học' },
    bacteriaGame: { name: 'Vi Khuẩn Phiêu Lưu', icon: '🦠', section: 'Công cụ dạy học' },
    vongQuay: { name: 'Vòng quay', icon: '🔄', section: 'Công cụ dạy học' },
    luckyWheel: { name: 'Vòng quay may mắn', icon: '🎡', section: 'Công cụ dạy học' },
    starWheel: { name: 'Vòng Xoay Ngôi Sao', icon: '⭐', section: 'Công cụ dạy học' },
    puzzleGame: { name: 'Giải Mã Bức Tranh', icon: '🧩', section: 'Công cụ dạy học' },
    treasureHunt: { name: 'Truy Tìm Kho Báu', icon: '🏴‍☠️', section: 'Công cụ dạy học' },
    videoStore: { name: 'Kho Video AI', icon: '🎬', section: 'Công cụ dạy học' },
    // ── Mô phỏng & Thí nghiệm ──
    virtualExperiment: { name: 'Thí nghiệm ảo tách muối', icon: '🧪', section: 'Mô phỏng & Thí nghiệm' },
    clockExperiment: { name: 'Xem Giờ Trên Đồng Hồ', icon: '⏰', section: 'Mô phỏng & Thí nghiệm' },
    yogurtExperiment: { name: 'Thí nghiệm làm Sữa chua', icon: '🧫', section: 'Mô phỏng & Thí nghiệm' },
    earthSeasons: { name: 'Chuyển động Trái Đất', icon: '🌍', section: 'Mô phỏng & Thí nghiệm' },
    phetForcesMotion: { name: 'PhET - Lực và chuyển động', icon: '🧲', section: 'Mô phỏng & Thí nghiệm' },
    phetCircuitDc: { name: 'PhET - Mạch điện DC', icon: '💡', section: 'Mô phỏng & Thí nghiệm' },
    phetStaticElectricity: { name: 'PhET - Tĩnh điện', icon: '⚡', section: 'Mô phỏng & Thí nghiệm' },
    phetMatterStates: { name: 'PhET - Trạng thái vật chất', icon: '🧊', section: 'Mô phỏng & Thí nghiệm' },
    phetDensity: { name: 'PhET - Khối lượng riêng', icon: '⚖️', section: 'Mô phỏng & Thí nghiệm' },
    phetBuildAtom: { name: 'PhET - Tạo nguyên tử', icon: '⚛️', section: 'Mô phỏng & Thí nghiệm' },
    // ── Khóa học & AI ──
    aiCourseStore: { name: 'Kho Khóa học AI', icon: '🎓', section: 'Khóa học & AI' },
    soanGiaoAnNangLucSo: { name: 'Soạn giáo án Năng lực số - AI', icon: '✨', section: 'Khóa học & AI' },
    ngheNghiep: { name: 'Nghề Nghiệp Tương Lai', icon: '👨‍🚀', section: 'Khóa học & AI' },
    canvaBasics: { name: 'Canva cơ bản', icon: '🎨', section: 'Khóa học & AI' },
    chucTet: { name: 'Mẫu Chúc Tết', icon: '🎊', section: 'Khóa học & AI' },
    communityResources: { name: 'Kho tài nguyên cộng đồng', icon: '👥', section: 'Khóa học & AI' },
    kiemTraDaoVan: { name: 'Thẩm Văn AI', icon: '🔍', section: 'Khóa học & AI' },
    // ── Ứng dụng 3D & VR ──
    heartSystem3D: { name: 'Hệ tuần hoàn 3D', icon: '❤️', section: 'Ứng dụng 3D & VR' },
    geometry3DTools: { name: 'Bộ công cụ Hình học 3D', icon: '📦', section: 'Ứng dụng 3D & VR' },
    vietnamMap: { name: 'Bản đồ Việt Nam', icon: '🗺️', section: 'Ứng dụng 3D & VR' },
    phongTranh3D: { name: 'Phòng tranh 3D tùy chỉnh', icon: '🎨', section: 'Ứng dụng 3D & VR' },
    denHung3D: { name: 'Phòng Tranh 3D - Đền Hùng', icon: '🏛️', section: 'Ứng dụng 3D & VR' },
    thatLuong3D: { name: 'Mô hình 3D - Thạt Luổng', icon: '🕍', section: 'Ứng dụng 3D & VR' },
    dinhDocLap3D: { name: 'Khám phá Dinh Độc Lập 3D', icon: '🏛️', section: 'Ứng dụng 3D & VR' },
    hue360: { name: 'VR360 Cố đô Huế', icon: '🏯', section: 'Ứng dụng 3D & VR' },
    hoiAn360: { name: 'VR360 Phố cổ Hội An', icon: '🏮', section: 'Ứng dụng 3D & VR' },
    phongNha360: { name: 'VR360 Phong Nha', icon: '⛰️', section: 'Ứng dụng 3D & VR' },
    haLong360: { name: 'VR360 Vịnh Hạ Long', icon: '🌊', section: 'Ứng dụng 3D & VR' },
    ninhBinh360: { name: 'VR360 Ninh Bình', icon: '🛶', section: 'Ứng dụng 3D & VR' },
    kimLien360: { name: 'VR360 Làng Kim Liên', icon: '🌾', section: 'Ứng dụng 3D & VR' },
    // ── Học liệu tương tác ──
    bangCuuChuong: { name: 'Bảng Cửu Chương Số', icon: '🔢', section: 'Học liệu tương tác' },
    soSanhSo: { name: 'Bé So Sánh Số', icon: '🔢', section: 'Học liệu tương tác' },
    keoThaPhanLoai: { name: 'Kéo - Thả Phân Loại', icon: '🧸', section: 'Học liệu tương tác' },
    gameTuongTac: { name: 'Game Tương Tác', icon: '🎮', section: 'Học liệu tương tác' },
    gameTuyChinh: { name: 'Game Tùy Chỉnh', icon: '🎮', section: 'Công cụ dạy học' },
    kyYeuCuoiNam: { name: 'Kỷ Yếu Cuối Năm', icon: '🎓', section: 'Học liệu tương tác' },
    thiepMoiOnline: { name: 'Thiệp Mời Online', icon: '💌', section: 'Học liệu tương tác' },
    sangKienKinhNghiem: { name: 'Viết SKKN & Báo Cáo', icon: '✍️', section: 'Khóa học & AI' },
    nhanXetTT27: { name: 'Nhận Xét TT27', icon: '📝', section: 'Khóa học & AI' },
    thuMoiTuongTac: { name: 'Thư Mời Họp Phụ Huynh', icon: '✉️', section: 'Học liệu tương tác' },
    thuMoiDauNam: { name: 'Thư Mời Họp Phụ Huynh Đầu Năm', icon: '🏫', section: 'Học liệu tương tác' },
    sensesExplorer: { name: 'Biệt đội 5 giác quan', icon: '👁️', section: 'Mô phỏng & Thí nghiệm' },
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
