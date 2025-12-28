/**
 * Types cho Kho Video AI
 */

// Sản phẩm video AI
export interface AIVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string; // Link ảnh từ Google Drive/Imgur
    price: number; // VND
    youtubeUrl: string; // Link video YouTube
    downloadUrl?: string; // Link tải miễn phí (cho sản phẩm 0đ)
    author: string;
    rating: number; // 1-5 sao
    isHot: boolean; // Badge "Hot"
    createdAt: number;
}

// Đơn hàng
export interface Order {
    id: string; // Mã đơn: DH + timestamp
    userId: string;
    userEmail: string;
    userName: string;
    items: AIVideo[];
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    paymentNote: string; // Nội dung chuyển khoản
    createdAt: number;
    confirmedAt?: number;
}

// Item trong giỏ hàng (local state)
export interface CartItem {
    video: AIVideo;
    quantity: number;
}
