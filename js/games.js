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
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Tic-Tac-Toe</h3>
                            <button class="btn btn-ghost help-btn" data-game="ttt" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
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
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Connect 4</h3>
                            <button class="btn btn-ghost help-btn" data-game="c4" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
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
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Neon Cards</h3>
                            <button class="btn btn-ghost help-btn" data-game="neon" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Cyberpunk card matching.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-neon-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                            <button class="btn btn-ghost" id="play-neon-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Battleship -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #001f3f, #0074D9);"></div>
                    <div class="game-card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Battleship</h3>
                            <button class="btn btn-ghost help-btn" data-game="battleship" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Sink enemy ships.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-battleship-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-battleship-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Dots and Boxes -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #FF8C00, #FF4500);"></div>
                    <div class="game-card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Dots & Boxes</h3>
                            <button class="btn btn-ghost help-btn" data-game="dots_boxes" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Claim the most squares.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-dots_boxes-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-dots_boxes-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Memory -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #9C27B0, #E040FB);"></div>
                    <div class="game-card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Memory</h3>
                            <button class="btn btn-ghost help-btn" data-game="memory" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Find matching pairs.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-memory-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-memory-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Hangman -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #5D4037, #A1887F);"></div>
                    <div class="game-card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Hangman</h3>
                            <button class="btn btn-ghost help-btn" data-game="hangman" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Guess the hidden word.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-hangman-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-hangman-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Rock Paper Scissors -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #009688, #80CBC4);"></div>
                    <div class="game-card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">R-P-S</h3>
                            <button class="btn btn-ghost help-btn" data-game="rps" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Rock Paper Scissors.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-rps-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                             <button class="btn btn-ghost" id="play-rps-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
                        </div>
                    </div>
                </div>

                <!-- Checkers -->
                <div class="game-card glass-panel">
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #333333, #000000);"></div>
                    <div class="game-card-content">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0;">Checkers</h3>
                            <button class="btn btn-ghost help-btn" data-game="checkers" style="padding: 2px 8px; font-size: 1.1rem;" title="How to play">❓</button>
                        </div>
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

    document.getElementById('play-battleship-local').addEventListener('click', () => {
        import('./battleship.js').then(m => new m.Battleship(container, 'local'));
    });

    document.getElementById('play-dots_boxes-local').addEventListener('click', () => {
        import('./dots_boxes.js').then(m => new m.DotsBoxes(container, 'local'));
    });

    document.getElementById('play-memory-local').addEventListener('click', () => {
        import('./memory.js').then(m => new m.Memory(container, 'local'));
    });

    document.getElementById('play-hangman-local').addEventListener('click', () => {
        import('./hangman.js').then(m => new m.Hangman(container, 'local'));
    });

    document.getElementById('play-rps-local').addEventListener('click', () => {
        import('./rps.js').then(m => new m.RPS(container, 'local'));
    });

    // Online Listeners
    const bindOnline = (id, type) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => setupOnlineGame(type, container, currentUser));
    };

    bindOnline('play-ttt-online', 'tictactoe');
    bindOnline('play-c4-online', 'connect4');
    bindOnline('play-neon-online', 'neon_cards');
    bindOnline('play-checkers-online', 'checkers');
    bindOnline('play-battleship-online', 'battleship');
    bindOnline('play-dots_boxes-online', 'dots_boxes');
    bindOnline('play-memory-online', 'memory');
    bindOnline('play-hangman-online', 'hangman');
    bindOnline('play-rps-online', 'rps');

    // Help Buttons Listeners
    container.querySelectorAll('.help-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const g = btn.dataset.game;
            let title = '', rules = '';

            if (g === 'ttt') {
                title = 'Tic-Tac-Toe Rules';
                rules = 'Place 3 of your marks (X or O) in a horizontal, vertical, or diagonal row to win.';
            } else if (g === 'c4') {
                title = 'Connect 4 Rules';
                rules = 'Drop your discs into the columns. The first player to form a line of 4 discs (horizontal, vertical, or diagonal) wins.';
            } else if (g === 'neon') {
                title = 'Neon Cards Rules';
                rules = 'Match the top card by Color or Number. Action cards (Skip, Reverse, +2) affect the opponent. Wilds can change the color. First to empty their hand wins.';
            } else if (g === 'battleship') {
                title = 'Battleship Rules';
                rules = 'Place your 5 ships on the grid. Take turns guessing coordinates to strike your opponent\'s fleet. First to sink all ships wins.';
            } else if (g === 'dots_boxes') {
                title = 'Dots and Boxes Rules';
                rules = 'Players take turns drawing horizontal or vertical lines between dots. The player who completes the 4th side of a 1x1 box claims it and gets another turn.';
            } else if (g === 'memory') {
                title = 'Memory Rules';
                rules = 'Flip two cards per turn. If they match, you score a point and get another turn. Find all pairs to win.';
            } else if (g === 'hangman') {
                title = 'Hangman Rules';
                rules = 'A secret word is chosen. Guess letters. If you guess wrong. A piece of the hangman is drawn. If the hangman completes, you lose.';
            } else if (g === 'rps') {
                title = 'Rock-Paper-Scissors Rules';
                rules = 'Both players secretly choose Rock, Paper, or Scissors. Rock beats Scissors, Scissors beats Paper, Paper beats Rock. Best of 5 wins.';
            } else if (g === 'checkers') {
                title = 'Checkers Rules';
                rules = 'Move diagonally forward. Jump over opponent pieces to capture them. Reach the opposite end to become a King (can move backwards). Capture all to win.';
            }
            showModal(title, `<p style="line-height: 1.6;">${rules}</p>`);
        };
    });
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
                players: [{
                    id: currentUser.id,
                    name: currentUser.user_metadata?.username || 'Host',
                    avatar_url: currentUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=Host&background=random`
                }],
                started: false,
                last_ping: Date.now()
            }
        });

    if (stateError) {
        console.error('State Init Error:', stateError);
    }

    waitForOpponent(session, type, container, currentUser);
}

async function joinGame(type, joinMode, container, currentUser) {
    let targetSessionId = null;

    if (joinMode === 'random') {
        showModal('Matchmaking', '<div style="text-align:center"><div class="loader" style="margin:20px auto; border:4px solid rgba(255,255,255,0.1); border-top:4px solid var(--accent-red); border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite;"></div><p>Searching for active lobbies...</p></div>');

        // Fetch all potential open games
        const { data: openGames, error } = await onlineGamesClient
            .from('game_sessions')
            .select('*')
            .eq('game_type', type)
            .eq('status', 'waiting')
            .eq('is_public', true)
            .neq('host_id', currentUser.id);

        if (error || !openGames || openGames.length === 0) {
            closeModal();
            showModal('No Matches', 'No public games found right now. Try hosting one!');
            return;
        }

        // Smart Join: Iterate and check DB 'last_ping'. If a lobby is a "ghost" (Host closed tab but DB didn't update), delete it.
        for (const session of openGames) {
            const { data: st } = await onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single();
            if (st && st.state_json) {
                const lastPing = st.state_json.last_ping || 0;
                // If the ping is older than 10 seconds, it's a ghost lobby
                if (Date.now() - lastPing > 10000) {
                    await onlineGamesClient.from('game_sessions').delete().eq('id', session.id);
                } else {
                    targetSessionId = session.id;
                    break; // found an active lobby
                }
            } else {
                // Completely broken state
                await onlineGamesClient.from('game_sessions').delete().eq('id', session.id);
            }
        }

        if (!targetSessionId) {
            closeModal();
            showModal('No Matches', 'All active lobbies are unfortunately closed now. Try hosting one!');
            return;
        }
    } else {
        targetSessionId = joinMode;
    }

    // Fetch session details directly
    const { data: session, error } = await onlineGamesClient
        .from('game_sessions')
        .select('*')
        .eq('id', targetSessionId)
        .single();

    if (error || !session) {
        showModal('Error', 'Game not found. Please check the ID or the host has closed it.');
        return;
    }

    if (session.host_id === currentUser.id) {
        showModal('Join Failed', 'Cannot join your own game. To test online multiplayer, use a Private/Incognito window for the second player.');
        return;
    }

    const guestPlayer = {
        id: currentUser.id,
        name: currentUser.user_metadata?.username || (currentUser.id.startsWith('guest_') ? `Guest (${currentUser.id.split('_')[1]})` : 'Guest'),
        avatar_url: currentUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=Guest`
    };

    // Explicitly add guest to DB state right now
    const { data: st } = await onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single();
    if (st && st.state_json && st.state_json.players) {
        let players = st.state_json.players;
        if (!players.find(p => p.id === guestPlayer.id)) {
            players.push(guestPlayer);
            await onlineGamesClient.from('game_states').update({ state_json: { ...st.state_json, players } }).eq('session_id', session.id);
        }
    }

    closeModal();
    waitForOpponent(session, type, container, currentUser);
}

