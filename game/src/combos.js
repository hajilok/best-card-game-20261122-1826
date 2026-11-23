// Multi-axis combo evaluation: Suit Resonance, Value Pairs/Cascades, Slot-3 Finisher, Relics & Counter-Clashes.

import { SUITS } from './config.js';

export function evaluateFinisherBonus(chainCards) {
  if (chainCards.length < 3) return null;
  const third = chainCards[2];
  const isOffensive = (third.damage ?? 0) >= (third.ward ?? 0);
  return {
    id: 'finisher_slot3',
    label: `FINISHER · ${third.name.toUpperCase()}`,
    detail: isOffensive ? '+3 Strike · ×1.25 Score' : '+3 Ward · ×1.25 Score',
    damage: isOffensive && !third.pierce ? 3 : 0,
    pierceDamage: isOffensive && third.pierce ? 3 : 0,
    ward: isOffensive ? 0 : 3,
    scoreBonus: 130,
    multiplierAdd: 0.25,
    color: '#ffe285',
  };
}

export function evaluateChainCombos(chainCards, relicId = null) {
  const bonuses = {
    damage: 0, pierceDamage: 0, ward: 0, heal: 0, draw: 0, energy: 0,
    scoreBonus: 0, multiplier: 1, triggers: [],
  };
  if (chainCards.length < 2) return bonuses;

  // 1. Suit Resonance (2 or 3 cards sharing the same suit)
  const suitCounts = new Map();
  for (const card of chainCards) suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1);
  for (const [suitId, count] of suitCounts.entries()) {
    if (count < 2) continue;
    const suit = SUITS[suitId];
    const scale = count === 3 ? 2 : 1;
    bonuses.multiplier += count === 3 ? 0.5 : 0.25;
    bonuses.scoreBonus += 120 * scale;

    if (suitId === 'solar') {
      bonuses.damage += 4 * scale;
      bonuses.triggers.push({ id: 'resonance_solar', label: count === 3 ? 'TRIPLE SOLAR FLARE' : 'SOLAR FLARE', detail: `+${4 * scale} Burn DMG`, color: suit.color, suit: suitId });
    } else if (suitId === 'tide') {
      bonuses.ward += 4 * scale;
      bonuses.draw += 1;
      bonuses.triggers.push({ id: 'resonance_tide', label: count === 3 ? 'TRIPLE TIDAL AEGIS' : 'TIDAL AEGIS', detail: `+${4 * scale} Ward · +1 Card`, color: suit.color, suit: suitId });
    } else if (suitId === 'verdant') {
      bonuses.heal += 3 * scale;
      bonuses.energy += 1;
      bonuses.triggers.push({ id: 'resonance_verdant', label: count === 3 ? 'TRIPLE BLOOM SURGE' : 'BLOOM SURGE', detail: `+${3 * scale} HP · +1 Aether`, color: suit.color, suit: suitId });
    } else if (suitId === 'eclipse') {
      bonuses.pierceDamage += 4 * scale;
      bonuses.triggers.push({ id: 'resonance_eclipse', label: count === 3 ? 'TOTAL ECLIPSE' : 'UMBRAL PIERCE', detail: `+${4 * scale} Pierce DMG`, color: suit.color, suit: suitId });
    }
  }

  // 2. Value Pair (equal numeric values)
  const valueCounts = new Map();
  for (const card of chainCards) valueCounts.set(card.value, (valueCounts.get(card.value) ?? 0) + 1);
  for (const [val, count] of valueCounts.entries()) {
    if (count < 2) continue;
    bonuses.damage += 3 * (count - 1);
    bonuses.ward += 2 * (count - 1);
    bonuses.scoreBonus += 140 * (count - 1);
    bonuses.multiplier += 0.25;
    bonuses.triggers.push({ id: `pair_${val}`, label: `TWIN ECHO (${val}·${val})`, detail: `+${3 * (count - 1)} DMG · +${2 * (count - 1)} Ward`, color: '#ffc94d', suit: null });
  }

  // 3. Ascending Value Cascade (3 strictly rising values)
  let triggeredPrism = false;
  if (chainCards.length === 3) {
    const [a, b, c] = chainCards;
    if (a.value < b.value && b.value < c.value) {
      bonuses.damage += 5;
      bonuses.scoreBonus += 250;
      bonuses.multiplier += 0.5;
      triggeredPrism = true;
      bonuses.triggers.push({ id: 'cascade', label: `CASCADE ${a.value}→${b.value}→${c.value}`, detail: '+5 Strike · ×1.5 Score', color: '#ffe078', suit: null });
    }
  }

  // 4. Prismatic Triad (3 distinct suits)
  if (chainCards.length === 3 && suitCounts.size === 3) {
    bonuses.damage += 3;
    bonuses.ward += 3;
    bonuses.heal += 2;
    bonuses.scoreBonus += 180;
    triggeredPrism = true;
    bonuses.triggers.push({ id: 'prism', label: 'PRISMATIC TRIAD', detail: '+3 DMG · +3 Ward · +2 HP', color: '#7ef2ff', suit: null });
  }

  // 5. Honest Slot 3 Finisher Bonus
  const finisher = evaluateFinisherBonus(chainCards);
  if (finisher) {
    bonuses.damage += finisher.damage;
    bonuses.pierceDamage += finisher.pierceDamage;
    bonuses.ward += finisher.ward;
    bonuses.scoreBonus += finisher.scoreBonus;
    bonuses.multiplier += finisher.multiplierAdd;
    bonuses.triggers.push(finisher);
  }

  // 6. Sunstone Prism Relic synergy
  if (relicId === 'prism' && triggeredPrism) {
    bonuses.damage += 3;
    bonuses.scoreBonus += 100;
    bonuses.triggers.push({ id: 'relic_prism', label: 'SUNSTONE PRISM', detail: '+3 Relic Strike', color: '#ffd262', suit: null });
  }

  return bonuses;
}

