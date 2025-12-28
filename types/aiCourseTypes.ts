/**
 * Types cho Khóa học AI
 */

// Khóa học AI
export interface AICourse {
    id: string;
    title: string;
    description: string;
    thumbnail: string; // Link ảnh thumbnail
    youtubeUrl: string; // Link video YouTube demo
    price: number; // VND (0 = miễn phí)
    originalPrice?: number; // Giá gốc (trước khuyến mãi)
    author: string;
    duration: string; // Thời lượng: "2 giờ", "10 bài học", etc.
    level: 'beginner' | 'intermediate' | 'advanced'; // Cấp độ
    category: string; // Danh mục: "AI cơ bản", "Tạo video", etc.
    rating: number; // 1-5 sao
    enrollCount: number; // Số lượt đăng ký
    isHot: boolean; // Badge "Hot"
    isNew: boolean; // Badge "Mới"
    registerUrl?: string; // Link đăng ký khóa học
    createdAt: number;
}
