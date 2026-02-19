
const PLAYERS = ['red', 'green', 'yellow', 'blue'];

export class Ludo {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        this.players = [
            { id: 'red', color: '#ff4444', pieces: [0, 0, 0, 0], startPos: 0, homeStart: 51 },
            { id: 'green', color: '#44ff44', pieces: [0, 0, 0, 0], startPos: 13, homeStart: 12 },
            { id: 'yellow', color: '#ffff44', pieces: [0, 0, 0, 0], startPos: 26, homeStart: 25 },
            { id: 'blue', color: '#4444ff', pieces: [0, 0, 0, 0], startPos: 39, homeStart: 38 }
        ];

        this.pieces = {
            red: [-1, -1, -1, -1],
            green: [-1, -1, -1, -1],
            yellow: [-1, -1, -1, -1],
            blue: [-1, -1, -1, -1]
        };

        this.turn = 0; // 0=red, 1=green, 2=yellow, 3=blue
        this.diceValue = null;
        this.waitingForMove = false;

        // Online Setup
        if (this.mode === 'online') {
            const isHost = String(this.session.host_id) === String(this.currentUser.id);
            this.myIndex = isHost ? 0 : 1; // Host=Red, Guest=Green
            this.activePlayers = [0, 1]; // Only 2 players for online MVP
        } else {
            this.activePlayers = [0, 1, 2, 3]; // All 4 local
        }

