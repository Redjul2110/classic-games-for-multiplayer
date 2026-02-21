// src/games/battleship.js
// Battleship vs AI with Hunt/Target strategy

import { showToast } from '../ui/toast.js';

const SIZE = 10;
const SHIPS = [5, 4, 3, 3, 2]; // ship sizes
const EMPTY = 0, SHIP = 1, HIT = 2, MISS = 3, SUNK = 4;

export function renderBattleship(container, onBack) {
  let playerGrid = createGrid();
  let aiGrid = createGrid();
  let playerShips = [];
  let aiShips = [];
  let gameOver = false;
  let aiMovePending = false; // Added aiMovePending
  let phase = 'placing'; // 'placing', 'playing'
  let placingShipIdx = 0;
  let horizontal = true;
  let preview = [];

  // AI Hunt/Target state
  let aiHits = [];
  let aiTargets = [];
  let aiHitList = new Set();

  // Place AI ships randomly
  placeShipsRandom(aiGrid, aiShips);

  function createGrid() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)); }

  function render() {
    const placingShip = phase === 'placing' ? SHIPS[placingShipIdx] : null;
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Battleship <span class="game-screen-badge vs-ai">VS AI</span></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;gap:12px;">
          ${phase === 'placing' ? `
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;">
              <span style="font-weight:600;font-size:0.9rem;">
                Placing ship ${placingShipIdx + 1}/5 (size ${placingShip})
              </span>
              <button class="btn btn-ghost btn-sm" id="rotate-btn">
                🔄 ${horizontal ? 'Horizontal' : 'Vertical'}
              </button>
            </div>
          ` : `
            <div style="font-weight:600;font-size:0.88rem;color:var(--text-secondary);">
              Click the AI's grid to fire! Ships sunk: 
              You ${countSunk(aiGrid, aiShips)} / AI ${countSunk(playerGrid, playerShips)}
            </div>
          `}
          <div class="battleship-grids">
            <div class="battleship-grid-wrap">
              <div class="battleship-grid-title">Your Fleet</div>
              <div class="bs-grid" style="grid-template-columns:repeat(${SIZE},1fr);" id="player-grid">
                ${renderGrid(playerGrid, false, phase === 'placing')}
              </div>
            </div>
            ${phase === 'playing' ? `
            <div class="battleship-grid-wrap">
              <div class="battleship-grid-title">Enemy Waters [HIT]</div>
              <div class="bs-grid" style="grid-template-columns:repeat(${SIZE},1fr);" id="ai-grid">
                ${renderGrid(aiGrid, true, false)}
              </div>
            </div>` : ''}
          </div>
          ${phase === 'placing' ? `
            <button class="btn btn-ghost btn-sm" id="random-place-btn">🎲 Place All Randomly</button>
          ` : ''}
        </div>
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => { gameOver = true; onBack(); });

    if (phase === 'placing') {
      container.querySelector('#rotate-btn')?.addEventListener('click', () => { horizontal = !horizontal; render(); });
      container.querySelector('#random-place-btn')?.addEventListener('click', () => {
        playerGrid = createGrid(); playerShips = [];
        placeShipsRandom(playerGrid, playerShips);
        placingShipIdx = SHIPS.length;
        phase = 'playing'; render();
      });

      // Hover preview
      container.querySelectorAll('#player-grid .bs-cell').forEach(cell => {
        const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
        cell.addEventListener('mouseenter', () => {
          showPreview(r, c, SHIPS[placingShipIdx], horizontal, playerGrid, container);
        });
        cell.addEventListener('mouseleave', () => clearPreview(container));
        cell.addEventListener('click', () => placeShip(r, c));
      });
    } else {
      // Fire on AI grid
      container.querySelectorAll('#ai-grid .bs-cell').forEach(cell => {
        const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c);
        cell.addEventListener('click', () => {
          if (gameOver || aiGrid[r][c] === HIT || aiGrid[r][c] === MISS || aiGrid[r][c] === SUNK) return;
          if (aiMovePending) return; // Guard against player input during AI turn

          fireAt(aiGrid, r, c, aiShips);
          const won = aiShips.every(s => s.cells.every(([sr, sc]) => aiGrid[sr][sc] === HIT || aiGrid[sr][sc] === SUNK));
          if (won) { gameOver = true; render(); return showEnd('You win! ★'); }
          render();

          // AI fires back
          aiMovePending = true; // Set flag before AI turn
          setTimeout(() => {
            aiFireAt();
            const lost = playerShips.every(s => s.cells.every(([sr, sc]) => playerGrid[sr][sc] === HIT || playerGrid[sr][sc] === SUNK));
            if (lost) { gameOver = true; render(); return showEnd('AI wins! [AI]'); }
            aiMovePending = false; // Clear flag after AI turn
            render();
          }, 800);
        });
      });
    }
  }

  function renderGrid(grid, hideShips, clickable) {
    let html = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = grid[r][c];
        let cls = 'bs-cell';
        if (cell === HIT) cls += ' hit';
        else if (cell === MISS) cls += ' miss';
        else if (cell === SUNK) cls += ' sunk';
        else if (cell === SHIP && !hideShips) cls += ' ship';
        html += `<div class="${cls}" data-r="${r}" data-c="${c}"></div>`;
      }
    }
    return html;
  }

  function placeShip(r, c) {
    if (placingShipIdx >= SHIPS.length) return;
    const size = SHIPS[placingShipIdx];
    const cells = getShipCells(r, c, size, horizontal);
    if (!cells || !canPlace(playerGrid, cells)) return;
    cells.forEach(([sr, sc]) => { playerGrid[sr][sc] = SHIP; });
    playerShips.push({ size, cells });
    placingShipIdx++;
    if (placingShipIdx >= SHIPS.length) { phase = 'playing'; }
    render();
  }

  function showEnd(msg) {
    if (msg.includes('win')) {
      import('../ui/animations.js').then(({ triggerConfetti }) => triggerConfetti());
    }
    showToast(msg, msg.includes('win') ? 'success' : 'error', 4000);
    setTimeout(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100;">
          <div style="text-align:center;padding:40px;">
            <div style="font-size:3rem;margin-bottom:12px;">${msg.includes('win') ? '★' : '💀'}</div>
            <div style="font-size:2rem;font-weight:900;margin-bottom:16px;">${msg}</div>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button class="btn btn-primary" id="restart-bs-btn">Play Again</button>
              <button class="btn btn-ghost" id="exit-bs-btn">Exit</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(div);
      div.querySelector('#restart-bs-btn').addEventListener('click', () => { div.remove(); renderBattleship(container, onBack); });
      div.querySelector('#exit-bs-btn').addEventListener('click', () => { div.remove(); onBack(); });
    }, 1000);
  }

  // ─── AI Hunt/Target strategy ───
  function aiFireAt() {
    let r, c;
    if (aiTargets.length > 0) {
      // Target mode: fire at adjacent cells of a hit
      [r, c] = aiTargets.shift();
      while (aiHitList.has(`${r},${c}`) && aiTargets.length > 0) [r, c] = aiTargets.shift();
    } else {
      // Hunt mode: checkerboard pattern
      const cells = [];
      for (let i = 0; i < SIZE; i++)
        for (let j = (i % 2); j < SIZE; j += 2)
          if (!aiHitList.has(`${i},${j}`) && playerGrid[i][j] !== HIT && playerGrid[i][j] !== MISS && playerGrid[i][j] !== SUNK)
            cells.push([i, j]);
      if (cells.length === 0) {
        // Fall back to any unshot cell
        for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++)
          if (!aiHitList.has(`${i},${j}`) && playerGrid[i][j] !== HIT && playerGrid[i][j] !== MISS) cells.push([i, j]);
      }
      if (cells.length === 0) return;
      [r, c] = cells[Math.floor(Math.random() * cells.length)];
    }

    aiHitList.add(`${r},${c}`);
    if (playerGrid[r][c] === SHIP) {
      playerGrid[r][c] = HIT;
      aiHits.push([r, c]);
      // Add adjacent cells to targets
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !aiHitList.has(`${nr},${nc}`))
          aiTargets.push([nr, nc]);
      });
      showToast('AI hit your ship! 🔥', 'error');
    } else {
      playerGrid[r][c] = MISS;
    }
  }

  render();
}

function getShipCells(r, c, size, horizontal) {
  const cells = [];
  for (let i = 0; i < size; i++) {
    const nr = horizontal ? r : r + i;
    const nc = horizontal ? c + i : c;
    if (nr >= SIZE || nc >= SIZE) return null;
    cells.push([nr, nc]);
  }
  return cells;
}

function canPlace(grid, cells) {
  return cells.every(([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE && grid[r][c] === EMPTY);
}

function placeShipsRandom(grid, ships) {
  for (const size of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      const cells = getShipCells(r, c, size, horiz);
      if (cells && canPlace(grid, cells)) {
        cells.forEach(([sr, sc]) => { grid[sr][sc] = SHIP; });
        ships.push({ size, cells });
        placed = true;
      }
    }
  }
}

function fireAt(grid, r, c, ships) {
  if (grid[r][c] === SHIP) { grid[r][c] = HIT; }
  else { grid[r][c] = MISS; }
}

function countSunk(grid, ships) {
  return ships.filter(s => s.cells.every(([r, c]) => grid[r][c] === HIT || grid[r][c] === SUNK)).length;
}

function showPreview(r, c, size, horiz, grid, container) {
  // Simple highlight (not re-rendering to keep it fast)
}

function clearPreview(container) { }
