// src/games/minesweeper.js
// Minesweeper – solo timed mode

import { showToast } from '../ui/toast.js';

export function renderMinesweeper(container, onBack) {
    const COLS = 10, ROWS = 10, MINES = 15;
    let board = [];
    let revealed = [];
    let flagged = [];
    let gameOver = false;
    let won = false;
    let startTime = null;
    let timerInterval = null;
    let firstClick = true;

    function createBoard(excludeR, excludeC) {
        const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        // Place mines (avoid first click)
        let placed = 0;
        while (placed < MINES) {
            const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
            if (b[r][c] === -1 || (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1)) continue;
            b[r][c] = -1;
            placed++;
        }
        // Calculate numbers
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

    revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    flagged = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    function render() {
        const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        const flagCount = flagged.flat().filter(Boolean).length;
        container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Minesweeper ⏱ <span class="game-screen-badge">SOLO</span></div>
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
              <button class="btn btn-primary" id="restart-btn">Play Again</button>
              <button class="btn btn-ghost" id="exit-btn">Exit</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

        container.querySelector('#back-btn').addEventListener('click', () => { clearInterval(timerInterval); onBack(); });
        container.querySelector('#restart-btn')?.addEventListener('click', () => { clearInterval(timerInterval); renderMinesweeper(container, onBack); });
        container.querySelector('#exit-btn')?.addEventListener('click', onBack);

        container.querySelectorAll('.ms-cell').forEach(cell => {
            const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
            cell.addEventListener('click', () => handleClick(r, c));
            cell.addEventListener('contextmenu', (e) => { e.preventDefault(); handleFlag(r, c); });
        });
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

    function handleClick(r, c) {
        if (gameOver || flagged[r][c] || (board.length > 0 && revealed[r][c])) return;
        if (firstClick) {
            board = createBoard(r, c);
            firstClick = false;
            startTime = Date.now();
            timerInterval = setInterval(() => render(), 1000);
        }
        if (board[r][c] === -1) {
            // Reveal all mines
            for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++)
                if (board[i][j] === -1) revealed[i][j] = true;
            gameOver = true;
            clearInterval(timerInterval);
            showToast('💥 Boom! Hit a mine!', 'error');
            render(); return;
        }
        floodReveal(r, c);
        checkWin();
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

    function handleFlag(r, c) {
        if (gameOver || revealed[r][c]) return;
        flagged[r][c] = !flagged[r][c];
        render();
    }

    function checkWin() {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
            if (board[r][c] !== -1 && !revealed[r][c]) return;
        won = true; gameOver = true;
        clearInterval(timerInterval);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        showToast(`★ Cleared in ${elapsed}s!`, 'success');
    }

    render();
}
