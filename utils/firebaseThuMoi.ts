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

export const getFullKeyFromShortId = async (shortId: string): Promise<string | null> => {
    try {
        const thumoiRef = ref(database, SHARED_THUMOI_REF);
        const snapshot = await get(thumoiRef);
        if (!snapshot.exists()) return null;

        const data = snapshot.val();
        for (const fullKey of Object.keys(data)) {
            if (fullKey.endsWith(shortId)) {
                return fullKey;
            }
        }
        return null;
    } catch (error) {
        console.error('[ShareLink] Error getting full key:', error);
        return null;
    }
};

export const checkStudentRSVP = async (shortId: string, studentName: string): Promise<boolean> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return false;

        const encodedName = btoa(encodeURIComponent(studentName.trim().toLowerCase()));
        const rsvpRef = ref(database, `${SHARED_THUMOI_REF}/${fullKey}/rsvps/${encodedName}`);
        const snapshot = await get(rsvpRef);
        return snapshot.exists();
    } catch (error) {
        console.error('[ShareLink] Error checking RSVP:', error);
        return false; // Fail open if error
    }
};

export const saveStudentRSVP = async (shortId: string, studentName: string): Promise<boolean> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return false;

        const encodedName = btoa(encodeURIComponent(studentName.trim().toLowerCase()));
        const rsvpRef = ref(database, `${SHARED_THUMOI_REF}/${fullKey}/rsvps/${encodedName}`);
        await set(rsvpRef, {
            timestamp: Date.now()
        });
        return true;
    } catch (error) {
        console.error('[ShareLink] Error saving RSVP:', error);
        return false;
    }
};