function waitForOpponent(session, type, container, currentUser) {
    const isHost = session.host_id === currentUser.id;
    let players = [];
    let pollingInterval = null;

    // Fast tracking cleanup for host closing tab during matchmaking
    const unloadHandler = () => {
        if (isHost) {
            onlineGamesClient.from('game_sessions').delete().eq('id', session.id).then();
        }
    };
    window.addEventListener('beforeunload', unloadHandler);

    const renderLobby = () => {
        container.innerHTML = `
            <div class="glass-panel" style="text-align:center; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h2 style="font-size: 2rem; margin-bottom: 20px;">Lobby <span style="color: var(--text-secondary); font-size: 1.2rem;">(${players.length}/${session.max_players})</span></h2>
                <div class="loader" style="border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--accent-red); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 30px auto;"></div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; display: inline-block;">
                    <p style="margin: 0;">Game ID: <span style="font-family: monospace; color: var(--accent-red); font-weight: bold; user-select: all; cursor: pointer;" title="Double click to copy">${session.id}</span></p>
                    ${session.is_public ? '<p style="color: #44ff44; font-size: 0.8rem; margin: 5px 0 0 0;">🌍 Public Matchmaking</p>' : '<p style="color: #ffaa44; font-size: 0.8rem; margin: 5px 0 0 0;">🔒 Private Lobby</p>'}
                </div>

                <div style="margin: 30px 0; text-align: left; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-top: 0;">Connected Players</h3>
                    <ul style="list-style: none; padding: 0; margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
                        ${players.map(p => {
            const isThisHost = p.id === session.host_id;
            return `
                            <li style="display: flex; align-items: center; gap: 15px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                                <img src="${p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}`}" alt="${p.name}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${isThisHost ? 'var(--accent-red)' : '#666'};">
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; font-size: 1.1rem; color: ${isThisHost ? '#ffd700' : 'white'};">${p.name || 'Player'}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${isThisHost ? '⭐ Party Leader' : 'Player'}</div>
                                </div>
                            </li>`;
        }).join('')}
                    </ul>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                ${isHost ?
                `<button id="start-game-btn" class="btn btn-primary" style="font-size: 1.1rem; padding: 12px 30px;" ${players.length >= 2 ? '' : 'disabled'}>Start Game</button>`
                : '<p style="color: var(--text-secondary); margin: 0; align-self: center;">Waiting for Host to start the game...</p>'
            }
                <button id="leave-lobby-btn" class="btn btn-secondary" style="font-size: 1.1rem; padding: 12px 30px;">Leave Lobby</button>
                </div>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;

        // Attach Leave Listener
        const leaveBtn = document.getElementById('leave-lobby-btn');
        if (leaveBtn) {
            leaveBtn.onclick = async () => {
                if (isHost) {
                    await onlineGamesClient.from('game_sessions').delete().eq('id', session.id);
                } else {
                    // Guest leaves
                    const { data: st } = await onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single();
                    if (st && st.state_json) {
                        const newPlayers = st.state_json.players.filter(p => p.id !== currentUser.id);
                        await onlineGamesClient.from('game_states').update({ state_json: { ...st.state_json, players: newPlayers } }).eq('session_id', session.id);
                    }
                }
                clearInterval(pollingInterval);
                location.reload();
            };
        }

        // Attach Start Listener
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.onclick = async () => {
                startBtn.disabled = true;
                startBtn.innerText = 'Starting...';

                await onlineGamesClient.from('game_sessions').update({ status: 'playing' }).eq('id', session.id);

                // Update state block
                const { data: st } = await onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single();
                if (st && st.state_json) {
                    await onlineGamesClient.from('game_states').update({ state_json: { ...st.state_json, started: true, players } }).eq('session_id', session.id);
                }

                clearInterval(pollingInterval);
                launch(session);
            };
        }
    };

    const loadState = async () => {
        const { data, error } = await onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single();
        if (error) {
            // Session likely deleted by host
            clearInterval(pollingInterval);
            showModal('Lobby Closed', 'The host has ended the lobby.', [{ text: 'OK', class: 'btn-primary', onClick: () => location.reload() }]);
            return;
        }

        if (data && data.state_json) {
            players = data.state_json.players || [];

            if (isHost) {
                // Host keeps the lobby alive
                await onlineGamesClient.from('game_states').update({ state_json: { ...data.state_json, last_ping: Date.now() } }).eq('session_id', session.id);
            } else {
                // Ghost Lobby Protection for guests already in lobby
                const lastPing = data.state_json.last_ping || 0;
                if (Date.now() - lastPing > 10000) {
                    clearInterval(pollingInterval);
                    showModal('Lobby Closed', 'The host has disconnected. This lobby is no longer active.', [{ text: 'Leave', class: 'btn-primary', onClick: () => location.reload() }]);
                    return;
                }
            }

            if (!isHost && data.state_json.started) {
                clearInterval(pollingInterval);
                launch(session);
                return;
            }
            renderLobby();
        }
    };

    // DB Polling specifically replaces pure Broadcast or pure Realtime completely
    pollingInterval = setInterval(loadState, 2000);
    loadState(); // init fast

    const launch = (updatedSession) => {
        showToast('Game Starting!');
        window.removeEventListener('beforeunload', unloadHandler); // Let launchOnlineGame handle it
        const finalSession = { ...updatedSession, players };
        launchOnlineGame(type, container, finalSession, currentUser);
    };
}

