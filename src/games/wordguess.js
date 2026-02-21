// src/games/wordguess.js
// Word Guess (Hangman) with frequency-based AI

import { showToast } from '../ui/toast.js';

const WORD_LIST = [
  'CASTLE', 'KNIGHT', 'DRAGON', 'WIZARD', 'SHIELD', 'BATTLE', 'MYSTIC', 'PLAYER',
  'GAMING', 'LEGEND', 'PORTAL', 'QUEST', 'REALM', 'SWORD', 'TOWER', 'ARROW',
  'FOREST', 'MAGIC', 'POWER', 'STORM', 'FLAME', 'FROST', 'GHOST', 'ANGEL',
  'BINARY', 'CIPHER', 'CHROME', 'DIVIDE', 'ENERGY', 'FILTER', 'GLITCH', 'HARBOR',
  'IMPACT', 'JUNGLE', 'KERNEL', 'LAUNCH', 'MARBLE', 'NETHER', 'ONWARD', 'PILLAR',
  'QUARTZ', 'RANSOM', 'SCRIPT', 'TACTIC', 'UNIQUE', 'VACUUM', 'WIDGET', 'XYSTER',
  'YELLOW', 'ZENITH', 'SPRING', 'SUMMER', 'WINTER', 'RIVER', 'OCEAN', 'PLANET',
];

const HANGMAN_SVG = (wrong) => `
  <svg class="hangman-svg" viewBox="0 0 200 220" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
    <line x1="20" y1="210" x2="180" y2="210" stroke="#555" stroke-width="4" stroke-linecap="round"/>
    <line x1="60" y1="210" x2="60" y2="20" stroke="#555" stroke-width="4" stroke-linecap="round"/>
    <line x1="60" y1="20" x2="130" y2="20" stroke="#555" stroke-width="4" stroke-linecap="round"/>
    <line x1="130" y1="20" x2="130" y2="45" stroke="#555" stroke-width="4" stroke-linecap="round"/>
    ${wrong >= 1 ? `<circle cx="130" cy="62" r="16" stroke="#e74c3c" stroke-width="3" fill="none"/>` : ''}
    ${wrong >= 2 ? `<line x1="130" y1="78" x2="130" y2="130" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>` : ''}
    ${wrong >= 3 ? `<line x1="130" y1="95" x2="100" y2="115" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>` : ''}
    ${wrong >= 4 ? `<line x1="130" y1="95" x2="160" y2="115" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>` : ''}
    ${wrong >= 5 ? `<line x1="130" y1="130" x2="105" y2="160" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>` : ''}
    ${wrong >= 6 ? `<line x1="130" y1="130" x2="155" y2="160" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>` : ''}
  </svg>`;

export function renderWordGuess(container, onBack) {
  let word = '';
  let guessed = new Set();
  let maxWrong = 6;
  let scores = { player: 0, ai: 0 };
  let gameOver = false;

  // Frequency order (most common English letters)
  const FREQ_ORDER = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';

  function newWord() {
    word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    guessed = new Set();
    gameOver = false;
  }

  function wrongCount() {
    return [...guessed].filter(l => !word.includes(l)).length;
  }

  function isWordGuessed() {
    return word.split('').every(l => guessed.has(l));
  }

  function render() {
    const wrong = wrongCount();
    const solved = isWordGuessed();
    const lost = wrong >= maxWrong;

    container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Word Guess <span class="game-screen-badge vs-ai">VS AI</span></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:16px 24px;gap:12px;max-width:600px;margin:0 auto;width:100%;">
          <div class="score-board">
            <div class="score-item"><div class="score-value player-score">${scores.player}</div><div class="score-label">You</div></div>
            <div class="score-divider">VS</div>
            <div class="score-item"><div class="score-value ai-score">${scores.ai}</div><div class="score-label">AI [AI]</div></div>
          </div>

          <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;justify-content:center;">
            ${HANGMAN_SVG(wrong)}
            <div>
              <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:8px;">
                Wrong guesses: ${wrong} / ${maxWrong}
              </div>
              ${wrong > 0 ? `<div style="color:var(--red-light);font-size:0.82rem;font-weight:600;letter-spacing:2px;">
                ${[...guessed].filter(l => !word.includes(l)).join(' ')}
              </div>` : '<div style="color:var(--text-muted);font-size:0.8rem;">No wrong guesses yet</div>'}
            </div>
          </div>

          <div class="wordguess-word">
            ${word.split('').map(l => `
              <div class="letter-box ${guessed.has(l) ? 'revealed' : lost ? 'wrong' : ''}">
                ${guessed.has(l) || lost ? l : ''}
              </div>
            `).join('')}
          </div>

          ${!solved && !lost ? `
            <div class="alphabet-keyboard">
              ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => {
      const correct = guessed.has(l) && word.includes(l);
      const wrong2 = guessed.has(l) && !word.includes(l);
      return `<button class="key-btn ${correct ? 'correct' : wrong2 ? 'wrong' : ''}"
                  data-letter="${l}" ${guessed.has(l) ? 'disabled' : ''}>${l}</button>`;
    }).join('')}
            </div>
          ` : `
            <div style="text-align:center;margin-top:8px;">
              <div style="font-size:1.5rem;font-weight:900;margin-bottom:6px;">
                ${solved ? '! You got it!' : '💀 Game Over'}
              </div>
              ${lost ? `<div style="color:var(--text-muted);">The word was: <strong style="color:var(--orange-primary)">${word}</strong></div>` : ''}
              <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-primary" id="new-word-btn">Next Word</button>
                <button class="btn btn-ghost" id="exit-btn">Exit</button>
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    container.querySelector('#back-btn')?.addEventListener('click', onBack);
    container.querySelector('#exit-btn')?.addEventListener('click', onBack);
    container.querySelector('#new-word-btn')?.addEventListener('click', () => { newWord(); render(); });

    container.querySelectorAll('.key-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => guess(btn.dataset.letter));
    });

    if (solved) scores.player++;
    if (lost) scores.ai++;
  }

  function guess(letter) {
    if (guessed.has(letter) || gameOver) return;
    guessed.add(letter);
    const wrong = wrongCount();
    const solved = isWordGuessed();
    if (solved) import('../ui/animations.js').then(({ triggerConfetti }) => triggerConfetti());
    if (solved || wrong >= maxWrong) gameOver = true;
    render();
  }

  newWord();
  render();
}
