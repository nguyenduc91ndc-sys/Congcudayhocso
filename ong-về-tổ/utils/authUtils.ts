/**
 * Authentication utilities for Ong Về Tổ
 * Handles Google Sign-In and user management
 * Uses SEPARATE Firebase paths: bee_pro_codes/ and bee_pro_users/
 */
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from '../../utils/firebaseConfig';
import { ref, get, set } from 'firebase/database';
import { database } from '../../utils/firebaseConfig';

// Admin email list
const ADMIN_EMAILS = ['nguyenduc91ndc@gmail.com'];

// Firebase path prefixes - UNIQUE FOR THIS GAME
const PRO_CODES_PATH = 'bee_pro_codes';
const PRO_USERS_PATH = 'bee_pro_users';

// Check if user is admin
export const isAdmin = (email: string | null): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User | null> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error: any) {
        console.error('Google sign-in error:', error);
        throw error;
    }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
};

// Get current user
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

// Subscribe to auth state changes
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
    return onAuthStateChanged(auth, callback);
};

// Check if user has Pro status
export const checkProStatus = async (userId: string): Promise<boolean> => {
    try {
        const proRef = ref(database, `${PRO_USERS_PATH}/${userId}`);
        const snapshot = await get(proRef);
        if (snapshot.exists()) {
            return snapshot.val().isPro === true;
        }
        return false;
    } catch (error) {
        console.error('Error checking pro status:', error);
        return false;
    }
};

// Activate Pro code
export const activateProCode = async (code: string, userId: string, email: string): Promise<boolean> => {
    try {
        // Check if code exists and is not used
        const codeRef = ref(database, `${PRO_CODES_PATH}/${code.toUpperCase()}`);
        const codeSnapshot = await get(codeRef);

        if (!codeSnapshot.exists()) {
            throw new Error('Mã không tồn tại');
        }

        const codeData = codeSnapshot.val();
        if (codeData.usedBy) {
            throw new Error('Mã đã được sử dụng');
        }

        // Mark code as used
        await set(codeRef, {
            ...codeData,
            usedBy: userId,
            usedByEmail: email,
            usedAt: Date.now()
        });

        // Set user as Pro
        const userRef = ref(database, `${PRO_USERS_PATH}/${userId}`);
        await set(userRef, {
            isPro: true,
            activatedAt: Date.now(),
            code: code.toUpperCase(),
            email: email
        });

        return true;
    } catch (error: any) {
        console.error('Error activating pro code:', error);
        throw error;
    }
};

// Generate Pro code (Admin only)
export const generateProCode = async (adminUserId: string): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BEE-'; // Prefix BEE- for this game
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const codeRef = ref(database, `${PRO_CODES_PATH}/${code}`);
    await set(codeRef, {
        createdBy: adminUserId,
        createdAt: Date.now(),
        usedBy: null,
        usedAt: null
    });

    return code;
};

// Get all Pro codes (Admin only)
export const getAllProCodes = async (): Promise<any[]> => {
    try {
        const codesRef = ref(database, PRO_CODES_PATH);
        const snapshot = await get(codesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.entries(data).map(([code, value]: [string, any]) => ({
                code,
                ...value
            }));
        }
        return [];
    } catch (error) {
        console.error('Error getting pro codes:', error);
        return [];
    }
};
