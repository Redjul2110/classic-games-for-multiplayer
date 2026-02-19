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
                    <div class="game-card-bg" style="background-image: linear-gradient(45deg, #FFFF00, #FF0000);"></div>
                    <div class="game-card-content">
                        <h3>Uno</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                            Card matching fun.
                        </p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" id="play-uno-local" style="font-size: 0.8rem; padding: 8px 16px;">VS AI</button>
                            <button class="btn btn-ghost" id="play-uno-online" style="font-size: 0.8rem; padding: 8px 16px;">Online</button>
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

    document.getElementById('play-uno-local').addEventListener('click', () => {
        import('./uno.js').then(m => new m.Uno(container, 'local'));
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
    bindOnline('play-uno-online', 'uno');
    bindOnline('play-ludo-online', 'ludo');
    bindOnline('play-checkers-online', 'checkers');
}

async function setupOnlineGame(type, container, currentUser) {
    showGameModeSelection(type.toUpperCase(),
        (isPublic) => hostGame(type, isPublic, container, currentUser),
        (joinMode) => joinGame(type, joinMode, container, currentUser)
    );
}

async function hostGame(type, isPublic, container, currentUser) {
    const { data, error } = await onlineGamesClient
        .from('game_sessions')
        .insert({
            host_id: currentUser.id,
            game_type: type,
            status: 'waiting',
            is_public: isPublic
        })
        .select()
        .single();

    if (error) {
        showModal('Error', error.message);
    } else {
        waitForOpponent(data, type, container, currentUser);
    }
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

    // Attempt Join
    const { error } = await onlineGamesClient
        .from('game_sessions')
        .update({ status: 'playing' }) // In a full app, we'd add guest_id here too
        .eq('id', gameId);

    if (error) {
        showModal('Error', 'Could not join game: ' + error.message);
    } else {
        // Broadcast arrival! This fixes the host waiting issue.
        const channel = onlineGamesClient.channel(`game_updates:${gameId}`);
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.send({
                    type: 'broadcast',
                    event: 'player-joined',
                    payload: { id: currentUser.id }
                });

                // Launch
                const { data: session } = await onlineGamesClient.from('game_sessions').select('*').eq('id', gameId).single();
                launchOnlineGame(type, container, session, currentUser);
            }
        });
    }
}

function waitForOpponent(session, type, container, currentUser) {
    // Show waiting UI
    container.innerHTML = `
        <div class="glass-panel" style="text-align:center; max-width: 500px; margin: 0 auto;">
            <h2>Waiting for opponent...</h2>
            <div class="loader" style="border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
            <p>Game ID: <span style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px; user-select: all;">${session.id}</span></p>
            ${session.is_public ? '<p style="color: #44ff44; font-size: 0.8rem;">Public Lobby - Visible to others</p>' : '<p style="color: #ffaa44; font-size: 0.8rem;">Private Lobby - Share ID</p>'}
            <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 20px;">Cancel</button>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;

    // Subscribe to BOTH DB updates (backup) and Broadcast events (fast)
    const channel = onlineGamesClient.channel(`game_updates:${session.id}`);

    const launch = (updatedSession) => {
        showToast('Opponent found! Starting...');
        channel.unsubscribe();
        launchOnlineGame(type, container, updatedSession || session, currentUser);
    };

    channel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` }, (payload) => {
            if (payload.new.status === 'playing') {
                launch(payload.new);
            }
        })
        .on('broadcast', { event: 'player-joined' }, () => {
            console.log('Player joined evt received');
            launch();
        })
        .subscribe();
}

function launchOnlineGame(type, container, session, currentUser) {
    if (type === 'tictactoe') {
        import('./tictactoe.js').then(m => new m.TicTacToe(container, 'online', session, currentUser));
    } else if (type === 'connect4') {
        import('./connect4.js').then(m => new m.Connect4(container, 'online', session, currentUser));
    } else if (type === 'uno') {
        import('./uno.js').then(m => new m.Uno(container, 'online', session, currentUser));
    } else if (type === 'ludo') {
        import('./ludo.js').then(m => new m.Ludo(container, 'online', session, currentUser));
    } else if (type === 'checkers') {
        import('./checkers.js').then(m => new m.Checkers(container, 'online', session, currentUser));
    }
}
