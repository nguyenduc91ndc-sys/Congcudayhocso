/**
 * Authentication utilities for Giải Mã Bức Tranh
 * Handles Google Sign-In and user management
 */
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from '../../utils/firebaseConfig';
import { ref, get, set } from 'firebase/database';
import { database } from '../../utils/firebaseConfig';

// Admin email list
const ADMIN_EMAILS = ['nguyenduc91ndc@gmail.com'];

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
        const proRef = ref(database, `decode_pro_users/${userId}`);
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
        const codeRef = ref(database, `decode_pro_codes/${code.toUpperCase()}`);
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
        const userRef = ref(database, `decode_pro_users/${userId}`);
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
    let code = 'PRO-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const codeRef = ref(database, `decode_pro_codes/${code}`);
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
        const codesRef = ref(database, 'decode_pro_codes');
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
