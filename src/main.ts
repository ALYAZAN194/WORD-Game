import './style.css';
import {
  MAX_ATTEMPTS,
  WORD_LENGTH,
  type Difficulty,
  getDailyWord,
  getRandomWord,
  evaluateGuess
} from './game';

type Screen = 'menu' | 'game';
type GameMode = 'random' | 'daily';
type GameStatus = 'playing' | 'won' | 'lost';

type SaveEntry = {
  date: string;
  score: number;
  difficulty: Difficulty;
  mode: GameMode;
};

const app = document.querySelector('#app') as HTMLElement;
const BEST_SCORE_KEY = 'word-best-score';
const BEST_RESULTS_KEY = 'word-best-results';

const state = {
  screen: 'menu' as Screen,
  difficulty: 'easy' as Difficulty,
  mode: 'random' as GameMode,
  selectedWord: '',
  currentGuess: '',
  currentRow: 0,
  guesses: Array.from({ length: MAX_ATTEMPTS }, () => ''),
  results: [] as Array<Array<{ letter: string; status: 'correct' | 'present' | 'absent' }>>,
  keyboardStatus: {} as Record<string, 'correct' | 'present' | 'absent'>,
  status: 'playing' as GameStatus,
  score: 0,
  bestScore: Number(localStorage.getItem(BEST_SCORE_KEY) ?? 0),
  bestResults: getSavedResults()
};

function getSavedResults(): SaveEntry[] {
  try {
    const raw = localStorage.getItem(BEST_RESULTS_KEY);
    return raw ? (JSON.parse(raw) as SaveEntry[]) : [];
  } catch {
    return [];
  }
}

function saveBestResults() {
  localStorage.setItem(BEST_RESULTS_KEY, JSON.stringify(state.bestResults.slice(0, 8)));
}

function saveBestScore() {
  localStorage.setItem(BEST_SCORE_KEY, String(state.bestScore));
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildBoardMarkup() {
  const rows = [] as string[];

  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    const guess = state.guesses[row] || '';
    const result = state.results[row] || [];

    const cells = Array.from({ length: WORD_LENGTH }, (_, col) => {
      const letter = guess[col] ?? '';
      const rowResult = result[col] ?? null;
      const statusClass = rowResult ? `tile-${rowResult.status}` : '';
      const activeClass = row === state.currentRow && state.screen === 'game' && col < state.currentGuess.length ? 'tile-active' : '';
      return `<div class="tile ${statusClass} ${activeClass}">${letter}</div>`;
    }).join('');

    rows.push(`<div class="row">${cells}</div>`);
  }

  return rows.join('');
}

function buildKeyboardMarkup() {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
  ];

  return rows
    .map((row) => {
      const buttons = row
        .map((key) => {
          const letter = key === 'ENTER' || key === 'DEL' ? key : key;
          const status = key === 'ENTER' || key === 'DEL' ? '' : (state.keyboardStatus[letter] ?? '');
          const className = key === 'ENTER' || key === 'DEL' ? 'key key-wide' : `key key-${status}`;
          return `<button class="${className}" data-key="${key}">${key === 'DEL' ? '⌫' : key}</button>`;
        })
        .join('');

      return `<div class="keyboard-row">${buttons}</div>`;
    })
    .join('');
}

