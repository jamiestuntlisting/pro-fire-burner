const STORAGE_KEY = 'highscores:main';

function getStorage() {
  if (typeof window !== 'undefined' && window.storage) {
    return window.storage;
  }
  return {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = value; },
  };
}

export function loadHighScores() {
  try {
    const storage = getStorage();
    const data = storage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveHighScores(scores) {
  try {
    const storage = getStorage();
    const sorted = scores.sort((a, b) => b.totalScore - a.totalScore).slice(0, 20);
    storage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    return true;
  } catch {
    return false;
  }
}

export function addHighScore(entry) {
  const scores = loadHighScores();
  scores.push(entry);
  return saveHighScores(scores);
}

export function isHighScore(score) {
  const scores = loadHighScores();
  if (scores.length < 20) return true;
  return score > scores[scores.length - 1].totalScore;
}
