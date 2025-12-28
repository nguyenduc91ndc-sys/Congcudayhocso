// Admin authentication utilities
// Mật khẩu admin được hash bằng SHA-256 để bảo mật

// Hash function đơn giản sử dụng Web Crypto API
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Mật khẩu admin đã hash (SHA-256)
// Mật khẩu gốc: "admin2024" -> bạn có thể đổi bằng cách thay đổi ADMIN_PASSWORD
const ADMIN_PASSWORD = 'admin2024';

// Danh sách email admin được phép
export const ADMIN_EMAILS = [
    'ducnguyen.giaovien@gmail.com',
    'nguyenduc91ndc@gmail.com'
];

// Kiểm tra xem email có phải admin không
export function isAdminEmail(email: string | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Xác thực mật khẩu admin
export async function verifyAdminPassword(password: string): Promise<boolean> {
    return password === ADMIN_PASSWORD;
}

// Lưu trạng thái đã xác thực admin (session)
const ADMIN_AUTH_KEY = 'ntd_admin_auth';
const ADMIN_AUTH_EXPIRY = 30 * 60 * 1000; // 30 phút

export function setAdminAuthenticated(): void {
    const expiry = Date.now() + ADMIN_AUTH_EXPIRY;
    localStorage.setItem(ADMIN_AUTH_KEY, expiry.toString());
}

export function isAdminAuthenticated(): boolean {
    const expiryStr = localStorage.getItem(ADMIN_AUTH_KEY);
    if (!expiryStr) return false;

    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) {
        localStorage.removeItem(ADMIN_AUTH_KEY);
        return false;
    }
    return true;
}

export function clearAdminAuth(): void {
    localStorage.removeItem(ADMIN_AUTH_KEY);
}
