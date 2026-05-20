import { database, firebaseConfig } from './firebaseConfig';
import { equalTo, get, orderByChild, query, ref, set, update } from 'firebase/database';

const SHARED_THUMOI_REF = 'shared-thumoi';

const createShortId = (pushKey: string): string => {
    return pushKey.slice(-8);
};

const getShortIdFromKey = (key: string): string => {
    return key.length <= 16 ? key : createShortId(key);
};

const createPublicId = (): string => {
    const timePart = Date.now().toString(36).slice(-5);
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `${timePart}${randomPart}`;
};

const findKeyByShortIdShallow = async (shortId: string): Promise<string | null> => {
    if (!firebaseConfig.databaseURL) return null;
    try {
        const response = await fetch(`${firebaseConfig.databaseURL}/${SHARED_THUMOI_REF}.json?shallow=true`);
        if (!response.ok) return null;
        const keys = await response.json();
        if (!keys || typeof keys !== 'object') return null;
        return Object.keys(keys).find((key) => key.endsWith(shortId)) || null;
    } catch (error) {
        console.warn('[ShareLink] Shallow key lookup failed:', error);
        return null;
    }
};

const buildRestUrl = (path: string, queryString = ''): string | null => {
    if (!firebaseConfig.databaseURL) return null;
    const cleanPath = path
        .split('/')
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join('/');
    return `${firebaseConfig.databaseURL}/${cleanPath}.json${queryString}`;
};

const fetchJsonWithTimeout = async <T,>(url: string, timeoutMs = 7000): Promise<T | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const data = await response.json();
        if (data && typeof data === 'object' && 'error' in data) return null;
        return data as T | null;
    } catch (error) {
        console.warn('[ShareLink] REST lookup failed:', error);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
};

const writeJsonWithTimeout = async (
    url: string,
    method: 'PUT' | 'PATCH',
    payload: unknown,
    timeoutMs = 8000
): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        if (!response.ok) return false;
        const data = await response.json();
        return !(data && typeof data === 'object' && 'error' in data);
    } catch (error) {
        console.warn('[ShareLink] REST write failed:', error);
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const saveSharedThuMoi = async (config: any, userId?: string, userEmail?: string): Promise<string | null> => {
    try {
        const shortId = createPublicId();
        const payload = {
            config,
            shortId,
            userId: userId || null,
            userEmail: userEmail || config.email || null,
            createdAt: Date.now()
        };

        const restUrl = buildRestUrl(`${SHARED_THUMOI_REF}/${shortId}`);
        if (restUrl && await writeJsonWithTimeout(restUrl, 'PUT', payload)) {
            return shortId;
        }

        const newRef = ref(database, `${SHARED_THUMOI_REF}/${shortId}`);
        await set(newRef, payload);

        return shortId;
    } catch (error) {
        console.error('[ShareLink] Error saving shared Thu Moi:', error);
        return null;
    }
};

export const updateSharedThuMoi = async (shortId: string, config: any, userId?: string, userEmail?: string): Promise<boolean> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return false;

        const payload = {
            config,
            userId: userId || null,
            userEmail: userEmail || config.email || null,
            updatedAt: Date.now()
        };

        const restUrl = buildRestUrl(`${SHARED_THUMOI_REF}/${fullKey}`);
        if (restUrl && await writeJsonWithTimeout(restUrl, 'PATCH', payload)) {
            return true;
        }

        await update(ref(database, `${SHARED_THUMOI_REF}/${fullKey}`), payload);

        return true;
    } catch (error) {
        console.error('[ShareLink] Error updating shared Thu Moi:', error);
        return false;
    }
};

export const getSharedThuMoi = async (shortId: string): Promise<any | null> => {
    try {
        const directRestUrl = buildRestUrl(`${SHARED_THUMOI_REF}/${shortId}/config`);
        if (directRestUrl) {
            const directConfig = await fetchJsonWithTimeout<any>(directRestUrl);
            if (directConfig) return directConfig;
        }

        const shallowKey = await findKeyByShortIdShallow(shortId);
        if (shallowKey) {
            const configRestUrl = buildRestUrl(`${SHARED_THUMOI_REF}/${shallowKey}/config`);
            if (configRestUrl) {
                const config = await fetchJsonWithTimeout<any>(configRestUrl);
                if (config) return config;
            }
        }

        const directSnapshot = await get(ref(database, `${SHARED_THUMOI_REF}/${shortId}/config`));
        if (directSnapshot.exists()) return directSnapshot.val();

        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return null;

        const configSnapshot = await get(ref(database, `${SHARED_THUMOI_REF}/${fullKey}/config`));
        return configSnapshot.exists() ? configSnapshot.val() : null;
    } catch (error) {
        console.error('[ShareLink] Error getting shared Thu Moi:', error);
        return null;
    }
};

