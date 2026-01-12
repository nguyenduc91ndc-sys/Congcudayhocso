/**
 * Firebase utilities để lưu và lấy video lessons cho link chia sẻ ngắn
 */
import { database } from './firebaseConfig';
import { ref, push, set, get } from 'firebase/database';
import { VideoLesson } from '../types';

const SHARED_VIDEOS_REF = 'shared-videos';

/**
 * Tạo ID ngắn từ Firebase push key (giữ 8 ký tự cuối)
 */
const createShortId = (pushKey: string): string => {
    // Firebase push keys có 20 ký tự, lấy 8 ký tự cuối để ngắn hơn
    return pushKey.slice(-8);
};

/**
 * Lưu video lesson vào Firebase và trả về ID ngắn
 */
export const saveSharedVideo = async (lesson: VideoLesson): Promise<string | null> => {
    try {
        console.log('[ShareLink] Saving video:', lesson.title);

        const videosRef = ref(database, SHARED_VIDEOS_REF);
        const newVideoRef = push(videosRef);
        const pushKey = newVideoRef.key;

        if (!pushKey) {
            console.error('[ShareLink] Failed to get push key');
            return null;
        }

        // Lưu dữ liệu với cấu trúc tối giản
        const videoData = {
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
            createdAt: Date.now(),
        };

        await set(newVideoRef, videoData);

        const shortId = createShortId(pushKey);
        console.log('[ShareLink] Video saved! pushKey:', pushKey, 'shortId:', shortId);

        // Trả về ID ngắn
        return shortId;
    } catch (error) {
        console.error('[ShareLink] Error saving shared video:', error);
        return null;
    }
};

/**
 * Lấy video lesson từ Firebase bằng ID ngắn
 */
export const getSharedVideo = async (shortId: string): Promise<VideoLesson | null> => {
    try {
        console.log('[ShareLink] Looking for video with shortId:', shortId);

        // Tìm video có ID kết thúc bằng shortId
        const videosRef = ref(database, SHARED_VIDEOS_REF);
        const snapshot = await get(videosRef);

        if (!snapshot.exists()) {
            console.log('[ShareLink] No shared videos found in database');
            return null;
        }

        const data = snapshot.val();
        console.log('[ShareLink] Found', Object.keys(data).length, 'videos in database');

        // Tìm key phù hợp với shortId
        for (const fullKey of Object.keys(data)) {
            if (fullKey.endsWith(shortId)) {
                console.log('[ShareLink] Found matching video:', fullKey);
                const videoData = data[fullKey];

                // Khôi phục cấu trúc đầy đủ (xử lý trường hợp questions undefined)
                const questions = videoData.q || [];

                return {
                    id: fullKey,
                    title: videoData.t || 'Video không tên',
                    youtubeUrl: videoData.u || '',
                    startTime: videoData.s || 0,
                    allowSeeking: videoData.a ?? false,
                    questions: questions.map((q: any) => ({
                        id: q.i || '',
                        time: q.t || 0,
                        text: q.x || '',
                        options: q.o || { A: '', B: '', C: '', D: '' },
                        correctOption: q.c || 'A',
                    })),
                    createdAt: videoData.createdAt || Date.now(),
                };
            }
        }

        console.log('[ShareLink] No video found with shortId:', shortId);
        return null;
    } catch (error) {
        console.error('[ShareLink] Error getting shared video:', error);
        return null;
    }
};
