import { get, off, onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from './firebaseConfig';

export interface QrLink {
    id: string;
    title: string;
    targetUrl: string;
    ownerEmail: string;
    ownerName: string;
    createdAt: number;
    updatedAt: number;
    scans: number;
}

const QR_LINKS_PATH = 'qr_links';

const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

export const createQrLink = async (input: {
    title: string;
    targetUrl: string;
    ownerEmail: string;
    ownerName: string;
}): Promise<QrLink> => {
    const itemRef = push(ref(database, QR_LINKS_PATH));
    const id = itemRef.key;
    if (!id) throw new Error('Không tạo được mã QR');

    const now = Date.now();
    const qrLink: QrLink = {
        id,
        title: input.title.trim() || 'Mã QR chưa đặt tên',
        targetUrl: normalizeUrl(input.targetUrl),
        ownerEmail: input.ownerEmail.toLowerCase().trim(),
        ownerName: input.ownerName || '',
        createdAt: now,
        updatedAt: now,
        scans: 0,
    };

    await set(itemRef, qrLink);
    return qrLink;
};

export const updateQrLink = async (id: string, data: Partial<Pick<QrLink, 'title' | 'targetUrl'>>) => {
    const payload: Record<string, unknown> = { updatedAt: Date.now() };
    if (data.title !== undefined) payload.title = data.title.trim() || 'Mã QR chưa đặt tên';
    if (data.targetUrl !== undefined) payload.targetUrl = normalizeUrl(data.targetUrl);
    await update(ref(database, `${QR_LINKS_PATH}/${id}`), payload);
};

export const deleteQrLink = async (id: string) => {
    await remove(ref(database, `${QR_LINKS_PATH}/${id}`));
};

export const getQrLinkById = async (id: string): Promise<QrLink | null> => {
    const snapshot = await get(ref(database, `${QR_LINKS_PATH}/${id}`));
    if (!snapshot.exists()) return null;
    return snapshot.val() as QrLink;
};

export const incrementQrScan = async (id: string, currentScans: number) => {
    await update(ref(database, `${QR_LINKS_PATH}/${id}`), {
        scans: (currentScans || 0) + 1,
        lastScannedAt: Date.now(),
    });
};

export const subscribeUserQrLinks = (
    ownerEmail: string,
    callback: (links: QrLink[]) => void
): (() => void) => {
    const dbRef = ref(database, QR_LINKS_PATH);
    const normalizedEmail = ownerEmail.toLowerCase().trim();

    const listener = onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }

        const data = snapshot.val() as Record<string, QrLink>;
        const links = Object.values(data)
            .filter(item => item.ownerEmail === normalizedEmail)
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        callback(links);
    });

    return () => off(dbRef, 'value', listener);
};
