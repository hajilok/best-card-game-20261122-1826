// Deterministic real-rules screenshot scene stager for ?shot=table|title|victory|defeat&seed=N.

import { LAYOUT, SUITS } from './config.js';
import { evaluateChainCombos, evaluateCounterClash } from './combos.js';
import { SCREEN_PLAY } from './rules.js';

function pickSmartPlayIndex(state, offensiveBias = false) {
  let bestIdx = -1;
  let bestScore = -Infinity;
  state.player.hand.forEach((card, idx) => {
    if (card.cost > state.player.energy || state.player.chain.length >= 3) return;
    const nextChain = [...state.player.chain, card];
    const combo = evaluateChainCombos(nextChain, state.relic.id);
    let score = (card.damage ?? 0) * (offensiveBias ? 2.1 : 1.4) + (card.ward ?? 0) * (offensiveBias ? 0.1 : 1.0) + (card.heal ?? 0) * (offensiveBias ? 0.1 : 0.9) + card.value * 0.25;
    score += combo.triggers.length * 7.5;
    const opp = state.opponent.intents[state.player.chain.length];
    if (opp && opp.revealed) {
      const clash = evaluateCounterClash(card, opp.card);
      if (clash) score += clash.suitCounter ? 9 : 4;
    }
    if (score > bestScore) { bestScore = score; bestIdx = idx; }
  });
  return bestIdx;
}

export function stageScreenshotScene(shotName, seed, engine, anim) {
  if (shotName === 'title') {
    engine.openTitle(seed);
    engine.state.time = 1.2;
    return;
  }

  if (shotName === 'victory') {
    engine.startDuel(0, seed, true);
    for (let t = 0; t < 24 && engine.state.screen === SCREEN_PLAY; t += 1) {
      while (engine.state.player.chain.length < 3) {
        const idx = pickSmartPlayIndex(engine.state, false);
        if (idx < 0) break;
        engine.playCardFromHand(idx, true);
      }
      engine.endTurn(true);
    }
    for (let f = 0; f < 34; f += 1) anim.step(1 / 60);
    return;
  }

  if (shotName === 'defeat') {
    // Hard-fought duel vs Lady Cinder: play Turn 1 combo chain so authentic combos/counters/damage record,
    // then get overwhelmed by Lady Cinder's fiery Solar Kindle assault!
    engine.startDuel(1, seed, true);
    for (let t = 0; t < 24 && engine.state.screen === SCREEN_PLAY; t += 1) {
      if (t === 0) {
        for (let s = 0; s < 3; s += 1) {
          const idx = pickSmartPlayIndex(engine.state, true);
          if (idx < 0) break;
          engine.playCardFromHand(idx, true);
        }
      }
      engine.endTurn(true);
    }
    for (let f = 0; f < 38; f += 1) anim.step(1 / 60);
    return;
  }

  // Default: 'table' — thrilling Turn 2 Cover shot with active 2-card chain, kinetic swoosh + outer snap ring,
  // counter-clash reduction badge, suit-aura hidden card, and hovered finisher casting golden preview arc into Slot 3!
  engine.startDuel(0, seed, true);
  if (engine.state.screen === SCREEN_PLAY) {
    while (engine.state.player.chain.length < 3) {
      const idx = pickSmartPlayIndex(engine.state, false);
      if (idx < 0) break;
      engine.playCardFromHand(idx, true);
    }
    engine.endTurn(true);
  }

  if (engine.state.screen === SCREEN_PLAY) {
    for (let step = 0; step < 2; step += 1) {
      const idx = pickSmartPlayIndex(engine.state, false);
      if (idx < 0) break;
      engine.playCardFromHand(idx, true);
    }
    const nextIdx = pickSmartPlayIndex(engine.state, false);
    if (nextIdx >= 0) {
      engine.state.hoveredHandIndex = nextIdx;
      const a = anim.cards.get(engine.state.player.hand[nextIdx].uid);
      if (a) { a.tiltX = -0.32; a.tiltY = -0.18; }
    }
    engine.syncCardTargets(true);

    if (engine.state.player.chain.length >= 2) {
      const s0 = LAYOUT.playerChainSlots[0];
      const s1 = LAYOUT.playerChainSlots[1];
      const col = SUITS[engine.state.player.chain[1].suit].bright;
      anim.triggerMotionSwoosh(LAYOUT.playerHandCenterX - 30, LAYOUT.playerHandY - 50, s1.x, s1.y + 38, col);
      anim.triggerComboArc(s0.x + 48, s0.y, s1.x - 48, s1.y, col, '');
      anim.triggerSnapImpact(s1.x, s1.y, col, 1.0);
    }
    for (let f = 0; f < 8; f += 1) anim.step(1 / 60);
  }
}
