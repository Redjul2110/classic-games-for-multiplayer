// src/games/neoncards.js
// Neon Cards — Color-matching card game with neon visual theme
// Play colorful action cards (Skip, Reverse, +2, Wild, Wild+4). First to empty hand wins!

import { showToast } from '../ui/toast.js';
import { showResultCard } from './tictactoe.js';

// ─── Card definitions ───
const COLORS = ['red', 'blue', 'green', 'yellow'];
const NEON = { red: '#ff2d55', blue: '#0af', green: '#0f0', yellow: '#ff0' };
const ACTIONS = ['skip', 'reverse', 'draw2'];
const WILDS = ['wild', 'wild4'];

function makeDeck() {
    const deck = [];
    for (const c of COLORS) {
        for (let n = 0; n <= 9; n++) deck.push({ color: c, val: String(n) });
        if (n => true) { // actions x2 per color
            for (const a of ACTIONS) {
                deck.push({ color: c, val: a });
                deck.push({ color: c, val: a });
            }
        }
    }
    for (const w of WILDS) {
        for (let i = 0; i < 4; i++) deck.push({ color: 'wild', val: w });
    }
    return deck;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function cardLabel(c) {
    const m = { skip: '⊘', reverse: '↺', draw2: '+2', wild: '★', wild4: '★+4' };
    return m[c.val] ?? c.val;
}

function cardBg(c) {
    if (c.color === 'wild') return 'linear-gradient(135deg,#ff2d55,#0af,#0f0,#ff0)';
    return NEON[c.color] || '#333';
}

function cardText(c) {
    return (c.color === 'red' || c.color === 'yellow' || c.color === 'wild') ? '#111' : '#fff';
}

function canPlay(card, top, chosenColor) {
    if (card.color === 'wild') return true;
    const tc = chosenColor || top.color;
    return card.color === tc || card.val === top.val;
}

function applyTopEffect(state, card) {
    if (card.val === 'skip') { state.skipNext = true; }
    // In 2-player, Reverse = Skip (standard rule)
    if (card.val === 'reverse') { state.skipNext = true; state.reversed = !state.reversed; }
    if (card.val === 'draw2') { state.drawPending = 2; }
    if (card.val === 'wild4') { state.drawPending = 4; }
}

// ─── Simple AI: play first valid card, prefer actions, choose best color ───
function aiPick(hand, top, chosenColor) {
    const valid = hand.filter(c => canPlay(c, top, chosenColor));
    if (!valid.length) return null;
    // Prefer action cards
    const action = valid.find(c => ACTIONS.includes(c.val) || WILDS.includes(c.val));
    return action || valid[0];
}

function aiChooseColor(hand) {
    const counts = {};
    for (const c of hand) if (c.color !== 'wild') counts[c.color] = (counts[c.color] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || COLORS[Math.floor(Math.random() * 4)];
}

// ─── Render ───
export function renderNeonCards(container, onBack) {
    let deck, playerHand, aiHand, discard, chosenColor, turn, gameOver, scores, reversed, skipNext, drawPending, choosingColor;
    let aiLock = false; // prevents concurrent AI turns

    function init() {
        deck = shuffle(makeDeck());
        playerHand = [];
        aiHand = [];
        discard = [];
        chosenColor = null;
        turn = 'player'; // player always goes first
        gameOver = false;
        reversed = false;
        skipNext = false;
        drawPending = 0;
        choosingColor = false;
        if (!scores) scores = { player: 0, ai: 0 };

        // Deal 7 cards each
        for (let i = 0; i < 7; i++) { playerHand.push(deck.pop()); aiHand.push(deck.pop()); }

        // Start discard pile with a non-wild card
        let starter;
        do { starter = deck.pop(); if (starter.color === 'wild') deck.unshift(starter); }
        while (starter.color === 'wild');
        discard.push(starter);

        render();
    }

    function getTop() { return discard[discard.length - 1]; }

    function drawCard() {
        if (!deck.length) {
            // Reshuffle discard except top
            const top = discard.pop();
            deck.push(...shuffle(discard));
            discard.length = 0;
            discard.push(top);
        }
        return deck.pop();
    }

    function render() {
        const top = getTop();
        const tc = chosenColor || top.color;
        const validCards = playerHand.filter(c => canPlay(c, top, tc));

        container.innerHTML = `
      <div class="game-screen" style="background:linear-gradient(160deg,#0a0a0f,#130a1a,#0a0a0f);">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Neon Cards <span class="game-screen-badge vs-ai">VS AI</span></div>
          <button class="btn btn-ghost btn-sm" id="new-game-btn">New</button>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;overflow-y:auto;">

          <!-- Scores -->
          <div class="score-board">
            <div class="score-item"><div class="score-value player-score">${scores.player}</div><div class="score-label">You</div></div>
            <div class="score-divider"> — </div>
            <div class="score-item"><div class="score-value ai-score">${scores.ai}</div><div class="score-label">AI</div></div>
          </div>

          <!-- AI hand (face-down) -->
          <div style="display:flex;gap:4px;justify-content:center;">
            ${aiHand.map(() => `<div style="width:32px;height:48px;border-radius:6px;background:linear-gradient(135deg,#222,#1a0a2e);border:1px solid rgba(255,255,255,0.1);"></div>`).join('')}
          </div>
          <div style="font-size:0.82rem;color:#888;">AI: ${aiHand.length} cards</div>

          <!-- Game status -->
          <div style="font-size:0.88rem;font-weight:700;color:${turn === 'player' ? '#0af' : '#ff2d55'};">
            ${gameOver ? 'Game Over' : turn === 'player' ? '▶ Your turn' : '⚡ AI thinking…'}
            ${drawPending > 0 ? ` — Draw ${drawPending} cards first!` : ''}
          </div>

          <!-- Discard pile (top card) -->
          <div style="display:flex;gap:24px;align-items:center;">
            <div style="text-align:center;">
              <div style="font-size:0.7rem;color:#666;margin-bottom:4px;">DECK (${deck.length})</div>
              <div id="draw-pile" style="width:64px;height:92px;border-radius:10px;background:linear-gradient(135deg,#1a0a2e,#2a0a3e);border:2px solid rgba(138,43,226,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.4rem;color:#8e44ad;">NC</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.7rem;color:#666;margin-bottom:4px;">TOP CARD</div>
              <div style="
                width:64px;height:92px;border-radius:10px;
                background:${cardBg(top)};
                border:2px solid rgba(255,255,255,0.3);
                display:flex;align-items:center;justify-content:center;
                font-weight:900;font-size:1.6rem;color:${cardText(top)};
                ${tc !== top.color ? `outline: 3px solid ${NEON[tc]};` : ''}
              ">${cardLabel(top)}
              ${tc !== top.color ? `<div style="position:absolute;bottom:4px;font-size:0.5rem;letter-spacing:1px;">${tc.toUpperCase()}</div>` : ''}
              </div>
              ${chosenColor ? `<div style="font-size:0.75rem;margin-top:4px;color:${NEON[chosenColor]};">Color: ${chosenColor}</div>` : ''}
            </div>
          </div>

          <!-- Color picker for wild -->
          ${choosingColor ? `
          <div style="background:rgba(255,255,255,0.05);padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:0.85rem;font-weight:700;color:#ccc;margin-bottom:10px;text-align:center;">Choose a color</div>
            <div style="display:flex;gap:10px;justify-content:center;">
              ${COLORS.map(col => `
                <button id="pick-${col}" style="
                  width:44px;height:44px;border-radius:50%;
                  background:${NEON[col]};
                  border:3px solid transparent;cursor:pointer;
                  font-size:1.2rem;font-weight:900;
                  color:${col === 'yellow' || col === 'green' ? '#111' : '#fff'};
                  transition:transform 0.15s;
                " title="${col}"></button>
              `).join('')}
            </div>
          </div>` : ''}

          <!-- Player hand -->
          <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:12px;border:1px solid rgba(255,255,255,0.06);width:100%;max-width:560px;">
            <div style="font-size:0.75rem;color:#666;margin-bottom:8px;text-align:center;">YOUR HAND (${playerHand.length} cards)</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
              ${playerHand.map((card, idx) => {
            const valid = validCards.includes(card) && turn === 'player' && !choosingColor;
            return `<div class="nc-card ${valid ? 'nc-valid' : ''}" data-idx="${idx}" style="
                  width:52px;height:76px;border-radius:8px;
                  background:${cardBg(card)};
                  border:2px solid ${valid ? '#fff' : 'rgba(255,255,255,0.15)'};
                  display:flex;align-items:center;justify-content:center;
                  font-weight:900;font-size:1.1rem;
                  color:${cardText(card)};
                  cursor:${valid ? 'pointer' : 'not-allowed'};
                  opacity:${valid ? 1 : 0.45};
                  transform:${valid ? 'translateY(0)' : 'none'};
                  transition:all 0.15s;
                  box-shadow:${valid ? `0 0 12px ${cardBg(card)}88` : 'none'};
                  position:relative;
                ">${cardLabel(card)}</div>`;
        }).join('')}
            </div>
          </div>

        </div>
      </div>
    `;

        container.querySelector('#back-btn').addEventListener('click', onBack);
        container.querySelector('#new-game-btn').addEventListener('click', init);

        // Draw from pile
        if (!choosingColor) {
            container.querySelector('#draw-pile')?.addEventListener('click', handleDrawPile);
        }

        // Play a card
        container.querySelectorAll('.nc-card.nc-valid').forEach(el => {
            el.addEventListener('mouseenter', () => el.style.transform = 'translateY(-8px)');
            el.addEventListener('mouseleave', () => el.style.transform = 'translateY(0)');
            el.addEventListener('click', () => handlePlayCard(parseInt(el.dataset.idx)));
        });

        // Color picker
        COLORS.forEach(col => {
            container.querySelector(`#pick-${col}`)?.addEventListener('click', () => handleColorPick(col));
        });

        // AI takes turn — only schedule if not already running
        if (turn === 'ai' && !gameOver && !choosingColor && !aiLock) {
            aiLock = true;
            setTimeout(() => { aiLock = false; aiTurn(); }, 900);
        }
    }

    function handlePlayCard(idx) {
        if (turn !== 'player' || gameOver || choosingColor) return;
        const card = playerHand[idx];
        const top = getTop();
        const tc = chosenColor || top.color;
        if (!canPlay(card, top, tc)) return;

        playerHand.splice(idx, 1);
        discard.push(card);
        chosenColor = null;

        // Wild — ask for color
        if (card.color === 'wild') {
            choosingColor = true;
            render();
            return;
        }

        // Apply effects
        const state = { skipNext, reversed, drawPending };
        applyTopEffect(state, card);
        skipNext = state.skipNext; reversed = state.reversed; drawPending = state.drawPending;

        if (!playerHand.length) return endGame('player');

        turn = 'ai';
        render();
    }

    function handleColorPick(color) {
        chosenColor = color;
        choosingColor = false;
        if (!playerHand.length) return endGame('player');
        turn = 'ai';
        render();
    }

    function handleDrawPile() {
        if (turn !== 'player' || gameOver) return;

        if (drawPending > 0) {
            for (let i = 0; i < drawPending; i++) playerHand.push(drawCard());
            drawPending = 0;
            turn = 'ai';
            render();
            return;
        }

        // Draw 1 card
        const drawn = drawCard();
        playerHand.push(drawn);

        // If it can be played, player can optionally play it (just let them click)
        render();
        showToast('Drew a card', 'info');
        // Give player a chance to play anything — pass turn if still no valid card
        const top = getTop();
        const tc = chosenColor || top.color;
        const valid = playerHand.filter(c => canPlay(c, top, tc));
        if (!valid.length) { turn = 'ai'; setTimeout(() => render(), 400); }
    }

    function aiTurn() {
        if (turn !== 'ai' || gameOver) return;

        // Handle draw penalty
        if (drawPending > 0) {
            for (let i = 0; i < drawPending; i++) aiHand.push(drawCard());
            drawPending = 0;
            turn = 'player';
            render();
            return;
        }

        // Skip
        if (skipNext) { skipNext = false; turn = 'player'; render(); return; }

        const top = getTop();
        const tc = chosenColor || top.color;
        const card = aiPick(aiHand, top, tc);

        if (!card) {
            // Draw and pass
            aiHand.push(drawCard());
            turn = 'player';
            render();
            return;
        }

        aiHand.splice(aiHand.indexOf(card), 1);
        discard.push(card);

        // Wild — AI picks color
        if (card.color === 'wild') {
            chosenColor = aiChooseColor(aiHand);
        } else {
            chosenColor = null;
        }

        const state = { skipNext, reversed, drawPending };
        applyTopEffect(state, card);
        skipNext = state.skipNext; reversed = state.reversed; drawPending = state.drawPending;

        if (!aiHand.length) return endGame('ai');

        // In 2-player, Skip/Reverse means player is skipped → AI goes again
        // render() will re-schedule aiTurn via aiLock guard — DON'T add another setTimeout here
        if (skipNext) {
            skipNext = false;
            turn = 'ai';
            render(); // render() auto-schedules the next aiTurn via the aiLock guard
            return;
        }

        turn = 'player';
        render();
    }

    function endGame(winner) {
        gameOver = true;
        if (winner === 'player') {
            scores.player++;
            showToast('You win! Hand empty! ✓', 'success');
        } else {
            scores.ai++;
            showToast('AI wins! Hand empty!', 'error');
        }
        render();
        const title = winner === 'player' ? 'You Win! ✓' : 'AI Wins!';
        setTimeout(() => showResultCard(container, title,
            `Score: You ${scores.player} – AI ${scores.ai}`, init, onBack), 800);
    }

    init();
}
