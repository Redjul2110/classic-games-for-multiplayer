// src/games/cardclash.js  
// Card Clash (UNO-style) – smart rule-based AI

import { showToast } from '../ui/toast.js';
import { getDisplayName } from '../auth.js';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw2'];
const WILDS = ['Wild', 'Wild4'];

function buildDeck() {
  const deck = [];
  for (const color of COLORS) {
    for (const val of VALUES) {
      deck.push({ color, value: val });
      if (val !== '0') deck.push({ color, value: val });
    }
  }
  for (const wild of WILDS) {
    for (let i = 0; i < 4; i++) deck.push({ color: 'wild', value: wild });
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

function cardCSSClass(card) {
  const map = { red: 'red-card', blue: 'blue-card', green: 'green-card', yellow: 'yellow-card', wild: 'wild-card' };
  return map[card.color] || 'wild-card';
}

function cardLabel(card) {
  const icons = { Wild: '[WILD]', Wild4: '[WILD]+4', Skip: '⊘', Reverse: '⇄', Draw2: '+2' };
  return icons[card.value] || card.value;
}

export function renderCardClash(container, onBack) {
  let deck = shuffle(buildDeck());
  const draw1 = () => deck.length > 0 ? deck.pop() : { color: 'red', value: '0' }; // Emergency
  let playerHand = [draw1(), draw1(), draw1(), draw1(), draw1(), draw1(), draw1()];
  let aiHand = [draw1(), draw1(), draw1(), draw1(), draw1(), draw1(), draw1()];
  let discardPile = [];
  let currentColor = '';
  let gameOver = false;
  let playerTurn = true;
  let skipPlayer = false;
  let skipAI = false;
  let aiMovePending = false;

  // Place first card (non-wild)
  let firstCard;
  do { firstCard = draw1(); } while (firstCard.color === 'wild');
  discardPile.push(firstCard);
  currentColor = firstCard.color;

  function topCard() { return discardPile[discardPile.length - 1]; }

  function canPlay(card) {
    const top = topCard();
    if (card.color === 'wild') return true;
    return card.color === currentColor || card.value === top.value;
  }

  function render() {
    const top = topCard();
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Card Clash <span class="game-screen-badge vs-ai">VS AI</span></div>
        </div>
        <div class="card-game-area">
          <div style="font-weight:700;font-size:0.9rem;color:var(--text-secondary);">
            AI Hand: ${aiHand.length} cards
          </div>
          <div class="ai-hand-pills">
            ${aiHand.map(() => `<div class="ai-card-pill"></div>`).join('')}
          </div>
          <div class="card-pile-area">
            <div class="playing-card card-back" style="user-select:none;">🂠</div>
            <div class="playing-card ${cardCSSClass(top)}" style="cursor:default;">
              ${cardLabel(top)}
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">Current Color</div>
              <div style="width:28px;height:28px;border-radius:50%;background:${currentColor === 'wild' ? '#8e44ad' : currentColor};margin:0 auto;border:2px solid rgba(255,255,255,0.3);"></div>
            </div>
          </div>
          <div style="font-size:0.82rem;font-weight:700;color:var(--text-secondary);">
            ${playerTurn ? '👤 Your turn — play or draw' : '[AI] AI is playing…'}
          </div>
          <div class="player-hand" id="player-hand">
            ${playerHand.map((card, i) => {
      const playable = canPlay(card) && playerTurn && !gameOver;
      return `<div class="playing-card in-hand ${cardCSSClass(card)} ${!playable ? 'opacity-50' : ''}"
                style="${!playable ? 'opacity:0.35;' : ''}"
                data-idx="${i}" title="${card.color} ${card.value}">
                ${cardLabel(card)}
              </div>`;
    }).join('')}
            ${playerTurn ? `<div class="playing-card card-back" id="draw-card-btn" title="Draw a card" style="opacity:0.7;font-size:0.7rem;display:flex;align-items:center;justify-content:center;">Draw</div>` : ''}
          </div>
          <div style="color:var(--text-muted);font-size:0.75rem;">
            Your cards: ${playerHand.length} | Deck: ${deck.length}
          </div>
        </div>
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', onBack);
    container.querySelector('#draw-card-btn')?.addEventListener('click', playerDraw);

    container.querySelectorAll('#player-hand [data-idx]').forEach(btn => {
      const idx = parseInt(btn.dataset.idx);
      const card = playerHand[idx];
      if (canPlay(card) && playerTurn && !gameOver) {
        btn.addEventListener('click', () => playerPlay(idx));
      }
    });
  }

  function playerPlay(idx) {
    if (gameOver || aiMovePending || !playerTurn) return;
    const card = playerHand.splice(idx, 1)[0];
    playCard(card, 'player');
    if (playerHand.length === 0) return endGame('player');
    if (skipAI) { skipAI = false; playerTurn = true; render(); return; }

    playerTurn = false;
    aiMovePending = true;
    render();
    setTimeout(() => { aiMovePending = false; aiTurn(); }, 900);
  }

  function playerDraw() {
    if (!playerTurn || gameOver || aiMovePending) return;
    playerHand.push(draw1());
    playerTurn = false;
    aiMovePending = true;
    render();
    setTimeout(() => { aiMovePending = false; aiTurn(); }, 900);
  }

  function playCard(card, who) {
    discardPile.push(card);
    if (card.color !== 'wild') currentColor = card.color;

    if (card.value === 'Wild' || card.value === 'Wild4') {
      // Choose best color for AI, random for player (simplified)
      if (who === 'ai') {
        const colorCounts = {};
        aiHand.forEach(c => { if (c.color !== 'wild') colorCounts[c.color] = (colorCounts[c.color] || 0) + 1; });
        currentColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || COLORS[Math.floor(Math.random() * 4)];
      } else {
        currentColor = COLORS[Math.floor(Math.random() * 4)]; // simplified: random
      }
    }
    if (card.value === 'Skip') { if (who === 'player') skipAI = true; else skipPlayer = true; }
    if (card.value === 'Reverse') { /* 2 player = same as skip */ if (who === 'player') skipAI = true; else skipPlayer = true; }
    if (card.value === 'Draw2') {
      if (who === 'player') { for (let i = 0; i < 2; i++) aiHand.push(draw1()); }
      else { for (let i = 0; i < 2; i++) playerHand.push(draw1()); }
    }
    if (card.value === 'Wild4') {
      if (who === 'player') { for (let i = 0; i < 4; i++) aiHand.push(draw1()); }
      else { for (let i = 0; i < 4; i++) playerHand.push(draw1()); }
    }
    if (playerHand.length === 1) showToast('One Card Left! [CARD]', 'info');
    if (aiHand.length === 1) showToast('AI has 1 card left! [AI]', 'error');
  }

  function aiTurn() {
    if (gameOver) return;
    if (skipPlayer) { skipPlayer = false; playerTurn = true; render(); return; }

    // Smart AI: prefer action cards, match color first
    const playable = aiHand.filter(c => canPlay(c));
    let chosen = null;

    if (playable.length > 0) {
      // Priority: action cards > same color > wild
      const actionCards = playable.filter(c => ['Skip', 'Reverse', 'Draw2', 'Wild4'].includes(c.value));
      const colorMatch = playable.filter(c => c.color === currentColor && c.color !== 'wild');
      const wilds = playable.filter(c => c.color === 'wild');

      if (actionCards.length > 0) chosen = actionCards[0];
      else if (colorMatch.length > 0) chosen = colorMatch[Math.floor(Math.random() * colorMatch.length)];
      else chosen = wilds[0] || playable[0];

      const idx = aiHand.indexOf(chosen);
      aiHand.splice(idx, 1);
      playCard(chosen, 'ai');
      if (aiHand.length === 0) return endGame('ai');
    } else {
      // Draw
      aiHand.push(draw1());
    }

    playerTurn = true;
    render();
  }

  function endGame(winner) {
    gameOver = true;
    render();
    const msg = winner === 'player' ? 'You win! ★' : 'AI wins! [AI]';
    if (winner === 'player') import('../ui/animations.js').then(({ triggerConfetti }) => triggerConfetti());
    showToast(msg, winner === 'player' ? 'success' : 'error');
    setTimeout(() => {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100;">
          <div style="text-align:center;padding:40px;">
            <div style="font-size:3rem;margin-bottom:12px;">${winner === 'player' ? '★' : '[AI]'}</div>
            <div style="font-size:2rem;font-weight:900;margin-bottom:16px;">${msg}</div>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button class="btn btn-primary" id="restart-cc">Play Again</button>
              <button class="btn btn-ghost" id="exit-cc">Exit</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(el);
      el.querySelector('#restart-cc').addEventListener('click', () => { el.remove(); renderCardClash(container, onBack); });
      el.querySelector('#exit-cc').addEventListener('click', () => { el.remove(); onBack(); });
    }, 1000);
  }

  render();
}
