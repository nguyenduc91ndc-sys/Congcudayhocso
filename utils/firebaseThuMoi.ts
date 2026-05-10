import { database } from './firebaseConfig';
import { ref, push, set, get } from 'firebase/database';

const SHARED_THUMOI_REF = 'shared-thumoi';

const createShortId = (pushKey: string): string => {
    return pushKey.slice(-8);
};

export const saveSharedThuMoi = async (config: any): Promise<string | null> => {
    try {
        const thumoiRef = ref(database, SHARED_THUMOI_REF);
        const newRef = push(thumoiRef);
        const pushKey = newRef.key;

        if (!pushKey) return null;

        await set(newRef, {
            config,
            createdAt: Date.now()
        });

        return createShortId(pushKey);
    } catch (error) {
        console.error('[ShareLink] Error saving shared Thu Moi:', error);
        return null;
    }
};

export const getSharedThuMoi = async (shortId: string): Promise<any | null> => {
    try {
        const thumoiRef = ref(database, SHARED_THUMOI_REF);
        const snapshot = await get(thumoiRef);

        if (!snapshot.exists()) return null;

        const data = snapshot.val();
        for (const fullKey of Object.keys(data)) {
            if (fullKey.endsWith(shortId)) {
                return data[fullKey].config;
            }
        }
        return null;
    } catch (error) {
        console.error('[ShareLink] Error getting shared Thu Moi:', error);
        return null;
    }
};
