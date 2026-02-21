// src/games/trivia.js
// Trivia Blitz – 10 questions, timed, AI opponent with ~70% accuracy

import { showToast } from '../ui/toast.js';

const QUESTIONS = [
  { q: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correct: 2 },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1 },
  { q: 'Who wrote "Romeo and Juliet"?', options: ['Dickens', 'Shakespeare', 'Twain', 'Poe'], correct: 1 },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correct: 1 },
  { q: 'What element has the chemical symbol "O"?', options: ['Gold', 'Oxygen', 'Osmium', 'Ozone'], correct: 1 },
  { q: 'Which country invented pizza?', options: ['USA', 'Greece', 'Italy', 'France'], correct: 2 },
  { q: 'What is 12 × 12?', options: ['124', '136', '144', '148'], correct: 2 },
  { q: 'Which animal is the fastest on land?', options: ['Lion', 'Cheetah', 'Horse', 'Greyhound'], correct: 1 },
  { q: 'What is the smallest continent?', options: ['Europe', 'Antarctica', 'Australia', 'South America'], correct: 2 },
  { q: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Raphael', 'Da Vinci', 'Monet'], correct: 2 },
  { q: 'What language has the most native speakers?', options: ['English', 'Spanish', 'Mandarin', 'Hindi'], correct: 2 },
  { q: 'How many bones are in the adult human body?', options: ['186', '206', '226', '246'], correct: 1 },
  { q: 'What is the hardest natural substance on Earth?', options: ['Iron', 'Quartz', 'Diamond', 'Granite'], correct: 2 },
  { q: 'Which programming language runs in a browser?', options: ['Python', 'Java', 'JavaScript', 'C++'], correct: 2 },
];

export function renderTrivia(container, onBack) {
  // Shuffle and pick 10 questions
  const selected = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
  let qIndex = 0;
  let scores = { player: 0, ai: 0 };
  let answered = false;
  let timerInterval = null;
  let timeLeft = 15;
  const QUESTION_TIME = 15;
  const AI_ACCURACY = 0.70; // 70% correct

  function render() {
    const q = selected[qIndex];
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Trivia Blitz <span class="game-screen-badge vs-ai">VS AI</span></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;max-width:700px;margin:0 auto;width:100%;">
          <div class="score-board">
            <div class="score-item"><div class="score-value player-score">${scores.player}</div><div class="score-label">You</div></div>
            <div class="score-divider">Q ${qIndex + 1}/10</div>
            <div class="score-item"><div class="score-value ai-score">${scores.ai}</div><div class="score-label">AI [AI]</div></div>
          </div>
          <div class="trivia-timer-bar">
            <div class="trivia-timer-fill" id="timer-fill" style="width:${(timeLeft / QUESTION_TIME) * 100}%"></div>
          </div>
          <div class="trivia-question">${q.q}</div>
          <div class="trivia-options">
            ${q.options.map((opt, i) => `
              <button class="trivia-option" data-idx="${i}">${opt}</button>
            `).join('')}
          </div>
          <div style="color:var(--text-muted);font-size:0.78rem;">${QUESTION_TIME - timeLeft}s elapsed</div>
        </div>
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', () => { clearTimer(); onBack(); });

    container.querySelectorAll('.trivia-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        clearTimer();
        handleAnswer(parseInt(btn.dataset.idx), q);
      });
    });

    // Start timer
    startTimer(q);
  }

  function startTimer(q) {
    timeLeft = QUESTION_TIME;
    timerInterval = setInterval(() => {
      timeLeft--;
      const fill = container.querySelector('#timer-fill');
      if (fill) fill.style.width = `${(timeLeft / QUESTION_TIME) * 100}%`;
      if (timeLeft <= 0) {
        clearTimer();
        handleAnswer(-1, q); // Time out = wrong
      }
    }, 1000);
  }

  function clearTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function handleAnswer(playerIdx, q) {
    answered = true;
    const correct = q.correct;
    const playerCorrect = playerIdx === correct;

    // AI answer: 70% accuracy, with thinking delay
    const aiCorrect = Math.random() < AI_ACCURACY;
    const timingBonus = Math.max(0, timeLeft - 5);

    if (playerCorrect) scores.player += 10 + timingBonus;
    if (aiCorrect) scores.ai += 10 + Math.floor(Math.random() * 5);

    // Highlight answers
    container.querySelectorAll('.trivia-option').forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) btn.classList.add('correct');
      else if (i === playerIdx && !playerCorrect) btn.classList.add('wrong');
    });

    // Show what AI did
    showToast(
      `You: ${playerCorrect ? '✅ Correct' : playerIdx === -1 ? '⏰ Time up' : '[X] Wrong'} | AI: ${aiCorrect ? '✅ Correct' : '[X] Wrong'}`,
      playerCorrect ? 'success' : 'error', 2000
    );

    setTimeout(() => {
      answered = false;
      qIndex++;
      if (qIndex >= selected.length) return showFinalResult();
      render();
    }, 2000);
  }

  function showFinalResult() {
    const winner = scores.player > scores.ai ? 'player' : scores.ai > scores.player ? 'ai' : 'draw';
    if (winner === 'player') import('../ui/animations.js').then(({ triggerConfetti }) => triggerConfetti());
    container.innerHTML = `
      <div class="game-screen" style="align-items:center;justify-content:center;">
        <div style="text-align:center;padding:40px;max-width:480px;">
          <div style="font-size:4rem;margin-bottom:16px;">
            ${winner === 'player' ? '★' : winner === 'ai' ? '[AI]' : '[DRAW]'}
          </div>
          <div style="font-size:2rem;font-weight:900;margin-bottom:8px;">
            ${winner === 'player' ? 'You Win!' : winner === 'ai' ? 'AI Wins!' : "It's a Draw!"}
          </div>
          <div style="color:var(--text-secondary);margin-bottom:24px;">
            Final Score: ${scores.player} – ${scores.ai}
          </div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" id="play-again-btn">Play Again</button>
            <button class="btn btn-ghost" id="exit-btn">Exit</button>
          </div>
        </div>
      </div>
    `;
    container.querySelector('#play-again-btn').addEventListener('click', () => renderTrivia(container, onBack));
    container.querySelector('#exit-btn').addEventListener('click', onBack);
  }

  render();
}
