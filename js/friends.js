import { redJClient } from './supabase-client.js';
import { showToast, showModal } from './ui-core.js';

export async function renderFriends(container, currentUser) {
    container.innerHTML = `
        <div style="padding: 20px;">
            <h2>Friends List</h2>
            
            <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                <input type="text" id="add-friend-input" class="form-input" placeholder="Enter username to add...">
                <button id="add-friend-btn" class="btn btn-primary">Add Friend</button>
            </div>

            <div id="pending-requests" style="margin-bottom: 30px;">
                <!-- Pending requests loaded here -->
            </div>

            <div id="friends-list">
                Loading friends...
            </div>
        </div>
    `;

    loadFriends(currentUser);
    loadPendingRequests(currentUser);

    document.getElementById('add-friend-btn').addEventListener('click', () => {
        addFriend(document.getElementById('add-friend-input').value, currentUser);
    });
}

async function loadFriends(currentUser) {
    const listEl = document.getElementById('friends-list');

    // Complex query: get friend_id where user_id=me, OR user_id where friend_id=me
    // And status = 'accepted'
    // Supabase JS doesn't support complex ORs across columns easily in one go with joins sometimes.
    // Let's do two queries for simplicity or one raw query if using rpc.
    // Standard approach: select * from friendships where (user_id=me or friend_id=me) and status='accepted'.

    const { data: friendships, error } = await redJClient
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

    if (error) {
        listEl.innerHTML = 'Error loading friends.';
        return;
    }

    if (friendships.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-secondary);">No friends yet. Add someone!</p>';
        return;
    }

    listEl.innerHTML = '';
    // We need to fetch the profile names for these IDs.
    const friendIds = friendships.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);

    const { data: profiles } = await redJClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', friendIds);

    profiles.forEach(p => {
        const div = document.createElement('div');
        div.className = 'flex-center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '10px';
        div.style.background = 'var(--bg-secondary)';
        div.style.marginBottom = '8px';
        div.innerHTML = `
            <div><strong>${p.username}</strong></div>
            <button class="btn btn-ghost" style="padding: 5px 10px; font-size: 0.8rem;">Message</button>
        `;
        listEl.appendChild(div);
    });
}

async function loadPendingRequests(currentUser) {
    const container = document.getElementById('pending-requests');

    // Incoming requests: friend_id = me AND status = 'pending'
    const { data: requests, error } = await redJClient
        .from('friendships')
        .select('*')
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending');

    if (!requests || requests.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<h4>Pending Requests</h4>';

    // Fetch sender profiles
    const senderIds = requests.map(r => r.user_id);
    const { data: senders } = await redJClient
        .from('profiles')
        .select('id, username')
        .in('id', senderIds);

    senders.forEach(sender => {
        const div = document.createElement('div');
        div.style.background = 'rgba(255, 0, 0, 0.1)';
        div.style.padding = '10px';
        div.style.marginBottom = '10px';
        div.style.borderRadius = '4px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';

        div.innerHTML = `
            <span><strong>${sender.username}</strong> wants to be friends.</span>
            <div>
                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 0.8rem;" id="accept-${sender.id}">Accept</button>
                <button class="btn btn-ghost" style="padding: 4px 8px; font-size: 0.8rem;" id="decline-${sender.id}">Decline</button>
            </div>
        `;
        container.appendChild(div);

        div.querySelector(`#accept-${sender.id}`).addEventListener('click', () => respondToRequest(sender.id, currentUser.id, 'accepted'));
        div.querySelector(`#decline-${sender.id}`).addEventListener('click', () => respondToRequest(sender.id, currentUser.id, 'declined')); // or delete
    });
}

async function addFriend(targetUsername, currentUser) {
    if (!targetUsername) return;

    // 1. Find user by username (Requires profiles table query)
    const { data: targetUser, error } = await redJClient
        .from('profiles')
        .select('id')
        .eq('username', targetUsername)
        .single();

    if (error || !targetUser) {
        showToast('User not found.');
        return;
    }

    if (targetUser.id === currentUser.id) {
        showToast("You can't befriend yourself (sadly).");
        return;
    }

    // 2. Create friendship record
    const { error: insertError } = await redJClient
        .from('friendships')
        .insert({
            user_id: currentUser.id,
            friend_id: targetUser.id,
            status: 'pending'
        });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
            showToast('Friend request already sent or exists.');
        } else {
            showModal('Error', 'Error sending request: ' + insertError.message);
        }
    } else {
        showToast('Friend request sent!');
        document.getElementById('add-friend-input').value = '';
    }
}

async function respondToRequest(senderId, myId, newStatus) {
    if (newStatus === 'declined') {
        await redJClient.from('friendships').delete().match({ user_id: senderId, friend_id: myId });
    } else {
        await redJClient.from('friendships')
            .update({ status: 'accepted' })
            .match({ user_id: senderId, friend_id: myId });
    }
    // Reload
    const contentArea = document.getElementById('content-area'); // HACK: finding the container to re-render
    renderFriends(contentArea, { id: myId }); // Re-render logic slightly broken here as we need full user object, but refreshing helps.
    // Better: simply reload the view or remove the element.
    document.getElementById('pending-requests').innerHTML = 'Reloading...';
    setTimeout(() => {
        // Simple reload of the module function isn't easy without the parent.
        // We will just reload page for now or re-call render if we had the user object.
        location.reload();
    }, 500);
}
