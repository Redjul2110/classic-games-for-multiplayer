// src/games/trivia.js
// Trivia Blitz – 10 questions, timed, AI opponent with ~70% accuracy

import { showToast } from '../ui/toast.js';
import { ogClient } from '../supabase.js';

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

export function renderTrivia(container, onBack, multiplayer) {
  const isMp = !!multiplayer;
  const isHost = isMp ? multiplayer.isHost : true;

  let selected = [];
  let qIndex = 0;
  let scores = { player: 0, ai: 0 };
  let answered = false;
  let oppAnswered = false;
  let oppResult = null; // { correct, score }
  let myIdx = -1;
  let myLastCorrect = false;

  let timerInterval = null;
  let timeLeft = 15;
  const QUESTION_TIME = 15;
  const AI_ACCURACY = 0.70; // 70% correct

  let channel = null;

  function initHost() {
    selected = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    if (isMp && channel) {
      channel.send({ type: 'broadcast', event: 'init_state', payload: { selected } });
    }
  }

  if (isMp) {
    channel = ogClient.channel('game-' + multiplayer.lobby.id);
    channel.on('broadcast', { event: 'init_state' }, (payload) => {
      if (!isHost) {
        selected = payload.payload.selected;
        startGame();
      }
    }).on('broadcast', { event: 'request_state' }, () => {
      // Guest requesting state – host re-sends
      if (isHost && selected.length > 0) {
        channel.send({ type: 'broadcast', event: 'init_state', payload: { selected } });
      }
    }).on('broadcast', { event: 'answer' }, (payload) => {
      oppAnswered = true;
      oppResult = payload.payload;
      checkRoundEnd();
    }).on('broadcast', { event: 'new_game' }, () => {
      if (isHost) {
        initHost();
        startGame();
      }
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        showToast('Connected to opponent! 🧠', 'success');
        if (isHost) {
          setTimeout(() => { initHost(); startGame(); }, 400);
        } else {
          // Guest: request state from host
          setTimeout(() => {
            channel.send({ type: 'broadcast', event: 'request_state' });
          }, 600);
        }
      }
    });
  }

  function handleExit() {
    clearTimer();
    if (channel) { channel.unsubscribe(); ogClient.removeChannel(channel); }
    onBack();
  }

  function startGame() {
    qIndex = 0;
    scores = { player: 0, ai: 0 };
    nextRound();
  }

  function nextRound() {
    answered = false;
    oppAnswered = false;
    oppResult = null;
    myIdx = -1;
    myLastCorrect = false;

    if (qIndex >= selected.length) {
      showFinalResult();
    } else {
      render();
      startTimer();

      if (!isMp) {
        // Let AI answer automatically after some delay
        const aiDelay = Math.floor(Math.random() * 5000) + 2000;
        setTimeout(() => {
          if (!answered && timeLeft > 0) {
            oppAnswered = true;
            const aiCorrect = Math.random() < AI_ACCURACY;
            oppResult = { correct: aiCorrect, score: aiCorrect ? 10 + Math.floor(Math.random() * 5) : 0 };
            checkRoundEnd();
          }
        }, aiDelay);
      }
    }
  }

  function render() {
    if (selected.length === 0) {
      container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">Waiting for host to select questions...</div>`;
      return;
    }
    const q = selected[qIndex];
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-screen-header">
          <button class="btn btn-ghost btn-sm" id="back-btn">← Back</button>
          <div class="game-screen-title">Trivia Blitz <span class="game-screen-badge ${isMp ? 'vs-player' : 'vs-ai'}">${isMp ? 'Multiplayer' : 'VS AI'}</span></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;max-width:700px;margin:0 auto;width:100%;">
          <div class="score-board">
            <div class="score-item"><div class="score-value player-score">${scores.player}</div><div class="score-label">You</div></div>
            <div class="score-divider">Q ${qIndex + 1}/10</div>
            <div class="score-item"><div class="score-value ai-score">${scores.ai}</div><div class="score-label">${isMp ? 'Opponent' : 'AI [AI]'}</div></div>
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
          <div style="color:var(--text-muted);font-size:0.78rem;" id="time-text">${QUESTION_TIME - timeLeft}s elapsed</div>
        </div>
      </div>
    `;

    container.querySelector('#back-btn').addEventListener('click', handleExit);

    container.querySelectorAll('.trivia-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        handleMyAnswer(parseInt(btn.dataset.idx), q);
      });
    });
  }

  function startTimer() {
    clearTimer();
    timeLeft = QUESTION_TIME;
    timerInterval = setInterval(() => {
      timeLeft--;
      const fill = container.querySelector('#timer-fill');
      const text = container.querySelector('#time-text');
      if (fill) fill.style.width = `${(timeLeft / QUESTION_TIME) * 100}%`;
      if (text) text.textContent = `${QUESTION_TIME - timeLeft}s elapsed`;

      if (timeLeft <= 0) {
        clearTimer();
        if (!answered) handleMyAnswer(-1, selected[qIndex]);
        if (isMp && !oppAnswered) {
          oppAnswered = true;
          oppResult = { correct: false, score: 0 };
        }
        checkRoundEnd();
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function handleMyAnswer(idx, q) {
    if (answered) return;
    answered = true;
    myIdx = idx;
    myLastCorrect = idx === q.correct;

    const timingBonus = Math.max(0, timeLeft - 5);
    const scoreBonus = myLastCorrect ? 10 + timingBonus : 0;
    scores.player += scoreBonus;

    if (!isMp) {
      if (!oppAnswered) { // if ai hasn't answered yet, force it to answer now
        oppAnswered = true;
        const aiCorrect = Math.random() < AI_ACCURACY;
        oppResult = { correct: aiCorrect, score: aiCorrect ? 10 + Math.floor(Math.random() * 5) : 0 };
      }
    } else {
      if (channel) channel.send({ type: 'broadcast', event: 'answer', payload: { correct: myLastCorrect, score: scoreBonus } });

      container.querySelectorAll('.trivia-option').forEach((btn, i) => {
        btn.disabled = true;
        if (i === idx) btn.style.border = '2px solid var(--primary-color)';
      });
    }
    checkRoundEnd();
  }

  function checkRoundEnd() {
    if (answered && oppAnswered) {
      clearTimer();
      resolveRound();
    }
  }

  function resolveRound() {
    const q = selected[qIndex];
    if (oppResult) scores.ai += oppResult.score;

    container.querySelectorAll('.trivia-option').forEach((btn, i) => {
      btn.disabled = true;
      btn.style.border = 'none'; // reset selection border
      if (i === q.correct) btn.classList.add('correct');
      else if (i === myIdx && !myLastCorrect) btn.classList.add('wrong');
    });

    showToast(
      `You: ${myLastCorrect ? '✅' : myIdx === -1 ? '⏰' : '❌'} | ${isMp ? 'Opp' : 'AI'}: ${oppResult && oppResult.correct ? '✅' : '❌'}`,
      myLastCorrect ? 'success' : 'error', 2000
    );

    const pScoreEl = container.querySelector('.player-score');
    const aScoreEl = container.querySelector('.ai-score');
    if (pScoreEl) pScoreEl.textContent = scores.player;
    if (aScoreEl) aScoreEl.textContent = scores.ai;

    setTimeout(() => {
      qIndex++;
      nextRound();
    }, 2000);
  }

  function showFinalResult() {
    const winner = scores.player > scores.ai ? 'player' : scores.ai > scores.player ? 'ai' : 'draw';
    if (winner === 'player') import('../ui/animations.js').then(({ triggerConfetti }) => triggerConfetti());
    container.innerHTML = `
      <div class="game-screen" style="align-items:center;justify-content:center;">
        <div style="text-align:center;padding:40px;max-width:480px;">
          <div style="font-size:4rem;margin-bottom:16px;">
            ${winner === 'player' ? '★' : (isMp ? (winner === 'draw' ? '[DRAW]' : '😔') : (winner === 'draw' ? '[DRAW]' : '[AI]'))}
          </div>
          <div style="font-size:2rem;font-weight:900;margin-bottom:8px;">
            ${winner === 'player' ? 'You Win!' : winner === 'ai' ? (isMp ? 'Opponent Wins!' : 'AI Wins!') : "It's a Draw!"}
          </div>
          <div style="color:var(--text-secondary);margin-bottom:24px;">
            Final Score: ${scores.player} – ${scores.ai}
          </div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            ${(!isMp || isHost) ? `<button class="btn btn-primary" id="play-again-btn">Play Again</button>` : `<div style="color:var(--text-muted)">Waiting for host to replay...</div>`}
            <button class="btn btn-ghost" id="exit-btn">Exit</button>
          </div>
        </div>
      </div>
    `;
    const replayBtn = container.querySelector('#play-again-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        if (isMp && channel) channel.send({ type: 'broadcast', event: 'new_game' });
        if (isMp) { initHost(); startGame(); }
        else startGame();
      });
    }
    container.querySelector('#exit-btn').addEventListener('click', handleExit);
  }

  if (!isMp) {
    initHost();
    startGame();
  } else {
    render(); // show waiting text
  }
}
