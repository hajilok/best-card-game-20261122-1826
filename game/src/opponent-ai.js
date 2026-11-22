// Smart AI rival planner: selects 2 telegraphed cards from its real hand using combo & counter heuristics.

import { SUITS } from './config.js';
import { evaluateChainCombos } from './combos.js';

/**
 * Plan the opponent's upcoming turn from their actual hand (respecting Aether budget).
 * Card 0 is telegraphed face-up (fully readable so the player can counter it);
 * Card 1 is placed face-down with its suit aura visible as a tell (or revealed by Eclipse).
 */
export function planOpponentTurn(opponentState, playerState, rivalProfile, maxEnergy = 4) {
  const hand = opponentState.hand;
  if (hand.length === 0) return [];

  const candidates = [];

  // Single-card plays
  for (let i = 0; i < hand.length; i += 1) {
    if (hand[i].cost <= maxEnergy) {
      candidates.push([hand[i]]);
    }
  }

  // Two-card combinations within Aether budget
  for (let i = 0; i < hand.length; i += 1) {
    for (let j = i + 1; j < hand.length; j += 1) {
      if (hand[i].cost + hand[j].cost <= maxEnergy) {
        candidates.push([hand[i], hand[j]]);
        candidates.push([hand[j], hand[i]]);
      }
    }
  }

  if (candidates.length === 0) {
    // Always guarantee at least the cheapest card can be staged
    const cheapest = hand.slice().sort((a, b) => a.cost - b.cost)[0];
    return [{ card: cheapest, revealed: true }];
  }

  let bestPlan = candidates[0];
  let bestScore = -Infinity;

  for (const plan of candidates) {
    const score = scoreOpponentPlan(plan, opponentState, playerState, rivalProfile);
    if (score > bestScore) {
      bestScore = score;
      bestPlan = plan;
    }
  }

  return bestPlan.map((card, idx) => ({
    card,
    revealed: idx === 0,
  }));
}

function scoreOpponentPlan(plan, opponentState, playerState, rivalProfile) {
  const combo = evaluateChainCombos(plan);
  let damage = combo.damage + combo.pierceDamage;
  let ward = combo.ward;
  let heal = combo.heal;
  let valueSum = 0;

  for (const card of plan) {
    damage += card.damage ?? 0;
    ward += card.ward ?? 0;
    heal += card.heal ?? 0;
    valueSum += card.value;
  }

  const lowHp = opponentState.hp <= 12;
  const lethal = damage >= playerState.hp + playerState.ward;
  const style = rivalProfile?.style ?? 'balanced';

  let weightDmg = style === 'aggressive' ? 1.55 : style === 'tactical' ? 1.3 : 1.15;
  let weightWard = lowHp ? 1.5 : style === 'balanced' ? 1.05 : 0.75;
  let weightHeal = opponentState.hp < opponentState.maxHp - 4 ? 1.25 : 0.35;

  let score = damage * weightDmg + ward * weightWard + heal * weightHeal + valueSum * 0.35;
  score += combo.triggers.length * 4.2;
  if (lethal) score += 28;

  // Prefer revealing a bold readable signature card in slot 0
  const leadSuit = SUITS[plan[0].suit];
  if (rivalProfile && leadSuit.shape === rivalProfile.emblem) score += 1.4;
  return score;
}