export const getFullKeyFromShortId = async (shortId: string): Promise<string | null> => {
    try {
        const directRestUrl = buildRestUrl(`${SHARED_THUMOI_REF}/${shortId}`);
        if (directRestUrl) {
            const directData = await fetchJsonWithTimeout<any>(directRestUrl);
            if (directData) return shortId;
        }

        const shallowKey = await findKeyByShortIdShallow(shortId);
        if (shallowKey) return shallowKey;

        const directSnapshot = await get(ref(database, `${SHARED_THUMOI_REF}/${shortId}`));
        if (directSnapshot.exists()) return shortId;

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

function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); 
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
    return str.toLowerCase().trim();
}

function getWords(name: string): string[] {
    return removeVietnameseTones(name).split(/\s+/).filter(w => w.length > 0);
}

function isNameMatch(name1: string, name2: string): boolean {
    const w1 = getWords(name1);
    const w2 = getWords(name2);
    
    if (w1.length === 0 || w2.length === 0) return false;
    
    const shorter = w1.length <= w2.length ? w1 : w2;
    const longer = w1.length <= w2.length ? w2 : w1;
    
    return shorter.every(word => longer.includes(word));
}

export const checkStudentRSVP = async (shortId: string, studentName: string): Promise<boolean> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return false;

        const rsvpsRef = ref(database, `${SHARED_THUMOI_REF}/${fullKey}/rsvps`);
        const snapshot = await get(rsvpsRef);
        
        if (!snapshot.exists()) return false;
        
        const rsvps = snapshot.val();
        
        for (const encodedKey of Object.keys(rsvps)) {
            try {
                const existingName = decodeURIComponent(atob(encodedKey));
                if (isNameMatch(studentName, existingName)) {
                    return true;
                }
            } catch (e) {
                // Ignore if decoding fails
            }
        }
        
        return false;
    } catch (error) {
        console.error('[ShareLink] Error checking RSVP:', error);
        return false; // Fail open if error
    }
};

export const saveStudentRSVP = async (shortId: string, studentName: string, parentName: string = '', attendance: string = ''): Promise<boolean> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return false;

        const encodedName = btoa(encodeURIComponent(studentName.trim().toLowerCase()));
        const rsvpRef = ref(database, `${SHARED_THUMOI_REF}/${fullKey}/rsvps/${encodedName}`);
        await set(rsvpRef, {
            timestamp: Date.now(),
            studentName: studentName.trim(),
            parentName: parentName.trim(),
            attendance: attendance.trim()
        });
        return true;
    } catch (error) {
        console.error('[ShareLink] Error saving RSVP:', error);
        return false;
    }
};

export const getUserThuMoiList = async (userEmail: string): Promise<any[]> => {
    try {
        const normalizedEmail = userEmail.toLowerCase().trim();
        const thumoiRef = ref(database, SHARED_THUMOI_REF);
        const snapshots = await Promise.all([
            get(query(thumoiRef, orderByChild('userEmail'), equalTo(userEmail))),
            get(query(thumoiRef, orderByChild('userEmail'), equalTo(normalizedEmail))),
            get(query(thumoiRef, orderByChild('config/email'), equalTo(userEmail))),
            get(query(thumoiRef, orderByChild('config/email'), equalTo(normalizedEmail)))
        ]);

        const itemsByKey = new Map<string, any>();
        snapshots.forEach((snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.val();
            Object.keys(data).forEach((fullKey) => {
                const item = data[fullKey];
                const itemEmail = item.userEmail || item.config?.email || '';
                if (itemEmail.toLowerCase().trim() === normalizedEmail) {
                    itemsByKey.set(fullKey, item);
                }
            });
        });

        return Array.from(itemsByKey.entries())
            .map(([fullKey, item]) => ({
                shortId: item.shortId || getShortIdFromKey(fullKey),
                config: item.config,
                createdAt: item.createdAt || item.updatedAt || 0,
                rsvpCount: item.rsvps ? Object.keys(item.rsvps).length : 0
            }))
            .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('[ShareLink] Error getting user Thu Moi list:', error);
        return [];
    }
};

export const getRSVPs = async (shortId: string): Promise<any[]> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return [];

        const rsvpsRef = ref(database, `${SHARED_THUMOI_REF}/${fullKey}/rsvps`);
        const snapshot = await get(rsvpsRef);
        
        if (!snapshot.exists()) return [];
        
        const rsvps = snapshot.val();
        const list: any[] = [];
        
        for (const key of Object.keys(rsvps)) {
            list.push({
                ...rsvps[key],
                id: key,
                // Fallback decode if missing fields from old data
                studentName: rsvps[key].studentName || decodeURIComponent(atob(key))
            });
        }
        
        return list.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('[ShareLink] Error getting RSVPs:', error);
        return [];
    }
};
