// src/games/minesweeper.js
import { showToast } from '../ui/toast.js';
import { ogClient } from '../supabase.js';

export function renderMinesweeper(container, onBack, multiplayer) {
    const isMp = !!multiplayer;
    const isHost = isMp ? multiplayer.isHost : true;

    const COLS = 10, ROWS = 10, MINES = 15;
    let board = [];
    let revealed = [];
    let flagged = [];
    let gameOver = false;
    let won = false;
    let startTime = null;
    let timerInterval = null;

    let channel = null;

    function initLocalState() {
        board = [];
        revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        flagged = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        gameOver = false;
        won = false;
        startTime = null;
        clearTimer();
    }

    initLocalState();

    if (isMp) {
        channel = ogClient.channel('game-' + multiplayer.lobby.id);
        channel.on('broadcast', { event: 'state' }, (payload) => {
            const { action, r, c, syncData } = payload.payload;
            if (isHost && action === 'click') {
                processClick(r, c);
            } else if (isHost && action === 'flag') {
                processFlag(r, c);
            } else if (isHost && action === 'new_game') {
                initLocalState();
                broadcastSync();
                render();
            } else if (isHost && action === 'request_state') {
                // Guest is asking for current state
                broadcastSync();
            } else if (!isHost && action === 'sync') {
                board = syncData.board;
                revealed = syncData.revealed;
                flagged = syncData.flagged;
                gameOver = syncData.gameOver;
                won = syncData.won;
                if (syncData.startTime && !startTime) {
                    startTime = syncData.startTime;
                    startTimerLocal();
                } else if (!syncData.startTime) {
                    startTime = null;
                    clearTimer();
                }

                if (gameOver && won) showToast('⭐ Cleared!', 'success');
                else if (gameOver && !won) showToast('💥 Boom! Hit a mine!', 'error');

                render();
            }
        }).subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                showToast('Connected to partner! 💣', 'success');
                if (isHost) {
                    setTimeout(() => broadcastSync(), 400);
                } else {
                    // Guest: request current board state from host
                    setTimeout(() => {
                        channel.send({ type: 'broadcast', event: 'state', payload: { action: 'request_state' } });
                    }, 600);
                }
            }
        });
    }

    function handleExit() {
        clearTimer();
        if (channel) { channel.unsubscribe(); ogClient.removeChannel(channel); }
        onBack();
    }

    function broadcastSync() {
        if (isMp && isHost && channel) {
            channel.send({
                type: 'broadcast',
                event: 'state',
                payload: {
                    action: 'sync',
                    syncData: { board, revealed, flagged, gameOver, won, startTime }
                }
            });
        }
    }

    function createBoard(excludeR, excludeC) {
        const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        let placed = 0;
        while (placed < MINES) {
            const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
            if (b[r][c] === -1 || (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1)) continue;
            b[r][c] = -1;
            placed++;
        }
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (b[r][c] === -1) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === -1) count++;
                }
                b[r][c] = count;
            }
        }
        return b;
    }

    function startTimerLocal() {
        clearTimer();
        timerInterval = setInterval(() => render(), 1000);
    }

    function clearTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }

    function processClick(r, c) {
        if (gameOver || flagged[r][c] || (board.length > 0 && revealed[r][c])) return;

        let first = false;
        if (board.length === 0) {
            board = createBoard(r, c);
            startTime = Date.now();
            startTimerLocal();
            first = true;
        }

        if (board[r][c] === -1) {
            for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++)
                if (board[i][j] === -1) revealed[i][j] = true;
            gameOver = true;
            clearTimer();
            showToast('💥 Boom! Hit a mine!', 'error');
        } else {
            floodReveal(r, c);
            checkWin();
        }

        broadcastSync();
        render();
    }

    function processFlag(r, c) {
        if (gameOver || (board.length > 0 && revealed[r][c])) return;
        flagged[r][c] = !flagged[r][c];
        broadcastSync();
        render();
    }

    function floodReveal(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        if (revealed[r][c] || flagged[r][c]) return;
        revealed[r][c] = true;
        if (board[r][c] === 0) {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) floodReveal(r + dr, c + dc);
        }
    }

    function checkWin() {
        if (board.length === 0) return;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
            if (board[r][c] !== -1 && !revealed[r][c]) return;
        won = true; gameOver = true;
        clearTimer();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        showToast(`★ Cleared in ${elapsed}s!`, 'success');
        import('../ui/animations.js').then(({ triggerConfetti }) => triggerConfetti());
    }

    function render() {
        const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        const flagCount = flagged.flat().filter(Boolean).length;

        container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Minesweeper ⏱ <span class="game-screen-badge ${isMp ? 'vs-player' : ''}">${isMp ? 'Co-op' : 'SOLO'}</span></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;gap:12px;">
          <div style="display:flex;gap:24px;font-size:0.9rem;font-weight:700;">
            <span>💣 ${MINES - flagCount} remaining</span>
            <span>⏱ ${elapsed}s</span>
            <span>${won ? '★ Cleared!' : gameOver && !won ? '💥 Exploded!' : '[HIT] Playing'}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Left-click: Reveal &nbsp;|&nbsp; Right-click: Flag</div>
          <div class="ms-grid" id="ms-grid" style="grid-template-columns:repeat(${COLS},1fr);">
            ${board.length > 0 ? renderGrid() : Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS), c = i % COLS;
            return `<div class="ms-cell" data-r="${r}" data-c="${c}"></div>`;
        }).join('')}
          </div>
          ${gameOver ? `
            <div style="display:flex;gap:12px;">
              ${(!isMp || isHost) ? `<button class="btn btn-primary" id="restart-btn">Play Again</button>` : `<div style="color:var(--text-muted)">Waiting for host...</div>`}
              <button class="btn btn-ghost" id="exit-btn">Exit</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

        container.querySelector('#back-btn').addEventListener('click', handleExit);
        container.querySelector('#exit-btn')?.addEventListener('click', handleExit);
        container.querySelector('#restart-btn')?.addEventListener('click', () => {
            if (isMp && channel) channel.send({ type: 'broadcast', event: 'state', payload: { action: 'new_game' } });
            initLocalState();
            if (isHost) broadcastSync();
            render();
        });

        // Event delegation pattern using the container reduces listeners
        const grid = container.querySelector('#ms-grid');
        if (grid && !gameOver) {
            grid.addEventListener('click', (e) => {
                const cell = e.target.closest('.ms-cell');
                if (!cell) return;
                const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
                if (isMp && !isHost) {
                    channel.send({ type: 'broadcast', event: 'state', payload: { action: 'click', r, c } });
                } else {
                    processClick(r, c);
                }
            });
            grid.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const cell = e.target.closest('.ms-cell');
                if (!cell) return;
                const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
                if (isMp && !isHost) {
                    channel.send({ type: 'broadcast', event: 'state', payload: { action: 'flag', r, c } });
                } else {
                    processFlag(r, c);
                }
            });
        }
    }

    function renderGrid() {
        let html = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let cls = 'ms-cell';
                let content = '';
                let attrs = `data-r="${r}" data-c="${c}"`;
                if (revealed[r][c]) {
                    cls += ' revealed';
                    if (board[r][c] === -1) { cls += ' mine'; content = '💣'; }
                    else if (board[r][c] > 0) { content = board[r][c]; attrs += ` data-n="${board[r][c]}"`; }
                } else if (flagged[r][c]) {
                    cls += ' flagged'; content = '🚩';
                }
                html += `<div class="${cls}" ${attrs}>${content}</div>`;
            }
        }
        return html;
    }

    render();
}
