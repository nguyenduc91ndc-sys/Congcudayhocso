/**
 * Firebase utilities cho Khóa học AI
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, update, remove, onValue } from 'firebase/database';
import { AICourse } from '../types/aiCourseTypes';

const COURSES_REF = 'ai-courses';

// Lấy tất cả khóa học
export const getAllCourses = async (): Promise<AICourse[]> => {
    try {
        const coursesRef = ref(database, COURSES_REF);
        const snapshot = await get(coursesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
        }
        return [];
    } catch (error) {
        console.error('Error getting courses:', error);
        return [];
    }
};

// Subscribe realtime
export const subscribeToCourses = (callback: (courses: AICourse[]) => void) => {
    const coursesRef = ref(database, COURSES_REF);
    return onValue(coursesRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const courses = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            callback(courses);
        } else {
            callback([]);
        }
    });
};

// Thêm khóa học mới (Admin)
export const addCourse = async (course: Omit<AICourse, 'id'>): Promise<string | null> => {
    try {
        const coursesRef = ref(database, COURSES_REF);
        const newCourseRef = push(coursesRef);
        await set(newCourseRef, {
            ...course,
            createdAt: Date.now()
        });
        return newCourseRef.key;
    } catch (error) {
        console.error('Error adding course:', error);
        return null;
    }
};

// Cập nhật khóa học (Admin)
export const updateCourse = async (courseId: string, updates: Partial<AICourse>): Promise<boolean> => {
    try {
        const courseRef = ref(database, `${COURSES_REF}/${courseId}`);
        await update(courseRef, updates);
        return true;
    } catch (error) {
        console.error('Error updating course:', error);
        return false;
    }
};

// Xóa khóa học (Admin)
export const deleteCourse = async (courseId: string): Promise<boolean> => {
    try {
        const courseRef = ref(database, `${COURSES_REF}/${courseId}`);
        await remove(courseRef);
        return true;
    } catch (error) {
        console.error('Error deleting course:', error);
        return false;
    }
};
