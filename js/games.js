import { onlineGamesClient } from './supabase-client.js';
import { showGameModeSelection, showModal, showToast, closeModal } from './ui-core.js';

export async function renderGameHub(container, currentUser) {
    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Game Lobby</h2>
                <!-- <button id="create-game-btn" class="btn btn-primary">Create New Game</button> -->
            </div>

            <div id="active-games-list" class="hub-grid">
                
                <!-- Tic Tac Toe -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #ff0000, #000000);"></div>
                    <div class="game-card-content">
                        <h3>Tic-Tac-Toe</h3>
                         <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            The classic game of X and O.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-ttt-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                            <button class="btn btn-ghost" id="play-ttt-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Connect 4 -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #0000FF, #000000);"></div>
                    <div class="game-card-content">
                        <h3>Connect 4</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Get 4 in a row. Gravity enabled.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-c4-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                            <button class="btn btn-ghost" id="play-c4-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Uno -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #ff66cc, #00ccff);"></div>
                    <div class="game-card-content">
                        <h3>Neon Cards</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Cyberpunk card matching.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-neon-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                            <button class="btn btn-ghost" id="play-neon-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Ludo -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #00FF00, #FFFF00);"></div>
                    <div class="game-card-content">
                        <h3>Ludo</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Race to the finish.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-ludo-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-ludo-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Checkers -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #333333, #000000);"></div>
                    <div class="game-card-content">
                        <h3>Checkers</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Strategy board game.
                        </p>
                         <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-checkers-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-checkers-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;

    // Local Listeners
    document.getElementById('play-ttt-local').addEventListener('click', () => {
        import('./tictactoe.js').then(m => new m.TicTacToe(container, 'local'));
    });

    document.getElementById('play-checkers-local').addEventListener('click', () => {
        import('./checkers.js').then(m => new m.Checkers(container, 'local'));
    });

    document.getElementById('play-c4-local').addEventListener('click', () => {
        import('./connect4.js').then(m => new m.Connect4(container, 'local'));
    });

    document.getElementById('play-neon-local').addEventListener('click', () => {
        import('./neon_cards.js').then(m => new m.NeonCards(container, 'local'));
    });

    document.getElementById('play-ludo-local').addEventListener('click', () => {
        import('./ludo.js').then(m => new m.Ludo(container, 'local'));
    });

    // Online Listeners
    const bindOnline = (id, type) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => setupOnlineGame(type, container, currentUser));
    };

    bindOnline('play-ttt-online', 'tictactoe');
    bindOnline('play-c4-online', 'connect4');
    bindOnline('play-neon-online', 'neon_cards');
    bindOnline('play-ludo-online', 'ludo');
    bindOnline('play-checkers-online', 'checkers');
}

async function setupOnlineGame(type, container, currentUser) {
    showGameModeSelection(type.toUpperCase(),
        (isPublic, maxPlayers) => hostGame(type, isPublic, maxPlayers, container, currentUser),
        (joinMode) => joinGame(type, joinMode, container, currentUser)
    );
}

async function hostGame(type, isPublic, maxPlayers, container, currentUser) {
    // 1. Create Session
    const { data: session, error } = await onlineGamesClient
        .from('game_sessions')
        .insert({
            host_id: currentUser.id,
            game_type: type,
            status: 'waiting',
            is_public: isPublic,
            max_players: maxPlayers
        })
        .select()
        .single();

    if (error) {
        showModal('Error', error.message);
        return;
    }

    // 2. Initialize State (Player List)
    const { error: stateError } = await onlineGamesClient
        .from('game_states')
        .insert({
            session_id: session.id,
            state_json: {
                players: [{ id: currentUser.id, name: currentUser.user_metadata?.username || 'Host' }],
                started: false
            }
        });

    if (stateError) {
        console.error('State Init Error:', stateError);
    }

    waitForOpponent(session, type, container, currentUser);
}

