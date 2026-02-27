/**
 * Firebase utilities cho Phòng Tranh 3D
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';

const GALLERIES_REF = 'galleries';
const MAX_GALLERIES_PER_USER = 5;

export interface GalleryPainting {
    id: string;
    imageUrl: string;
    title: string;
    description: string;
    position: number; // Vị trí trên tường (0-based index)
}

export interface Gallery {
    id: string;
    title: string;
    template: 'classic' | 'modern' | 'space' | 'royal' | 'minimal' | 'art';
    ownerEmail: string;
    ownerName: string;
    paintings: GalleryPainting[];
    createdAt: number;
    updatedAt: number;
}

// Tạo phòng tranh mới
export const createGallery = async (gallery: Omit<Gallery, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
        // Kiểm tra giới hạn
        const userGalleries = await getUserGalleries(gallery.ownerEmail);
        if (userGalleries.length >= MAX_GALLERIES_PER_USER) {
            alert(`Bạn đã đạt giới hạn ${MAX_GALLERIES_PER_USER} phòng tranh. Vui lòng xóa bớt để tạo mới.`);
            return null;
        }

        const galleriesRef = ref(database, GALLERIES_REF);
        const newRef = push(galleriesRef);
        const now = Date.now();
        await set(newRef, {
            ...gallery,
            paintings: gallery.paintings || [],
            createdAt: now,
            updatedAt: now
        });
        return newRef.key;
    } catch (error) {
        console.error('Error creating gallery:', error);
        return null;
    }
};

// Lấy phòng tranh theo ID
export const getGallery = async (galleryId: string): Promise<Gallery | null> => {
    try {
        const galleryRef = ref(database, `${GALLERIES_REF}/${galleryId}`);
        const snapshot = await get(galleryRef);
        if (snapshot.exists()) {
            return { ...snapshot.val(), id: galleryId };
        }
        return null;
    } catch (error) {
        console.error('Error getting gallery:', error);
        return null;
    }
};

// Lấy tất cả phòng tranh của user
export const getUserGalleries = async (email: string): Promise<Gallery[]> => {
    try {
        const galleriesRef = ref(database, GALLERIES_REF);
        const snapshot = await get(galleriesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data)
                .map(key => ({ ...data[key], id: key }))
                .filter(g => g.ownerEmail === email)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        return [];
    } catch (error) {
        console.error('Error getting user galleries:', error);
        return [];
    }
};

// Lấy tất cả phòng tranh (cho admin)
export const getAllGalleries = async (): Promise<Gallery[]> => {
    try {
        const galleriesRef = ref(database, GALLERIES_REF);
        const snapshot = await get(galleriesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data)
                .map(key => ({ ...data[key], id: key }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        return [];
    } catch (error) {
        console.error('Error getting all galleries:', error);
        return [];
    }
};

// Cập nhật phòng tranh
export const updateGallery = async (galleryId: string, updates: Partial<Gallery>): Promise<boolean> => {
    try {
        const galleryRef = ref(database, `${GALLERIES_REF}/${galleryId}`);
        await update(galleryRef, { ...updates, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error updating gallery:', error);
        return false;
    }
};

// Xóa phòng tranh
export const deleteGallery = async (galleryId: string): Promise<boolean> => {
    try {
        const galleryRef = ref(database, `${GALLERIES_REF}/${galleryId}`);
        await remove(galleryRef);
        return true;
    } catch (error) {
        console.error('Error deleting gallery:', error);
        return false;
    }
};
