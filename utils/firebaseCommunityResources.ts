/**
 * Firebase utilities cho Community Resources
 * Chỉ Admin mới có quyền thêm/sửa/xóa tài nguyên
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove, onValue } from 'firebase/database';

export interface CommunityResource {
    id: string;
    title: string;
    description: string;
    link: string;
    category?: string;
    icon?: string; // Emoji icon for visual appeal
    addedAt: number;
}

const RESOURCES_REF = 'community-resources';

// Lấy tất cả tài nguyên
export const getAllResources = async (): Promise<CommunityResource[]> => {
    try {
        const resourcesRef = ref(database, RESOURCES_REF);
        const snapshot = await get(resourcesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                ...data[key],
                id: key
            })).sort((a, b) => b.addedAt - a.addedAt);
        }
        return [];
    } catch (error) {
        console.error('Error getting resources:', error);
        return [];
    }
};

// Subscribe realtime - Ai cũng có thể xem
export const subscribeToResources = (callback: (resources: CommunityResource[]) => void) => {
    const resourcesRef = ref(database, RESOURCES_REF);
    return onValue(resourcesRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const resources = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            })).sort((a, b) => b.addedAt - a.addedAt);
            callback(resources);
        } else {
            callback([]);
        }
    });
};

// Thêm tài nguyên mới (Chỉ Admin)
export const addResource = async (resource: Omit<CommunityResource, 'id'>): Promise<string | null> => {
    try {
        const resourcesRef = ref(database, RESOURCES_REF);
        const newResourceRef = push(resourcesRef);
        await set(newResourceRef, {
            ...resource,
            addedAt: Date.now()
        });
        return newResourceRef.key;
    } catch (error) {
        console.error('Error adding resource:', error);
        return null;
    }
};

// Cập nhật tài nguyên (Chỉ Admin)
export const updateResource = async (resourceId: string, updates: Partial<CommunityResource>): Promise<boolean> => {
    try {
        const resourceRef = ref(database, `${RESOURCES_REF}/${resourceId}`);
        await update(resourceRef, updates);
        return true;
    } catch (error) {
        console.error('Error updating resource:', error);
        return false;
    }
};

// Xóa tài nguyên (Chỉ Admin)
export const deleteResource = async (resourceId: string): Promise<boolean> => {
    try {
        const resourceRef = ref(database, `${RESOURCES_REF}/${resourceId}`);
        await remove(resourceRef);
        return true;
    } catch (error) {
        console.error('Error deleting resource:', error);
        return false;
    }
};
