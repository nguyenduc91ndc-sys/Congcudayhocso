import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyD8b5wDZjI7GMQN0LfdssjSSrDu724LRIk",
    authDomain: "giaoviencongnghe-3c2a9.firebaseapp.com",
    databaseURL: "https://giaoviencongnghe-3c2a9-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "giaoviencongnghe-3c2a9",
    storageBucket: "giaoviencongnghe-3c2a9.firebasestorage.app",
    messagingSenderId: "1024719098510",
    appId: "1:1024719098510:web:323719476029d430c16fdf",
    measurementId: "G-0YLC6TN39W"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
