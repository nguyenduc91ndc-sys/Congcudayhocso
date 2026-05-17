import { database } from './firebaseConfig';
import { ref, push, set, get, update } from 'firebase/database';

const SHARED_THUMOI_REF = 'shared-thumoi';

const createShortId = (pushKey: string): string => {
    return pushKey.slice(-8);
};

export const saveSharedThuMoi = async (config: any, userId?: string, userEmail?: string): Promise<string | null> => {
    try {
        const thumoiRef = ref(database, SHARED_THUMOI_REF);
        const newRef = push(thumoiRef);
        const pushKey = newRef.key;

        if (!pushKey) return null;

        await set(newRef, {
            config,
            userId: userId || null,
            userEmail: userEmail || config.email || null,
            createdAt: Date.now()
        });

        return createShortId(pushKey);
    } catch (error) {
        console.error('[ShareLink] Error saving shared Thu Moi:', error);
        return null;
    }
};

export const updateSharedThuMoi = async (shortId: string, config: any, userId?: string, userEmail?: string): Promise<boolean> => {
    try {
        const fullKey = await getFullKeyFromShortId(shortId);
        if (!fullKey) return false;

        await update(ref(database, `${SHARED_THUMOI_REF}/${fullKey}`), {
            config,
            userId: userId || null,
            userEmail: userEmail || config.email || null,
            updatedAt: Date.now()
        });

        return true;
    } catch (error) {
        console.error('[ShareLink] Error updating shared Thu Moi:', error);
        return false;
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
        const thumoiRef = ref(database, SHARED_THUMOI_REF);
        const snapshot = await get(thumoiRef);
        if (!snapshot.exists()) return [];

        const data = snapshot.val();
        const list: any[] = [];
        
        for (const fullKey of Object.keys(data)) {
            const item = data[fullKey];
            const itemEmail = item.userEmail || (item.config && item.config.email);
            if (itemEmail && itemEmail.toLowerCase() === userEmail.toLowerCase()) {
                list.push({
                    shortId: createShortId(fullKey),
                    config: item.config,
                    createdAt: item.createdAt || 0,
                    rsvpCount: item.rsvps ? Object.keys(item.rsvps).length : 0
                });
            }
        }
        
        return list.sort((a, b) => b.createdAt - a.createdAt);
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
