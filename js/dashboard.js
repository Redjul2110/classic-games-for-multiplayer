import { redJClient } from './supabase-client.js';
import { signOut } from './auth.js';
import { isGuest, getGuestId, clearGuestSession } from './guest.js';
import { showModal } from './ui-core.js';

// DOM Elements
const userNameEl = document.getElementById('user-name');
const userAvatarEl = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');

// State
let currentUser = null;
let currentProfile = null;

async function initDashboard() {
    // 1. Check Auth State
    if (isGuest()) {
        currentUser = { id: getGuestId(), isGuest: true };
        renderGuestProfile();
    } else {
        const { data: { session } } = await redJClient.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = session.user;
        await loadUserProfile();
    }

    // 2. Setup Navigation
    setupNavigation();

    // 3. Load Default Tab
    loadTabContent('hub');
}

async function loadUserProfile() {
    try {
        const { data, error } = await redJClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (data) {
            currentProfile = data;
            userNameEl.textContent = data.username || 'Unknown Player';
            if (data.username) userAvatarEl.textContent = data.username.charAt(0).toUpperCase();
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

function renderGuestProfile() {
    userNameEl.textContent = `Guest (${currentUser.id.split('_')[1]})`;
    userAvatarEl.textContent = 'G';
    // Disable certain features for guests
    document.querySelector('[data-tab="friends"]').classList.add('hidden');
    document.querySelector('[data-tab="profile"]').classList.add('hidden');
}

function setupNavigation() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Active class
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Close mobile menu if open
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }

            // Load Content
            const tab = item.getAttribute('data-tab');
            loadTabContent(tab);
        });
    });

    logoutBtn.addEventListener('click', () => {
        showModal('Logout', 'Are you sure you want to end your session?', [
            {
                text: 'Logout', class: 'btn-primary', onClick: async () => {
                    if (currentUser.isGuest) {
                        clearGuestSession();
                        window.location.href = 'index.html';
                    } else {
                        await signOut();
                    }
                }
            },
            { text: 'Cancel', class: 'btn-secondary' }
        ]);
    });
}

function loadTabContent(tabName) {
    // Animation Reset
    contentArea.classList.remove('animate-in');
    void contentArea.offsetWidth; // Trigger reflow
    contentArea.classList.add('animate-in');

    contentArea.innerHTML = '<div class="flex-center" style="height:200px; color: var(--text-secondary);">Loading module...</div>';

    switch (tabName) {
        case 'hub':
            import('./games.js').then(module => {
                module.renderGameHub(contentArea, currentUser);
            });
            break;
        case 'chat':
            import('./chat.js').then(module => {
                module.renderChat(contentArea, currentUser);
            });
            break;
        case 'friends':
            import('./friends.js').then(module => {
                module.renderFriends(contentArea, currentUser);
            });
            break;
        case 'profile':
            import('./profile.js').then(module => {
                module.renderProfile(contentArea, currentUser);
            });
            break;
    }
}

// Start
initDashboard();
