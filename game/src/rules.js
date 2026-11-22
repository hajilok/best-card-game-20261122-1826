// Core Sunstone Gambit duel engine: turns, hand/deck cycling, chain resolution, counters, and scoring.

import { CARD, LAYOUT, RULES, SUITS } from './config.js';
import { createRng } from './rng.js';
import { buildStandardDeck, resetCardUidCounter, RIVALS } from './cards.js';
import { evaluateChainCombos, evaluateCounterClash } from './combos.js';
import { planOpponentTurn } from './opponent-ai.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';

export function computeHandLayout(count, centerX, baseY, scale = 1, maxSpread = 560, isOpponent = false) {
  const slots = [];
  if (count <= 0) return slots;
  const step = Math.min(134 * scale, maxSpread / Math.max(1, count - 1));
  const totalWidth = step * (count - 1);
  const startX = centerX - totalWidth / 2;
  const mid = (count - 1) / 2;

  for (let i = 0; i < count; i += 1) {
    const offset = i - mid;
    const x = startX + i * step;
    const arcY = (offset * offset) * (isOpponent ? -3.2 : 4.2) * scale;
    const rot = offset * (isOpponent ? -0.055 : 0.055);
    slots.push({ x, y: baseY + arcY, rot, scale });
  }
  return slots;
}

