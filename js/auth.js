import { redJClient } from './supabase-client.js';

const DOMAIN = 'redjgames.local';

function getLegacyEmail(username) {
    return `${username.toLowerCase().replace(/\s/g, '')}@${DOMAIN}`;
}

export async function signUp(username, email, password) {
    // If no email provided, fallback to legacy (should not happen with new form)
    const finalEmail = email || getLegacyEmail(username);

    const { data, error } = await redJClient.auth.signUp({
        email: finalEmail,
        password: password,
        options: {
            data: {
                username: username,
                avatar_url: `https://ui-avatars.com/api/?name=${username}&background=ff0000&color=fff`
            }
        }
    });

    if (error) throw error;
    return data;
}

export async function signIn(emailOrUsername, password) {
    let email;

    if (emailOrUsername.includes('@')) {
        email = emailOrUsername;
    } else {
        email = getLegacyEmail(emailOrUsername);
    }

    const { data, error } = await redJClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await redJClient.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
}

// Check session on load for protected pages
export async function requireAuth() {
    const { data: { session } } = await redJClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
    return session;
}
