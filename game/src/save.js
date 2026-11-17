// HIVEWARDEN — best-stats persistence in localStorage.
const KEY = 'hivewarden.best.v1';

export function loadBest() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (typeof b !== 'object' || !b) return null;
    return b;
  } catch (e) {
    return null;
  }
}

export function saveBest(best) {
  try {
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch (e) {
    // Storage unavailable (private mode, etc.) — the game still works.
  }
}

// Merge a finished run into the best record. Returns the merged record.
export function recordRun(run) {
  const prev = loadBest() || {
    bestScore: 0,
    furthestDay: 0,
    hivesSaved: 0,
    victories: 0,
    totalBanished: 0,
    bestChain: 0,
    gamesPlayed: 0,
  };
  const next = {
    bestScore: Math.max(prev.bestScore, run.score || 0),
    furthestDay: Math.max(prev.furthestDay, run.dayReached || 0),
    hivesSaved: prev.hivesSaved + (run.victory ? 1 : 0),
    victories: prev.victories + (run.victory ? 1 : 0),
    totalBanished: prev.totalBanished + (run.banished || 0),
    bestChain: Math.max(prev.bestChain, run.bestChain || 0),
    gamesPlayed: prev.gamesPlayed + 1,
  };
  saveBest(next);
  return next;
}
