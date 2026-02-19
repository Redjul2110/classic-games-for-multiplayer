
// RedJGames Project (Auth, Chat, Friends)
const REDJ_URL = 'https://dxooundpabsbmgbtqijc.supabase.co';
const REDJ_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4b291bmRwYWJzYm1nYnRxaWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTg2MDYsImV4cCI6MjA4NjkzNDYwNn0.4sp8UgIwCgPTwnvQNYZZVsr1h6E2WdEHiFAbwm6FBSU';

// Online Games Project (Game Data, Realtime)
const GAMES_URL = 'https://dzujxfxsmzojgbuasbtc.supabase.co';
// Note: Key string was split in prompt, joining it here to ensure correctness.
const GAMES_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWp4ZnhzbXpvamdidWFzYnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjU3OTAsImV4cCI6MjA4NzEwMTc5MH0.WFxp4xb2pMzLxy7HaKEeKpuUCygZSq-Nksbhplr_s6U';

// Initialize Clients
// We access the global 'supabase' object provided by the CDN script in HTML
const { createClient } = window.supabase;

export const redJClient = createClient(REDJ_URL, REDJ_KEY, {
    auth: {
        persistSession: true, // Keep user logged in
        storageKey: 'redjgames-auth-token'
    }
});

export const onlineGamesClient = createClient(GAMES_URL, GAMES_KEY, {
    auth: {
        persistSession: false // We rely on the main project for auth mostly, or guest ids
    }
});

// Helper to check if user is logged in
export async function getCurrentUser() {
    const { data: { session } } = await redJClient.auth.getSession();
    return session?.user || null;
}