        this.initUI();
        if (this.mode === 'online') this.initRealtime();
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'roll' }, ({ payload }) => {
                this.receiveRoll(payload);
            })
                .on('broadcast', { event: 'move' }, ({ payload }) => {
                    this.receiveMove(payload);
                })
                .subscribe();
        });
    }

    initUI() {
        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 600px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Ludo</h2>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div id="turn-indicator" style="font-weight: bold; font-size: 1.2rem; color: #ff4444;">Red's Turn</div>
                    <div id="dice-container" class="dice-box">?</div>
                </div>

                <div id="ludo-board" style="
                    display: grid; 
                    grid-template-columns: repeat(11, 1fr); 
                    grid-template-rows: repeat(11, 1fr); 
                    gap: 2px;
                    aspect-ratio: 1;
                    background: #222;
                    border: 4px solid #444;
                    position: relative;
                ">
                    <!-- Configured via JS -->
                </div>

                 <div id="game-controls" class="hidden" style="margin-top: 20px;">
                    <h2 id="winner-msg"></h2>
                    <button id="exit-btn" class="btn btn-primary">Exit</button>
                </div>
            </div>
        `;

        this.renderBoardBase();
        this.renderPieces();

        const diceBtn = this.container.querySelector('#dice-container');
        diceBtn.onclick = () => this.rollDice();

        this.container.querySelector('#exit-btn').onclick = () => location.reload();
    }

    // --- Board Rendering ---
    renderBoardBase() {
        const board = this.container.querySelector('#ludo-board');
        board.innerHTML = '';
        board.className = 'ludo-board-container';

        for (let r = 0; r < 11; r++) {
            for (let c = 0; c < 11; c++) {
                const cell = document.createElement('div');
                cell.className = 'ludo-cell';

                // Colors for bases
                if (r < 4 && c < 4) { cell.classList.add('ludo-base'); cell.style.background = '#ff444433'; } // Red
                else if (r < 4 && c > 6) { cell.classList.add('ludo-base'); cell.style.background = '#44ff4433'; } // Green
                else if (r > 6 && c < 4) { cell.classList.add('ludo-base'); cell.style.background = '#4444ff33'; } // Blue
                else if (r > 6 && c > 6) { cell.classList.add('ludo-base'); cell.style.background = '#ffff4433'; } // Yellow

                // Path visualization
                else if (c === 5 && r > 0 && r < 5) { cell.classList.add('ludo-home-path'); cell.style.background = '#44ff4455'; }
                else if (c === 5 && r > 5 && r < 10) { cell.classList.add('ludo-home-path'); cell.style.background = '#4444ff55'; }
                else if (r === 5 && c > 0 && c < 5) { cell.classList.add('ludo-home-path'); cell.style.background = '#ff444455'; }
                else if (r === 5 && c > 5 && c < 10) { cell.classList.add('ludo-home-path'); cell.style.background = '#ffff4455'; }

                else cell.style.background = 'rgba(255,255,255,0.05)';

                board.appendChild(cell);
            }
        }
    }

    renderPieces() {
        this.container.querySelectorAll('.ludo-piece').forEach(el => el.remove());
        const board = this.container.querySelector('#ludo-board');

        PLAYERS.forEach((pColor, pIdx) => {
            this.pieces[pColor].forEach((pos, pieceIdx) => {
                if (pos === 999) return;

                const coords = this.getCoords(pos, pColor);

                const piece = document.createElement('div');
                piece.className = `ludo-piece ${pColor}`;

                piece.style.left = `calc(${coords.c * (100 / 11)}% + 20%)`;
                piece.style.top = `calc(${coords.r * (100 / 11)}% + 20%)`;

                // Interaction
                if (this.waitingForMove && pIdx === this.turn) {
                    const isMyTurn = this.mode === 'local' || this.turn === this.myIndex;
                    if (isMyTurn) {
                        piece.style.cursor = 'pointer';
                        piece.onclick = () => this.handlePieceClick(pColor, pieceIdx);
                        if (this.canMove(pColor, pieceIdx, this.diceValue)) {
                            piece.classList.add('pulse');
                        } else {
                            piece.style.opacity = '0.5';
                        }
                    }
                }

                board.appendChild(piece);
            });
        });
    }

    // --- Logic ---
    rollDice() {
        if (this.waitingForMove) return;
        if (this.mode === 'online' && this.turn !== this.myIndex) return;

        // Visual roll
        this.animateDice(() => {
            this.diceValue = Math.floor(Math.random() * 6) + 1;
            this.container.querySelector('#dice-container').textContent = this.diceValue;

            if (this.mode === 'online') {
                this.channel.send({
                    type: 'broadcast',
                    event: 'roll',
                    payload: { dice: this.diceValue, playerIdx: this.myIndex }
                });
            }

            this.checkMoves();
        });
    }

    receiveRoll({ dice, playerIdx }) {
        if (playerIdx === this.myIndex) return;
        this.diceValue = dice;
        this.animateDice(() => {
            this.container.querySelector('#dice-container').textContent = this.diceValue;
            this.checkMoves();
        });
    }

    animateDice(callback) {
        const diceEl = this.container.querySelector('#dice-container');
        let rolls = 10;
        const interval = setInterval(() => {
            diceEl.textContent = Math.floor(Math.random() * 6) + 1;
            rolls--;
            if (rolls === 0) {
                clearInterval(interval);
                callback();
            }
        }, 50);
    }

    checkMoves() {
        this.waitingForMove = true;
        const color = this.players[this.turn].id;
        const pieces = this.pieces[color];

        const possibleMoves = pieces.some((pos, idx) => this.canMove(color, idx, this.diceValue));

        if (!possibleMoves) {
            setTimeout(() => this.nextTurn(), 1000);
        } else {
            this.renderPieces();
            // Local AI Trigger
            if (this.mode === 'local' && this.turn !== 0) {
                setTimeout(() => this.makeAIMove(), 800);
            }
        }
    }

    canMove(color, pieceIdx, roll) {
        const pos = this.pieces[color][pieceIdx];
        if (pos === 999) return false;
        if (pos === -1) return roll === 6;
        if (pos >= 100) return pos + roll <= 105;
        return true;
    }

    handlePieceClick(color, pieceIdx) {
        if (!this.waitingForMove || color !== this.players[this.turn].id) return;
        if (!this.canMove(color, pieceIdx, this.diceValue)) return;

        this.movePiece(color, pieceIdx, this.diceValue);
    }

    movePiece(color, pieceIdx, roll) {
        let pos = this.pieces[color][pieceIdx];
        let nextPos;

        if (pos === -1 && roll === 6) {
            nextPos = 0;
        } else {
            nextPos = pos + roll;
            if (pos < 50 && nextPos >= 51) {
                let overflow = nextPos - 50;
                nextPos = 100 + overflow - 1;
            } else if (pos >= 100) {
                nextPos = pos + roll;
            }
        }

        if (nextPos === 105) nextPos = 999;

        // Apply
        this.pieces[color][pieceIdx] = nextPos;
        if (nextPos !== -1 && nextPos < 100) this.checkCapture(color, nextPos);

        // Broadcast
        if (this.mode === 'online' && this.turn === this.myIndex) {
            this.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: { color, pieceIdx, roll, nextPos }
            });
        }

        this.finishMove(roll === 6);
    }

    receiveMove({ color, pieceIdx, roll, nextPos }) {
        if (color === this.players[this.myIndex].id) return; // Ignore self echoing

        this.pieces[color][pieceIdx] = nextPos;
        if (nextPos !== -1 && nextPos < 100) this.checkCapture(color, nextPos);

        this.finishMove(roll === 6);
    }

    checkCapture(attackerColor, relativePos) {
        const attackerGlobal = this.toGlobal(relativePos, attackerColor);
        PLAYERS.forEach(pColor => {
            if (pColor === attackerColor) return;
            this.pieces[pColor].forEach((pPos, idx) => {
                if (pPos !== -1 && pPos < 100) {
                    const victimGlobal = this.toGlobal(pPos, pColor);
                    if (victimGlobal === attackerGlobal) {
                        this.pieces[pColor][idx] = -1; // Send Home
                    }
                }
            });
        });
    }

    finishMove(rollAgain) {
        this.waitingForMove = false;
        this.renderPieces();

        if (this.pieces[this.players[this.turn].id].every(p => p === 999)) {
            const winner = this.players[this.turn].id.toUpperCase();
            this.container.querySelector('#winner-msg').textContent = `${winner} WINS!`;
            this.container.querySelector('#game-controls').classList.remove('hidden');
            return;
        }

        if (rollAgain) {
            this.updateStatus(`${this.players[this.turn].id.toUpperCase()} Rolls Again!`);
            // If online and it's opponent rolling again, wait.
        } else {
            this.nextTurn();
        }
    }

    nextTurn() {
        // Find next active player
        // For MVP 2 player online: turn 0 -> 1 -> 0
        // For local: 0->1->2->3

        if (this.mode === 'online') {
            this.turn = (this.turn + 1) % 2; // Only 0 and 1
        } else {
            this.turn = (this.turn + 1) % 4;
        }

        this.updateStatus();

        if (this.mode === 'local' && this.turn !== 0) {
            setTimeout(() => this.rollDice(), 1000);
        }
    }

    updateStatus(msg) {
        const pName = this.players[this.turn].id.toUpperCase();
        const pColor = this.players[this.turn].color;
        this.container.querySelector('#turn-indicator').innerHTML = `<span style="color:${pColor}">${msg || pName + "'s Turn"}</span>`;
    }

    makeAIMove() {
        // ... (Same AI logic)
        const color = this.players[this.turn].id;
        const pieces = this.pieces[color];
        const validIndices = pieces.map((p, i) => this.canMove(color, i, this.diceValue) ? i : -1).filter(i => i !== -1);
        if (validIndices.length > 0) this.movePiece(color, validIndices[0], this.diceValue);
    }

    getCoords(pos, color) {
        if (pos === -1) {
            if (color === 'red') return { r: 1, c: 1 };
            if (color === 'green') return { r: 1, c: 9 };
            if (color === 'yellow') return { r: 9, c: 9 };
            if (color === 'blue') return { r: 9, c: 1 };
        }

        if (pos >= 100) {
            const offset = pos - 100;
            if (color === 'red') return { r: 5, c: 1 + offset };
            if (color === 'green') return { r: 1 + offset, c: 5 };
            if (color === 'yellow') return { r: 5, c: 9 - offset };
            if (color === 'blue') return { r: 9 - offset, c: 5 };
        }

        const globalPos = this.toGlobal(pos, color);
        // Correct 11x11 Grid Path
        /*
        Red Start (0) at r4,c1? No, track is:
        (4,0)-(4,4) -> (3,4)-(0,4) -> (0,5)-(0,6) -> (1,6)-(4,6) -> (4,7)-(4,10) ...
        */
        const p = this.pathMap;
        return p[globalPos] || { r: 5, c: 5 };
    }

    toGlobal(relative, color) {
        const offset = this.players.find(p => p.id === color).startPos;
        return (relative + offset) % 52;
    }

    get pathMap() {
        if (this._path) return this._path;
        const p = [];
        // Red Wing
        p.push({ r: 4, c: 0 }); p.push({ r: 4, c: 1 }); p.push({ r: 4, c: 2 }); p.push({ r: 4, c: 3 }); p.push({ r: 4, c: 4 });
        // Up Wing Left
        p.push({ r: 3, c: 4 }); p.push({ r: 2, c: 4 }); p.push({ r: 1, c: 4 }); p.push({ r: 0, c: 4 });
        // Top Center
        p.push({ r: 0, c: 5 }); p.push({ r: 0, c: 6 });
        // Up Wing Right
        p.push({ r: 1, c: 6 }); p.push({ r: 2, c: 6 }); p.push({ r: 3, c: 6 }); p.push({ r: 4, c: 6 });
        // Right Wing Top
        p.push({ r: 4, c: 7 }); p.push({ r: 4, c: 8 }); p.push({ r: 4, c: 9 }); p.push({ r: 4, c: 10 });
        // Right Center
        p.push({ r: 5, c: 10 }); p.push({ r: 6, c: 10 });
        // Right Wing Bottom
        p.push({ r: 6, c: 9 }); p.push({ r: 6, c: 8 }); p.push({ r: 6, c: 7 }); p.push({ r: 6, c: 6 });
        // Down Wing Right
        p.push({ r: 7, c: 6 }); p.push({ r: 8, c: 6 }); p.push({ r: 9, c: 6 }); p.push({ r: 10, c: 6 });
        // Bottom Center
        p.push({ r: 10, c: 5 }); p.push({ r: 10, c: 4 });
        // Down Wing Left
        p.push({ r: 9, c: 4 }); p.push({ r: 8, c: 4 }); p.push({ r: 7, c: 4 }); p.push({ r: 6, c: 4 });
        // Left Wing Bottom
        p.push({ r: 6, c: 3 }); p.push({ r: 6, c: 2 }); p.push({ r: 6, c: 1 }); p.push({ r: 6, c: 0 });
        // Left Center
        p.push({ r: 5, c: 0 });
        // End loop back to start is implicit for global modulo

        this._path = p;
        return p;
    }
}
