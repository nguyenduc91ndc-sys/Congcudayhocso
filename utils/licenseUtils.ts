/**
 * Quản lý License Key cho Pro
 * 
 * Mã Pro có thể đến từ 2 nguồn:
 * 1. Mã cố định trong file này (FIXED_KEYS)
 * 2. Mã do Admin tạo (lưu trong localStorage)
 */

// Mã cố định (backup)
const FIXED_KEYS: string[] = [
    'PRO-DEMO-2024',
];

/**
 * Lấy tất cả mã hợp lệ (cố định + admin tạo)
 */
const getAllValidKeys = (): string[] => {
    const adminKeys = localStorage.getItem('ntd_admin_keys');
    const adminKeyList = adminKeys
        ? JSON.parse(adminKeys).map((k: { key: string }) => k.key.toUpperCase())
        : [];
    return [...FIXED_KEYS.map(k => k.toUpperCase()), ...adminKeyList];
};

/**
 * Kiểm tra mã có hợp lệ không
 */
export const isValidLicenseKey = (key: string): boolean => {
    const normalizedKey = key.trim().toUpperCase();
    return getAllValidKeys().includes(normalizedKey);
};

/**
 * Lưu trạng thái Pro vào localStorage
 */
export const activatePro = (deviceId: string, licenseKey: string): void => {
    localStorage.setItem(`ntd_pro_${deviceId}`, licenseKey);
};

/**
 * Kiểm tra thiết bị đã kích hoạt Pro chưa
 */
export const isProUser = (deviceId: string): boolean => {
    const savedKey = localStorage.getItem(`ntd_pro_${deviceId}`);
    if (!savedKey) return false;
    return isValidLicenseKey(savedKey);
};

/**
 * Lấy mã đã kích hoạt (nếu có)
 */
export const getActivatedKey = (deviceId: string): string | null => {
    return localStorage.getItem(`ntd_pro_${deviceId}`);
};
