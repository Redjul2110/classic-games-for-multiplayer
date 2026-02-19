
// Game Constants
const PLAYER_X = 'X'; // Human
const PLAYER_O = 'O'; // AI
const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

export class TicTacToe {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode; // 'local' or 'online'
        this.session = session; // Supabase session object
        this.currentUser = currentUser;
        this.board = Array(9).fill(null);
        this.currentPlayer = PLAYER_X;
        this.gameActive = true;

        // Determine player side if online
        if (this.mode === 'online') {
            const isHost = this.session.host_id === this.currentUser.id;
            this.mySide = isHost ? PLAYER_X : PLAYER_O;
        } else {
            this.mySide = PLAYER_X; // Local play always starts as X
        }

        this.initUI();
        if (this.mode === 'online') this.initRealtime();
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'move' }, ({ payload }) => {
                this.makeMove(payload.index, payload.player, false); // false = don't broadcast back
            })
                .subscribe();
        });
    }

    initUI() {
        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 400px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Tic-Tac-Toe</h2>
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 1.1rem;">
                    <span id="player-x-score" style="color: var(--accent-red); font-weight: bold;">
                        ${this.mode === 'online' && this.mySide === PLAYER_O ? 'Opponent (X)' : 'You (X)'}
                    </span>
                    <span id="game-status" style="color: var(--text-secondary);">Waiting...</span>
                    <span id="player-o-score" style="color: white;">
                         ${this.mode === 'online' && this.mySide === PLAYER_X ? 'Opponent (O)' : 'AI (O)'}
                    </span>
                </div>
                
                <div class="ttt-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
                    ${Array(9).fill(0).map((_, i) => `
                        <div class="ttt-cell glass-panel" data-index="${i}" 
                             style="height: 100px; display: flex; align-items: center; justify-content: center; font-size: 3rem; cursor: pointer; transition: all 0.2s;">
                        </div>
                    `).join('')}
                </div>

                <div id="game-controls" class="hidden">
                     ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit to Hub</button>
                </div>
            </div>
        `;

        this.updateStatus();

        // Attach Listeners
        this.container.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.addEventListener('click', () => this.handleCellClick(cell.dataset.index));
        });

        if (this.mode === 'local') {
            this.container.querySelector('#restart-btn').addEventListener('click', () => this.restartGame());
        }
        this.container.querySelector('#exit-btn').addEventListener('click', () => location.reload());
    }

    handleCellClick(index) {
        if (!this.gameActive || this.board[index]) return;

        // Online Check: Is it my turn?
        if (this.mode === 'online' && this.currentPlayer !== this.mySide) {
            return;
        }

        this.makeMove(index, this.currentPlayer, true); // true = broadcast

        if (this.gameActive && this.mode === 'local' && this.currentPlayer === PLAYER_O) {
            // AI Turn
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    makeMove(index, player, shouldBroadcast) {
        this.board[index] = player;
        this.updateBoardUI(index, player);

        if (shouldBroadcast && this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: { index, player }
            });
        }

        if (this.checkWin(player)) {
            this.endGame(player);
        } else if (this.checkDraw()) {
            this.endGame('draw');
        } else {
            this.switchTurn();
        }
    }

    switchTurn() {
        this.currentPlayer = this.currentPlayer === PLAYER_X ? PLAYER_O : PLAYER_X;
        this.updateStatus();
    }

    updateStatus() {
        const statusEl = this.container.querySelector('#game-status');
        if (this.mode === 'local') {
            statusEl.textContent = this.currentPlayer === PLAYER_X ? "Your Turn" : "AI Thinking...";
        } else {
            statusEl.textContent = this.currentPlayer === this.mySide ? "Your Turn" : "Opponent's Turn";
        }
    }

    updateBoardUI(index, player) {
        const cell = this.container.querySelector(`.ttt-cell[data-index="${index}"]`);
        cell.textContent = player;
        cell.style.color = player === PLAYER_X ? 'var(--accent-red)' : 'white';
        // Simple pop animation
        cell.style.transform = 'scale(1.1)';
        setTimeout(() => cell.style.transform = 'scale(1)', 200);
    }

    // --- Win Logic ---
    checkWin(player) {
        return WINNING_COMBOS.some(combo => {
            return combo.every(index => this.board[index] === player);
        });
    }

    checkDraw() {
        return this.board.every(cell => cell !== null);
    }

    endGame(winner) {
        this.gameActive = false;
        const statusEl = this.container.querySelector('#game-status');

        if (winner === 'draw') {
            statusEl.textContent = "It's a Draw!";
            statusEl.style.color = 'var(--text-secondary)';
        } else {
            statusEl.innerHTML = winner === PLAYER_X ?
                '<span style="color: var(--accent-red);">You Win!</span>' :
                '<span style="color: white;">AI Wins!</span>';
        }

        this.container.querySelector('#game-controls').classList.remove('hidden');
    }

    restartGame() {
        this.board = Array(9).fill(null);
        this.currentPlayer = PLAYER_X;
        this.gameActive = true;
        this.container.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.textContent = '';
            cell.style.background = '';
        });
        this.container.querySelector('#game-controls').classList.add('hidden');
        this.updateStatus();
        this.container.querySelector('#game-status').style.color = 'var(--text-secondary)';
    }

    // --- Minimax AI ---
    makeAIMove() {
        const bestMove = this.getBestMove();
        this.makeMove(bestMove, PLAYER_O);
    }

    getBestMove() {
        // Simple logic first: 1. Win, 2. Block, 3. Random
        // For simplicity in this iteration, using random empty spot or center
        const emptyIndices = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);

        if (this.board[4] === null) return 4; // Take center

        // Random
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }
}
