import { cleanupAndExit } from './games.js';

const WORD_LIST = [
    'JAVASCRIPT', 'HTML', 'PROGRAMMING', 'COMPUTER', 'INTERNET',
    'KEYBOARD', 'MONITOR', 'GAMING', 'MULTIPLAYER', 'NETWORK',
    'DATABASE', 'APPLICATION', 'INTERFACE', 'COMPONENT', 'VARIABLE',
    'FUNCTION', 'DEBUGGER', 'BROWSER', 'SECURITY', 'PASSWORD',
    'TUTORIAL', 'DEVELOPER', 'SOFTWARE', 'HARDWARE', 'TERMINAL'
];

export class Hangman {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        this.word = '';
        this.guessedLetters = new Set();
        this.mistakes = 0;
        this.maxMistakes = 6;

        this.players = [];
        this.mySide = 0;
        this.turn = 0;
        this.scores = [0, 0];

        this.initGame();
        if (this.mode === 'online') {
            this.initRealtime();
        }
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'guess' }, ({ payload }) => {
                this.receiveGuess(payload.letter);
            }).subscribe();
        });
    }

    initGame() {
        if (this.mode === 'online') {
            const isHost = this.session.host_id === this.currentUser.id;
            this.mySide = isHost ? 0 : 1;
            this.players = [{ name: 'Host' }, { name: 'Opponent' }];
            this.pickWord(this.session.id);
        } else {
            this.mySide = 0;
            this.players = [{ name: 'You' }, { name: 'AI' }];
            this.pickWord(Date.now().toString());
        }

        this.renderUI();
    }

    // A simple seeded RNG to ensure Host and Guest pick the exact same word
    seededRandom(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        hash = Math.imul(1597334677, hash) + 16807 | 0;
        return (hash >>> 0) / 4294967296;
    }

    pickWord(seed) {
        const rng = this.seededRandom(seed);
        this.word = WORD_LIST[Math.floor(rng * WORD_LIST.length)];
    }

    renderUI() {
        const keyboard = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 600px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 20px;">Hangman</h2>
                
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

                <!-- Hangman Drawing -->
                <div style="margin-bottom: 20px;">
                    <svg height="200" width="200" stroke="white" stroke-width="4" fill="transparent" stroke-linecap="round">
                        <!-- Gallows -->
                        <line x1="20" y1="180" x2="100" y2="180" />
                        <line x1="60" y1="180" x2="60" y2="20" />
                        <line x1="60" y1="20" x2="140" y2="20" />
                        <line x1="140" y1="20" x2="140" y2="40" />
                        
                        <!-- Body parts injected dynamically -->
                        <g id="hm-body"></g>
                    </svg>
                </div>

                <!-- Word Display -->
                <div id="hm-word" style="
                    display: flex; justify-content: center; gap: 10px; margin-bottom: 30px;
                    font-size: 2rem; font-family: monospace; font-weight: bold; letter-spacing: 5px;
                ">
                    ${this.generateWordHTML()}
                </div>

                <!-- Keyboard -->
                <div id="hm-keyboard" style="
                    display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; max-width: 400px; margin: 0 auto;
                ">
                    ${keyboard.map(l => `
                        <button class="btn btn-ghost hm-key" data-key="${l}" style="padding: 10px; font-size: 1.2rem;">${l}</button>
                    `).join('')}
                </div>

                <div id="game-controls" class="hidden" style="margin-top: 20px;">
                    <h3 id="end-msg" style="margin-bottom: 15px;"></h3>
                    ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary" style="margin-right: 10px;">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit</button>
                </div>
            </div>
        `;

        this.updateDrawing();
        this.bindEvents();
    }

    generateWordHTML() {
        return this.word.split('').map(char => {
            if (this.guessedLetters.has(char)) {
                return `<span style="border-bottom: 3px solid white; display: inline-block; width: 30px;">${char}</span>`;
            } else {
                return `<span style="border-bottom: 3px solid rgba(255,255,255,0.3); display: inline-block; width: 30px;">&nbsp;</span>`;
            }
        }).join('');
    }

    updateDrawing() {
        const body = this.container.querySelector('#hm-body');
        const parts = [
            '<circle cx="140" cy="60" r="20" />', // Head 1
            '<line x1="140" y1="80" x2="140" y2="130" />', // Body 2
            '<line x1="140" y1="90" x2="110" y2="110" />', // L Arm 3
            '<line x1="140" y1="90" x2="170" y2="110" />', // R Arm 4
            '<line x1="140" y1="130" x2="110" y2="160" />', // L Leg 5
            '<line x1="140" y1="130" x2="170" y2="160" />'  // R Leg 6
        ];

        body.innerHTML = parts.slice(0, this.mistakes).join('');
    }

    bindEvents() {
        this.container.querySelectorAll('.hm-key').forEach(btn => {
            btn.onclick = () => this.handleGuess(btn.dataset.key);
        });

        if (this.mode === 'local') {
            const rb = this.container.querySelector('#restart-btn');
            if (rb) rb.onclick = () => {
                this.scores = [0, 0];
                this.turn = 0;
                this.guessedLetters = new Set();
                this.mistakes = 0;
                this.pickWord(Date.now().toString());
                this.container.querySelector('#game-controls').classList.add('hidden');
                this.renderUI();
            };
        }

        const btn = this.container.querySelector('#exit-btn');
        if (btn) btn.onclick = () => {
            if (this.mode === 'online') cleanupAndExit(this.session, this.currentUser);
            else location.reload();
        };
    }

    handleGuess(letter) {
        if (this.turn !== this.mySide) return;
        if (this.guessedLetters.has(letter)) return;

        this.processGuess(letter, true);
    }

    receiveGuess(letter) {
        if (this.turn === this.mySide) return;
        this.processGuess(letter, false);
    }

    processGuess(letter, shouldBroadcast) {
        this.guessedLetters.add(letter);

        if (shouldBroadcast && this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'guess',
                payload: { letter }
            });
        }

        const occurrences = this.word.split('').filter(c => c === letter).length;

        if (occurrences > 0) {
            // Correct guess!
            this.scores[this.turn] += occurrences;
            // Player gets to go again, so do NOT switch turns.
        } else {
            // Incorrect guess
            this.mistakes++;
            this.turn = this.turn === 0 ? 1 : 0; // Switch turns
        }

        this.updateUI(letter, occurrences > 0);
        this.checkEndGame();

        // AI move if applicable
        if (this.mode === 'local' && this.turn === 1 && this.mistakes < this.maxMistakes && !this.isWordComplete()) {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }

    updateUI(letter, isCorrect) {
        // Update Word
        this.container.querySelector('#hm-word').innerHTML = this.generateWordHTML();

        // Update Drawing
        this.updateDrawing();

        // Update Keyboard Button
        const btn = this.container.querySelector(`.hm-key[data-key="${letter}"]`);
        if (btn) {
            btn.style.opacity = '0.3';
            btn.style.cursor = 'default';
            btn.style.background = isCorrect ? 'var(--accent-red)' : '#444';
            if (isCorrect) btn.style.color = 'white';
        }

        // Update Scores & Status
        this.container.querySelector('#p1-score').innerText = `${this.mySide === 0 && this.mode === 'online' ? 'You' : 'Red'}: ${this.scores[0]}`;
        this.container.querySelector('#p2-score').innerText = `${this.mySide === 1 && this.mode === 'online' ? 'You' : (this.mode === 'local' ? 'AI' : 'Blue')}: ${this.scores[1]}`;

        const text = this.container.querySelector('#status-text');
        text.innerHTML = this.turn === this.mySide ? 'YOUR TURN' : "OPPONENT'S TURN";
        text.style.color = this.turn === 0 ? 'var(--accent-red)' : '#64B5F6';
    }

    isWordComplete() {
        return this.word.split('').every(c => this.guessedLetters.has(c));
    }

    checkEndGame() {
        let gameOver = false;
        let msg = '';

        if (this.mistakes >= this.maxMistakes) {
            msg = `<span style="color: var(--accent-red);">Game Over! The word was ${this.word}</span>`;
            gameOver = true;
        } else if (this.isWordComplete()) {
            if (this.scores[this.mySide] > this.scores[this.mySide === 0 ? 1 : 0]) {
                msg = '<span style="color: #44ff44;">You Win!</span>';
            } else if (this.scores[0] === this.scores[1]) {
                msg = "It's a Tie!";
            } else {
                msg = '<span style="color: var(--accent-red);">You Lose!</span>';
            }
            gameOver = true;
        }

        if (gameOver) {
            // Disable all keys
            this.container.querySelectorAll('.hm-key').forEach(btn => btn.style.pointerEvents = 'none');
            this.container.querySelector('#status-text').innerText = '';
            this.container.querySelector('#end-msg').innerHTML = msg;
            this.container.querySelector('#game-controls').classList.remove('hidden');
        }
    }

    makeAIMove() {
        if (this.turn !== 1) return;

        // Vowel bias first, then common consignments
        const commonLetters = "EAIONRTLSUVWCMHYGPFKBDJQXZ".split('');

        let chosenLetter = null;
        for (const l of commonLetters) {
            if (!this.guessedLetters.has(l)) {
                chosenLetter = l;
                break;
            }
        }

        if (chosenLetter) {
            this.processGuess(chosenLetter, false);
        }
    }
}
