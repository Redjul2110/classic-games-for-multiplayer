import { cleanupAndExit } from './games.js';

const EMOJIS = ['🐶', '😸', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦉'];

export class Memory {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        this.players = [];
        this.mySide = 0;
        this.turn = 0; // 0 for player 1, 1 for player 2

        this.scores = [0, 0];

        // Game State
        this.cards = [];
        this.flippedIndices = []; // Cards currently flipped but not matched
        this.matchedIndices = []; // Cards successfully matched
        this.isAnimating = false;

        this.initGame();
        if (this.mode === 'online') {
            this.initRealtime();
        }
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'flip' }, ({ payload }) => {
                this.receiveFlip(payload.index);
            }).subscribe();
        });
    }

    initGame() {
        if (this.mode === 'online') {
            const isHost = this.session.host_id === this.currentUser.id;
            this.mySide = isHost ? 0 : 1;

            this.players = [
                { id: this.session.host_id, name: 'Host' },
                { id: 'guest', name: 'Opponent' }
            ];

            // Seed the deck using session ID so both host and guest generate the exact same board without needing a sync
            this.createDeck(this.session.id);
        } else {
            this.mySide = 0;
            this.players = [{ name: 'You' }, { name: 'AI' }];
            this.createDeck(Date.now().toString());
        }

        this.renderUI();
    }

    // A simple seeded random number generator
    seededRandom(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        return function () {
            hash = Math.imul(1597334677, hash) + 16807 | 0;
            return (hash >>> 0) / 4294967296;
        };
    }

    createDeck(seedStr) {
        const rng = this.seededRandom(seedStr);
        // 6x4 Grid = 24 Cards = 12 Pairs
        const selectedEmojis = [];

        // Shallow copy and shuffle EMOJIS with our RNG
        let availableEmojis = [...EMOJIS];
        for (let i = availableEmojis.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [availableEmojis[i], availableEmojis[j]] = [availableEmojis[j], availableEmojis[i]];
        }

        for (let i = 0; i < 12; i++) {
            selectedEmojis.push(availableEmojis[i], availableEmojis[i]);
        }

        // Shuffle the pairs
        for (let i = selectedEmojis.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [selectedEmojis[i], selectedEmojis[j]] = [selectedEmojis[j], selectedEmojis[i]];
        }

        this.cards = selectedEmojis.map(emoji => ({ emoji }));
    }

    renderUI() {
        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 600px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Memory Pairs</h2>
                
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

                <div id="memory-board" style="
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 10px;
                    margin: 0 auto 20px auto;
                ">
                    ${this.cards.map((c, i) => `
                        <div class="memory-card" data-idx="${i}" style="
                            aspect-ratio: 1;
                            background: rgba(255,255,255,0.1);
                            border: 2px solid rgba(255,255,255,0.2);
                            border-radius: 8px;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 2rem;
                            cursor: pointer;
                            transition: transform 0.3s, background 0.3s;
                            transform-style: preserve-3d;
                        ">
                            <!-- content injected via JS dynamically based on state -->
                        </div>
                    `).join('')}
                </div>

                <div id="game-controls" class="hidden">
                    <h3 id="end-msg" style="margin-bottom: 15px;"></h3>
                    ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary" style="margin-right: 10px;">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit</button>
                </div>
            </div>
        `;

        this.updateBoardUI();
        this.bindEvents();
    }

    bindEvents() {
        this.container.querySelectorAll('.memory-card').forEach(card => {
            card.onclick = () => this.handleCardClick(parseInt(card.dataset.idx));
        });

        if (this.mode === 'local') {
            const rb = this.container.querySelector('#restart-btn');
            if (rb) rb.onclick = () => {
                this.scores = [0, 0];
                this.flippedIndices = [];
                this.matchedIndices = [];
                this.turn = 0;
                this.createDeck(Date.now().toString());
                this.container.querySelector('#game-controls').classList.add('hidden');
                this.updateBoardUI();
                this.updateStatus();
            };
        }

        const btn = this.container.querySelector('#exit-btn');
        if (btn) btn.onclick = () => {
            if (this.mode === 'online') cleanupAndExit(this.session, this.currentUser);
            else location.reload();
        };
    }

    updateBoardUI() {
        this.container.querySelectorAll('.memory-card').forEach((cardEl, idx) => {
            if (this.matchedIndices.includes(idx)) {
                // Matched state
                cardEl.innerHTML = this.cards[idx].emoji;
                cardEl.style.background = 'rgba(0,0,0,0.5)';
                cardEl.style.borderColor = 'rgba(255,255,255,0.05)';
                cardEl.style.transform = 'scale(0.95)';
                cardEl.style.opacity = '0.5';
                cardEl.style.cursor = 'default';
            } else if (this.flippedIndices.includes(idx)) {
                // Flipped state
                cardEl.innerHTML = this.cards[idx].emoji;
                const turnColor = this.turn === 0 ? 'rgba(255,68,68,0.3)' : 'rgba(100,181,246,0.3)';
                const turnBorder = this.turn === 0 ? 'var(--accent-red)' : '#64B5F6';
                cardEl.style.background = turnColor;
                cardEl.style.borderColor = turnBorder;
                cardEl.style.transform = 'scale(1.05)';
                cardEl.style.opacity = '1';
                cardEl.style.cursor = 'default';
            } else {
                // Face down state
                cardEl.innerHTML = '';
                cardEl.style.background = 'rgba(255,255,255,0.1)';
                cardEl.style.borderColor = 'rgba(255,255,255,0.2)';
                cardEl.style.transform = 'scale(1)';
                cardEl.style.opacity = '1';
                cardEl.style.cursor = 'pointer';
            }
        });
    }

    updateStatus() {
        const text = this.container.querySelector('#status-text');
        if (text) {
            text.innerHTML = this.turn === this.mySide ? 'YOUR TURN' : "OPPONENT'S TURN";
            text.style.color = this.turn === 0 ? 'var(--accent-red)' : '#64B5F6';
        }

        const p1 = this.container.querySelector('#p1-score');
        if (p1) p1.innerText = `${this.mySide === 0 && this.mode === 'online' ? 'You' : 'Red'}: ${this.scores[0]}`;

        const p2 = this.container.querySelector('#p2-score');
        if (p2) p2.innerText = `${this.mySide === 1 && this.mode === 'online' ? 'You' : (this.mode === 'local' ? 'AI' : 'Blue')}: ${this.scores[1]}`;
    }

    handleCardClick(idx) {
        if (this.isAnimating) return;
        if (this.turn !== this.mySide) return;
        if (this.matchedIndices.includes(idx) || this.flippedIndices.includes(idx)) return;

        this.processFlip(idx, true);
    }

    receiveFlip(idx) {
        if (this.turn === this.mySide) return; // Prevent receiving echoes or if state is desynced
        this.processFlip(idx, false);
    }

    processFlip(idx, shouldBroadcast) {
        this.flippedIndices.push(idx);
        this.updateBoardUI();

        if (shouldBroadcast && this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'flip',
                payload: { index: idx }
            });
        }

        if (this.flippedIndices.length === 2) {
            this.isAnimating = true;
            this.checkMatch();
        }
    }

    checkMatch() {
        const [idx1, idx2] = this.flippedIndices;

        if (this.cards[idx1].emoji === this.cards[idx2].emoji) {
            // Match found!
            setTimeout(() => {
                this.matchedIndices.push(idx1, idx2);
                this.scores[this.turn]++;
                this.flippedIndices = [];
                this.isAnimating = false;

                this.updateBoardUI();
                this.updateStatus();
                this.checkEndGame();

                // If they score, they go again
                if (this.mode === 'local' && this.turn === 1) {
                    this.makeAIMove();
                }
            }, 600); // 600ms showcase of the match
        } else {
            // No match
            setTimeout(() => {
                this.flippedIndices = [];
                this.turn = this.turn === 0 ? 1 : 0;
                this.isAnimating = false;

                this.updateBoardUI();
                this.updateStatus();

                if (this.mode === 'local' && this.turn === 1) {
                    this.makeAIMove();
                }
            }, 1000); // Wait 1 sec before flipping back
        }
    }

    checkEndGame() {
        if (this.matchedIndices.length === this.cards.length) {
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

    makeAIMove() {
        if (!this.isAnimating && this.turn === 1 && this.matchedIndices.length < this.cards.length) {
            setTimeout(() => {
                const available = [];
                for (let i = 0; i < this.cards.length; i++) {
                    if (!this.matchedIndices.includes(i) && !this.flippedIndices.includes(i)) available.push(i);
                }

                if (available.length > 0) {
                    // Random flip 1
                    const idx1 = available[Math.floor(Math.random() * available.length)];
                    this.processFlip(idx1, false);

                    setTimeout(() => {
                        const available2 = available.filter(i => i !== idx1);
                        if (available2.length > 0) {
                            // AI cheating slightly for better difficulty: 10% chance to remember the pair if it exists
                            let idx2 = available2[Math.floor(Math.random() * available2.length)];

                            if (Math.random() < 0.1) {
                                const pairIdx = available2.find(i => this.cards[i].emoji === this.cards[idx1].emoji);
                                if (pairIdx !== undefined) idx2 = pairIdx;
                            }

                            this.processFlip(idx2, false);
                        }
                    }, 500);
                }
            }, 800);
        }
    }
}
