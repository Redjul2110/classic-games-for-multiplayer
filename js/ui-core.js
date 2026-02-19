// Basic Modal System
export function showModal(title, content, buttons = []) {
    // Remove existing
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    let buttonsHtml = '';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    modal.innerHTML = `
        <h3 class="modal-title">${title}</h3>
        <div class="modal-body">${content}</div>
        <div class="modal-actions"></div>
    `;

    const actionsContainer = modal.querySelector('.modal-actions');

    if (buttons.length === 0) {
        // Default Close
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => closeModal();
        actionsContainer.appendChild(closeBtn);
    } else {
        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = `btn ${btnConfig.class || 'btn-secondary'}`;
            btn.textContent = btnConfig.text;
            btn.onclick = () => {
                if (btnConfig.onClick) btnConfig.onClick();
                // We typically close modal after action unless specified
                if (!btnConfig.preventClose) closeModal();
            };
            actionsContainer.appendChild(btn);
        });
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animation trigger
    requestAnimationFrame(() => overlay.classList.add('active'));

    return overlay;
}

export function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}

export function showToast(message, duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Specialized Setup Modal
export function showGameModeSelection(gameName, onHost, onJoin) {
    const content = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="mode-btn" id="btn-host-public">
                <span class="icon">🌍</span>
                <div>
                    <div>Host Public Game</div>
                    <div class="mode-info">Anyone can join via Matchmaking</div>
                </div>
            </button>
            <button class="mode-btn" id="btn-host-private">
                <span class="icon">🔒</span>
                <div>
                    <div>Host Private Game</div>
                    <div class="mode-info">Share a Game ID with a friend</div>
                </div>
            </button>
             <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 5px 0;"></div>
            <button class="mode-btn" id="btn-join-random">
                <span class="icon">🎲</span>
                <div>
                    <div>Join Random Game</div>
                    <div class="mode-info">Find a waiting public lobby</div>
                </div>
            </button>
            <button class="mode-btn" id="btn-join-id">
                <span class="icon">🔑</span>
                <div>
                    <div>Join via ID</div>
                    <div class="mode-info">Enter a specific Game ID</div>
                </div>
            </button>
        </div>
    `;

    const overlay = showModal(gameName + ' - Online', content, [{ text: 'Cancel', class: 'btn-ghost' }]);

    // Attach Listeners
    setTimeout(() => {
        document.getElementById('btn-host-public').onclick = () => { closeModal(); onHost(true); };
        document.getElementById('btn-host-private').onclick = () => { closeModal(); onHost(false); };
        document.getElementById('btn-join-random').onclick = () => { closeModal(); onJoin('random'); };
        document.getElementById('btn-join-id').onclick = () => {
            closeModal();
            // Show input modal
            showModal('Enter Game ID', '<input type="text" id="game-id-input" class="modal-input" placeholder="Paste UUID here">', [
                { text: 'Cancel', class: 'btn-ghost' },
                {
                    text: 'Join', class: 'btn-primary', onClick: () => {
                        const id = document.getElementById('game-id-input').value;
                        if (id) onJoin(id);
                    }
                }
            ]);
        };
    }, 100);
}
