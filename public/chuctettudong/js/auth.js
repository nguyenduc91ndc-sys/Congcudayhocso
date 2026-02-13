import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8b5wDZjI7GMQN0LfdssjSSrDu724LRIk",
    authDomain: "giaoviencongnghe-3c2a9.firebaseapp.com",
    projectId: "giaoviencongnghe-3c2a9",
    storageBucket: "giaoviencongnghe-3c2a9.firebasestorage.app",
    messagingSenderId: "1098765432100",
    appId: "1:1098765432100:web:abcdef123456",
    databaseURL: "https://giaoviencongnghe-3c2a9-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Check if viewing shared card
const params = new URLSearchParams(window.location.search);
// Check for either 'data' (Chuc Tet shared param) or 'v' (short link param from shareUtils)
// Also skip login if embedded in iframe (user already logged in via parent app)
const isInIframe = window.self !== window.top;
const isSharedView = params.has('data') || params.has('v') || isInIframe;

const loginModal = document.getElementById('loginModal');
const btnLogin = document.getElementById('btnLoginGoogle');

// Helper to get device info
const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'MacOS';
    return 'Unknown';
};

// Helper to log history
const logHistory = (user) => {
    const lastLogTime = localStorage.getItem('chuctet_last_log_time');
    const now = Date.now();

    // Throttle: Log only if > 30 mins since last log
    if (lastLogTime && (now - parseInt(lastLogTime) < 30 * 60 * 1000)) {
        console.log("Visit log throttled (logged recently)");
        return;
    }

    const historyRef = ref(db, 'loginHistory');
    const newEntryRef = push(historyRef);

    set(newEntryRef, {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL,
        loginTime: now,
        device: getDeviceInfo(),
        source: 'ChucTetApp' // Mark source to distinguish from main app
    }).then(() => {
        localStorage.setItem('chuctet_last_log_time', now.toString());
        console.log("Logged visit to history");
    }).catch(err => console.error("Error logging visit:", err));
};

// Only run auth logic if NOT in shared view
if (!isSharedView) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, hide modal
            if (loginModal) loginModal.classList.remove('active');
            console.log("User signed in:", user.displayName);

            // Auto-fill sender name if empty
            const sendInput = document.getElementById('inputSender');
            if (sendInput && !sendInput.value) {
                sendInput.value = user.displayName;
            }

            // Log visit
            logHistory(user);
        } else {
            // User is signed out, show modal
            if (loginModal) loginModal.classList.add('active');
        }
    });

    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            signInWithPopup(auth, provider)
                .then((result) => {
                    if (loginModal) loginModal.classList.remove('active');
                }).catch((error) => {
                    console.error("Login failed:", error);
                    alert("Đăng nhập thất bại: " + error.message);
                });
        });
    }
} else {
    // Shared view, no login required
    console.log("Viewing shared card, login bypassed.");
    if (loginModal) loginModal.classList.remove('active');
}
