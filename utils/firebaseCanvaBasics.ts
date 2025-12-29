/**
 * Firebase utilities cho Canva Basics Videos
 * Chỉ Admin mới có quyền thêm/sửa/xóa video
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove, onValue } from 'firebase/database';

export interface CanvaVideo {
    id: string;
    title: string;
    youtubeUrl: string;
    description?: string;
    customThumbnail?: string;
    addedAt: number;
}

const CANVA_VIDEOS_REF = 'canva-basics-videos';

// Lấy tất cả video
export const getAllCanvaVideos = async (): Promise<CanvaVideo[]> => {
    try {
        const videosRef = ref(database, CANVA_VIDEOS_REF);
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
        console.error('Error getting canva videos:', error);
        return [];
    }
};

// Subscribe realtime - Ai cũng có thể xem
export const subscribeToCanvaVideos = (callback: (videos: CanvaVideo[]) => void) => {
    const videosRef = ref(database, CANVA_VIDEOS_REF);
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

// Thêm video mới (Chỉ Admin)
export const addCanvaVideo = async (video: Omit<CanvaVideo, 'id'>): Promise<string | null> => {
    try {
        const videosRef = ref(database, CANVA_VIDEOS_REF);
        const newVideoRef = push(videosRef);
        await set(newVideoRef, {
            ...video,
            addedAt: Date.now()
        });
        return newVideoRef.key;
    } catch (error) {
        console.error('Error adding canva video:', error);
        return null;
    }
};

// Cập nhật video (Chỉ Admin)
export const updateCanvaVideo = async (videoId: string, updates: Partial<CanvaVideo>): Promise<boolean> => {
    try {
        const videoRef = ref(database, `${CANVA_VIDEOS_REF}/${videoId}`);
        await update(videoRef, updates);
        return true;
    } catch (error) {
        console.error('Error updating canva video:', error);
        return false;
    }
};

// Xóa video (Chỉ Admin)
export const deleteCanvaVideo = async (videoId: string): Promise<boolean> => {
    try {
        const videoRef = ref(database, `${CANVA_VIDEOS_REF}/${videoId}`);
        await remove(videoRef);
        return true;
    } catch (error) {
        console.error('Error deleting canva video:', error);
        return false;
    }
};