export function createDuelEngine(anim, audio) {
  const state = {
    screen: SCREEN_TITLE,
    seed: 7,
    rivalIndex: 0,
    rival: RIVALS[0],
    turn: 1,
    phase: 'player', // 'player' | 'resolving'
    score: 0,
    swapsLeft: RULES.swapsPerTurn,
    swapMode: false,
    helpOpen: false,
    selectedHandIndex: -1,
    hoveredHandIndex: -1,
    draggingHandIndex: -1,
    dragX: 0,
    dragY: 0,
    time: 0,
    combosTriggered: 0,
    countersLanded: 0,
    totalDamageDealt: 0,
    bestComboLabel: 'None yet',
    bestChainPower: 0,
    activeCombos: null,
    activeClashes: [],
    resonanceEnergyGranted: false,
    resonanceDrawGranted: false,
    lastTurnSummary: 'Play cards into the Ritual Chain to trigger Combos & Counters.',
    player: makeCombatant(RULES.startingHp),
    opponent: makeCombatant(RIVALS[0].hp),
    resolveQueue: [],
    resolveTimer: 0,
    rng: createRng(7),
  };

  function makeCombatant(maxHp) {
    return {
      hp: maxHp,
      maxHp,
      ward: 0,
      energy: RULES.maxEnergy,
      maxEnergy: RULES.maxEnergy,
      deck: [],
      hand: [],
      chain: [],
      intents: [],
      discard: [],
    };
  }

  function drawCards(combatant, count, owner, instant = false) {
    const drawn = [];
    for (let i = 0; i < count; i += 1) {
      if (combatant.deck.length === 0) {
        if (combatant.discard.length === 0) break;
        combatant.deck = state.rng.shuffle(combatant.discard);
        combatant.discard = [];
      }
      const card = combatant.deck.pop();
      if (!card) break;
      combatant.hand.push(card);
      drawn.push(card);
      const pile = owner === 'player' ? LAYOUT.deckPile : LAYOUT.opponentDeckPile;
      anim.ensureCard(card.uid, pile.x, pile.y, owner === 'player');
      if (!instant && owner === 'player') {
        audio.playDeal(i);
      }
    }
    return drawn;
  }

  function syncCardTargets(instant = false) {
    // Player hand layout
    const pSlots = computeHandLayout(
      state.player.hand.length,
      LAYOUT.playerHandCenterX,
      LAYOUT.playerHandY,
      CARD.handScale,
      540,
      false,
    );
    state.player.hand.forEach((card, i) => {
      const slot = pSlots[i];
      const isDragged = state.draggingHandIndex === i;
      const isHovered = state.hoveredHandIndex === i && !isDragged;
      const isSelected = state.selectedHandIndex === i && !isDragged;
      const neighborPush =
        state.hoveredHandIndex >= 0 && state.hoveredHandIndex !== i && state.draggingHandIndex < 0
          ? Math.sign(i - state.hoveredHandIndex) * Math.max(0, 26 - Math.abs(i - state.hoveredHandIndex) * 8)
          : 0;

      const target = isDragged
        ? {
            tx: state.dragX,
            ty: state.dragY,
            trot: Math.max(-0.22, Math.min(0.22, (state.dragX - slot.x) * 0.0012)),
            tscale: 1.08,
            tflip: 1,
            z: 90,
            glow: 1,
          }
        : {
            tx: slot.x + neighborPush,
            ty: slot.y - (isHovered ? 18 : isSelected ? 14 : 0),
            trot: isHovered || isSelected ? 0 : slot.rot,
            tscale: isHovered ? CARD.hoverScale : isSelected ? 0.94 : slot.scale,
            tflip: 1,
            z: isHovered ? 50 : isSelected ? 40 : 10 + i,
            glow: isHovered || isSelected ? 0.9 : 0,
          };

      anim.ensureCard(card.uid, LAYOUT.deckPile.x, LAYOUT.deckPile.y, true);
      if (instant) anim.snapCardInstant(card.uid, target);
      else anim.setCardTarget(card.uid, target);
    });

    // Player chain cards in center arena
    state.player.chain.forEach((card, i) => {
      const slot = LAYOUT.playerChainSlots[i] ?? LAYOUT.playerChainSlots[2];
      const target = {
        tx: slot.x,
        ty: slot.y,
        trot: (i - 1) * 0.025,
        tscale: CARD.arenaScale,
        tflip: 1,
        z: 22 + i,
        glow: 0.75,
      };
      anim.ensureCard(card.uid, slot.x, slot.y, true);
      if (instant) anim.snapCardInstant(card.uid, target);
      else anim.setCardTarget(card.uid, target);
    });

    // Opponent fanned hand (face down cleanly below top bar)
    const oSlots = computeHandLayout(
      state.opponent.hand.length,
      582,
      LAYOUT.opponentHandY,
      CARD.opponentScale,
      205,
      true,
    );
    state.opponent.hand.forEach((card, i) => {
      const slot = oSlots[i];
      const target = {
        tx: slot.x,
        ty: slot.y,
        trot: slot.rot,
        tscale: slot.scale,
        tflip: 0,
        z: 5 + i,
        glow: 0,
      };
      anim.ensureCard(card.uid, LAYOUT.opponentDeckPile.x, LAYOUT.opponentDeckPile.y, false);
      if (instant) anim.snapCardInstant(card.uid, target);
      else anim.setCardTarget(card.uid, target);
    });

    // Opponent telegraphed intent cards
    state.opponent.intents.forEach((intent, i) => {
      const slot = LAYOUT.opponentIntentSlots[i] ?? LAYOUT.opponentIntentSlots[1];
      const target = {
        tx: slot.x,
        ty: slot.y,
        trot: i === 0 ? -0.015 : 0.02,
        tscale: 0.74,
        tflip: intent.revealed ? 1 : 0,
        z: 18 + i,
        glow: intent.revealed ? 0.65 : 0.35,
      };
      anim.ensureCard(intent.card.uid, LAYOUT.opponentDeckPile.x, LAYOUT.opponentDeckPile.y, intent.revealed);
      if (instant) anim.snapCardInstant(intent.card.uid, target);
      else anim.setCardTarget(intent.card.uid, target);
    });
  }

  function stageOpponentIntents(instant = false) {
    // Draw opponent up to 6 so 2 can be staged as intent and 4 remain visibly fanned in hand
    const needed = Math.max(0, 6 - state.opponent.hand.length);
    drawCards(state.opponent, needed, 'opponent', instant);

    const planned = planOpponentTurn(state.opponent, state.player, state.rival, RULES.maxEnergy);
    state.opponent.intents = [];
    for (const item of planned) {
      const idx = state.opponent.hand.findIndex((c) => c.uid === item.card.uid);
      if (idx !== -1) state.opponent.hand.splice(idx, 1);
      state.opponent.intents.push({
        card: item.card,
        revealed: item.revealed,
      });
    }
  }

  function startDuel(rivalIndex = state.rivalIndex, seed = state.seed, instant = false) {
    resetCardUidCounter();
    anim.reset();
    state.rivalIndex = ((rivalIndex % RIVALS.length) + RIVALS.length) % RIVALS.length;
    state.rival = RIVALS[state.rivalIndex];
    state.seed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 7;
    state.rng = createRng(state.seed + state.rivalIndex * 97);

    state.screen = SCREEN_PLAY;
    state.turn = 1;
    state.phase = 'player';
    state.score = 0;
    state.swapsLeft = RULES.swapsPerTurn;
    state.swapMode = false;
    state.helpOpen = false;
    state.selectedHandIndex = -1;
    state.hoveredHandIndex = -1;
    state.draggingHandIndex = -1;
    state.combosTriggered = 0;
    state.countersLanded = 0;
    state.totalDamageDealt = 0;
    state.bestComboLabel = 'None yet';
    state.bestChainPower = 0;
    state.activeCombos = evaluateChainCombos([]);
    state.activeClashes = [];
    state.resonanceEnergyGranted = false;
    state.resonanceDrawGranted = false;
    state.resolveQueue = [];
    state.resolveTimer = 0;

    state.player = makeCombatant(RULES.startingHp);
    state.opponent = makeCombatant(state.rival.hp);

    const bias = state.rival.id === 'pyromancer' ? 'solar' : state.rival.id === 'sovereign' ? 'eclipse' : 'tide';
    state.player.deck = buildStandardDeck(state.rng, null);
    state.opponent.deck = buildStandardDeck(state.rng, bias);

    drawCards(state.player, RULES.handLimit, 'player', instant);
    stageOpponentIntents(instant);

    state.lastTurnSummary = `Duel begun vs ${state.rival.name}. Read the revealed intent and chain your cards!`;
    syncCardTargets(instant);
    if (!instant) {
      const handUids = state.player.hand.map((c) => c.uid);
      const targets = computeHandLayout(handUids.length, LAYOUT.playerHandCenterX, LAYOUT.playerHandY, CARD.handScale, 540, false)
        .map((s, idx) => ({ tx: s.x, ty: s.y, trot: s.rot, tscale: s.scale, tflip: 1, z: 10 + idx }));
      anim.animateDealHand(handUids, LAYOUT.deckPile.x, LAYOUT.deckPile.y, targets, true);
    }
  }

  function openTitle(seed = state.seed) {
    state.seed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 7;
    state.screen = SCREEN_TITLE;
    state.helpOpen = false;
    anim.reset();
  }

  function canPlayHandIndex(handIndex) {
    if (state.screen !== SCREEN_PLAY || state.phase !== 'player') return false;
    if (handIndex < 0 || handIndex >= state.player.hand.length) return false;
    if (state.player.chain.length >= RULES.chainSlots) return false;
    const card = state.player.hand[handIndex];
    return card.cost <= state.player.energy;
  }

  function recomputeLiveChain(triggerEffects = false, instant = false) {
    const prevCount = state.activeCombos?.triggers.length ?? 0;
    const combo = evaluateChainCombos(state.player.chain);
    state.activeCombos = combo;

    // Recompute clashes against opponent intents
    state.activeClashes = [];
    state.player.chain.forEach((card, i) => {
      const intent = state.opponent.intents[i];
      if (!intent) return;
      const clash = evaluateCounterClash(card, intent.card);
      if (clash && intent.revealed) {
        state.activeClashes.push({ slot: i, ...clash });
      }
    });

    // Grant live mid-turn resonance utilities (Verdant +1 Aether, Tide +1 Card) once per turn
    const anchor = LAYOUT.playerChainSlots[Math.max(0, state.player.chain.length - 1)];
    if (combo.energy > 0 && !state.resonanceEnergyGranted) {
      state.resonanceEnergyGranted = true;
      state.player.energy = Math.min(state.player.maxEnergy + 2, state.player.energy + combo.energy);
      if (!instant) anim.spawnPopup(anchor.x, anchor.y - 54, `+${combo.energy} AETHER`, '#ffc94d', 1.05);
    }
    if (combo.draw > 0 && !state.resonanceDrawGranted) {
      state.resonanceDrawGranted = true;
      drawCards(state.player, combo.draw, 'player', instant);
      if (!instant) anim.spawnPopup(anchor.x, anchor.y - 34, `+${combo.draw} CARD`, '#8ceaff', 0.98);
    }

    if (triggerEffects && !instant) {
      const n = state.player.chain.length;
      if (n >= 2) {
        const s1 = LAYOUT.playerChainSlots[n - 2];
        const s2 = LAYOUT.playerChainSlots[n - 1];
        const newTrigger = combo.triggers.length > prevCount ? combo.triggers[combo.triggers.length - 1] : null;
        const arcColor = newTrigger ? newTrigger.color : SUITS[state.player.chain[n - 1].suit].bright;
        anim.triggerComboArc(s1.x, s1.y, s2.x, s2.y, arcColor, newTrigger ? newTrigger.label : '');
        if (newTrigger) {
          audio.playComboChime(combo.triggers.length);
          anim.showBanner(newTrigger.label, newTrigger.detail, newTrigger.color, 1.35);
        }
      }
    }
  }

  function playCardFromHand(handIndex, instant = false) {
    if (!canPlayHandIndex(handIndex)) return false;
    const [card] = state.player.hand.splice(handIndex, 1);
    const slotIdx = state.player.chain.length;
    state.player.energy -= card.cost;
    state.player.chain.push(card);
    state.selectedHandIndex = -1;
    state.hoveredHandIndex = -1;
    state.draggingHandIndex = -1;
    state.swapMode = false;

    // Immediate tactical utilities (Aether surge, card draw, and Eclipse reveal)
    const slotPos = LAYOUT.playerChainSlots[slotIdx];
    const suit = SUITS[card.suit];

    if (card.energy > 0) {
      state.player.energy = Math.min(state.player.maxEnergy + 2, state.player.energy + card.energy);
      if (!instant) anim.spawnPopup(slotPos.x, slotPos.y - 68, `+${card.energy} AETHER`, '#ffc94d', 1.05);
    }
    if (card.draw > 0) {
      drawCards(state.player, card.draw, 'player', instant);
      if (!instant) anim.spawnPopup(slotPos.x, slotPos.y - 44, `+${card.draw} CARD`, '#8ceaff', 0.95);
    }
    if (card.reveal) {
      let revealedAny = false;
      for (const intent of state.opponent.intents) {
        if (!intent.revealed) {
          intent.revealed = true;
          revealedAny = true;
          if (!instant) {
            anim.animateCardFlip(intent.card.uid, true);
            audio.playCardFlip();
          }
        }
      }
      if (revealedAny && !instant) {
        anim.showBanner('GAMBIT REVEALED!', 'Opponent hidden card exposed', '#d8a8ff', 1.25);
      }
    }

    recomputeLiveChain(true, instant);

    // Check immediate counter visual feedback
    const opposed = state.opponent.intents[slotIdx];
    if (opposed && opposed.revealed) {
      const clash = evaluateCounterClash(card, opposed.card);
      if (clash && !instant) {
        audio.playCounterParry();
        const oSlot = LAYOUT.opponentIntentSlots[slotIdx];
        anim.triggerComboArc(slotPos.x, slotPos.y - 40, oSlot.x, oSlot.y + 40, clash.color, clash.label);
        anim.spawnPopup((slotPos.x + oSlot.x) / 2, (slotPos.y + oSlot.y) / 2, clash.label, clash.color, 1.12);
      }
    }

    if (!instant) {
      audio.playCardSnap(slotIdx);
      anim.triggerSnapImpact(slotPos.x, slotPos.y, suit.color, 0.85 + slotIdx * 0.25);
    }

    state.lastTurnSummary = `Staged ${card.name} (${suit.name} ${card.value}).`;
    syncCardTargets(instant);
    return true;
  }

  function swapHandCard(handIndex, instant = false) {
    if (state.screen !== SCREEN_PLAY || state.phase !== 'player') return false;
    if (state.swapsLeft <= 0) return false;
    if (handIndex < 0 || handIndex >= state.player.hand.length) return false;

    const [discarded] = state.player.hand.splice(handIndex, 1);
    state.player.discard.push(discarded);
    state.swapsLeft -= 1;
    state.swapMode = false;
    state.selectedHandIndex = -1;
    state.hoveredHandIndex = -1;
    drawCards(state.player, 1, 'player', instant);
    if (!instant) {
      audio.playCardFlip();
      anim.spawnPopup(LAYOUT.playerHandCenterX, LAYOUT.playerHandY - 125, 'SWAPPED CARD', '#8ceaff', 0.95);
    }
    state.lastTurnSummary = `Swapped ${discarded.name} for a fresh draw.`;
    syncCardTargets(instant);
    return true;
  }

  function applyDamage(target, amount, pierce, targetX, targetY, instant = false) {
    if (amount <= 0) return 0;
    let remaining = amount;
    if (!pierce && target.ward > 0) {
      const absorbed = Math.min(target.ward, remaining);
      target.ward -= absorbed;
      remaining -= absorbed;
      if (absorbed > 0 && !instant) {
        anim.spawnPopup(targetX + 34, targetY - 12, `-${absorbed} WARD`, '#4cd6ff', 0.92);
      }
    }
    if (remaining > 0) {
      target.hp = Math.max(0, target.hp - remaining);
      if (!instant) {
        anim.spawnPopup(targetX, targetY - 34, `-${remaining} HP`, pierce ? '#df9cff' : '#ff666e', remaining >= 7 ? 1.3 : 1.08);
      }
    }
    return remaining;
  }

  function endTurn(instant = false) {
    if (state.screen !== SCREEN_PLAY || state.phase !== 'player') return false;
    state.phase = 'resolving';
    state.swapMode = false;
    state.selectedHandIndex = -1;
    state.hoveredHandIndex = -1;
    state.draggingHandIndex = -1;
    if (!instant) audio.playTurnEnd();

    // Flip all hidden opponent intents face-up for clash resolution
    for (const intent of state.opponent.intents) {
      if (!intent.revealed) {
        intent.revealed = true;
        if (!instant) {
          anim.animateCardFlip(intent.card.uid, true);
          audio.playCardFlip();
        }
      }
    }
    syncCardTargets(instant);

    const steps = buildTurnResolutionSteps(instant);
    if (instant) {
      for (const fn of steps) {
        fn();
        if (state.screen === SCREEN_VICTORY || state.screen === SCREEN_DEFEAT) break;
      }
    } else {
      state.resolveQueue = steps;
      state.resolveTimer = 0.24;
    }
    return true;
  }

  function buildTurnResolutionSteps(instant) {
    const steps = [];
    const chain = state.player.chain.slice();
    const intents = state.opponent.intents.slice();
    const combo = evaluateChainCombos(chain);
    const opponentPenaltyBySlot = [0, 0];

    // Step 1: Resolve player's chain cards & combos
    steps.push(() => {
      let totalDmg = combo.damage;
      let totalPierce = combo.pierceDamage;
      let totalWard = combo.ward;
      let totalHeal = combo.heal;
      let clashScore = 0;

      chain.forEach((card, i) => {
        if (card.pierce) totalPierce += card.damage ?? 0;
        else totalDmg += card.damage ?? 0;
        totalWard += card.ward ?? 0;
        totalHeal += card.heal ?? 0;

        const opposed = intents[i];
        if (opposed) {
          const clash = evaluateCounterClash(card, opposed.card);
          if (clash) {
            totalDmg += clash.bonusDamage;
            totalWard += clash.bonusWard;
            opponentPenaltyBySlot[i] = clash.opponentPenalty;
            clashScore += clash.scoreBonus;
            state.countersLanded += 1;
          }
        }
      });

      if (combo.triggers.length > 0) {
        state.combosTriggered += combo.triggers.length;
        const primary = combo.triggers[combo.triggers.length - 1];
        const power = totalDmg + totalPierce + totalWard;
        if (power >= state.bestChainPower) {
          state.bestChainPower = power;
          state.bestComboLabel = primary.label;
        }
      }

      // Apply player ward & heal
      if (totalWard > 0) {
        state.player.ward += totalWard;
        if (!instant) {
          audio.playWard();
          anim.spawnPopup(LAYOUT.playerHud.x + 120, LAYOUT.playerHud.y + 18, `+${totalWard} WARD`, '#35c6ff', 1.05);
        }
      }
      if (totalHeal > 0) {
        const before = state.player.hp;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + totalHeal);
        const gained = state.player.hp - before;
        if (gained > 0 && !instant) {
          audio.playHeal();
          anim.spawnPopup(LAYOUT.playerHud.x + 120, LAYOUT.playerHud.y - 10, `+${gained} HP`, '#3be898', 1.05);
        }
      }

      // Deal player damage to opponent
      const oX = LAYOUT.opponentHud.x + LAYOUT.opponentHud.w * 0.55;
      const oY = LAYOUT.opponentHud.y + LAYOUT.opponentHud.h * 0.5;
      const originX = chain.length > 0 ? LAYOUT.playerChainSlots[chain.length - 1].x : LAYOUT.playerHandCenterX;
      const originY = LAYOUT.playerChainSlots[0].y;
      const primaryColor = chain.length > 0 ? SUITS[chain[chain.length - 1].suit].color : '#ffc94d';

      const totalStrike = totalDmg + totalPierce;
      if (totalStrike > 0) {
        if (!instant) {
          anim.triggerAttackBeam(originX, originY - 30, oX, oY, primaryColor, totalStrike >= 9);
          audio.playHit(totalStrike >= 9);
          if (totalStrike >= 9) {
            anim.triggerHitstop(0.065);
            anim.triggerScreenShake(9, 0.26);
          } else {
            anim.triggerScreenShake(4.5, 0.16);
          }
        }
        const hpDealtNormal = applyDamage(state.opponent, totalDmg, false, oX, oY, instant);
        const hpDealtPierce = applyDamage(state.opponent, totalPierce, true, oX + 20, oY - 22, instant);
        state.totalDamageDealt += hpDealtNormal + hpDealtPierce;
      }

      const turnPoints = Math.round(((totalStrike * 28) + totalWard * 12 + combo.scoreBonus + clashScore) * combo.multiplier);
      state.score += turnPoints;

      state.lastTurnSummary = totalStrike > 0
        ? `Your chain dealt ${totalStrike} power & gained ${totalWard} Ward (+${turnPoints} pts).`
        : `Fortified +${totalWard} Ward (+${turnPoints} pts).`;

      if (state.opponent.hp <= 0) {
        triggerVictory(instant);
      }
    });

    // Step 2: Resolve opponent's intent cards if opponent still stands
    steps.push(() => {
      if (state.screen !== SCREEN_PLAY) return;
      const oppCards = intents.map((it) => it.card);
      const oppCombo = evaluateChainCombos(oppCards);

      let oppDmg = oppCombo.damage;
      let oppPierce = oppCombo.pierceDamage;
      let oppWard = oppCombo.ward;
      let oppHeal = oppCombo.heal;

      oppCards.forEach((card, i) => {
        const penalty = opponentPenaltyBySlot[i] ?? 0;
        const rawDmg = Math.max(0, (card.damage ?? 0) - penalty);
        if (card.pierce) oppPierce += rawDmg;
        else oppDmg += rawDmg;
        oppWard += card.ward ?? 0;
        oppHeal += card.heal ?? 0;
      });

      if (oppWard > 0) {
        state.opponent.ward += oppWard;
        if (!instant) {
          audio.playWard();
          anim.spawnPopup(LAYOUT.opponentHud.x + 120, LAYOUT.opponentHud.y + 120, `+${oppWard} WARD`, '#35c6ff', 0.95);
        }
      }
      if (oppHeal > 0) {
        const before = state.opponent.hp;
        state.opponent.hp = Math.min(state.opponent.maxHp, state.opponent.hp + oppHeal);
        const gained = state.opponent.hp - before;
        if (gained > 0 && !instant) {
          anim.spawnPopup(LAYOUT.opponentHud.x + 120, LAYOUT.opponentHud.y + 92, `+${gained} HP`, '#3be898', 0.95);
        }
      }

      const pX = LAYOUT.playerHud.x + LAYOUT.playerHud.w * 0.55;
      const pY = LAYOUT.playerHud.y + LAYOUT.playerHud.h * 0.45;
      const oSlot = LAYOUT.opponentIntentSlots[0];
      const oppStrike = oppDmg + oppPierce;

      if (oppStrike > 0) {
        if (!instant) {
          const beamColor = oppCards.length > 0 ? SUITS[oppCards[0].suit].color : '#ff5d38';
          anim.triggerAttackBeam(oSlot.x, oSlot.y + 30, pX, pY, beamColor, oppStrike >= 9);
          audio.playHit(oppStrike >= 9);
          anim.triggerScreenShake(oppStrike >= 9 ? 8 : 4, 0.22);
        }
        applyDamage(state.player, oppDmg, false, pX, pY, instant);
        applyDamage(state.player, oppPierce, true, pX + 18, pY - 20, instant);
      }

      if (state.player.hp <= 0) {
        triggerDefeat(instant);
      }
    });

    // Step 3: Start next turn cleanly
    steps.push(() => {
      if (state.screen !== SCREEN_PLAY) return;
      state.player.discard.push(...state.player.chain);
      state.player.chain = [];
      state.opponent.discard.push(...state.opponent.intents.map((it) => it.card));
      state.opponent.intents = [];

      // Ward partially decays each round (retains up to 3 Ward for defensive continuity)
      state.player.ward = Math.min(3, Math.floor(state.player.ward * 0.35));
      state.opponent.ward = Math.min(3, Math.floor(state.opponent.ward * 0.35));

      state.turn += 1;
      state.player.energy = state.player.maxEnergy;
      state.swapsLeft = RULES.swapsPerTurn;
      state.activeCombos = evaluateChainCombos([]);
      state.activeClashes = [];
      state.resonanceEnergyGranted = false;
      state.resonanceDrawGranted = false;

      const needPlayer = Math.max(0, RULES.handLimit - state.player.hand.length);
      drawCards(state.player, needPlayer, 'player', instant);
      stageOpponentIntents(instant);

      state.phase = 'player';
      syncCardTargets(instant);
    });

    return steps;
  }

  function triggerVictory(instant = false) {
    state.screen = SCREEN_VICTORY;
    state.phase = 'done';
    state.score += state.player.hp * 25 + Math.max(0, 12 - state.turn) * 60;
    state.lastTurnSummary = `Victory over ${state.rival.name} in ${state.turn} turns!`;
    syncCardTargets(instant);
    anim.triggerVictoryFlourish(1280, 720);
    if (!instant) {
      audio.playVictoryFanfare();
      anim.showBanner('VICTORY!', `${state.rival.name} defeated`, '#ffe078', 2.4);
    }
  }

  function triggerDefeat(instant = false) {
    state.screen = SCREEN_DEFEAT;
    state.phase = 'done';
    state.lastTurnSummary = `${state.rival.name} prevailed on Turn ${state.turn}.`;
    syncCardTargets(instant);
    anim.triggerDefeatEclipse(1280, 720);
    if (!instant) {
      audio.playDefeatChord();
    }
  }

  function step(dt) {
    state.time += dt;
    if (state.phase === 'resolving' && state.resolveQueue.length > 0) {
      state.resolveTimer -= dt;
      if (state.resolveTimer <= 0) {
        const nextFn = state.resolveQueue.shift();
        nextFn();
        state.resolveTimer = 0.42;
      }
    }
    anim.step(dt);
  }

  return {
    state,
    startDuel,
    openTitle,
    canPlayHandIndex,
    playCardFromHand,
    swapHandCard,
    endTurn,
    syncCardTargets,
    step,
  };
}
