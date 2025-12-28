/**
 * Feedback/Comment System Utilities
 * Hệ thống bình luận với kiểm duyệt
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, remove, update, query, orderByChild, equalTo } from 'firebase/database';

export interface Feedback {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    message: string;
    rating: number; // 1-5 sao
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

const FEEDBACKS_REF = 'feedbacks';

/**
 * Gửi feedback mới (status = pending)
 */
export const submitFeedback = async (
    userId: string,
    userName: string,
    userAvatar: string,
    message: string,
    rating: number
): Promise<boolean> => {
    try {
        const feedbacksRef = ref(database, FEEDBACKS_REF);
        const newFeedbackRef = push(feedbacksRef);

        const feedback: Omit<Feedback, 'id'> = {
            userId,
            userName,
            userAvatar,
            message,
            rating,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await set(newFeedbackRef, feedback);
        return true;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        return false;
    }
};

/**
 * Lấy tất cả feedbacks (cho admin)
 */
export const getAllFeedbacks = async (): Promise<Feedback[]> => {
    try {
        const feedbacksRef = ref(database, FEEDBACKS_REF);
        const snapshot = await get(feedbacksRef);

        if (!snapshot.exists()) return [];

        const feedbacks: Feedback[] = [];
        snapshot.forEach((child) => {
            feedbacks.push({
                id: child.key!,
                ...child.val()
            });
        });

        // Sắp xếp mới nhất lên đầu
        return feedbacks.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
        console.error('Error getting feedbacks:', error);
        return [];
    }
};

/**
 * Lấy feedbacks đã duyệt (hiển thị công khai)
 */
export const getApprovedFeedbacks = async (): Promise<Feedback[]> => {
    try {
        const allFeedbacks = await getAllFeedbacks();
        return allFeedbacks.filter(f => f.status === 'approved');
    } catch (error) {
        console.error('Error getting approved feedbacks:', error);
        return [];
    }
};

/**
 * Lấy feedbacks chờ duyệt
 */
export const getPendingFeedbacks = async (): Promise<Feedback[]> => {
    try {
        const allFeedbacks = await getAllFeedbacks();
        return allFeedbacks.filter(f => f.status === 'pending');
    } catch (error) {
        console.error('Error getting pending feedbacks:', error);
        return [];
    }
};

/**
 * Duyệt feedback
 */
export const approveFeedback = async (feedbackId: string): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, `${FEEDBACKS_REF}/${feedbackId}`);
        await update(feedbackRef, { status: 'approved' });
        return true;
    } catch (error) {
        console.error('Error approving feedback:', error);
        return false;
    }
};

/**
 * Từ chối feedback
 */
export const rejectFeedback = async (feedbackId: string): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, `${FEEDBACKS_REF}/${feedbackId}`);
        await update(feedbackRef, { status: 'rejected' });
        return true;
    } catch (error) {
        console.error('Error rejecting feedback:', error);
        return false;
    }
};

/**
 * Xóa feedback
 */
export const deleteFeedback = async (feedbackId: string): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, `${FEEDBACKS_REF}/${feedbackId}`);
        await remove(feedbackRef);
        return true;
    } catch (error) {
        console.error('Error deleting feedback:', error);
        return false;
    }
};

/**
 * Cập nhật nội dung feedback (cho admin chỉnh sửa)
 */
export const updateFeedback = async (
    feedbackId: string,
    newMessage: string,
    newRating?: number
): Promise<boolean> => {
    try {
        const feedbackRef = ref(database, `${FEEDBACKS_REF}/${feedbackId}`);
        const updateData: { message: string; rating?: number } = { message: newMessage };
        if (newRating !== undefined) {
            updateData.rating = newRating;
        }
        await update(feedbackRef, updateData);
        return true;
    } catch (error) {
        console.error('Error updating feedback:', error);
        return false;
    }
};

/**
 * Tính rating trung bình từ feedbacks đã duyệt
 */
export const getAverageRating = async (): Promise<number> => {
    const approved = await getApprovedFeedbacks();
    if (approved.length === 0) return 0;

    const total = approved.reduce((sum, f) => sum + f.rating, 0);
    return Math.round((total / approved.length) * 10) / 10;
};
