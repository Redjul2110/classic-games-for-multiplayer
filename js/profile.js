import { redJClient } from './supabase-client.js';

export async function renderProfile(container, currentUser) {
    if (currentUser.isGuest) {
        container.innerHTML = '<h2>Guest Profile</h2><p>Guests cannot edit profiles. Create an account to save your progress permanently.</p>';
        return;
    }

    container.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>My Profile</h2>
            <form id="profile-form">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="profile-username" class="form-input" minlength="3">
                </div>
                <div class="form-group">
                    <label class="form-label">Avatar URL</label>
                    <input type="text" id="profile-avatar" class="form-input" placeholder="https://example.com/avatar.png">
                </div>
                <div class="form-group">
                    <label class="form-label">Website</label>
                    <input type="text" id="profile-website" class="form-input" placeholder="https://yourwebsite.com">
                </div>
                <button type="submit" class="btn btn-primary">Save Profile</button>
            </form>
        </div>
            <br>
            <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 2rem 0; padding-top: 2rem;">
                <h3>Account Security</h3>
                
                <form id="email-form" style="margin-bottom: 2rem;">
                    <div class="form-group">
                        <label class="form-label">Update Email</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="email" id="profile-email" class="form-input" placeholder="New Email Address">
                            <button type="submit" class="btn btn-secondary" style="width: auto;">Update</button>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">
                            Note: You may need to verify the new email.
                        </p>
                    </div>
                </form>

                <form id="password-form">
                    <div class="form-group">
                        <label class="form-label">Change Password</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="password" id="profile-password" class="form-input" placeholder="New Password" minlength="6">
                            <button type="submit" class="btn btn-secondary" style="width: auto;">Update</button>
                        </div>
                    </div>
                </form>
            </div>

            <div style="border-top: 1px solid rgba(255,68,68,0.3); margin-top: 2rem; padding-top: 2rem;">
                <h3 style="color: #ff4444;">Danger Zone</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    Once you delete your account, there is no going back. Please be certain.
                </p>
                <button id="delete-account-btn" class="btn btn-primary" style="background: #ff4444; border: none; width: 100%;">
                    Delete Account
                </button>
            </div>
        </div>
    `;

    // Load current data
    const { data: profile } = await redJClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    // Get stats from auth metadata (or email)
    const { data: { user } } = await redJClient.auth.getUser();

    if (profile) {
        document.getElementById('profile-username').value = profile.username || '';
        document.getElementById('profile-avatar').value = profile.avatar_url || '';
        document.getElementById('profile-website').value = profile.website || '';
    }
    if (user && user.email && !user.email.endsWith('@redjgames.local')) {
        document.getElementById('profile-email').value = user.email;
    }

    // Profile Save Handler
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('profile-username').value;
        const avatar_url = document.getElementById('profile-avatar').value;
        const website = document.getElementById('profile-website').value;
        const btn = e.target.querySelector('button');

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            // 1. Update Public Profile
            const { error: dbError } = await redJClient
                .from('profiles')
                .update({ username, avatar_url, website, updated_at: new Date() })
                .eq('id', currentUser.id);

            if (dbError) throw dbError;

            // 2. Update Auth Metadata
            const { error: authError } = await redJClient.auth.updateUser({
                data: { username: username }
            });

            if (authError) console.warn('Auth metadata sync failed:', authError);

            alert('Profile updated successfully!');
            location.reload(); // Refresh to show updates
        } catch (error) {
            alert('Error updating profile: ' + error.message);
            btn.disabled = false;
            btn.textContent = 'Save Profile';
        }
    });

    // Email Update Handler
    document.getElementById('email-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('profile-email').value;
        const btn = e.target.querySelector('button');
        if (!email) return;

        btn.disabled = true;
        btn.textContent = '...';

        try {
            const { error } = await redJClient.auth.updateUser({ email: email });
            if (error) throw error;
            alert('Confirmation link sent to ' + email + '. Please click it to verify.');
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update';
        }
    });

    // Password Update Handler
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('profile-password').value;
        const btn = e.target.querySelector('button');
        if (!password) return;

        btn.disabled = true;
        btn.textContent = '...';

        try {
            const { error } = await redJClient.auth.updateUser({ password: password });
            if (error) throw error;
            alert('Password updated successfully.');
            document.getElementById('profile-password').value = '';
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update';
        }
    });

    // Delete Account Handler
    document.getElementById('delete-account-btn').addEventListener('click', async () => {
        if (!confirm('Are you absolutely sure?\nThis will delete your profile data and sign you out.\n(Login credentials may persist until backend deletion).')) return;

        try {
            // 1. Delete Profile Data (Soft Delete)
            const { error } = await redJClient
                .from('profiles')
                .delete()
                .eq('id', currentUser.id);

            if (error) console.error('Error deleting profile:', error);

            // 2. Sign Out
            await redJClient.auth.signOut();
            alert('Account data deleted. Goodbye Commander.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Error deleting account: ' + error.message);
        }
    });
}