async function joinGame(type, joinMode, container, currentUser) {
    let gameId;

    if (joinMode === 'random') {
        const { data, error } = await onlineGamesClient
            .from('game_sessions')
            .select('id')
            .eq('game_type', type)
            .eq('status', 'waiting')
            .eq('is_public', true)
            .neq('host_id', currentUser.id) // Don't join own game
            .limit(1);

        if (error || !data || data.length === 0) {
            showModal('No Matches', 'No public games found. Try hosting one!');
            return;
        }
        gameId = data[0].id;
    } else {
        gameId = joinMode; // logic from modal handled ID input
    }

    // For Party Mode, we just enter the lobby "waiting room"
    // The Host will accept us via Broadcast and then switch status when they are ready.
    // So we just load the waitForOpponent screen which now handles the handshake.

    // Fetch session details first
    const { data: session, error } = await onlineGamesClient
        .from('game_sessions')
        .select('*')
        .eq('id', gameId)
        .single();

    if (error) {
        showModal('Error', 'Game not found.');
        return;
    }

    waitForOpponent(session, type, container, currentUser);
}

function waitForOpponent(session, type, container, currentUser) {
    const isHost = session.host_id === currentUser.id;
    let players = [{ id: session.host_id, name: 'Host' }]; // Local cache, updated via broadcast/state

    const renderLobby = () => {
        container.innerHTML = `
            <div class="glass-panel" style="text-align:center; max-width: 600px; margin: 0 auto;">
                <h2>Lobby (${players.length}/${session.max_players})</h2>
                <div class="loader" style="border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                
                <p>Game ID: <span style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px; user-select: all;">${session.id}</span></p>
                ${session.is_public ? '<p style="color: #44ff44; font-size: 0.8rem;">Public Lobby</p>' : '<p style="color: #ffaa44; font-size: 0.8rem;">Private Lobby</p>'}

                <div style="margin: 20px 0; text-align: left; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                    <h4 style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Players:</h4>
                    <ul style="list-style: none; padding: 0;">
                        ${players.map(p => `<li style="padding: 5px 0;">👤 ${p.name || 'Player'} ${p.id === session.host_id ? '(Host)' : ''}</li>`).join('')}
                    </ul>
                </div>

                ${isHost ?
                `<button id="start-game-btn" class="btn btn-primary" ${players.length >= 2 ? '' : 'disabled'}>Start Game</button>`
                : '<p>Waiting for Host to start...</p>'
            }
                <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 10px;">Leave</button>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;

        // Attach Start Listener
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.onclick = async () => {
                await onlineGamesClient.from('game_sessions').update({ status: 'playing' }).eq('id', session.id);
                channel.send({ type: 'broadcast', event: 'game-start', payload: { players } });
                launch(session);
            };
        }
    };

    renderLobby();

    const channel = onlineGamesClient.channel(`game_updates:${session.id}`);

    const launch = (updatedSession) => {
        showToast('Game Starting!');
        channel.unsubscribe();
        // Pass the player list to the game
        const finalSession = { ...updatedSession, players };
        launchOnlineGame(type, container, finalSession, currentUser);
    };

    channel
        .on('broadcast', { event: 'player-join-req' }, async ({ payload }) => {
            if (isHost) {
                // Host validates and adds player
                if (players.length < session.max_players && !players.find(p => p.id === payload.id)) {
                    players.push(payload);
                    renderLobby();

                    // Sync everyone
                    channel.send({ type: 'broadcast', event: 'lobby-update', payload: { players } });

                    // Update DB state (Backup)
                    await onlineGamesClient.from('game_states').update({ state_json: { players } }).eq('session_id', session.id);
                }
            }
        })
        .on('broadcast', { event: 'lobby-update' }, ({ payload }) => {
            // Clients receive update
            players = payload.players;
            renderLobby();
        })
        .on('broadcast', { event: 'game-start' }, ({ payload }) => {
            players = payload.players;
            launch(session);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && !isHost) {
                // Guest: Request to join
                channel.send({
                    type: 'broadcast',
                    event: 'player-join-req',
                    payload: { id: currentUser.id, name: currentUser.user_metadata?.username || 'Guest' }
                });
            }
        });
}

function launchOnlineGame(type, container, session, currentUser) {
    if (type === 'tictactoe') {
        import('./tictactoe.js').then(m => new m.TicTacToe(container, 'online', session, currentUser));
    } else if (type === 'connect4') {
        import('./connect4.js').then(m => new m.Connect4(container, 'online', session, currentUser));
    } else if (type === 'neon_cards') {
        import('./neon_cards.js').then(m => new m.NeonCards(container, 'online', session, currentUser));
    } else if (type === 'ludo') {
        import('./ludo.js').then(m => new m.Ludo(container, 'online', session, currentUser));
    } else if (type === 'checkers') {
        import('./checkers.js').then(m => new m.Checkers(container, 'online', session, currentUser));
    }
}
