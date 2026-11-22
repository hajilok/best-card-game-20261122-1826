// Deterministic real-rules screenshot scene stager for ?shot=table|title|victory|defeat&seed=N.
// Every screenshot plays genuine rules forward via an autopilot so renders match live gameplay 100%.

import { LAYOUT, SUITS } from './config.js';
import { evaluateChainCombos, evaluateCounterClash } from './combos.js';
import { SCREEN_DEFEAT, SCREEN_PLAY, SCREEN_VICTORY } from './rules.js';

/**
 * Tactical autopilot choosing the highest-synergy playable card from hand.
 */
function pickSmartPlayIndex(state) {
  let bestIdx = -1;
  let bestScore = -Infinity;

  state.player.hand.forEach((card, idx) => {
    if (card.cost > state.player.energy) return;
    if (state.player.chain.length >= 3) return;

    const nextChain = [...state.player.chain, card];
    const combo = evaluateChainCombos(nextChain);
    let score = (card.damage ?? 0) * 1.4 + (card.ward ?? 0) * 1.0 + (card.heal ?? 0) * 0.9 + card.value * 0.25;
    score += combo.triggers.length * 7.5;

    const opposed = state.opponent.intents[state.player.chain.length];
    if (opposed && opposed.revealed) {
      const clash = evaluateCounterClash(card, opposed.card);
      if (clash) score += (clash.suitCounter ? 9 : 4);
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
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
    for (let turn = 0; turn < 24 && engine.state.screen === SCREEN_PLAY; turn += 1) {
      while (engine.state.player.chain.length < 3) {
        const idx = pickSmartPlayIndex(engine.state);
        if (idx < 0) break;
        engine.playCardFromHand(idx, true);
      }
      engine.endTurn(true);
    }
    // Step confetti slightly so the golden flourish is mid-bloom
    for (let f = 0; f < 36; f += 1) anim.step(1 / 60);
    return;
  }

  if (shotName === 'defeat') {
    // Face Lady Cinder: play 1 opening turn actively so realistic damage/combo stats record, then fall to her assault
    engine.startDuel(1, seed, true);
    for (let turn = 0; turn < 24 && engine.state.screen === SCREEN_PLAY; turn += 1) {
      if (turn === 0) {
        for (let s = 0; s < 2; s += 1) {
          const idx = pickSmartPlayIndex(engine.state);
          if (idx < 0) break;
          engine.playCardFromHand(idx, true);
        }
      }
      engine.endTurn(true);
    }
    for (let f = 0; f < 40; f += 1) anim.step(1 / 60);
    return;
  }

  // Default: 'table' — thrilling mid-duel Cover shot showing both hands, telegraphed intent,
  // active 2-card Ritual Chain combo + counter clash, readable values/suits/costs, HP/Ward/Score!
  engine.startDuel(0, seed, true);

  // Play 1 full turn so HP, Ward, Discard, and Score show dynamic mid-match progress
  if (engine.state.screen === SCREEN_PLAY) {
    while (engine.state.player.chain.length < 3) {
      const idx = pickSmartPlayIndex(engine.state);
      if (idx < 0) break;
      engine.playCardFromHand(idx, true);
    }
    engine.endTurn(true);
  }

  // On Turn 2, stage 2 synergistic cards into the center chain while keeping a lush hand visible
  if (engine.state.screen === SCREEN_PLAY) {
    for (let step = 0; step < 2; step += 1) {
      const idx = pickSmartPlayIndex(engine.state);
      if (idx < 0) break;
      engine.playCardFromHand(idx, true);
    }
    // Highlight the best remaining playable card as hovered so hover-lift + preview glow shines
    const nextIdx = pickSmartPlayIndex(engine.state);
    if (nextIdx >= 0) {
      engine.state.hoveredHandIndex = nextIdx;
    }
    engine.syncCardTargets(true);

    // Add live combo arc & shockwave glow between the staged chain cards
    if (engine.state.player.chain.length >= 2) {
      const s0 = LAYOUT.playerChainSlots[0];
      const s1 = LAYOUT.playerChainSlots[1];
      const col = SUITS[engine.state.player.chain[1].suit].bright;
      anim.triggerComboArc(s0.x, s0.y, s1.x, s1.y, col, '');
      anim.triggerSnapImpact(s1.x, s1.y, col, 1.0);
    }
    for (let f = 0; f < 10; f += 1) anim.step(1 / 60);
  }
}
