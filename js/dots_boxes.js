import { cleanupAndExit } from './games.js';

const DOTS_SIZE = 5; // 5x5 dots = 4x4 boxes = 16 boxes total

export class DotsBoxes {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        this.mySide = 0; // 0 for Player 1 (Red), 1 for Player 2 (Blue)
        this.turn = 0;
        this.scores = [0, 0];

        // Data Structures for Lines and Boxes
        // Horizontal lines: r from 0 to DOTS_SIZE-1, c from 0 to DOTS_SIZE-2. (5 rows, 4 cols)
        this.hEdges = Array(DOTS_SIZE).fill(null).map(() => Array(DOTS_SIZE - 1).fill(false));

        // Vertical lines: r from 0 to DOTS_SIZE-2, c from 0 to DOTS_SIZE-1. (4 rows, 5 cols)
        this.vEdges = Array(DOTS_SIZE - 1).fill(null).map(() => Array(DOTS_SIZE).fill(false));

        // Boxes: r from 0 to DOTS_SIZE-2, c from 0 to DOTS_SIZE-2. (4x4)
        this.boxes = Array(DOTS_SIZE - 1).fill(null).map(() => Array(DOTS_SIZE - 1).fill(null));

        this.initGame();
        if (this.mode === 'online') {
            this.initRealtime();
        }
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'move' }, ({ payload }) => {
                this.receiveMove(payload);
            }).subscribe();
        });
    }

    initGame() {
        if (this.mode === 'online') {
            const isHost = this.session.host_id === this.currentUser.id;
            this.mySide = isHost ? 0 : 1;
        } else {
            this.mySide = 0;
        }

        this.renderUI();
    }

    renderUI() {
        const dotGap = 60; // Pixels between dots
        const boardWidth = (DOTS_SIZE - 1) * dotGap;

        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 600px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Dots and Boxes</h2>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 1.2rem;">
                    <span id="p1-score" style="color: var(--accent-red); font-weight: bold;">
                        ${this.mySide === 0 && this.mode === 'online' ? 'You' : 'Red'}: ${this.scores[0]}
                    </span>
                    <span id="status-text" style="color: white; font-weight: bold;">
                        ${this.turn === this.mySide ? 'YOUR TURN' : "OPPONENT'S TURN"}
                    </span>
                    <span id="p2-score" style="color: #64B5F6; font-weight: bold;">
                        ${this.mySide === 1 && this.mode === 'online' ? 'You' : (this.mode === 'local' ? 'AI' : 'Blue')}: ${this.scores[1]}
                    </span>
                </div>

                <!-- Board Container -->
                <div style="position: relative; width: ${boardWidth + 20}px; height: ${boardWidth + 20}px; margin: 0 auto 30px auto; user-select: none;">
                    
                    <!-- SVG for rendering lines and boxes precisely -->
                    <svg id="dab-svg" width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
                         <!-- Boxes filled here -->
                         <!-- Lines drawn here -->
                    </svg>

                    <!-- HTML overlay for Interaction (Hover/Clicks on edges) -->
                    <div id="dab-interactive" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                        <!-- Interactive zones created via JS -->
                    </div>

                    <!-- Dots (just visual, laid over top) -->
                    ${this.generateDotsHTML()}
                </div>

                <div id="game-controls" class="hidden">
                    <h3 id="end-msg" style="margin-bottom: 15px;"></h3>
                    ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary" style="margin-right: 10px;">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit</button>
                </div>
            </div>
        `;

        this.createInteractiveZones();
        this.updateBoardUI();

        if (this.mode === 'local') {
            const rb = this.container.querySelector('#restart-btn');
            if (rb) rb.onclick = () => this.restartGame();
        }

        const btn = this.container.querySelector('#exit-btn');
        if (btn) btn.onclick = () => {
            if (this.mode === 'online') cleanupAndExit(this.session, this.currentUser);
            else location.reload();
        };
    }

    generateDotsHTML() {
        const gap = 60;
        const offset = 10; // 10px padding from container edge
        let html = '';
        for (let r = 0; r < DOTS_SIZE; r++) {
            for (let c = 0; c < DOTS_SIZE; c++) {
                html += `
                    <div style="
                        position: absolute;
                        top: ${offset + r * gap - 4}px;
                        left: ${offset + c * gap - 4}px;
                        width: 8px; height: 8px;
                        background: white;
                        border-radius: 50%;
                        box-shadow: 0 0 5px rgba(255,255,255,0.8);
                        pointer-events: none;
                    "></div>
                `;
            }
        }
        return html;
    }

    createInteractiveZones() {
        const interactiveLayer = this.container.querySelector('#dab-interactive');
        const gap = 60;
        const offset = 10;
        const thickness = 14;

        // Horizontal Zones
        for (let r = 0; r < DOTS_SIZE; r++) {
            for (let c = 0; c < DOTS_SIZE - 1; c++) {
                const zone = document.createElement('div');
                zone.style.position = 'absolute';
                zone.style.top = `${offset + r * gap - (thickness / 2)}px`;
                zone.style.left = `${offset + c * gap}px`;
                zone.style.width = `${gap}px`;
                zone.style.height = `${thickness}px`;
                zone.style.cursor = 'pointer';
                zone.className = 'dab-hover-h';
                // hover effect in JS as css requires injecting huge styles or generic classes doesn't have local scopes
                zone.onmouseenter = () => { if (!this.hEdges[r][c] && this.turn === this.mySide) zone.style.background = 'rgba(255,255,255,0.3)'; };
                zone.onmouseleave = () => { zone.style.background = 'transparent'; };
                zone.onclick = () => this.handleEdgeClick('h', r, c);
                interactiveLayer.appendChild(zone);
            }
        }

        // Vertical Zones
        for (let r = 0; r < DOTS_SIZE - 1; r++) {
            for (let c = 0; c < DOTS_SIZE; c++) {
                const zone = document.createElement('div');
                zone.style.position = 'absolute';
                zone.style.top = `${offset + r * gap}px`;
                zone.style.left = `${offset + c * gap - (thickness / 2)}px`;
                zone.style.width = `${thickness}px`;
                zone.style.height = `${gap}px`;
                zone.style.cursor = 'pointer';
                zone.className = 'dab-hover-v';
                zone.onmouseenter = () => { if (!this.vEdges[r][c] && this.turn === this.mySide) zone.style.background = 'rgba(255,255,255,0.3)'; };
                zone.onmouseleave = () => { zone.style.background = 'transparent'; };
                zone.onclick = () => this.handleEdgeClick('v', r, c);
                interactiveLayer.appendChild(zone);
            }
        }
    }

    updateBoardUI() {
        const svg = this.container.querySelector('#dab-svg');
        const gap = 60;
        const offset = 10;
        let svgHtml = '';

        // Draw Boxes
        for (let r = 0; r < DOTS_SIZE - 1; r++) {
            for (let c = 0; c < DOTS_SIZE - 1; c++) {
                if (this.boxes[r][c] !== null) {
                    const color = this.boxes[r][c] === 0 ? 'rgba(255,68,68,0.5)' : 'rgba(100,181,246,0.5)';
                    svgHtml += `
                        <rect x="${offset + c * gap}" y="${offset + r * gap}" width="${gap}" height="${gap}" fill="${color}" />
                        <text x="${offset + c * gap + gap / 2}" y="${offset + r * gap + gap / 2}" 
                              fill="rgba(255,255,255,0.8)" font-size="24" font-weight="bold" 
                              text-anchor="middle" dominant-baseline="central">
                              ${this.boxes[r][c] === 0 ? 'R' : 'B'}
                        </text>
                    `;
                }
            }
        }

        // Draw H-Edges
        for (let r = 0; r < DOTS_SIZE; r++) {
            for (let c = 0; c < DOTS_SIZE - 1; c++) {
                if (this.hEdges[r][c]) {
                    svgHtml += `<line x1="${offset + c * gap}" y1="${offset + r * gap}" x2="${offset + (c + 1) * gap}" y2="${offset + r * gap}" stroke="white" stroke-width="4" />`;
                }
            }
        }

        // Draw V-Edges
        for (let r = 0; r < DOTS_SIZE - 1; r++) {
            for (let c = 0; c < DOTS_SIZE; c++) {
                if (this.vEdges[r][c]) {
                    svgHtml += `<line x1="${offset + c * gap}" y1="${offset + r * gap}" x2="${offset + c * gap}" y2="${offset + (r + 1) * gap}" stroke="white" stroke-width="4" />`;
                }
            }
        }

        svg.innerHTML = svgHtml;

        // Update Scores & Status
        this.container.querySelector('#p1-score').innerText = `${this.mySide === 0 && this.mode === 'online' ? 'You' : 'Red'}: ${this.scores[0]} `;
        this.container.querySelector('#p2-score').innerText = `${this.mySide === 1 && this.mode === 'online' ? 'You' : (this.mode === 'local' ? 'AI' : 'Blue')}: ${this.scores[1]} `;

        const text = this.container.querySelector('#status-text');
        text.innerHTML = this.turn === this.mySide ? 'YOUR TURN' : "OPPONENT'S TURN";
        text.style.color = this.turn === 0 ? 'var(--accent-red)' : '#64B5F6';

        this.checkEndGame();
    }

    handleEdgeClick(type, r, c) {
        if (this.turn !== this.mySide) return;

        if (type === 'h' && this.hEdges[r][c]) return;
        if (type === 'v' && this.vEdges[r][c]) return;

        this.processMove(type, r, c, true);
    }

    receiveMove(payload) {
        if (this.turn === this.mySide) return;
        this.processMove(payload.type, payload.r, payload.c, false);
    }

    processMove(type, r, c, shouldBroadcast) {
        if (type === 'h') this.hEdges[r][c] = true;
        if (type === 'v') this.vEdges[r][c] = true;

        if (shouldBroadcast && this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: { type, r, c }
            });
        }

        // Check if any boxes were completed
        let scored = false;

        if (type === 'h') {
            // Check box above
            if (r > 0 && this.checkBox(r - 1, c)) scored = true;
            // Check box below
            if (r < DOTS_SIZE - 1 && this.checkBox(r, c)) scored = true;
        } else {
            // Check box left
            if (c > 0 && this.checkBox(r, c - 1)) scored = true;
            // Check box right
            if (c < DOTS_SIZE - 1 && this.checkBox(r, c)) scored = true;
        }

        if (scored) {
            // Player gets another turn
        } else {
            // Switch turns
            this.turn = this.turn === 0 ? 1 : 0;
        }

        this.updateBoardUI();

        if (this.mode === 'local' && this.turn === 1) {
            setTimeout(() => this.makeAIMove(), 600);
        }
    }

    checkBox(r, c) {
        if (this.boxes[r][c] !== null) return false;

        // A box is completed if all 4 surrounding edges are true
        // Top: hEdges[r][c], Bottom: hEdges[r+1][c]
        // Left: vEdges[r][c], Right: vEdges[r][c+1]
        if (this.hEdges[r][c] && this.hEdges[r + 1][c] && this.vEdges[r][c] && this.vEdges[r][c + 1]) {
            this.boxes[r][c] = this.turn;
            this.scores[this.turn]++;
            return true;
        }
        return false;
    }

    makeAIMove() {
        if (this.turn !== 1) return;

        // Collect all available edges
        const availableH = [];
        for (let r = 0; r < DOTS_SIZE; r++) {
            for (let c = 0; c < DOTS_SIZE - 1; c++) {
                if (!this.hEdges[r][c]) availableH.push({ type: 'h', r, c });
            }
        }
        const availableV = [];
        for (let r = 0; r < DOTS_SIZE - 1; r++) {
            for (let c = 0; c < DOTS_SIZE; c++) {
                if (!this.vEdges[r][c]) availableV.push({ type: 'v', r, c });
            }
        }

        const allAvailable = [...availableH, ...availableV];
        if (allAvailable.length === 0) return;

        // AI Logic:
        // 1. Can we score a box right now? (Find an edge that completes a box)
        for (const move of allAvailable) {
            // Simulate move
            let scoresBox = false;

            if (move.type === 'h') {
                this.hEdges[move.r][move.c] = true;
                if (move.r > 0 && this.hEdges[move.r - 1][move.c] && this.hEdges[move.r][move.c] && this.vEdges[move.r - 1][move.c] && this.vEdges[move.r - 1][move.c + 1]) scoresBox = true;
                if (move.r < DOTS_SIZE - 1 && this.hEdges[move.r][move.c] && this.hEdges[move.r + 1][move.c] && this.vEdges[move.r][move.c] && this.vEdges[move.r][move.c + 1]) scoresBox = true;
                this.hEdges[move.r][move.c] = false; // undo
            } else {
                this.vEdges[move.r][move.c] = true;
                if (move.c > 0 && this.hEdges[move.r][move.c - 1] && this.hEdges[move.r + 1][move.c - 1] && this.vEdges[move.r][move.c - 1] && this.vEdges[move.r][move.c]) scoresBox = true;
                if (move.c < DOTS_SIZE - 1 && this.hEdges[move.r][move.c] && this.hEdges[move.r + 1][move.c] && this.vEdges[move.r][move.c] && this.vEdges[move.r][move.c + 1]) scoresBox = true;
                this.vEdges[move.r][move.c] = false; // undo
            }

            if (scoresBox) {
                this.processMove(move.type, move.r, move.c, false);
                return;
            }
        }

        // 2. Play random but try to avoid giving away a box (giving the opponent a 3rd edge)
        // For simple AI, just pick completely random for now, to keep it fun and casual.
        const randomMove = allAvailable[Math.floor(Math.random() * allAvailable.length)];
        this.processMove(randomMove.type, randomMove.r, randomMove.c, false);
    }

    checkEndGame() {
        const totalBoxes = (DOTS_SIZE - 1) * (DOTS_SIZE - 1); // 16
        if (this.scores[0] + this.scores[1] === totalBoxes) {
            let msg = '';
            if (this.scores[this.mySide] > this.scores[this.mySide === 0 ? 1 : 0]) {
                msg = '<span style="color: #44ff44;">You Win!</span>';
            } else if (this.scores[0] === this.scores[1]) {
                msg = "It's a Tie!";
            } else {
                msg = '<span style="color: var(--accent-red);">You Lose!</span>';
            }

            this.container.querySelector('#end-msg').innerHTML = msg;
            this.container.querySelector('#game-controls').classList.remove('hidden');
        }
    }

    restartGame() {
        this.scores = [0, 0];
        this.turn = 0;
        this.hEdges = Array(DOTS_SIZE).fill(null).map(() => Array(DOTS_SIZE - 1).fill(false));
        this.vEdges = Array(DOTS_SIZE - 1).fill(null).map(() => Array(DOTS_SIZE).fill(false));
        this.boxes = Array(DOTS_SIZE - 1).fill(null).map(() => Array(DOTS_SIZE - 1).fill(null));
        this.container.querySelector('#game-controls').classList.add('hidden');
        this.updateBoardUI();
    }
}