export function launchOnlineGame(type, container, session, currentUser) {
    const isHost = session && session.host_id && currentUser && session.host_id === currentUser.id;

    // Auto cleanup if tab is closed during an active game
    window.addEventListener('beforeunload', () => {
        if (isHost) {
            onlineGamesClient.from('game_sessions').delete().eq('id', session.id).then();
        } else if (session) {
            onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single().then(({ data: st }) => {
                if (st && st.state_json && st.state_json.players) {
                    const newPlayers = st.state_json.players.filter(p => p.id !== currentUser.id);
                    onlineGamesClient.from('game_states').update({ state_json: { ...st.state_json, players: newPlayers } }).eq('session_id', session.id).then();
                }
            });
        }
    });

    if (type === 'tictactoe') {
        import('./tictactoe.js').then(m => new m.TicTacToe(container, 'online', session, currentUser));
    } else if (type === 'connect4') {
        import('./connect4.js').then(m => new m.Connect4(container, 'online', session, currentUser));
    } else if (type === 'neon_cards') {
        import('./neon_cards.js').then(m => new m.NeonCards(container, 'online', session, currentUser));
    } else if (type === 'battleship') {
        import('./battleship.js').then(m => new m.Battleship(container, 'online', session, currentUser));
    } else if (type === 'dots_boxes') {
        import('./dots_boxes.js').then(m => new m.DotsBoxes(container, 'online', session, currentUser));
    } else if (type === 'memory') {
        import('./memory.js').then(m => new m.Memory(container, 'online', session, currentUser));
    } else if (type === 'hangman') {
        import('./hangman.js').then(m => new m.Hangman(container, 'online', session, currentUser));
    } else if (type === 'rps') {
        import('./rps.js').then(m => new m.RPS(container, 'online', session, currentUser));
    } else if (type === 'checkers') {
        import('./checkers.js').then(m => new m.Checkers(container, 'online', session, currentUser));
    }
}

export async function cleanupAndExit(session, currentUser) {
    if (!session || !currentUser) {
        location.reload();
        return;
    }
    const isHost = session.host_id === currentUser.id;
    if (isHost) {
        await onlineGamesClient.from('game_sessions').delete().eq('id', session.id);
    } else {
        const { data: st } = await onlineGamesClient.from('game_states').select('state_json').eq('session_id', session.id).single();
        if (st && st.state_json && st.state_json.players) {
            const newPlayers = st.state_json.players.filter(p => p.id !== currentUser.id);
            await onlineGamesClient.from('game_states').update({ state_json: { ...st.state_json, players: newPlayers } }).eq('session_id', session.id);
        }
    }
    location.reload();
}
