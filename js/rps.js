import { cleanupAndExit } from './games.js';

export class RPS {
    constructor(container, mode = 'local', session = null, currentUser = null) {
        this.container = container;
        this.mode = mode;
        this.session = session;
        this.currentUser = currentUser;

        this.choices = ['rock', 'paper', 'scissors'];
        this.emojis = { rock: '✊', paper: '✋', scissors: '✌️' };

        this.mySide = 0; // 0 for P1, 1 for P2
        this.scores = [0, 0];

        // Round State
        this.myChoice = null;
        this.oppChoice = null;
        this.roundWinner = null;
        this.roundActive = true;

        this.initGame();
        if (this.mode === 'online') {
            this.initRealtime();
        }
    }

    initRealtime() {
        import('./supabase-client.js').then(({ onlineGamesClient }) => {
            this.channel = onlineGamesClient.channel(`game:${this.session.id}`);

            this.channel.on('broadcast', { event: 'choice' }, ({ payload }) => {
                if (payload.player !== this.mySide) {
                    this.receiveChoice(payload.choice);
                }
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
        this.container.innerHTML = `
            <div class="glass-panel" style="max-width: 600px; margin: 0 auto; text-align: center; min-height: 400px; display: flex; flex-direction: column;">
                <h2 style="margin-bottom: 20px;">Rock Paper Scissors</h2>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 1.2rem;">
                    <span id="p1-score" style="color: var(--accent-red); font-weight: bold;">
                        ${this.mySide === 0 && this.mode === 'online' ? 'You' : 'Player 1'}: ${this.scores[0]}
                    </span>
                    <span id="status-text" style="color: white; font-weight: bold;">
                        First to 3 Wins
                    </span>
                    <span id="p2-score" style="color: #64B5F6; font-weight: bold;">
                        ${this.mySide === 1 && this.mode === 'online' ? 'You' : (this.mode === 'local' ? 'AI' : 'Player 2')}: ${this.scores[1]}
                    </span>
                </div>

                <!-- Arena -->
                <div id="rps-arena" style="display: flex; justify-content: space-around; align-items: center; min-height: 150px; margin-bottom: 30px; font-size: 5rem;">
                    
                    <div id="arena-p1" style="transform: scaleX(1); width: 100px; height: 100px; line-height: 100px;">
                        ?
                    </div>

                    <div style="font-size: 2rem; font-weight: bold; color: var(--text-secondary);">VS</div>

                    <div id="arena-p2" style="transform: scaleX(-1); width: 100px; height: 100px; line-height: 100px;">
                        ?
                    </div>
                </div>

                <!-- Controls -->
                <div id="rps-controls" style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
                    ${this.choices.map(c => `
                        <button class="btn btn-ghost rps-btn" data-choice="${c}" style="font-size: 3rem; padding: 10px 20px; border-radius: 15px; border: 2px solid rgba(255,255,255,0.2);">
                            ${this.emojis[c]}
                        </button>
                    `).join('')}
                </div>

                <div id="round-msg" style="font-size: 1.5rem; font-weight: bold; height: 40px; margin-bottom: 10px;"></div>

                <div id="game-controls" class="hidden">
                    <h3 id="end-msg" style="margin-bottom: 15px;"></h3>
                    ${this.mode === 'local' ? '<button id="restart-btn" class="btn btn-primary" style="margin-right: 10px;">Play Again</button>' : ''}
                    <button id="exit-btn" class="btn btn-ghost">Exit</button>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        this.container.querySelectorAll('.rps-btn').forEach(btn => {
            btn.onclick = () => this.handleChoice(btn.dataset.choice);
        });

        if (this.mode === 'local') {
            const rb = this.container.querySelector('#restart-btn');
            if (rb) rb.onclick = () => {
                this.scores = [0, 0];
                this.resetRound();
                this.container.querySelector('#game-controls').classList.add('hidden');
                this.updateScores();
            };
        }

        const exitBtn = this.container.querySelector('#exit-btn');
        if (exitBtn) exitBtn.onclick = () => {
            if (this.mode === 'online') cleanupAndExit(this.session, this.currentUser);
            else location.reload();
        };
    }

    handleChoice(choice) {
        if (!this.roundActive || this.myChoice !== null) return;

        this.myChoice = choice;

        // Visual feedback
        this.container.querySelectorAll('.rps-btn').forEach(btn => btn.style.opacity = '0.3');
        this.container.querySelector(`.rps-btn[data-choice="${choice}"]`).style.opacity = '1';
        this.container.querySelector(`.rps-btn[data-choice="${choice}"]`).style.borderColor = 'var(--accent-red)';

        const myArena = this.mySide === 0 ? '#arena-p1' : '#arena-p2';
        this.container.querySelector(myArena).innerHTML = '🔒';

        this.container.querySelector('#round-msg').innerText = 'Waiting for opponent...';

        if (this.mode === 'online') {
            this.channel.send({
                type: 'broadcast',
                event: 'choice',
                payload: { choice, player: this.mySide }
            });
        } else {
            // Local AI Move
            setTimeout(() => {
                this.oppChoice = this.choices[Math.floor(Math.random() * this.choices.length)];
                this.reveal();
            }, 500);
        }

        this.checkReveal();
    }

    receiveChoice(choice) {
        if (!this.roundActive) return;

        this.oppChoice = choice;
        const oppArena = this.mySide === 0 ? '#arena-p2' : '#arena-p1';
        this.container.querySelector(oppArena).innerHTML = '🔒';

        this.checkReveal();
    }

    checkReveal() {
        if (this.myChoice !== null && this.oppChoice !== null) {
            this.reveal();
        }
    }

    reveal() {
        this.roundActive = false;

        // Animate
        const p1Arena = this.container.querySelector('#arena-p1');
        const p2Arena = this.container.querySelector('#arena-p2');

        p1Arena.innerHTML = '✊'; // Shake animation base
        p2Arena.innerHTML = '✊';

        p1Arena.classList.add('shake');
        p2Arena.classList.add('shake');

        let msg = this.container.querySelector('#round-msg');
        msg.innerText = 'Rock... Paper... Scissors... Shoot!';

        setTimeout(() => {
            p1Arena.classList.remove('shake');
            p2Arena.classList.remove('shake');

            const p1Choice = this.mySide === 0 ? this.myChoice : this.oppChoice;
            const p2Choice = this.mySide === 1 ? this.myChoice : this.oppChoice;

            p1Arena.innerHTML = this.emojis[p1Choice];
            p2Arena.innerHTML = this.emojis[p2Choice];

            // Determine Winner logic
            // 0=tie, 1=p1 wins, 2=p2 wins
            let winner = 0;
            if (p1Choice === p2Choice) {
                winner = 0;
            } else if (
                (p1Choice === 'rock' && p2Choice === 'scissors') ||
                (p1Choice === 'paper' && p2Choice === 'rock') ||
                (p1Choice === 'scissors' && p2Choice === 'paper')
            ) {
                winner = 1;
            } else {
                winner = 2;
            }

            if (winner === 1) {
                this.scores[0]++;
                msg.innerHTML = '<span style="color: var(--accent-red);">Player 1 Wins Round!</span>';
            } else if (winner === 2) {
                this.scores[1]++;
                msg.innerHTML = '<span style="color: #64B5F6);">Player 2 Wins Round!</span>';
            } else {
                msg.innerHTML = '<span style="color: white;">Round Tie!</span>';
            }

            this.updateScores();

            // Next round
            if (this.scores[0] < 3 && this.scores[1] < 3) {
                setTimeout(() => this.resetRound(), 2000);
            } else {
                this.checkEndGame();
            }

        }, 1500);
    }

    updateScores() {
        this.container.querySelector('#p1-score').innerText = `${this.mySide === 0 && this.mode === 'online' ? 'You' : 'Player 1'}: ${this.scores[0]}`;
        this.container.querySelector('#p2-score').innerText = `${this.mySide === 1 && this.mode === 'online' ? 'You' : (this.mode === 'local' ? 'AI' : 'Player 2')}: ${this.scores[1]}`;
    }

    resetRound() {
        this.myChoice = null;
        this.oppChoice = null;
        this.roundActive = true;

        this.container.querySelector('#arena-p1').innerHTML = '?';
        this.container.querySelector('#arena-p2').innerHTML = '?';
        this.container.querySelector('#round-msg').innerText = '';

        this.container.querySelectorAll('.rps-btn').forEach(btn => {
            btn.style.opacity = '1';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        });
    }

    checkEndGame() {
        const msg = this.container.querySelector('#end-msg');
        if (this.scores[this.mySide] === 3) {
            msg.innerHTML = '<span style="color: #44ff44;">You Win the Match!</span>';
        } else {
            msg.innerHTML = '<span style="color: var(--accent-red);">You Lose the Match!</span>';
        }

        this.container.querySelector('#game-controls').classList.remove('hidden');
    }
}