export function evaluateCounterClash(playerCard, opponentCard) {
  if (!playerCard || !opponentCard) return null;
  const pSuit = SUITS[playerCard.suit];
  const suitCounters = pSuit.counterOf === opponentCard.suit;
  const valueBeats = playerCard.value > opponentCard.value;
  if (!suitCounters && !valueBeats) return null;

  const result = {
    suitCounter: suitCounters, valueClashWin: valueBeats,
    bonusDamage: 0, bonusWard: 0, opponentPenalty: 0, scoreBonus: 0,
    label: '', color: pSuit.bright,
  };
  if (suitCounters) {
    result.bonusDamage += 3;
    result.opponentPenalty += 3;
    result.scoreBonus += 160;
    result.label = `${pSuit.name.toUpperCase()} COUNTER!`;
  }
  if (valueBeats) {
    result.bonusWard += 2;
    result.opponentPenalty += 2;
    result.scoreBonus += 90;
    result.label = suitCounters ? 'PERFECT PARRY!' : `VALUE CLASH (${playerCard.value}>${opponentCard.value})`;
  }
  return result;
}

export function previewCardSynergy(candidateCard, currentChain, opponentIntents, relicId = null) {
  const hints = [];
  if (!candidateCard) return hints;

  const nextChain = [...currentChain, candidateCard];
  const prevCombos = evaluateChainCombos(currentChain, relicId);
  const nextCombos = evaluateChainCombos(nextChain, relicId);

  const prevIds = new Set(prevCombos.triggers.map((t) => t.id));
  const added = nextCombos.triggers.filter((t) => !prevIds.has(t.id));
  if (added.length > 0) {
    const nonFinisher = added.find((t) => t.id !== 'finisher_slot3');
    const chosen = nonFinisher ?? added[added.length - 1];
    const suffix = nextChain.length === 3 && chosen.id !== 'finisher_slot3' ? ' · FINISHER!' : '';
    hints.push({ kind: 'combo', label: `${chosen.label}${suffix}`, color: chosen.color });
  }

  const slotIdx = currentChain.length;
  const opposed = opponentIntents[slotIdx];
  if (opposed && opposed.revealed) {
    const clash = evaluateCounterClash(candidateCard, opposed.card);
    if (clash && clash.suitCounter) {
      hints.push({ kind: 'counter', label: clash.label, color: clash.color });
    }
  }
  return hints;
}
