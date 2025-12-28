/**
 * Firebase utilities cho Kho Video AI
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove, onValue } from 'firebase/database';
import { AIVideo } from '../types/videoStoreTypes';

const VIDEOS_REF = 'ai-videos';

// Lấy tất cả video
export const getAllVideos = async (): Promise<AIVideo[]> => {
    try {
        const videosRef = ref(database, VIDEOS_REF);
        const snapshot = await get(videosRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
        }
        return [];
    } catch (error) {
        console.error('Error getting videos:', error);
        return [];
    }
};

// Subscribe realtime
export const subscribeToVideos = (callback: (videos: AIVideo[]) => void) => {
    const videosRef = ref(database, VIDEOS_REF);
    return onValue(videosRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const videos = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            callback(videos);
        } else {
            callback([]);
        }
    });
};

// Thêm video mới (Admin)
export const addVideo = async (video: Omit<AIVideo, 'id'>): Promise<string | null> => {
    try {
        const videosRef = ref(database, VIDEOS_REF);
        const newVideoRef = push(videosRef);
        await set(newVideoRef, {
            ...video,
            createdAt: Date.now()
        });
        return newVideoRef.key;
    } catch (error) {
        console.error('Error adding video:', error);
        return null;
    }
};

// Cập nhật video (Admin)
export const updateVideo = async (videoId: string, updates: Partial<AIVideo>): Promise<boolean> => {
    try {
        const videoRef = ref(database, `${VIDEOS_REF}/${videoId}`);
        await update(videoRef, updates);
        return true;
    } catch (error) {
        console.error('Error updating video:', error);
        return false;
    }
};

// Xóa video (Admin)
export const deleteVideo = async (videoId: string): Promise<boolean> => {
    try {
        const videoRef = ref(database, `${VIDEOS_REF}/${videoId}`);
        await remove(videoRef);
        return true;
    } catch (error) {
        console.error('Error deleting video:', error);
        return false;
    }
};
