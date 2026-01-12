/**
 * Utility để nén và giải nén dữ liệu video cho link chia sẻ
 * Sử dụng lz-string để nén + base64 encode
 */

import { VideoLesson } from '../types';
import LZString from 'lz-string';

/**
 * Nén video lesson thành chuỗi ngắn để đưa vào URL
 */
export const encodeVideoData = (lesson: VideoLesson): string => {
    try {
        // Chỉ lấy các field cần thiết và rút gọn tên field
        const minimalData = {
            i: lesson.id,
            t: lesson.title,
            u: lesson.youtubeUrl,
            s: lesson.startTime,
            a: lesson.allowSeeking,
            q: lesson.questions.map(q => ({
                i: q.id,
                t: q.time,
                x: q.text,
                o: q.options,
                c: q.correctOption,
            })),
        };

        const jsonStr = JSON.stringify(minimalData);
        // Nén bằng LZ-String (URL-safe)
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        return compressed;
    } catch (error) {
        console.error('Error encoding video data:', error);
        return '';
    }
};

/**
 * Giải nén chuỗi URL thành video lesson
 */
export const decodeVideoData = (encodedData: string): VideoLesson | null => {
    try {
        // Giải nén LZ-String
        const jsonStr = LZString.decompressFromEncodedURIComponent(encodedData);
        if (!jsonStr) return null;

        const data = JSON.parse(jsonStr);

        // Khôi phục lại cấu trúc đầy đủ
        return {
            id: data.i,
            title: data.t,
            youtubeUrl: data.u,
            startTime: data.s,
            allowSeeking: data.a,
            questions: data.q.map((q: any) => ({
                id: q.i,
                time: q.t,
                text: q.x,
                options: q.o,
                correctOption: q.c,
            })),
            createdAt: Date.now(),
        };
    } catch (error) {
        console.error('Error decoding video data:', error);
        return null;
    }
};

/**
 * Tạo URL chia sẻ với dữ liệu video nén (URL dài)
 */
export const createShareUrl = (lesson: VideoLesson): string => {
    const encoded = encodeVideoData(lesson);
    return `${window.location.origin}?v=${encoded}`;
};

/**
 * Rút gọn URL bằng is.gd API (không có quảng cáo)
 */
export const shortenUrl = async (longUrl: string): Promise<string> => {
    try {
        // is.gd API không có quảng cáo, miễn phí và đáng tin cậy
        const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
        if (response.ok) {
            const shortUrl = await response.text();
            // Kiểm tra xem có phải URL hợp lệ không
            if (shortUrl.startsWith('https://is.gd/')) {
                return shortUrl;
            }
        }
        return longUrl; // Fallback nếu lỗi
    } catch (error) {
        console.error('Error shortening URL:', error);
        return longUrl; // Fallback nếu lỗi
    }
};
