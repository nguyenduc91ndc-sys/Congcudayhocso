import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove } from 'firebase/database';

const GALLERIES_REF = 'galleries';
export const MAX_GALLERIES_PER_USER = 3;

export const createGalleryShareId = (galleryId: string): string => {
    const shortId = galleryId.length <= 10 ? galleryId : galleryId.slice(-8);
    return shortId.startsWith('room_') ? shortId : `room_${shortId}`;
};

const normalizeGalleryLookupId = (galleryId: string): string => {
    return galleryId.startsWith('room_') ? galleryId.slice(5) : galleryId;
};

export type GalleryTemplate = 'technology' | 'nature' | 'history' | 'classroom';

export interface GalleryPainting {
    id: string;
    label: string;
    yaw: number;
    pitch: number;
    imageUrl?: string;
    youtubeUrl?: string;
    title?: string;
    description?: string;
    position?: number;
    x?: number;
    y?: number;
    z?: number;
}

export interface Gallery {
    id: string;
    title: string;
    template: GalleryTemplate;
    panoramaUrl: string;
    ownerEmail: string;
    ownerName: string;
    paintings: GalleryPainting[];
    createdAt: number;
    updatedAt: number;
}

export const createGallery = async (gallery: Omit<Gallery, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
        const userGalleries = await getUserGalleries(gallery.ownerEmail);
        if (userGalleries.length >= MAX_GALLERIES_PER_USER) {
            const galleriesToRemove = userGalleries.slice(MAX_GALLERIES_PER_USER - 1);
            await Promise.all(
                galleriesToRemove.map(item => remove(ref(database, `${GALLERIES_REF}/${item.id}`)))
            );
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

export const getGallery = async (galleryId: string): Promise<Gallery | null> => {
    try {
        const galleryRef = ref(database, `${GALLERIES_REF}/${galleryId}`);
        const snapshot = await get(galleryRef);
        if (snapshot.exists()) return { ...snapshot.val(), id: galleryId };
        const lookupId = normalizeGalleryLookupId(galleryId);

        const galleriesRef = ref(database, GALLERIES_REF);
        const allSnapshot = await get(galleriesRef);
        if (!allSnapshot.exists()) return null;

        const data = allSnapshot.val();
        const matchedKey = Object.keys(data).find(key => (
            createGalleryShareId(key) === galleryId ||
            createGalleryShareId(key) === `room_${lookupId}` ||
            key.endsWith(lookupId)
        ));
        if (!matchedKey) return null;

        return { ...data[matchedKey], id: matchedKey };
    } catch (error) {
        console.error('Error getting gallery:', error);
        return null;
    }
};

export const getUserGalleries = async (email: string): Promise<Gallery[]> => {
    try {
        const galleriesRef = ref(database, GALLERIES_REF);
        const snapshot = await get(galleriesRef);
        if (!snapshot.exists()) return [];

        const data = snapshot.val();
        return Object.keys(data)
            .map(key => ({ ...data[key], id: key }))
            .filter(g => g.ownerEmail === email)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error('Error getting user galleries:', error);
        return [];
    }
};

export const getAllGalleries = async (): Promise<Gallery[]> => {
    try {
        const galleriesRef = ref(database, GALLERIES_REF);
        const snapshot = await get(galleriesRef);
        if (!snapshot.exists()) return [];

        const data = snapshot.val();
        return Object.keys(data)
            .map(key => ({ ...data[key], id: key }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error('Error getting all galleries:', error);
        return [];
    }
};

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

export const updateGalleryPainting = async (
    galleryId: string,
    paintingIndex: number,
    painting: GalleryPainting
): Promise<boolean> => {
    try {
        const galleryRef = ref(database, `${GALLERIES_REF}/${galleryId}`);
        await update(galleryRef, {
            [`paintings/${paintingIndex}`]: painting,
            updatedAt: Date.now()
        });
        return true;
    } catch (error) {
        console.error('Error updating gallery painting:', error);
        return false;
    }
};

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
