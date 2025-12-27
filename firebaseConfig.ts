import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyB-placeholder-update-this",
    authDomain: "giaoviencongnghe-3c2a9.firebaseapp.com",
    projectId: "giaoviencongnghe-3c2a9",
    databaseURL: "https://giaoviencongnghe-3c2a9-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "giaoviencongnghe-3c2a9.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:placeholder"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
