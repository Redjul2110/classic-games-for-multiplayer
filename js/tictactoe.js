
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

        // Party Mode Settings
        this.players = session?.players || [];
        this.playerCount = this.players.length > 0 ? this.players.length : 2;

        // Scale Board
        this.gridSize = this.playerCount > 2 ? Math.max(10, this.playerCount * 3) : 3;
        this.winCondition = this.playerCount > 2 ? 5 : 3;

        this.board = Array(this.gridSize * this.gridSize).fill(null);
        this.currentPlayerIdx = 0;
        this.gameActive = true;

        // Symbols map
        this.symbols = ['X', 'O', '△', '□', '☆', '◇', '♤', '♡', '♧', 'test'];

        // Determine player side if online
        if (this.mode === 'online') {
            this.myIndex = this.players.findIndex(p => p.id === this.currentUser.id);
            if (this.myIndex === -1) this.myIndex = 0; // Fallback
        } else {
            this.myIndex = 0;
        }

        this.initUI();
        if (this.mode === 'online') this.initRealtime();
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'move' }, ({ payload }) => {
                this.makeMove(payload.index, payload.playerIdx, false);
            })
                .subscribe();
        });
    }

    initUI() {
        const cellSize = this.gridSize > 3 ? '40px' : '100px';
        const fontSize = this.gridSize > 3 ? '1.5rem' : '3rem';

        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: ${this.gridSize > 3 ? '800px' : '400px'}; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Tic-Tac-Toe ${this.playerCount > 2 ? '(Party Mode)' : ''}</h2>
                <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; font-size: 1.1rem;">
                    <span id="game-status" style="color: var(--text-secondary);">Waiting...</span>
                </div>
                
                <div class="ttt-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(${this.gridSize}, 1fr); 
                    gap: 5px; 
                    margin-bottom: 20px;
                    width: fit-content;
                    margin-left: auto;
                    margin-right: auto;
                ">
                    ${Array(this.board.length).fill(0).map((_, i) => `
                        <div class="ttt-cell glass-panel" data-index="${i}" 
                             style="width: ${cellSize}; height: ${cellSize}; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}; cursor: pointer; transition: all 0.2s;">
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
            cell.addEventListener('click', () => this.handleCellClick(parseInt(cell.dataset.index)));
        });

        if (this.mode === 'local') {
            this.container.querySelector('#restart-btn').addEventListener('click', () => this.restartGame());
        }
        this.container.querySelector('#exit-btn').addEventListener('click', () => location.reload());
    }

    handleCellClick(index) {
        if (!this.gameActive || this.board[index]) return;

        // Online Check: Is it my turn?
        if (this.mode === 'online' && this.currentPlayerIdx !== this.myIndex) {
            return;
        }

        this.makeMove(index, this.currentPlayerIdx, true); // true = broadcast

        if (this.gameActive && this.mode === 'local' && this.currentPlayerIdx === 1) {
            // AI Turn (Only works for 2 player local for now)
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    makeMove(index, playerIdx, shouldBroadcast) {
        this.board[index] = playerIdx;
        this.updateBoardUI(index, playerIdx);

        if (shouldBroadcast && this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: { index, playerIdx }
            });
        }

        if (this.checkWin(playerIdx)) {
            this.endGame(playerIdx);
        } else if (this.checkDraw()) {
            this.endGame('draw');
        } else {
            this.switchTurn();
        }
    }

    switchTurn() {
        this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.playerCount;
        this.updateStatus();
    }

    updateStatus() {
        const statusEl = this.container.querySelector('#game-status');
        const symbol = this.symbols[this.currentPlayerIdx];

        let text = "";
        if (this.mode === 'online') {
            text = this.currentPlayerIdx === this.myIndex ? "Your Turn" : `Player ${this.currentPlayerIdx + 1}'s Turn`;
        } else {
            text = `Player ${this.currentPlayerIdx + 1} (${symbol}) Turn`;
        }
        statusEl.textContent = text;
        statusEl.style.color = 'white';
    }

    updateBoardUI(index, playerIdx) {
        const cell = this.container.querySelector(`.ttt-cell[data-index="${index}"]`);
        const symbol = this.symbols[playerIdx];
        cell.textContent = symbol;
        cell.style.color = ['var(--accent-red)', '#44ff44', '#4444ff', '#ffff44'][playerIdx % 4];
        cell.style.transform = 'scale(1.1)';
        setTimeout(() => cell.style.transform = 'scale(1)', 200);
    }

    // --- Win Logic (Standard + Gomoku style for large grids) ---
    checkWin(playerIdx) {
        const size = this.gridSize;
        const req = this.winCondition;
        const b = this.board;

        // Helper to check direction
        const checkDir = (startIdx, step) => {
            let count = 0;
            for (let i = 0; i < req; i++) {
                const idx = startIdx + (i * step);
                if (idx < 0 || idx >= b.length) return false;

                // Wrap check for rows
                if (step === 1 || step === size + 1 || step === size - 1) {
                    // Simple bounds check logic is complex for 1D array representing 2D
                    // Let's use (r,c) coordinates for safety
                    const r = Math.floor(idx / size);
                    const c = idx % size;
                    const startR = Math.floor(startIdx / size);
                    const startC = startIdx % size;

                    // If we wrapped rows improperly, fail
                    if (Math.abs(r - startR) !== Math.abs(c - startC) && step !== 1 && step !== size) return false; // Diagonal check fail
                    if (r !== startR && step === 1) return false; // Horizontal wrap fail
                }

                if (b[idx] === playerIdx) count++;
                else break;
            }
            return count === req;
        };

        for (let i = 0; i < b.length; i++) {
            if (b[i] !== playerIdx) continue;

            // Check E, S, SE, SW
            if (checkDir(i, 1)) return true; // Horizontal
            if (checkDir(i, size)) return true; // Vertical
            if (checkDir(i, size + 1)) return true; // Diagonal \
            if (checkDir(i, size - 1)) return true; // Diagonal /
        }
        return false;
    }

    checkDraw() {
        return this.board.every(cell => cell !== null);
    }

    endGame(winner) {
        this.gameActive = false;
        const statusEl = this.container.querySelector('#game-status');

        if (winner === 'draw') {
            statusEl.textContent = "It's a Draw!";
        } else {
            statusEl.innerHTML = `<span style="color: #44ff44;">Player ${winner + 1} Wins!</span>`;
        }

        this.container.querySelector('#game-controls').classList.remove('hidden');
    }

    restartGame() {
        this.board = Array(this.gridSize * this.gridSize).fill(null);
        this.currentPlayerIdx = 0;
        this.gameActive = true;
        this.container.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.textContent = '';
            cell.style.background = '';
        });
        this.container.querySelector('#game-controls').classList.add('hidden');
        this.updateStatus();
    }

    // --- Simple AI (Random) ---
    makeAIMove() {
        const empty = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (empty.length > 0) {
            const move = empty[Math.floor(Math.random() * empty.length)];
            this.makeMove(move, 1, false);
        }
    }
}
