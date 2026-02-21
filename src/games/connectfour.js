// src/games/connectfour.js
// Connect Four with Minimax Alpha-Beta AI (depth 6)

import { showResultCard } from './tictactoe.js';
import { showToast } from '../ui/toast.js';
import { triggerConfetti } from '../ui/animations.js';

const ROWS = 6, COLS = 7;
const PLAYER = 1, AI = 2, EMPTY = 0;

export function renderConnectFour(container, onBack) {
    let board = createBoard();
    let gameOver = false;
    let aiMovePending = false; // Added aiMovePending
    let scores = { player: 0, ai: 0, draws: 0 };
    let aiThinking = false;

    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    }

    function render() {
        container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Connect Four <span class="game-screen-badge vs-ai">VS AI</span></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:20px;gap:16px;">
          <div class="score-board">
            <div class="score-item"><div class="score-value player-score">${scores.player}</div><div class="score-label">You (Red)</div></div>
            <div class="score-divider">–</div>
            <div class="score-item"><div class="score-value" style="color:var(--text-muted)">${scores.draws}</div><div class="score-label">Draws</div></div>
            <div class="score-divider">–</div>
            <div class="score-item"><div class="score-value ai-score">${scores.ai}</div><div class="score-label">AI 🟡</div></div>
          </div>
          <div style="color:var(--text-secondary);font-size:0.88rem;">
            ${aiThinking ? '[AI] AI is thinking…' : 'Click a column to drop your disc'}
          </div>
          <div class="c4-board" id="c4-board">
            ${board.map((row, r) => `
              <div class="c4-row">
                ${row.map((cell, c) => `
                  <div class="c4-cell ${cell === PLAYER ? 'red' : cell === AI ? 'yellow' : ''}"
                       data-col="${c}"></div>
                `).join('')}
              </div>
            `).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" id="new-game-btn">New Game</button>
        </div>
      </div>
    `;

        container.querySelector('#back-btn').addEventListener('click', onBack);
        container.querySelector('#new-game-btn').addEventListener('click', newGame);

        if (!aiThinking && !gameOver) {
            container.querySelectorAll('.c4-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    handlePlayerMove(parseInt(cell.dataset.col));
                });
            });
        }
    }

    function handlePlayerMove(col) {
        if (gameOver || aiThinking || aiMovePending) return; // Added aiMovePending check
        const row = dropDisc(board, col, PLAYER);
        if (row === -1) return; // column full
        const win = checkConnect4Win(board, PLAYER);
        if (win) { render(); highlightWin(win); return endGame('player'); }
        if (isDraw(board)) { render(); return endGame('draw'); }
        aiThinking = true;
        aiMovePending = true; // Set aiMovePending before AI move
        render();
        setTimeout(() => {
            const aiCol = c4AIMove(board);
            dropDisc(board, aiCol, AI);
            const aiWin = checkConnect4Win(board, AI);
            aiThinking = false;
            if (aiWin) { render(); highlightWin(aiWin); return endGame('ai'); }
            if (isDraw(board)) { render(); return endGame('draw'); }
            render();
        }, 600);
    }

    function highlightWin(cells) {
        const allCells = container.querySelectorAll('.c4-cell');
        cells.forEach(([r, c]) => {
            const idx = r * COLS + c;
            allCells[idx]?.classList.add('winner');
        });
    }

    function endGame(result) {
        gameOver = true;
        if (result === 'player') { scores.player++; showToast('You win! ★', 'success'); triggerConfetti(); }
        else if (result === 'ai') { scores.ai++; showToast('AI wins! [AI]', 'error'); }
        else { scores.draws++; showToast("It's a draw!", 'info'); }

        const title = result === 'player' ? 'You Win! ★' : result === 'ai' ? 'AI Wins! [AI]' : 'Draw! [DRAW]';
        const sub = `Score: You ${scores.player} – AI ${scores.ai}`;
        setTimeout(() => showResultCard(container, title, sub, newGame, onBack), 1200);
    }

    function newGame() {
        board = createBoard(); gameOver = false; aiThinking = false; render();
    }
    render();
}

function dropDisc(board, col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === EMPTY) { board[r][col] = player; return r; }
    }
    return -1;
}

function undropDisc(board, col) {
    for (let r = 0; r < ROWS; r++) {
        if (board[r][col] !== EMPTY) { board[r][col] = EMPTY; return; }
    }
}

function isDraw(board) { return board[0].every(c => c !== EMPTY); }

function checkConnect4Win(board, player) {
    // Horizontal, Vertical, Diagonal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
            for (const [dr, dc] of dirs) {
                const cells = [];
                for (let k = 0; k < 4; k++) {
                    const nr = r + dr * k, nc = c + dc * k;
                    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
                    if (board[nr][nc] !== player) break;
                    cells.push([nr, nc]);
                }
                if (cells.length === 4) return cells;
            }
        }
    }
    return null;
}

// ─── Minimax with Alpha-Beta (depth 6) ───
function c4AIMove(board) {
    const validCols = [];
    for (let c = 0; c < COLS; c++) { if (board[0][c] === EMPTY) validCols.push(c); }

    // Win immediately
    for (const c of validCols) {
        dropDisc(board, c, AI);
        if (checkConnect4Win(board, AI)) { undropDisc(board, c); return c; }
        undropDisc(board, c);
    }
    // Block immediate win
    for (const c of validCols) {
        dropDisc(board, c, PLAYER);
        if (checkConnect4Win(board, PLAYER)) { undropDisc(board, c); return c; }
        undropDisc(board, c);
    }

    let bestScore = -Infinity, bestCol = validCols[Math.floor(validCols.length / 2)];
    // Center-first order
    const order = [3, 2, 4, 1, 5, 0, 6].filter(c => validCols.includes(c));
    for (const c of order) {
        dropDisc(board, c, AI);
        const score = alphabeta(board, 5, -Infinity, Infinity, false);
        undropDisc(board, c);
        if (score > bestScore) { bestScore = score; bestCol = c; }
    }
    return bestCol;
}

function alphabeta(board, depth, alpha, beta, isMax) {
    const aiWin = checkConnect4Win(board, AI);
    if (aiWin) return 1000 + depth;
    const playerWin = checkConnect4Win(board, PLAYER);
    if (playerWin) return -(1000 + depth);
    if (isDraw(board) || depth === 0) return c4Evaluate(board);

    const order = [3, 2, 4, 1, 5, 0, 6];
    if (isMax) {
        let v = -Infinity;
        for (const c of order) {
            if (board[0][c] !== EMPTY) continue;
            dropDisc(board, c, AI);
            v = Math.max(v, alphabeta(board, depth - 1, alpha, beta, false));
            undropDisc(board, c);
            alpha = Math.max(alpha, v);
            if (alpha >= beta) break;
        }
        return v;
    } else {
        let v = Infinity;
        for (const c of order) {
            if (board[0][c] !== EMPTY) continue;
            dropDisc(board, c, PLAYER);
            v = Math.min(v, alphabeta(board, depth - 1, alpha, beta, true));
            undropDisc(board, c);
            beta = Math.min(beta, v);
            if (alpha >= beta) break;
        }
        return v;
    }
}

function c4Evaluate(board) {
    let score = 0;
    // Center column preference
    const centerCol = board.map(r => r[3]);
    score += centerCol.filter(c => c === AI).length * 6;
    score -= centerCol.filter(c => c === PLAYER).length * 6;

    const scoreWindow = (window) => {
        const aiCount = window.filter(c => c === AI).length;
        const playerCount = window.filter(c => c === PLAYER).length;
        const empty = window.filter(c => c === EMPTY).length;
        let s = 0;
        if (aiCount === 3 && empty === 1) s += 50;
        if (aiCount === 2 && empty === 2) s += 10;
        if (playerCount === 3 && empty === 1) s -= 80;
        if (playerCount === 2 && empty === 2) s -= 15;
        return s;
    };

    // Horizontal
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS - 3; c++)
            score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]]);
    // Vertical
    for (let r = 0; r < ROWS - 3; r++)
        for (let c = 0; c < COLS; c++)
            score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]]);
    // Diagonals
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++)
            score += scoreWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]]);
        for (let c = 3; c < COLS; c++)
            score += scoreWindow([board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]]);
    }
    return score;
}
