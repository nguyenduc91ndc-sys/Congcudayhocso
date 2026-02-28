import { database } from './firebaseConfig';
import { ref, push, set, get, remove, query, orderByChild } from 'firebase/database';

export interface SKKNFeedback {
    id: string;
    content: string;
    createdAt: number;
    userEmail?: string;
    userName?: string;
    status: 'new' | 'read' | 'resolved';
}

/**
 * Gửi góp ý/lỗi mới lên Firebase
 */
export const submitSKKNFeedback = async (
    content: string,
    userEmail?: string,
    userName?: string
): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, 'skkn_feedback');
        const newFeedbackRef = push(feedbackRef);

        const feedback: Omit<SKKNFeedback, 'id'> = {
            content,
            createdAt: Date.now(),
            userEmail: userEmail || 'Khách',
            userName: userName || 'Khách',
            status: 'new'
        };

        await set(newFeedbackRef, feedback);
        console.log('[SKKN Feedback] ✅ Submitted successfully:', newFeedbackRef.key, feedback);
        return true;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        return false;
    }
};

/**
 * [ADMIN] Lấy danh sách góp ý, sắp xếp mới nhất lên đầu
 */
export const getSKKNFeedbacks = async (): Promise<SKKNFeedback[]> => {
    try {
        const feedbackRef = ref(database, 'skkn_feedback');
        console.log('[SKKN Feedback] 📖 Fetching from skkn_feedback/...');
        const snapshot = await get(feedbackRef);

        if (!snapshot.exists()) {
            console.log('[SKKN Feedback] ⚠️ No feedbacks found in skkn_feedback/');
            return [];
        }

        const feedbacks: SKKNFeedback[] = [];
        snapshot.forEach((childSnapshot) => {
            feedbacks.push({
                id: childSnapshot.key as string,
                ...childSnapshot.val()
            });
        });

        // Sort mới nhất ở trên
        feedbacks.sort((a, b) => b.createdAt - a.createdAt);
        console.log('[SKKN Feedback] ✅ Loaded', feedbacks.length, 'feedbacks');
        return feedbacks;
    } catch (error) {
        console.error('[SKKN Feedback] ❌ Error fetching feedbacks:', error);
        return [];
    }
};

/**
 * [ADMIN] Cập nhật trạng thái góp ý
 */
export const updateFeedbackStatus = async (id: string, status: SKKNFeedback['status']): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, `skkn_feedback/${id}/status`);
        await set(feedbackRef, status);
        return true;
    } catch (error) {
        console.error('Error updating feedback status:', error);
        return false;
    }
};

/**
 * [ADMIN] Xóa góp ý
 */
export const deleteSKKNFeedback = async (id: string): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, `skkn_feedback/${id}`);
        await remove(feedbackRef);
        return true;
    } catch (error) {
        console.error('Error deleting feedback:', error);
        return false;
    }
};
