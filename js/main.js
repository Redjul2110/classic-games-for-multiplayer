import { signIn, signUp } from './auth.js';
import { redJClient } from './supabase-client.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const guestBtn = document.getElementById('guest-play-btn');

// --- Initialization ---
async function init() {
    // Check if already logged in
    const { data: { session } } = await redJClient.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
}

// --- Event Listeners ---

// Toggle Forms
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
});

// Login Handlers
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginInput = document.getElementById('login-input').value; // Changed from login-username
    const password = document.getElementById('login-password').value;
    const btn = loginForm.querySelector('button');

    try {
        btn.textContent = 'Authenticating...';
        btn.disabled = true;
        await signIn(loginInput, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(error.message);
        btn.textContent = 'Enter World';
        btn.disabled = false;
    }
});

// Register Handlers
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value; // New field
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const btn = registerForm.querySelector('button');

    try {
        btn.textContent = 'Creating Identity...';
        btn.disabled = true;
        await signUp(username, email, password);
        // Supabase might verify email or auto-login.
        // If auto-login is on (default), we are good.
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(error.message);
        btn.textContent = 'Initialize Account';
        btn.disabled = false;
    }
});

// Guest Mode
guestBtn.addEventListener('click', () => {
    // Logic for guest mode (set flag and redirect)
    localStorage.setItem('redjgames_guest_mode', 'true');
    // We might generate a unique ID here or in the dashboard
    import('./guest.js').then(module => {
        const guestId = module.initGuestSession();
        alert(`Entered as Guest: ${guestId}`); // Temporary feedback
        window.location.href = 'dashboard.html';
    });
});

init();
