import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';

const VIRTUAL_GALLERY_REF = 'virtual_galleries';

export interface VirtualGallery {
    id: string;
    title: string;
    ownerEmail: string;
    ownerName: string;
    galleryFileUrl: string; // URL của file ZIP lưu trên Firebase Storage
    createdAt: number;
    updatedAt: number;
}

export const saveVirtualGallery = async (data: Omit<VirtualGallery, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
        const galleriesRef = ref(database, VIRTUAL_GALLERY_REF);
        const newRef = push(galleriesRef);
        const now = Date.now();
        await set(newRef, {
            ...data,
            createdAt: now,
            updatedAt: now
        });
        return newRef.key;
    } catch (error) {
        console.error('Lỗi khi lưu phòng tranh mới:', error);
        return null;
    }
};

export const updateVirtualGallery = async (id: string, updates: Partial<VirtualGallery>): Promise<boolean> => {
    try {
        const refObj = ref(database, `${VIRTUAL_GALLERY_REF}/${id}`);
        await update(refObj, { ...updates, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Lỗi khi cập nhật phòng tranh:', error);
        return false;
    }
};

export const getVirtualGallery = async (id: string): Promise<VirtualGallery | null> => {
    try {
        const refObj = ref(database, `${VIRTUAL_GALLERY_REF}/${id}`);
        const snapshot = await get(refObj);
        if (snapshot.exists()) {
            return { ...snapshot.val(), id };
        }
        return null;
    } catch (error) {
        console.error('Lỗi khi lấy phòng tranh theo ID:', error);
        return null;
    }
};

export const getVirtualGalleriesByUser = async (email: string): Promise<VirtualGallery[]> => {
    try {
        const galleriesRef = ref(database, VIRTUAL_GALLERY_REF);
        const snapshot = await get(galleriesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data)
                .map(key => ({ ...data[key], id: key }))
                .filter(g => g.ownerEmail === email) // Lọc client-side (với DB nhỏ)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        return [];
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng tranh:', error);
        return [];
    }
};

export const deleteVirtualGallery = async (id: string): Promise<boolean> => {
    try {
        const refObj = ref(database, `${VIRTUAL_GALLERY_REF}/${id}`);
        await remove(refObj);
        return true;
    } catch (error) {
        console.error('Lỗi khi xóa phòng tranh:', error);
        return false;
    }
};
