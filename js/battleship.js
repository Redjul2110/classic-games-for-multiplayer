import { cleanupAndExit } from './games.js';

const SHIPS = [
    { id: 'carrier', size: 5 },
    { id: 'battleship', size: 4 },
    { id: 'cruiser', size: 3 },
    { id: 'submarine', size: 3 },
    { id: 'destroyer', size: 2 }
];

const GRID_SIZE = 10;

export class Battleship {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        this.mySide = 0; // 0 for P1, 1 for P2

        this.phase = 'setup'; // 'setup', 'waiting', 'play', 'end'

        // Local State
        this.myGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)); // null, 'ship', 'hit', 'miss'
        this.oppGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)); // 'hit', 'miss'

        this.myShips = [];
        this.oppShipsRaw = []; // Store opp ships if broadcasted

        this.placingShipIdx = 0;
        this.placingVertical = false;

        this.turn = 0;
        this.scores = [0, 0]; // Hits registered
        this.totalHealth = 17; // 5+4+3+3+2

        this.oppReady = false;

        this.initGame();
        if (this.mode === 'online') {
            this.initRealtime();
        }
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'ready' }, ({ payload }) => {
                this.receiveReady(payload.ships);
            }).on('broadcast', { event: 'fire' }, ({ payload }) => {
                this.receiveFire(payload.r, payload.c);
            }).subscribe();
        });
    }

    initGame() {
        if (this.mode === 'online') {
            const isHost = this.session.host_id === this.currentUser.id;
            this.mySide = isHost ? 0 : 1;
        } else {
            this.mySide = 0;
            // Immediate AI Setup
            this.generateAIShips();
            this.oppReady = true;
        }

        this.renderUI();
    }

    generateAIShips() {
        this.oppShipsRaw = [];
        const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

        for (const ship of SHIPS) {
            let placed = false;
            while (!placed) {
                const isVert = Math.random() > 0.5;
                const r = Math.floor(Math.random() * GRID_SIZE);
                const c = Math.floor(Math.random() * GRID_SIZE);

                if (this.canPlaceAI(grid, r, c, ship.size, isVert)) {
                    for (let i = 0; i < ship.size; i++) {
                        if (isVert) grid[r + i][c] = 'ship';
                        else grid[r][c + i] = 'ship';
                    }
                    this.oppShipsRaw.push({ r, c, size: ship.size, isVert, id: ship.id });
                    placed = true;
                }
            }
        }
    }

    canPlaceAI(grid, r, c, size, isVert) {
        if (isVert && r + size > GRID_SIZE) return false;
        if (!isVert && c + size > GRID_SIZE) return false;

        for (let i = 0; i < size; i++) {
            if (isVert && grid[r + i][c] !== null) return false;
            if (!isVert && grid[r][c + i] !== null) return false;
        }
        return true;
    }

    renderUI() {
        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 900px; margin: 0 auto; text-align: center; display: flex; flex-direction: column;">
                <h2 style="margin-bottom: 20px;">Battleship</h2>
                
                <div id="status-display" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 20px;">
                    <!-- Injected -->
                </div>

                <div id="setup-controls" style="margin-bottom: 20px;">
                    <button class="btn btn-secondary" id="rotate-btn">Rotate Ship (Horizontal)</button>
                </div>

                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
                    
                    <!-- My Grid -->
                    <div>
                        <h3 style="color: #64B5F6;">Your Fleet</h3>
                        <div id="my-grid" style="display: grid; grid-template-columns: repeat(10, 30px); gap: 2px; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 5px;">
                            ${this.generateGridHTML('my')}
                        </div>
                    </div>

                    <!-- Opponent Grid -->
                    <div>
                        <h3 style="color: var(--accent-red);">Target Radar</h3>
                        <div id="opp-grid" style="display: grid; grid-template-columns: repeat(10, 30px); gap: 2px; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 5px;">
                            ${this.generateGridHTML('opp')}
                        </div>
                    </div>

                </div>

                <div id="game-controls" class="hidden" style="margin-top: 30px;">
                    <h3 id="end-msg" style="margin-bottom: 15px;"></h3>
                    ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary" style="margin-right: 10px;">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit</button>
                </div>
            </div>
        `;

        this.bindEvents();
        this.updateStatus();
    }

    generateGridHTML(type) {
        let html = '';
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                html += `<div class="bs-cell ${type}-cell" data-r="${r}" data-c="${c}" style="
                    width: 30px; height: 30px; background: rgba(0, 100, 255, 0.2); 
                    border: 1px solid rgba(255,255,255,0.1); cursor: ${type === 'my' ? 'pointer' : 'crosshair'};
                    display: flex; align-items: center; justify-content: center; font-weight: bold; transition: background 0.2s;
                "></div>`;
            }
        }
        return html;
    }

    bindEvents() {
        const rotateBtn = this.container.querySelector('#rotate-btn');
        if (rotateBtn) {
            rotateBtn.onclick = () => {
                this.placingVertical = !this.placingVertical;
                rotateBtn.innerText = `Rotate Ship (${this.placingVertical ? 'Vertical' : 'Horizontal'})`;
            };
        }

        // Setup Phase Hover & Clicks
        this.container.querySelectorAll('.my-cell').forEach(cell => {
            cell.onmouseenter = () => this.handleHover(parseInt(cell.dataset.r), parseInt(cell.dataset.c));
            cell.onmouseleave = () => this.clearHover();
            cell.onclick = () => this.handlePlaceShip(parseInt(cell.dataset.r), parseInt(cell.dataset.c));
        });

        // Attack Phase Clicks
        this.container.querySelectorAll('.opp-cell').forEach(cell => {
            cell.onclick = () => this.handleAttack(parseInt(cell.dataset.r), parseInt(cell.dataset.c));
        });

        if (this.mode === 'local') {
            const rb = this.container.querySelector('#restart-btn');
            if (rb) rb.onclick = () => {
                this.myGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
                this.oppGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
                this.myShips = [];
                this.placingShipIdx = 0;
                this.turn = 0;
                this.scores = [0, 0];
                this.phase = 'setup';
                this.generateAIShips();

                this.container.querySelector('#game-controls').classList.add('hidden');
                this.container.querySelector('#setup-controls').style.display = 'block';
                this.updateBothGridsUI();
                this.updateStatus();
            };
        }

        const exitBtn = this.container.querySelector('#exit-btn');
        if (exitBtn) exitBtn.onclick = () => {
            if (this.mode === 'online') cleanupAndExit(this.session, this.currentUser);
            else location.reload();
        };
    }

    updateStatus() {
        const textArea = this.container.querySelector('#status-display');

        if (this.phase === 'setup') {
            const ship = SHIPS[this.placingShipIdx];
            textArea.innerHTML = `<span style="color: yellow;">Place your ${ship.id} (Size: ${ship.size})</span>`;
        } else if (this.phase === 'waiting') {
            textArea.innerHTML = `<span style="color: orange;">Waiting for opponent to place ships...</span>`;
        } else if (this.phase === 'play') {
            if (this.turn === this.mySide) {
                textArea.innerHTML = `<span style="color: var(--accent-red);">YOUR TURN - Fire at enemy radar!</span>`;
            } else {
                textArea.innerHTML = `<span style="color: #64B5F6;">OPPONENT'S TURN...</span>`;
            }
        }
    }

    // --- SETUP PHASE ---
    handleHover(r, c) {
        if (this.phase !== 'setup') return;

        const ship = SHIPS[this.placingShipIdx];
        const isValid = this.canPlace(r, c, ship.size, this.placingVertical);

        for (let i = 0; i < ship.size; i++) {
            let tr = this.placingVertical ? r + i : r;
            let tc = this.placingVertical ? c : c + i;

            if (tr < GRID_SIZE && tc < GRID_SIZE) {
                const cell = this.container.querySelector(`.my-cell[data-r="${tr}"][data-c="${tc}"]`);
                if (isValid) {
                    cell.style.background = 'rgba(0, 255, 0, 0.5)';
                } else {
                    cell.style.background = 'rgba(255, 0, 0, 0.5)';
                }
            }
        }
    }

    clearHover() {
        if (this.phase !== 'setup') return;
        this.updateMyGridUI();
    }

    canPlace(r, c, size, isVert) {
        if (isVert && r + size > GRID_SIZE) return false;
        if (!isVert && c + size > GRID_SIZE) return false;

        for (let i = 0; i < size; i++) {
            if (isVert && this.myGrid[r + i][c] !== null) return false;
            if (!isVert && this.myGrid[r][c + i] !== null) return false;
        }
        return true;
    }

    handlePlaceShip(r, c) {
        if (this.phase !== 'setup') return;

        const ship = SHIPS[this.placingShipIdx];
        if (this.canPlace(r, c, ship.size, this.placingVertical)) {
            // Place it
            for (let i = 0; i < ship.size; i++) {
                if (this.placingVertical) this.myGrid[r + i][c] = 'ship';
                else this.myGrid[r][c + i] = 'ship';
            }
            this.myShips.push({ id: ship.id, r, c, size: ship.size, isVert: this.placingVertical });

            this.updateMyGridUI();

            this.placingShipIdx++;
            if (this.placingShipIdx >= SHIPS.length) {
                this.finalizeSetup();
            } else {
                this.updateStatus();
            }
        }
    }

    finalizeSetup() {
        this.container.querySelector('#setup-controls').style.display = 'none';

        if (this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'ready',
                payload: { ships: this.myShips }
            });

            if (this.oppReady) {
                this.phase = 'play';
            } else {
                this.phase = 'waiting';
            }
        } else {
            this.phase = 'play';
        }

        this.updateStatus();
    }

    receiveReady(oppShips) {
        this.oppShipsRaw = oppShips;
        this.oppReady = true;

        if (this.phase === 'waiting') {
            this.phase = 'play';
            this.updateStatus();
        }
    }

    // --- MAIN GAMEPLAY ---
    updateMyGridUI() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = this.container.querySelector(`.my-cell[data-r="${r}"][data-c="${c}"]`);
                const val = this.myGrid[r][c];

                if (val === 'ship') {
                    cell.style.background = '#888';
                } else if (val === 'hit') {
                    cell.style.background = 'var(--accent-red)';
                    cell.innerHTML = '🔥';
                } else if (val === 'miss') {
                    cell.style.background = '#333';
                    cell.innerHTML = '🌊';
                } else {
                    cell.style.background = 'rgba(0, 100, 255, 0.2)';
                    cell.innerHTML = '';
                }
            }
        }
    }

    updateOppGridUI() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = this.container.querySelector(`.opp-cell[data-r="${r}"][data-c="${c}"]`);
                const val = this.oppGrid[r][c];

                if (val === 'hit') {
                    cell.style.background = 'var(--accent-red)';
                    cell.innerHTML = '🔥';
                } else if (val === 'miss') {
                    cell.style.background = '#333';
                    cell.innerHTML = '🌊';
                } else {
                    cell.style.background = 'rgba(0, 100, 255, 0.2)';
                    cell.innerHTML = '';
                }
            }
        }
    }

    updateBothGridsUI() {
        this.updateMyGridUI();
        this.updateOppGridUI();
    }

    handleAttack(r, c) {
        if (this.phase !== 'play') return;
        if (this.turn !== this.mySide) return;
        if (this.oppGrid[r][c] !== null) return; // Already attacked

        this.processAttack(r, c, true);
    }

    receiveFire(r, c) {
        if (this.phase !== 'play') return;
        if (this.turn === this.mySide) return;
        this.processAttack(r, c, false);
    }

    processAttack(r, c, isMe) {
        if (isMe) {
            // I am attacking enemy
            let hit = false;
            // Check oppShipsRaw
            for (const ship of this.oppShipsRaw) {
                if (ship.isVert) {
                    if (c === ship.c && r >= ship.r && r < ship.r + ship.size) hit = true;
                } else {
                    if (r === ship.r && c >= ship.c && c < ship.c + ship.size) hit = true;
                }
            }

            this.oppGrid[r][c] = hit ? 'hit' : 'miss';
            if (hit) this.scores[this.mySide]++;

            if (this.mode === 'online') {
                this.channel.send({
                    type: 'broadcast',
                    event: 'fire',
                    payload: { r, c }
                });
            }
            this.updateOppGridUI();

        } else {
            // Enemy attacking me
            let hit = false;
            if (this.myGrid[r][c] === 'ship') {
                hit = true;
                this.myGrid[r][c] = 'hit';
            } else {
                this.myGrid[r][c] = 'miss';
            }
            if (hit) this.scores[this.mySide === 0 ? 1 : 0]++;

            this.updateMyGridUI();
        }

        // Switch turn
        this.turn = this.turn === 0 ? 1 : 0;
        this.updateStatus();

        this.checkEndGame();

        if (this.phase === 'play' && this.mode === 'local' && this.turn === 1) {
            setTimeout(() => this.makeAIMove(), 800);
        }
    }

    checkEndGame() {
        if (this.scores[0] >= this.totalHealth || this.scores[1] >= this.totalHealth) {
            this.phase = 'end';
            const msg = this.container.querySelector('#end-msg');

            if (this.scores[this.mySide] >= this.totalHealth) {
                msg.innerHTML = '<span style="color: #44ff44;">Target Destroyed. You Win!</span>';
            } else {
                msg.innerHTML = '<span style="color: var(--accent-red);">Fleet Sinked. You Lose!</span>';
            }

            this.container.querySelector('#status-display').innerHTML = '';
            this.container.querySelector('#game-controls').classList.remove('hidden');
        }
    }

    makeAIMove() {
        if (this.phase !== 'play' || this.turn !== 1) return;

        let r, c, valid = false;
        while (!valid) {
            r = Math.floor(Math.random() * GRID_SIZE);
            c = Math.floor(Math.random() * GRID_SIZE);
            if (this.myGrid[r][c] !== 'hit' && this.myGrid[r][c] !== 'miss') {
                valid = true;
            }
        }

        this.processAttack(r, c, false);
    }
}
