// Deterministic seeded pseudo-random generator (Mulberry32) for reproducible duels and screenshots.

export function createRng(seed = 1) {
  let state = (Math.floor(seed) >>> 0) || 1;

  function nextFloat() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(maxExclusive) {
    return Math.floor(nextFloat() * maxExclusive);
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = nextInt(i + 1);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function pick(items) {
    return items[nextInt(items.length)];
  }

  return { nextFloat, nextInt, shuffle, pick };
}