function renderMenu() {
  app.innerHTML = `
    <div class="app-shell">
      <div class="menu-card">
        <div class="brand-wrap">
          <div class="brand-badge">W</div>
          <div>
            <p class="eyebrow">لعبة تخمين الكلمات</p>
            <h1>WORD</h1>
          </div>
        </div>

        <p class="subtitle">اختر مستوى الصعوبة ثم ابدأ التحدي</p>

        <div class="difficulty-panel">
          <button class="difficulty-btn ${state.difficulty === 'easy' ? 'active' : ''}" data-difficulty="easy">سهل</button>
          <button class="difficulty-btn ${state.difficulty === 'medium' ? 'active' : ''}" data-difficulty="medium">متوسط</button>
          <button class="difficulty-btn ${state.difficulty === 'hard' ? 'active' : ''}" data-difficulty="hard">صعب</button>
        </div>

        <div class="action-row">
          <button class="primary-btn" id="play-btn">Play</button>
          <button class="secondary-btn" id="daily-btn">Daily Challenge</button>
        </div>

        <div class="stats-panel">
          <div class="stat-box">
            <span>أفضل نتيجة</span>
            <strong>${state.bestScore}</strong>
          </div>
          <div class="stat-box">
            <span>آخر النتائج</span>
            <strong>${state.bestResults.length}</strong>
          </div>
        </div>

        <div class="history-box">
          <h3>سجل أفضل النتائج</h3>
          ${
            state.bestResults.length
              ? state.bestResults
                  .slice(0, 5)
                  .map(
                    (item) => `<div class="history-item"><span>${item.date}</span><span>${item.score} نقطة</span></div>`
                  )
                  .join('')
              : '<p class="empty-state">لا توجد نتائج بعد</p>'
          }
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.difficulty-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-difficulty') as Difficulty;
      state.difficulty = value;
      renderMenu();
    });
  });

  document.getElementById('play-btn')?.addEventListener('click', () => {
    state.mode = 'random';
    startGame();
  });

  document.getElementById('daily-btn')?.addEventListener('click', () => {
    state.mode = 'daily';
    startGame();
  });
}

function renderGame() {
  app.innerHTML = `
    <div class="game-shell">
      <header class="topbar">
        <button class="ghost-btn" id="home-btn">الرئيسية</button>
        <div class="header-title">WORD</div>
        <div class="score-box">النقاط: <strong>${state.score}</strong></div>
      </header>

      <div class="status-bar">
        <span class="pill">${state.mode === 'daily' ? 'Daily Challenge' : 'Random Mode'}</span>
        <span class="pill soft">${state.difficulty}</span>
      </div>

      <main class="board-panel">
        <div class="board">${buildBoardMarkup()}</div>
      </main>

      <div class="message-box ${state.status !== 'playing' ? 'visible' : ''}">
        ${
          state.status === 'won'
            ? 'أحسنت! لقد فزت!'
            : state.status === 'lost'
              ? `انتهت المحاولات! الكلمة كانت: ${state.selectedWord}`
              : 'اختر الحروف بحذر'
        }
      </div>

      <div class="game-actions">
        <button class="primary-btn" id="new-game-btn">لعبة جديدة</button>
        <button class="secondary-btn" id="back-menu-btn">العودة إلى القائمة</button>
      </div>

      <div class="keyboard">${buildKeyboardMarkup()}</div>
    </div>
  `;

  document.getElementById('home-btn')?.addEventListener('click', () => {
    state.screen = 'menu';
    renderMenu();
  });

  document.getElementById('new-game-btn')?.addEventListener('click', () => {
    startGame();
  });

  document.getElementById('back-menu-btn')?.addEventListener('click', () => {
    state.screen = 'menu';
    renderMenu();
  });

  document.querySelectorAll('.key').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-key') ?? '';
      handleKeyInput(key);
    });
  });

  document.addEventListener('keydown', handleKeyboardInput);
}

function resetState() {
  state.currentGuess = '';
  state.currentRow = 0;
  state.guesses = Array.from({ length: MAX_ATTEMPTS }, () => '');
  state.results = [];
  state.keyboardStatus = {};
  state.status = 'playing';
  state.score = 0;
}

function startGame() {
  resetState();
  state.selectedWord = state.mode === 'daily' ? getDailyWord(state.difficulty) : getRandomWord(state.difficulty);
  state.screen = 'game';
  renderGame();
}

function handleKeyboardInput(event: KeyboardEvent) {
  if (state.screen !== 'game') return;

  const key = event.key.toUpperCase();
  if (key === 'ENTER' || key === 'RETURN') {
    event.preventDefault();
    submitGuess();
    return;
  }

  if (key === 'BACKSPACE' || key === 'DELETE') {
    event.preventDefault();
    deleteLetter();
    return;
  }

  if (/^[A-Z]$/.test(key)) {
    addLetter(key);
  }
}

function handleKeyInput(key: string) {
  if (state.screen !== 'game') return;

  if (key === 'ENTER') {
    submitGuess();
    return;
  }

  if (key === 'DEL') {
    deleteLetter();
    return;
  }

  if (/^[A-Z]$/.test(key)) {
    addLetter(key);
  }
}

function addLetter(letter: string) {
  if (state.status !== 'playing') return;
  if (state.currentGuess.length >= WORD_LENGTH) return;

  state.currentGuess += letter;
  renderGame();
}

function deleteLetter() {
  if (state.status !== 'playing') return;
  state.currentGuess = state.currentGuess.slice(0, -1);
  renderGame();
}

function updateKeyboardStatus(guessResult: Array<{ letter: string; status: 'correct' | 'present' | 'absent' }>) {
  for (const item of guessResult) {
    const existing = state.keyboardStatus[item.letter];
    if (!existing || priority(item.status) > priority(existing)) {
      state.keyboardStatus[item.letter] = item.status;
    }
  }
}

function priority(status: 'correct' | 'present' | 'absent') {
  if (status === 'correct') return 3;
  if (status === 'present') return 2;
  return 1;
}

function submitGuess() {
  if (state.status !== 'playing') return;
  if (state.currentGuess.length !== WORD_LENGTH) {
    return;
  }

  const guess = state.currentGuess.toUpperCase();
  const result = evaluateGuess(state.selectedWord, guess);

  state.guesses[state.currentRow] = guess;
  state.results[state.currentRow] = result;
  updateKeyboardStatus(result);

  if (guess === state.selectedWord) {
    state.status = 'won';
    state.score = Math.max(0, 600 - state.currentRow * 80 + (state.difficulty === 'easy' ? 100 : state.difficulty === 'medium' ? 200 : 300));
    state.bestScore = Math.max(state.bestScore, state.score);

    const entry: SaveEntry = {
      date: formatDateKey(new Date()),
      score: state.score,
      difficulty: state.difficulty,
      mode: state.mode
    };

    state.bestResults = [entry, ...state.bestResults].slice(0, 8);
    saveBestScore();
    saveBestResults();
    renderGame();
    return;
  }

  if (state.currentRow === MAX_ATTEMPTS - 1) {
    state.status = 'lost';
    renderGame();
    return;
  }

  state.currentRow += 1;
  state.currentGuess = '';
  renderGame();
}

function setup() {
  renderMenu();
}

setup();
