// src/games/rockpaperscissors.js
// Rock Paper Scissors with Markov Chain pattern-prediction AI

import { showToast } from '../ui/toast.js';
import { getDisplayName } from '../auth.js';

const CHOICES = ['[ROCK]', '[PAPER]', '[SCISSORS]'];
const CHOICE_NAMES = ['Rock', 'Paper', 'Scissors'];

export function renderRPS(container, onBack) {
  let scores = { player: 0, ai: 0, draws: 0 };
  let round = 1;
  const maxRounds = 5;
  let gameOver = false;
  let playerHistory = []; // tracks player moves for pattern prediction
  let lastResult = null;
  let lastPlayerChoice = null;
  let lastAiChoice = null;
  let aiThinking = false;

  function render() {
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">
            Rock Paper Scissors <span class="game-screen-badge vs-ai">VS AI</span>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:24px;gap:20px;">
          <div class="score-board">
            <div class="score-item">
              <div class="score-value player-score">${scores.player}</div>
              <div class="score-label">You</div>
            </div>
            <div class="score-divider">${round <= maxRounds ? `Round ${round}/${maxRounds}` : 'Final'}</div>
            <div class="score-item">
              <div class="score-value ai-score">${scores.ai}</div>
              <div class="score-label">AI [AI]</div>
            </div>
          </div>

          <div class="rps-arena">
            <div class="rps-player">
              <div class="rps-choice-display player" id="player-display">
                ${lastPlayerChoice !== null ? CHOICES[lastPlayerChoice] : '?'}
              </div>
              <div style="font-weight:700;font-size:0.9rem;">You</div>
              ${lastResult ? `<div style="font-size:0.82rem;color:${lastResult === 'player' ? '#2ecc71' : lastResult === 'ai' ? 'var(--red-light)' : 'var(--text-muted)'}";>
                ${lastResult === 'player' ? '[*] Win!' : lastResult === 'ai' ? '[X] Loss' : '[DRAW] Tie'}
              </div>` : ''}
            </div>
            <div class="rps-vs">VS</div>
            <div class="rps-player">
              <div class="rps-choice-display ai" id="ai-display">
                ${lastAiChoice !== null ? CHOICES[lastAiChoice] : '?'}
              </div>
              <div style="font-weight:700;font-size:0.9rem;">AI [AI]</div>
            </div>
          </div>

          ${!gameOver ? `
            <div style="text-align:center;color:var(--text-secondary);font-size:0.9rem;margin-bottom:4px;">
              ${aiThinking ? '[AI] AI is reading your patterns…' : 'Make your choice:'}
            </div>
            <div class="rps-choices">
              ${CHOICES.map((emoji, i) => `
                <button class="rps-btn" data-choice="${i}" title="${CHOICE_NAMES[i]}"
                  ${aiThinking ? 'disabled' : ''}>
                  ${emoji}
                </button>
              `).join('')}
            </div>
          ` : `
            <div style="text-align:center;margin-top:12px;">
              <div style="font-size:1.5rem;font-weight:900;margin-bottom:8px;">
                ${scores.player > scores.ai ? '★ You Win the Match!' : scores.ai > scores.player ? '[AI] AI Wins the Match!' : '[DRAW] Match Drawn!'}
              </div>
              <div style="color:var(--text-secondary);margin-bottom:20px;">Final: ${scores.player} – ${scores.ai}</div>
              <div style="display:flex;gap:12px;justify-content:center;">
                <button class="btn btn-primary" id="rematch-btn">Rematch</button>
                <button class="btn btn-ghost" id="exit-btn">Exit</button>
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    container.querySelector('#back-btn')?.addEventListener('click', onBack);
    container.querySelector('#rematch-btn')?.addEventListener('click', resetGame);
    container.querySelector('#exit-btn')?.addEventListener('click', onBack);

    if (!gameOver && !aiThinking) {
      container.querySelectorAll('.rps-btn').forEach(btn => {
        btn.addEventListener('click', () => playRound(parseInt(btn.dataset.choice)));
      });
    }
  }

  function playRound(playerChoice) {
    if (aiThinking || gameOver) return;
    aiThinking = true;
    lastPlayerChoice = playerChoice;
    render();

    setTimeout(() => {
      const aiChoice = markovAIChoice(playerHistory);
      lastAiChoice = aiChoice;

      const result = getRPSResult(playerChoice, aiChoice);
      lastResult = result;

      if (result === 'player') scores.player++;
      else if (result === 'ai') scores.ai++;
      else scores.draws++;

      playerHistory.push(playerChoice);

      round++;
      aiThinking = false;

      if (round > maxRounds || scores.player === 3 || scores.ai === 3) {
        gameOver = true;
      }
      render();
    }, 700);
  }

  function resetGame() {
    scores = { player: 0, ai: 0, draws: 0 };
    round = 1; gameOver = false; aiThinking = false;
    playerHistory = []; lastResult = null;
    lastPlayerChoice = null; lastAiChoice = null;
    render();
  }

  render();
}

// ─── Markov Chain AI (pattern prediction) ───
function markovAIChoice(history) {
  if (history.length < 4) {
    // Random for first rounds
    return Math.floor(Math.random() * 3);
  }

  // Count transitions: what player does after each choice
  const transitions = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < history.length - 1; i++) {
    transitions[history[i]][history[i + 1]]++;
  }

  // Predict: what's the player most likely to do after their last move?
  const lastMove = history[history.length - 1];
  const probs = transitions[lastMove];
  const total = probs.reduce((a, b) => a + b, 0);

  if (total === 0) return Math.floor(Math.random() * 3);

  // Find predicted player move
  let predicted = 0;
  let maxP = probs[0];
  for (let i = 1; i < 3; i++) {
    if (probs[i] > maxP) { maxP = probs[i]; predicted = i; }
  }

  // Counter the predicted move: Rock→Paper, Paper→Scissors, Scissors→Rock
  return (predicted + 1) % 3;
}

function getRPSResult(player, ai) {
  if (player === ai) return 'draw';
  // Rock(0) beats Scissors(2), Paper(1) beats Rock(0), Scissors(2) beats Paper(1)
  if ((player + 1) % 3 === ai) return 'ai'; // AI has counter to player
  return 'player';
}
