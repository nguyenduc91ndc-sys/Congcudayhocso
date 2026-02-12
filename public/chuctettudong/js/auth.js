import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD8b5wDZjI7GMQN0LfdssjSSrDu724LRIk",
    authDomain: "giaoviencongnghe-3c2a9.firebaseapp.com",
    projectId: "giaoviencongnghe-3c2a9",
    storageBucket: "giaoviencongnghe-3c2a9.firebasestorage.app",
    messagingSenderId: "1098765432100",
    appId: "1:1098765432100:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Check if viewing shared card
const params = new URLSearchParams(window.location.search);
// Check for either 'data' (Chuc Tet shared param) or 'v' (short link param from shareUtils)
const isSharedView = params.has('data') || params.has('v');

const loginModal = document.getElementById('loginModal');
const btnLogin = document.getElementById('btnLoginGoogle');

// Only run auth logic if NOT in shared view
if (!isSharedView) {
    // Show modal initially to prevent flash of content
    // validation is fast enough usually

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, hide modal
            if (loginModal) loginModal.classList.remove('active');
            console.log("Usersigned in:", user.displayName);
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
