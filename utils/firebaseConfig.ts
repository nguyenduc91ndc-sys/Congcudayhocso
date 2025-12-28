/**
 * Firebase Configuration
 * Dự án: Giáo viên yêu công nghệ
 */
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyD8b5wDZjI7GMQN0LfdssjSSrDu724LRIk",
    authDomain: "giaoviencongnghe-3c2a9.firebaseapp.com",
    projectId: "giaoviencongnghe-3c2a9",
    storageBucket: "giaoviencongnghe-3c2a9.firebasestorage.app",
    messagingSenderId: "1098765432100",
    appId: "1:1098765432100:web:abcdef123456",
    databaseURL: "https://giaoviencongnghe-3c2a9-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;

