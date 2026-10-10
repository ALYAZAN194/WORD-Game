export type GuessResult = {
  letter: string;
  status: 'correct' | 'present' | 'absent';
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export const WORD_BANKS: Record<Difficulty, string[]> = {
  easy: [
    'APPLE', 'BREAD', 'CHAIR', 'DREAM', 'EARTH',
    'FLAME', 'GRAIN', 'HOUSE', 'IMAGE', 'JELLY',
    'KNIFE', 'LEMON', 'MANGO', 'NIGHT', 'OCEAN',
    'PLANT', 'QUEEN', 'ROBOT', 'STONE', 'TRAIL',
    'UNITY', 'VOICE', 'WATER', 'YOUNG', 'ZEBRA'
  ],
  medium: [
    'AMBER', 'BLOOM', 'CROWN', 'DRIFT', 'EMBER',
    'FABLE', 'GHOST', 'HONEY', 'IVORY', 'JOKER',
    'KNOCK', 'LASER', 'MUSIC', 'NOBLE', 'OASIS',
    'PILOT', 'QUEST', 'RIVER', 'SHINE', 'THORN',
    'ULTRA', 'VIVID', 'WHALE', 'XENON', 'YIELD'
  ],
  hard: [
    'AURORA', 'BREEZE', 'CRYPTO', 'DIVERSE', 'ECHOED',
    'FALCON', 'GLACIER', 'HARBOR', 'INVOKE', 'JUNGLE',
    'KERNEL', 'LANTERN', 'MIRROR', 'NEXUS', 'ORCHID',
    'PUBLISH', 'QUARTZ', 'RADIANT', 'SAPPHIRE', 'TENSION',
    'UNITYX', 'VECTOR', 'WIZARD', 'XYLENE', 'YACHTS'
  ]
};

export const MAX_ATTEMPTS = 6;
export const WORD_LENGTH = 5;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getRandomWord(difficulty: Difficulty): string {
  const list = WORD_BANKS[difficulty];
  const index = Math.floor(Math.random() * list.length);
  return list[index].toUpperCase();
}

export function getDailyWord(difficulty: Difficulty, date = new Date()): string {
  const key = `${date.toISOString().slice(0, 10)}:${difficulty}`;
  const list = WORD_BANKS[difficulty];
  const index = hashString(key) % list.length;
  return list[index].toUpperCase();
}

export function evaluateGuess(target: string, guess: string): GuessResult[] {
  const result: GuessResult[] = Array.from({ length: guess.length }, (_, index) => ({
    letter: guess[index],
    status: 'absent'
  }));

  const remaining = new Map<string, number>();

  for (let i = 0; i < target.length; i++) {
    const letter = target[i];
    remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
  }

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      result[i].status = 'correct';
      remaining.set(guess[i], (remaining.get(guess[i]) ?? 1) - 1);
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i].status === 'correct') continue;

    const letter = guess[i];
    const count = remaining.get(letter) ?? 0;

    if (count > 0) {
      result[i].status = 'present';
      remaining.set(letter, count - 1);
    }
  }

  return result;
}
