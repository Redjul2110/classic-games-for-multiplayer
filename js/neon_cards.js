
const COLORS = ['pink', 'cyan', 'lime', 'purple'];
const TYPES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILDS = ['wild', 'wild4'];

export class NeonCards {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        // Game State
        this.deck = [];
        this.discardPile = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.activeColor = null;
        this.myIndex = 0; // Default local

        this.initGame();
        if (this.mode === 'online') this.initRealtime();
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'move' }, ({ payload }) => {
                this.receiveMove(payload);
            })
                .on('broadcast', { event: 'draw' }, ({ payload }) => {
                    this.receiveDraw(payload);
                })
                .on('broadcast', { event: 'sync' }, ({ payload }) => {
                    // For complex resync if needed, but 'move' is enough for simple state
                })
                .subscribe();
        });
    }

    initGame() {
        this.createDeck();
        this.shuffleDeck();

        // Setup Players
        if (this.mode === 'local') {
            this.players = [
                { id: 'p1', name: 'You', hand: [], isBot: false },
                { id: 'p2', name: 'AI', hand: [], isBot: true }
            ];
            this.myIndex = 0;
        } else {
            // Online: Host is 0, Joiner is 1
            const isHost = String(this.session.host_id) === String(this.currentUser.id);
            this.myIndex = isHost ? 0 : 1;

            this.players = [
                { id: this.session.host_id, name: 'Host', hand: [], isBot: false },
                { id: 'opponent', name: 'Opponent', hand: [], isBot: false }
            ];
        }

        // Deal 7 cards
        for (let i = 0; i < 7; i++) {
            this.players.forEach(p => p.hand.push(this.drawCard()));
        }

        // Start discard
        let startCard = this.drawCard();
        while (WILDS.includes(startCard.type)) {
            this.deck.push(startCard);
            this.shuffleDeck();
            startCard = this.drawCard();
        }
        this.discardPile.push(startCard);
        this.activeColor = startCard.color;

        this.renderUI();
    }

    createDeck() {
        this.deck = [];
        COLORS.forEach(color => {
            TYPES.forEach(type => {
                this.deck.push({ color, type, id: Math.random().toString(36) });
                if (type !== '0') this.deck.push({ color, type, id: Math.random().toString(36) });
            });
        });

        // Wilds
        for (let i = 0; i < 4; i++) {
            this.deck.push({ color: 'wild', type: 'wild', id: Math.random().toString(36) });
            this.deck.push({ color: 'wild', type: 'wild4', id: Math.random().toString(36) });
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    drawCard() {
        if (this.deck.length === 0) {
            // Reshuffle
            if (this.discardPile.length <= 1) return { color: 'gray', type: 'empty' }; // Safety
            const top = this.discardPile.pop();
            this.deck = [...this.discardPile];
            this.discardPile = [top];
            this.shuffleDeck();
        }
        return this.deck.pop();
    }

    renderUI() {
        console.log('Rendering UI. Mode:', this.mode, 'MyIndex:', this.myIndex);
        const opponentIndex = (this.myIndex + 1) % 2;

        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 800px; margin: 0 auto; min-height: 500px; position: relative;">
                <div id="uno-game-area" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 20px;">
                    
                    <!-- Opponent -->
                    <div style="text-align: center;">
                        <h3 style="color: var(--text-secondary);">Opponent (${this.players[opponentIndex].hand.length} cards)</h3>
                         <div style="display: flex; justify-content: center; gap: 5px; margin-top: 10px;">
                            ${Array(this.players[opponentIndex].hand.length).fill(0).map(() =>
            `<div style="width: 40px; height: 60px; background: #333; border-radius: 4px; border: 1px solid #555;"></div>`
        ).join('')}
                        </div>
                    </div>

                    <!-- Center Area (Discard + Draw) -->
                    <div style="display: flex; justify-content: center; align-items: center; gap: 40px; margin: 20px 0;">
                        
                        <!-- Draw Pile -->
                        <div id="draw-pile" style="width: 80px; height: 120px; background: #222; border: 2px dashed #555; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            Draw
                        </div>

                        <!-- Discard Pile -->
                        <div id="discard-pile" style="
                            width: 80px; height: 120px; 
                            background: ${this.getColorCode(this.activeColor)}; 
                            color: white; 
                            border-radius: 8px; 
                            display: flex; align-items: center; justify-content: center; 
                            font-weight: bold; font-size: 1.5rem; text-shadow: 1px 1px 2px black;
                            border: 2px solid white;
                        ">
                            ${this.formatCardText(this.discardPile[this.discardPile.length - 1])}
                        </div>
                    </div>

                    <!-- Status -->
                    <div style="text-align: center; margin-bottom: 10px;">
                        <div style="color: white; font-size: 1.2rem;">
                            ${this.currentPlayerIndex === this.myIndex ? "YOUR TURN" : "OPPONENT'S TURN"}
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            Current Color: <span style="color: ${this.getColorCode(this.activeColor)}; font-weight: bold;">${this.activeColor ? this.activeColor.toUpperCase() : 'NONE'}</span>
                        </div>
                    </div>

                    <!-- Player Hand -->
                    <div id="player-hand" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <!-- Cards injected -->
                    </div>

                </div>
                 
                <div id="game-controls" class="hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <h2 id="end-msg">Game Over</h2>
                    <button class="btn btn-primary" onclick="location.reload()">Exit</button>
                </div>
            </div>
        `;

        this.renderHand();

        // Listeners
        this.container.querySelector('#draw-pile').onclick = () => this.handleDraw();
    }

    renderHand() {
        const handEl = this.container.querySelector('#player-hand');
        handEl.innerHTML = '';
        const player = this.players[this.myIndex];

        player.hand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `uno-card ${card.color === 'wild' ? 'wild' : card.color}`;

            // Inner content
            const text = this.formatCardText(card);
            cardEl.innerHTML = `
                <div class="inner-oval"></div>
                <div class="content">${text}</div>
                <div class="small-icon top-left">${text}</div>
                <div class="small-icon bottom-right">${text}</div>
            `;

            // Interaction
            if (this.currentPlayerIndex === this.myIndex) { // My Turn
                cardEl.onclick = () => this.playCard(card);
            } else {
                cardEl.style.opacity = '0.7';
                cardEl.style.cursor = 'default';
            }

            handEl.appendChild(cardEl);
        });
    }

    getColorCode(color) {
        // Obsolete with CSS classes but kept for fallback or Status text
        if (color === 'pink') return '#ff66cc';
        if (color === 'cyan') return '#00ccff';
        if (color === 'lime') return '#ccff00';
        if (color === 'purple') return '#cc66ff';
        return '#444';
    }

    formatCardText(card) {
        if (!card) return '';
        if (card.type === 'skip') return '🚫';
        if (card.type === 'reverse') return '⇄';
        if (card.type === 'draw2') return '+2';
        if (card.type === 'wild') return 'W';
        if (card.type === 'wild4') return '+4';
        return card.type;
    }

    handleDraw() {
        if (this.currentPlayerIndex !== this.myIndex) return;

        const card = this.drawCard();
        this.players[this.myIndex].hand.push(card);
        this.renderUI();

        if (this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'draw',
                payload: { playerIdx: this.myIndex }
            });
        }

        if (!this.isValidMove(card)) {
            setTimeout(() => this.nextTurn(), 1000);
        }
    }

    isValidMove(card) {
        if (card.color === 'wild') return true;
        if (card.color === this.activeColor) return true;
        const top = this.discardPile[this.discardPile.length - 1];
        if (card.type === top.type) return true;
        return false;
    }

    playCard(card) {
        if (this.currentPlayerIndex !== this.myIndex) return;
        if (!this.isValidMove(card)) return;

        // Remove from hand
        const idx = this.players[this.myIndex].hand.indexOf(card);
        this.players[this.myIndex].hand.splice(idx, 1);
        this.discardPile.push(card);

        // Wild
        if (card.color === 'wild') {
            this.activeColor = 'pink'; // Simplification: auto-pink for rapid play
        } else {
            this.activeColor = card.color;
        }

        this.handleEffects(card);
        this.renderUI();

        if (this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'move',
                payload: {
                    card,
                    playerIdx: this.myIndex,
                    activeColor: this.activeColor
                }
            });
        }

        if (this.players[this.myIndex].hand.length === 0) {
            this.endGame('You Win!');
            return;
        }

        this.nextTurn();
    }

    receiveMove({ card, playerIdx, activeColor }) {
        if (playerIdx === this.myIndex) return;

        // Apply opp move
        this.discardPile.push(card);
        this.activeColor = activeColor;
        this.players[playerIdx].hand.pop(); // reduce visual count

        this.handleEffects(card);
        this.renderUI();

        if (this.players[playerIdx].hand.length === 0) {
            this.endGame('Opponent Wins!');
        } else {
            this.nextTurn();
        }
    }

    receiveDraw({ playerIdx }) {
        if (playerIdx === this.myIndex) return;
        this.players[playerIdx].hand.push({ color: 'back', type: 'back' });
        this.renderUI();
        setTimeout(() => this.nextTurn(), 1000);
    }

    handleEffects(card) {
        if (card.type === 'skip' || card.type === 'reverse') {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        }
        if (card.type === 'draw2') {
            const nextP = this.players[(this.currentPlayerIndex + 1) % 2];
            nextP.hand.push(this.drawCard());
            nextP.hand.push(this.drawCard());
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        }
        if (card.type === 'wild4') {
            const nextP = this.players[(this.currentPlayerIndex + 1) % 2];
            for (let i = 0; i < 4; i++) nextP.hand.push(this.drawCard());
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        }
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        this.renderUI();

        if (this.mode === 'local' && this.currentPlayerIndex === 1) {
            setTimeout(() => this.makeAIMove(), 1500);
        }
    }

    makeAIMove() {
        const bot = this.players[1];
        const playables = bot.hand.filter(c => this.isValidMove(c));

        if (playables.length > 0) {
            const card = playables[0];
            const idx = bot.hand.indexOf(card);
            bot.hand.splice(idx, 1);
            this.discardPile.push(card);
            this.activeColor = card.color === 'wild' ? COLORS[Math.floor(Math.random() * 4)] : card.color;
            this.handleEffects(card);

            if (bot.hand.length === 0) {
                this.endGame('AI Wins!');
                return;
            }
        } else {
            bot.hand.push(this.drawCard());
        }
        this.nextTurn();
    }

    endGame(msg) {
        this.container.querySelector('#game-controls').classList.remove('hidden');
        this.container.querySelector('#end-msg').textContent = msg;
    }
}
