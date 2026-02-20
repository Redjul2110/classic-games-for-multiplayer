import { cleanupAndExit } from './games.js';

const ROWS = 6;
const COLS = 7;
const PLAYER_RED = 'R'; // Player 1
const PLAYER_YELLOW = 'Y'; // Player 2 / AI

export class Connect4 {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        this.currentPlayer = PLAYER_RED;
        this.gameActive = true;
        this.mySide = PLAYER_RED;

        if (this.mode === 'online') {
            const isHost = String(this.session.host_id) === String(this.currentUser.id);
            this.mySide = isHost ? PLAYER_RED : PLAYER_YELLOW;
            this.initRealtime();
        }

        this.initUI();
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);
            this.channel.on('broadcast', { event: 'move' }, ({ payload }) => {
                this.dropPiece(payload.col, payload.player, false);
            }).subscribe();
        });
    }

    initUI() {
        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 500px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Connect 4</h2>
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <span id="p1-score" style="color: var(--accent-red); font-weight: bold;">
                        ${this.getLabel(PLAYER_RED)}
                    </span>
                    <span id="game-status" style="color: var(--text-secondary);">Red's Turn</span>
                    <span id="p2-score" style="color: yellow;">
                        ${this.getLabel(PLAYER_YELLOW)}
                    </span>
                </div>

                <div class="c4-board" style="
                    display: grid; 
                    grid-template-columns: repeat(${COLS}, 1fr); 
                    gap: 5px; 
                    background: rgba(0,0,255,0.2); 
                    padding: 10px; 
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                ">
                    <!-- Grid Generated -->
                </div>
                
                <div id="game-controls" class="hidden" style="margin-top: 20px;">
                    ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit</button>
                </div>
            </div>
        `;

        this.renderGrid();

        if (this.mode === 'local') {
            this.container.querySelector('#restart-btn').addEventListener('click', () => this.restartGame());
        }
        this.container.querySelector('#exit-btn').addEventListener('click', () => {
            if (this.mode === 'online') cleanupAndExit(this.session, this.currentUser);
            else location.reload();
        });
    }

    getLabel(player) {
        if (this.mode === 'local') {
            return player === PLAYER_RED ? 'You (Red)' : 'AI (Yellow)';
        }
        return player === this.mySide ? 'You' : 'Opponent';
    }

    renderGrid() {
        const boardEl = this.container.querySelector('.c4-board');
        boardEl.innerHTML = '';

        // We render slots. Clicking anywhere in a col drops piece.
        // But for visual, we just render cells.
        // We need clickable columns overlays or just cell click handler that calcs col.

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'c4-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.style.aspectRatio = '1';
                cell.style.borderRadius = '50%';
                cell.style.background = 'rgba(0,0,0,0.5)';
                cell.style.cursor = 'pointer';
                cell.style.transition = 'background 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

                // Color existing pieces
                if (this.board[r][c] === PLAYER_RED) cell.style.background = 'var(--accent-red)';
                if (this.board[r][c] === PLAYER_YELLOW) cell.style.background = 'yellow';

                cell.addEventListener('click', () => this.handleColumnClick(c));
                boardEl.appendChild(cell);
            }
        }
    }

    handleColumnClick(col) {
        if (!this.gameActive) return;
        if (this.mode === 'online' && this.currentPlayer !== this.mySide) return;

        this.dropPiece(col, this.currentPlayer, true);

        if (this.gameActive && this.mode === 'local' && this.currentPlayer === PLAYER_YELLOW) {
            setTimeout(() => this.makeAIMove(), 600);
        }
    }

    dropPiece(col, player, shouldBroadcast) {
        // Find lowest empty row
        let r = ROWS - 1;
        while (r >= 0 && this.board[r][col] !== null) {
            r--;
        }

        if (r < 0) return; // Column full

        this.board[r][col] = player;
        this.animateDrop(r, col, player);

        if (shouldBroadcast && this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: { col, player }
            });
        }

        if (this.checkWin(r, col, player)) {
            this.endGame(player);
        } else if (this.checkDraw()) {
            this.endGame('draw');
        } else {
            this.currentPlayer = this.currentPlayer === PLAYER_RED ? PLAYER_YELLOW : PLAYER_RED;
            this.updateStatus();
        }
    }

    animateDrop(r, col, player) {
        const index = r * COLS + col;
        const cells = this.container.querySelectorAll('.c4-cell');
        const cell = cells[index];

        // Immediate update for now, could animate "falling" by highlighting cells above first
        cell.style.background = player === PLAYER_RED ? 'var(--accent-red)' : 'yellow';
        cell.style.transform = 'scale(0.8)';
        setTimeout(() => cell.style.transform = 'scale(1)', 100);
    }

    updateStatus() {
        const el = this.container.querySelector('#game-status');
        const color = this.currentPlayer === PLAYER_RED ? 'var(--accent-red)' : 'yellow';
        const name = this.currentPlayer === PLAYER_RED ? 'Red' : 'Yellow';
        el.innerHTML = `<span style="color:${color}">${name}'s Turn</span>`;
    }

    checkWin(r, c, player) {
        // Directions: [dr, dc]
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        return directions.some(([dr, dc]) => {
            let count = 1;
            // Check forward
            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || this.board[nr][nc] !== player) break;
                count++;
            }
            // Check backward
            for (let i = 1; i < 4; i++) {
                const nr = r - dr * i;
                const nc = c - dc * i;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || this.board[nr][nc] !== player) break;
                count++;
            }
            return count >= 4;
        });
    }

    checkDraw() {
        return this.board[0].every(cell => cell !== null);
    }

    endGame(winner) {
        this.gameActive = false;
        const el = this.container.querySelector('#game-status');
        if (winner === 'draw') {
            el.textContent = "Draw!";
            el.style.color = '#fff';
        } else {
            const name = winner === PLAYER_RED ? 'Red' : 'Yellow';
            const color = winner === PLAYER_RED ? 'var(--accent-red)' : 'yellow';
            el.innerHTML = `<span style="color:${color}; font-size: 1.2rem; font-weight: bold;">${name} Wins!</span>`;
        }
        this.container.querySelector('#game-controls').classList.remove('hidden');
    }

    restartGame() {
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        this.currentPlayer = PLAYER_RED;
        this.gameActive = true;
        this.renderGrid();
        this.updateStatus();
        this.container.querySelector('#game-controls').classList.add('hidden');
    }

    makeAIMove() {
        // Simple AI: Random valid col, but prefer center or block
        const validCols = [];
        for (let c = 0; c < COLS; c++) {
            if (this.board[0][c] === null) validCols.push(c);
        }

        if (validCols.length === 0) return;

        // Pick random
        const col = validCols[Math.floor(Math.random() * validCols.length)];
        this.dropPiece(col, PLAYER_YELLOW);
    }
}
