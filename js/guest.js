
const GUEST_KEY = 'redjgames_guest_id';
const DATE_KEY = 'redjgames_guest_date';

export function initGuestSession() {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(DATE_KEY);
    let guestId = localStorage.getItem(GUEST_KEY);

    // Daily Reset Logic
    if (storedDate !== today) {
        // New day, reset guest progress/identity
        // We accept that this "loses" the account, as requested.
        guestId = null;
        localStorage.removeItem(GUEST_KEY);
        // We could also clear local stats if we stored them here
        localStorage.setItem(DATE_KEY, today);
    }

    if (!guestId) {
        guestId = 'guest_' + crypto.randomUUID().slice(0, 8);
        localStorage.setItem(GUEST_KEY, guestId);
    }

    return guestId;
}

export function getGuestId() {
    return localStorage.getItem(GUEST_KEY);
}

export function isGuest() {
    return !!localStorage.getItem(GUEST_KEY); // Simplified check
}

export function clearGuestSession() {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(DATE_KEY);
    localStorage.removeItem('redjgames_guest_mode');
}
