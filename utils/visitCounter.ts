/**
 * Firebase Visit Counter
 * Đếm lượt truy cập lưu trên Firebase - tất cả người dùng đều thấy
 */
import { database } from './firebaseConfig';
import { ref, get, set, increment, runTransaction } from 'firebase/database';

const VISITS_REF = 'visitStats';

export interface VisitStats {
    totalVisits: number;
    lastUpdated: string;
}

/**
 * Tăng lượt truy cập và trả về số mới
 */
export const incrementVisitCount = async (): Promise<number> => {
    try {
        const statsRef = ref(database, `${VISITS_REF}/totalVisits`);

        // Sử dụng transaction để tránh race condition
        const result = await runTransaction(statsRef, (currentValue) => {
            return (currentValue || 0) + 1;
        });

        if (result.committed) {
            // Cập nhật thời gian
            const lastUpdatedRef = ref(database, `${VISITS_REF}/lastUpdated`);
            await set(lastUpdatedRef, new Date().toISOString());

            return result.snapshot.val() as number;
        }

        return 0;
    } catch (error) {
        console.error('Error incrementing visit count:', error);
        return 0;
    }
};

/**
 * Lấy thống kê lượt truy cập
 */
export const getVisitStats = async (): Promise<VisitStats> => {
    try {
        const statsRef = ref(database, VISITS_REF);
        const snapshot = await get(statsRef);

        if (snapshot.exists()) {
            return snapshot.val() as VisitStats;
        }

        return { totalVisits: 0, lastUpdated: '' };
    } catch (error) {
        console.error('Error getting visit stats:', error);
        return { totalVisits: 0, lastUpdated: '' };
    }
};

/**
 * Đặt số lượt truy cập (cho Admin)
 */
export const setVisitCount = async (count: number): Promise<boolean> => {
    try {
        const statsRef = ref(database, VISITS_REF);
        await set(statsRef, {
            totalVisits: count,
            lastUpdated: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error setting visit count:', error);
        return false;
    }
};
