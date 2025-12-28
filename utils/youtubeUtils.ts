/**
 * Hàm làm sạch và chuẩn hóa URL YouTube
 * Hỗ trợ tất cả các định dạng link YouTube phổ biến
 */

/**
 * Trích xuất Video ID từ bất kỳ URL YouTube nào
 * 
 * Các định dạng được hỗ trợ:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID (mobile)
 * - youtube.com/watch?v=VIDEO_ID (không có protocol)
 * - VIDEO_ID (chỉ ID)
 * - Các URL có thêm tham số (t=, list=, index=, si=...)
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Loại bỏ khoảng trắng thừa
  const cleanUrl = url.trim();

  // Nếu chỉ là Video ID (11 ký tự chữ và số, dấu gạch ngang, gạch dưới)
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdPattern.test(cleanUrl)) {
    return cleanUrl;
  }

  // Regex pattern bao quát tất cả các định dạng URL YouTube
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    
    // youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    
    // youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    
    // youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    
    // youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    
    // youtube.com/live/VIDEO_ID
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    
    // youtube-nocookie.com/embed/VIDEO_ID (privacy-enhanced mode)
    /(?:youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Chuyển đổi bất kỳ URL YouTube nào thành URL chuẩn để embed
 * 
 * @param url - URL YouTube gốc (bất kỳ định dạng nào)
 * @param options - Các tùy chọn bổ sung
 * @returns URL embed chuẩn hoặc null nếu URL không hợp lệ
 */
export interface EmbedOptions {
  autoplay?: boolean;       // Tự động phát
  mute?: boolean;           // Tắt tiếng (cần thiết cho autoplay trên mobile)
  loop?: boolean;           // Lặp video
  start?: number;           // Thời gian bắt đầu (giây)
  end?: number;             // Thời gian kết thúc (giây)
  controls?: boolean;       // Hiện/ẩn controls
  modestbranding?: boolean; // Giảm thiểu logo YouTube
  rel?: boolean;            // Hiện video liên quan khi kết thúc
  privacyEnhanced?: boolean; // Dùng youtube-nocookie.com
}

export function getYouTubeEmbedUrl(
  url: string, 
  options: EmbedOptions = {}
): string | null {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return null;
  }

  // Xây dựng URL cơ bản
  const baseUrl = options.privacyEnhanced 
    ? 'https://www.youtube-nocookie.com/embed/'
    : 'https://www.youtube.com/embed/';

  const params = new URLSearchParams();

  // Thêm các tham số theo options
  if (options.autoplay) params.set('autoplay', '1');
  if (options.mute) params.set('mute', '1');
  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Cần thiết cho loop
  }
  if (options.start !== undefined) params.set('start', String(options.start));
  if (options.end !== undefined) params.set('end', String(options.end));
  if (options.controls === false) params.set('controls', '0');
  if (options.modestbranding) params.set('modestbranding', '1');
  if (options.rel === false) params.set('rel', '0');

  const queryString = params.toString();
  return `${baseUrl}${videoId}${queryString ? '?' + queryString : ''}`;
}

/**
 * Tạo URL thumbnail cho video YouTube
 * 
 * @param url - URL YouTube
 * @param quality - Chất lượng ảnh thumbnail
 * @returns URL thumbnail hoặc null
 */
export type ThumbnailQuality = 
  | 'default'       // 120x90
  | 'mqdefault'     // 320x180
  | 'hqdefault'     // 480x360
  | 'sddefault'     // 640x480
  | 'maxresdefault' // 1280x720 (không phải video nào cũng có)

export function getYouTubeThumbnailUrl(
  url: string, 
  quality: ThumbnailQuality = 'hqdefault'
): string | null {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return null;
  }

  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Kiểm tra xem URL có phải là URL YouTube hợp lệ không
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Làm sạch và chuẩn hóa URL YouTube thành định dạng chuẩn
 * Trả về URL dạng youtube.com/watch?v=VIDEO_ID
 */
export function cleanYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Trích xuất thời gian bắt đầu từ URL nếu có (t= hoặc start=)
 * 
 * @returns Thời gian bắt đầu tính bằng giây, hoặc 0 nếu không có
 */
export function extractStartTime(url: string): number {
  if (!url) return 0;

  // Pattern cho t=XXs hoặc t=XX hoặc start=XX
  const timePatterns = [
    /[?&]t=(\d+)s?/,
    /[?&]start=(\d+)/,
    // Định dạng t=XmYs (phút và giây)
    /[?&]t=(\d+)m(\d+)s/,
  ];

  // Check cho định dạng XmYs trước
  const minuteSecondMatch = url.match(/[?&]t=(\d+)m(\d+)s/);
  if (minuteSecondMatch) {
    const minutes = parseInt(minuteSecondMatch[1], 10);
    const seconds = parseInt(minuteSecondMatch[2], 10);
    return minutes * 60 + seconds;
  }

  // Check các pattern khác
  for (const pattern of timePatterns.slice(0, 2)) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return 0;
}

// ============================================================
// VÍ DỤ SỬ DỤNG
// ============================================================

/*
// Import các hàm
import { 
  extractYouTubeVideoId, 
  getYouTubeEmbedUrl, 
  cleanYouTubeUrl,
  isValidYouTubeUrl,
  getYouTubeThumbnailUrl,
  extractStartTime
} from './utils/youtubeUtils';

// Ví dụ 1: Làm sạch URL
const messyUrl = "https://youtu.be/dQw4w9WgXcQ?si=abc123&t=30s";
const cleanedUrl = cleanYouTubeUrl(messyUrl);
// Kết quả: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

// Ví dụ 2: Lấy URL embed cho iframe
const embedUrl = getYouTubeEmbedUrl(messyUrl, {
  autoplay: false,
  controls: true,
  rel: false // Không hiện video liên quan
});
// Kết quả: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"

// Ví dụ 3: Kiểm tra URL hợp lệ trước khi sử dụng
if (isValidYouTubeUrl(userInput)) {
  // URL hợp lệ, tiếp tục xử lý
  const videoId = extractYouTubeVideoId(userInput);
  const thumbnail = getYouTubeThumbnailUrl(userInput, 'hqdefault');
}

// Ví dụ 4: Xử lý input từ giáo viên
function handleTeacherInput(input: string): { 
  isValid: boolean; 
  embedUrl?: string; 
  thumbnail?: string;
  startTime?: number;
} {
  if (!isValidYouTubeUrl(input)) {
    return { isValid: false };
  }

  return {
    isValid: true,
    embedUrl: getYouTubeEmbedUrl(input, { rel: false }) || undefined,
    thumbnail: getYouTubeThumbnailUrl(input) || undefined,
    startTime: extractStartTime(input)
  };
}
*/
