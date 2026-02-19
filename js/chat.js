import { redJClient } from './supabase-client.js';

export async function renderChat(container, currentUser) {
    container.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; max-height: 80vh;">
            <div id="chat-header" style="padding: 10px; border-bottom: 1px solid var(--border-color); background: var(--bg-card);">
                <h3>Global Community Chat</h3>
                <small style="color: var(--text-secondary);">Connect with other players.</small>
            </div>
            
            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                <div style="text-align: center; color: var(--text-secondary);">Connecting to secure channel...</div>
            </div>

            <div style="padding: 10px; border-top: 1px solid var(--border-color); background: var(--bg-card); display: flex; gap: 10px;">
                <input type="text" id="chat-input" class="form-input" placeholder="Type a message..." ${currentUser.isGuest ? 'disabled' : ''}>
                <button id="send-btn" class="btn btn-primary" ${currentUser.isGuest ? 'disabled' : ''}>Send</button>
            </div>
            ${currentUser.isGuest ? '<div style="font-size: 0.8rem; color: var(--accent-red); padding: 5px;">Guests are in Read-Only mode.</div>' : ''}
        </div>
    `;

    const messagesContainer = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Load initial messages
    const { data: initialMessages, error } = await redJClient
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        messagesContainer.innerHTML = `<div style="color: red;">Error loading chat: ${error.message}</div>`;
    } else {
        messagesContainer.innerHTML = '';
        // Reverse to show oldest first in the list (ascending visual order)
        [...initialMessages].reverse().forEach(msg => appendMessage(msg, currentUser, messagesContainer));
        scrollToBottom(messagesContainer);
    }

    // Subscribe to Realtime
    const subscription = redJClient
        .channel('public:chat_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            appendMessage(payload.new, currentUser, messagesContainer);
            scrollToBottom(messagesContainer);
        })
        .subscribe();

    // Send Message Handler
    if (!currentUser.isGuest) {
        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;

            // Optimistic update? No, let's wait for ack to ensure consistency with DB policies
            input.value = '';

            // We need the username. It should be in currentUser object from dashboard logic
            const { error } = await redJClient
                .from('chat_messages')
                .insert({
                    user_id: currentUser.id,
                    username: currentUser.user_metadata?.username || 'Player',
                    message: text
                });

            if (error) {
                alert('Failed to send: ' + error.message);
                input.value = text;
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function appendMessage(msg, currentUser, container) {
    const isMe = msg.user_id === currentUser.id;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
    div.style.maxWidth = '70%';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '8px';
    div.style.background = isMe ? 'var(--accent-red)' : 'var(--bg-secondary)';
    div.style.color = '#fff';
    div.style.border = '1px solid var(--border-color)';

    div.innerHTML = `
        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-bottom: 2px;">
            ${isMe ? 'You' : msg.username || 'Unknown'} <span style="margin-left:5px;">${time}</span>
        </div>
        <div>${escapeHtml(msg.message)}</div>
    `;

    container.appendChild(div);
}

function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
