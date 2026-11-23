// Smart AI rival planner: selects 2 telegraphed cards from its real hand using combo & passive heuristics.

import { SUITS } from './config.js';
import { evaluateChainCombos } from './combos.js';

export function computeRivalPassiveBonus(rivalProfile, intents) {
  if (!rivalProfile?.passive || intents.length === 0) return { leadBonusDmg: 0, hiddenBonusDmg: 0, startWard: 0 };
  const pid = rivalProfile.passive.id;
  return {
    startWard: pid === 'brass_aegis' ? 2 : 0,
    leadBonusDmg: pid === 'solar_kindle' && intents[0]?.card.suit === 'solar' ? 3 : 0,
    hiddenBonusDmg: pid === 'eclipse_veil' && intents[1] && !intents[1].revealed ? 2 : 0,
  };
}

export function planOpponentTurn(opponentState, playerState, rivalProfile, maxEnergy = 4) {
  const hand = opponentState.hand;
  if (hand.length === 0) return [];

  const candidates = [];
  for (let i = 0; i < hand.length; i += 1) {
    if (hand[i].cost <= maxEnergy) candidates.push([hand[i]]);
  }
  for (let i = 0; i < hand.length; i += 1) {
    for (let j = i + 1; j < hand.length; j += 1) {
      if (hand[i].cost + hand[j].cost <= maxEnergy) {
        candidates.push([hand[i], hand[j]], [hand[j], hand[i]]);
      }
    }
  }

  if (candidates.length === 0) {
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

  return bestPlan.map((card, idx) => ({ card, revealed: idx === 0 }));
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

  if (rivalProfile?.passive?.id === 'solar_kindle' && plan[0].suit === 'solar') damage += 3;
  if (rivalProfile?.passive?.id === 'eclipse_veil' && plan.length > 1) damage += 2;

  const lowHp = opponentState.hp <= 14;
  const lethal = damage >= playerState.hp + playerState.ward;
  const style = rivalProfile?.style ?? 'balanced';
  const weightDmg = style === 'aggressive' ? 1.55 : style === 'tactical' ? 1.3 : 1.15;
  const weightWard = lowHp ? 1.5 : style === 'balanced' ? 1.05 : 0.75;
  const weightHeal = opponentState.hp < opponentState.maxHp - 4 ? 1.25 : 0.35;

  let score = damage * weightDmg + ward * weightWard + heal * weightHeal + valueSum * 0.35 + combo.triggers.length * 4.2;
  if (lethal) score += 28;
  if (rivalProfile && SUITS[plan[0].suit].shape === rivalProfile.emblem) score += 1.4;
  return score;
}
