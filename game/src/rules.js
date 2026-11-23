// Core Sunstone Gambit duel engine: turns, Ritual Chain combos, Slot-3 Finishers, Rival Passives, and Relics.

import { CARD, LAYOUT, RULES, SUITS } from './config.js';
import { createRng } from './rng.js';
import { buildStandardDeck, RELICS, resetCardUidCounter, RIVALS } from './cards.js';
import { evaluateChainCombos, evaluateCounterClash } from './combos.js';
import { computeRivalPassiveBonus, planOpponentTurn } from './opponent-ai.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';

export function computeHandLayout(count, centerX, baseY, scale = 1, maxSpread = 520, isOpponent = false) {
  const slots = [];
  if (count <= 0) return slots;
  const step = Math.min(130 * scale, maxSpread / Math.max(1, count - 1));
  const startX = centerX - (step * (count - 1)) / 2;
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i += 1) {
    const offset = i - mid;
    slots.push({
      x: startX + i * step,
      y: baseY + offset * offset * (isOpponent ? -2.8 : 4.0) * scale,
      rot: offset * (isOpponent ? -0.05 : 0.052),
      scale,
    });
  }
  return slots;
}

export class DuelEngine {
  constructor(anim, audio) {
    this.anim = anim;
    this.audio = audio;
    this.state = {
      screen: SCREEN_TITLE, seed: 7, rivalIndex: 0, rival: RIVALS[0],
      relicIndex: 0, relic: RELICS[0], turn: 1, phase: 'player', score: 0,
      swapsLeft: RULES.swapsPerTurn, swapMode: false, helpOpen: false,
      selectedHandIndex: -1, hoveredHandIndex: -1, draggingHandIndex: -1, dragX: 0, dragY: 0,
      time: 0, combosTriggered: 0, countersLanded: 0, totalDamageDealt: 0,
      bestComboLabel: 'None yet', bestChainPower: 0,
      activeCombos: null, activeClashes: [],
      resonanceEnergyGranted: false, resonanceDrawGranted: false,
      compassBonusUsed: false, lensRevealBonus: 0,
      lastTurnSummary: 'Play cards into the Ritual Chain to trigger Combos & Counters.',
      player: this._makeCombatant(RULES.startingHp),
      opponent: this._makeCombatant(RIVALS[0].hp),
      resolveQueue: [], resolveTimer: 0, rng: createRng(7),
    };
  }
  startDuel(rivalIndex = this.state.rivalIndex, seed = this.state.seed, instant = false) {
    const st = this.state;
    resetCardUidCounter();
    this.anim.reset();
    st.rivalIndex = ((rivalIndex % RIVALS.length) + RIVALS.length) % RIVALS.length;
    st.rival = RIVALS[st.rivalIndex];
    st.relic = RELICS[st.relicIndex] ?? RELICS[0];
    st.seed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 7;
    st.rng = createRng(st.seed + st.rivalIndex * 97);
    Object.assign(st, {
      screen: SCREEN_PLAY, turn: 1, phase: 'player', score: 0,
      swapsLeft: RULES.swapsPerTurn, swapMode: false, helpOpen: false,
      selectedHandIndex: -1, hoveredHandIndex: -1, draggingHandIndex: -1,
      combosTriggered: 0, countersLanded: 0, totalDamageDealt: 0,
      bestComboLabel: 'None yet', bestChainPower: 0,
      activeCombos: evaluateChainCombos([], st.relic.id), activeClashes: [],
      resonanceEnergyGranted: false, resonanceDrawGranted: false,
      compassBonusUsed: false, lensRevealBonus: 0,
      resolveQueue: [], resolveTimer: 0,
    });
    st.player = this._makeCombatant(RULES.startingHp);
    st.opponent = this._makeCombatant(st.rival.hp);
    if (st.relic.id === 'lens') st.player.energy += 1; // Eclipse Lens Turn-1 Aether bonus
    const bias = st.rival.id === 'pyromancer' ? 'solar' : st.rival.id === 'sovereign' ? 'eclipse' : 'tide';
    st.player.deck = buildStandardDeck(st.rng, null);
    st.opponent.deck = buildStandardDeck(st.rng, bias);
    this._drawCards(st.player, RULES.handLimit, 'player', instant);
    this._stageOpponentIntents(instant);
    this._applyTurnStartRivalPassive(instant);
    st.lastTurnSummary = `Duel vs ${st.rival.name} (${st.rival.passive.name}: ${st.rival.passive.text}).`;
    this.syncCardTargets(instant);
    if (!instant) {
      const uids = st.player.hand.map((c) => c.uid);
      const targets = computeHandLayout(uids.length, LAYOUT.playerHandCenterX, LAYOUT.playerHandY, CARD.handScale, 480, false)
        .map((s, idx) => ({ tx: s.x, ty: s.y, trot: s.rot, tscale: s.scale, tflip: 1, z: 10 + idx }));
      this.anim.animateDealHand(uids, LAYOUT.deckPile.x, LAYOUT.deckPile.y, targets, true);
    }
  }
  openTitle(seed = this.state.seed) {
    this.state.seed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 7;
    this.state.screen = SCREEN_TITLE;
    this.state.helpOpen = false;
    this.anim.reset();
  }
  canPlayHandIndex(handIndex) {
    const st = this.state;
    if (st.screen !== SCREEN_PLAY || st.phase !== 'player') return false;
    if (handIndex < 0 || handIndex >= st.player.hand.length) return false;
    if (st.player.chain.length >= RULES.chainSlots) return false;
    return st.player.hand[handIndex].cost <= st.player.energy;
  }
  playCardFromHand(handIndex, instant = false) {
    if (!this.canPlayHandIndex(handIndex)) return false;
    const st = this.state;
    const prevAnim = this.anim.cards.get(st.player.hand[handIndex].uid);
    const fromX = prevAnim?.x ?? LAYOUT.playerHandCenterX;
    const fromY = prevAnim?.y ?? LAYOUT.playerHandY;
    const [card] = st.player.hand.splice(handIndex, 1);
    const slotIdx = st.player.chain.length;
    st.player.energy -= card.cost;
    card._retractable = !(card.draw > 0 || card.energy > 0 || card.reveal);
    st.player.chain.push(card);
    st.selectedHandIndex = -1;
    st.hoveredHandIndex = -1;
    st.draggingHandIndex = -1;
    st.swapMode = false;
    const slotPos = LAYOUT.playerChainSlots[slotIdx];
    const suit = SUITS[card.suit];
    if (card.energy > 0) {
      st.player.energy = Math.min(st.player.maxEnergy + 2, st.player.energy + card.energy);
      if (!instant) this.anim.spawnPopup(slotPos.x, slotPos.y - 68, `+${card.energy} AETHER`, '#ffc94d', 1.05);
    }
    if (card.draw > 0) {
      this._drawCards(st.player, card.draw, 'player', instant);
      if (!instant) this.anim.spawnPopup(slotPos.x, slotPos.y - 44, `+${card.draw} CARD`, '#8ceaff', 0.95);
    }
    if (card.reveal) {
      let revealedAny = false;
      for (const intent of st.opponent.intents) {
        if (!intent.revealed) {
          intent.revealed = true;
          revealedAny = true;
          if (!instant) { this.anim.animateCardFlip(intent.card.uid, true); this.audio.playCardFlip(); }
        }
      }
      if (revealedAny) {
        if (st.relic.id === 'lens') st.lensRevealBonus += 2;
        if (!instant) this.anim.showBanner('GAMBIT REVEALED!', st.relic.id === 'lens' ? 'Eclipse Lens: +2 DMG' : 'Rival hidden card exposed', '#d8a8ff', 1.25);
      }
    }
    const prevE = st.resonanceEnergyGranted;
    const prevD = st.resonanceDrawGranted;
    const prevC = st.compassBonusUsed;
    this._recomputeLiveChain(true, instant);
    const opposed = st.opponent.intents[slotIdx];
    if (opposed && opposed.revealed) {
      const clash = evaluateCounterClash(card, opposed.card);
      if (clash) {
        if (clash.suitCounter && st.relic.id === 'compass' && !st.compassBonusUsed) {
          st.compassBonusUsed = true;
          st.player.ward += 2;
          st.swapsLeft += 1;
        }
        if (!instant) {
          this.audio.playCounterParry();
          const oSlot = LAYOUT.opponentIntentSlots[slotIdx];
          this.anim.triggerComboArc(slotPos.x, slotPos.y - 42, oSlot.x, oSlot.y + 42, clash.color, clash.label);
          this.anim.spawnPopup((slotPos.x + oSlot.x) / 2, (slotPos.y + oSlot.y) / 2, clash.label, clash.color, 1.1);
        }
      }
    }
    if (st.resonanceEnergyGranted !== prevE || st.resonanceDrawGranted !== prevD || st.compassBonusUsed !== prevC) {
      card._retractable = false;
    }
    if (!instant) {
      this.audio.playCardSnap(slotIdx);
      this.anim.triggerMotionSwoosh(fromX, fromY, slotPos.x, slotPos.y, suit.bright);
      this.anim.triggerSnapImpact(slotPos.x, slotPos.y, suit.color, 0.85 + slotIdx * 0.22);
    }
    st.lastTurnSummary = `Staged ${card.name} (${suit.name} ${card.value}) in Slot ${slotIdx + 1}.`;
    this.syncCardTargets(instant);
    return true;
  }
  retractChainCard(chainIndex, instant = false) {
    const st = this.state;
    if (st.screen !== SCREEN_PLAY || st.phase !== 'player') return false;
    if (chainIndex < 0 || chainIndex >= st.player.chain.length) return false;
    const card = st.player.chain[chainIndex];
    if (!card._retractable) return false;
    st.player.chain.splice(chainIndex, 1);
    st.player.hand.push(card);
    st.player.energy = Math.min(st.player.maxEnergy + 2, st.player.energy + card.cost);
    this._recomputeLiveChain(false, instant);
    if (!instant) {
      this.audio.playCardFlip();
      this.anim.spawnPopup(LAYOUT.playerChainSlots[chainIndex].x, LAYOUT.playerChainSlots[chainIndex].y - 30, 'RETRACTED', '#8ceaff', 0.9);
    }
    st.lastTurnSummary = `Retracted ${card.name} to hand (+${card.cost} Aether refunded).`;
    this.syncCardTargets(instant);
    return true;
  }
  swapHandCard(handIndex, instant = false) {
    const st = this.state;
    if (st.screen !== SCREEN_PLAY || st.phase !== 'player' || st.swapsLeft <= 0) return false;
    if (handIndex < 0 || handIndex >= st.player.hand.length) return false;
    const [discarded] = st.player.hand.splice(handIndex, 1);
    st.player.discard.push(discarded);
    st.swapsLeft -= 1;
    st.swapMode = false;
    st.selectedHandIndex = -1;
    st.hoveredHandIndex = -1;
    this._drawCards(st.player, 1, 'player', instant);
    if (!instant) {
      this.audio.playCardFlip();
      this.anim.spawnPopup(LAYOUT.playerHandCenterX, LAYOUT.playerHandY - 120, 'SWAPPED CARD', '#8ceaff', 0.95);
    }
    st.lastTurnSummary = `Swapped ${discarded.name} for a fresh draw.`;
    this.syncCardTargets(instant);
    return true;
  }
  endTurn(instant = false) {
    const st = this.state;
    if (st.screen !== SCREEN_PLAY || st.phase !== 'player') return false;
    st.phase = 'resolving';
    st.swapMode = false;
    st.selectedHandIndex = -1;
    st.hoveredHandIndex = -1;
    st.draggingHandIndex = -1;
    if (!instant) this.audio.playTurnEnd();
    // Record whether Slot 2 was still hidden for Astral Sovereign's Eclipse Veil passive
    const hiddenStillConcealed = Boolean(st.opponent.intents[1] && !st.opponent.intents[1].revealed);
    for (const intent of st.opponent.intents) {
      if (!intent.revealed) {
        intent.revealed = true;
        if (!instant) { this.anim.animateCardFlip(intent.card.uid, true); this.audio.playCardFlip(); }
      }
    }
    this.syncCardTargets(instant);
    const steps = this._buildResolutionSteps(instant, hiddenStillConcealed);
    if (instant) {
      for (const fn of steps) {
        fn();
        if (st.screen === SCREEN_VICTORY || st.screen === SCREEN_DEFEAT) break;
      }
    } else {
      st.resolveQueue = steps;
      st.resolveTimer = 0.24;
    }
    return true;
  }
  syncCardTargets(instant = false) {
    const st = this.state;
    const pSlots = computeHandLayout(st.player.hand.length, LAYOUT.playerHandCenterX, LAYOUT.playerHandY, CARD.handScale, 480, false);
    st.player.hand.forEach((card, i) => {
      const slot = pSlots[i];
      const dragged = st.draggingHandIndex === i;
      const hovered = st.hoveredHandIndex === i && !dragged;
      const selected = st.selectedHandIndex === i && !dragged;
      const push = st.hoveredHandIndex >= 0 && st.hoveredHandIndex !== i && st.draggingHandIndex < 0
        ? Math.sign(i - st.hoveredHandIndex) * Math.max(0, 22 - Math.abs(i - st.hoveredHandIndex) * 7) : 0;
      const target = dragged
        ? { tx: st.dragX, ty: st.dragY, trot: Math.max(-0.22, Math.min(0.22, (st.dragX - slot.x) * 0.0012)), tscale: 1.05, tflip: 1, z: 90, glow: 1 }
        : { tx: slot.x + push, ty: slot.y - (hovered ? 22 : selected ? 14 : 0), trot: hovered || selected ? 0 : slot.rot, tscale: hovered ? CARD.hoverScale : selected ? 0.94 : slot.scale, tflip: 1, z: hovered ? 50 : selected ? 40 : 10 + i, glow: hovered || selected ? 0.92 : 0 };
      this.anim.ensureCard(card.uid, LAYOUT.deckPile.x, LAYOUT.deckPile.y, true);
      if (instant) this.anim.snapCardInstant(card.uid, target);
      else this.anim.setCardTarget(card.uid, target);
    });
    st.player.chain.forEach((card, i) => {
      const slot = LAYOUT.playerChainSlots[i] ?? LAYOUT.playerChainSlots[2];
      const target = { tx: slot.x, ty: slot.y, trot: (i - 1) * 0.02, tscale: CARD.arenaScale, tflip: 1, z: 22 + i, glow: 0.72 };
      this.anim.ensureCard(card.uid, slot.x, slot.y, true);
      if (instant) this.anim.snapCardInstant(card.uid, target);
      else this.anim.setCardTarget(card.uid, target);
    });
    const oSlots = computeHandLayout(st.opponent.hand.length, 558, LAYOUT.opponentHandY, CARD.opponentScale, 252, true);
    st.opponent.hand.forEach((card, i) => {
      const slot = oSlots[i];
      const target = { tx: slot.x, ty: slot.y, trot: slot.rot, tscale: slot.scale, tflip: 0, z: 5 + i, glow: 0 };
      this.anim.ensureCard(card.uid, LAYOUT.opponentDeckPile.x, LAYOUT.opponentDeckPile.y, false);
      if (instant) this.anim.snapCardInstant(card.uid, target);
      else this.anim.setCardTarget(card.uid, target);
    });
    st.opponent.intents.forEach((intent, i) => {
      const slot = LAYOUT.opponentIntentSlots[i] ?? LAYOUT.opponentIntentSlots[1];
      const target = { tx: slot.x, ty: slot.y, trot: i === 0 ? -0.015 : 0.02, tscale: 0.76, tflip: intent.revealed ? 1 : 0, z: 18 + i, glow: intent.revealed ? 0.65 : 0.45 };
      this.anim.ensureCard(intent.card.uid, LAYOUT.opponentDeckPile.x, LAYOUT.opponentDeckPile.y, intent.revealed);
      if (instant) this.anim.snapCardInstant(intent.card.uid, target);
      else this.anim.setCardTarget(intent.card.uid, target);
    });
  }
  step(dt) {
    const st = this.state;
    st.time += dt;
    if (st.phase === 'resolving' && st.resolveQueue.length > 0) {
      st.resolveTimer -= dt;
      if (st.resolveTimer <= 0) {
        const nextFn = st.resolveQueue.shift();
        nextFn();
        st.resolveTimer = 0.42;
      }
    }
    this.anim.step(dt);
  }
  _makeCombatant(maxHp) {
    return { hp: maxHp, maxHp, ward: 0, energy: RULES.maxEnergy, maxEnergy: RULES.maxEnergy, deck: [], hand: [], chain: [], intents: [], discard: [] };
  }
  _drawCards(combatant, count, owner, instant) {
    for (let i = 0; i < count; i += 1) {
      if (combatant.deck.length === 0) {
        if (combatant.discard.length === 0) break;
        combatant.deck = this.state.rng.shuffle(combatant.discard);
        combatant.discard = [];
      }
      const card = combatant.deck.pop();
      if (!card) break;
      combatant.hand.push(card);
      const pile = owner === 'player' ? LAYOUT.deckPile : LAYOUT.opponentDeckPile;
      this.anim.ensureCard(card.uid, pile.x, pile.y, owner === 'player');
      if (!instant && owner === 'player') this.audio.playDeal(i);
    }
  }
  _stageOpponentIntents(instant) {
    const st = this.state;
    const needed = Math.max(0, 6 - st.opponent.hand.length);
    this._drawCards(st.opponent, needed, 'opponent', instant);
    const planned = planOpponentTurn(st.opponent, st.player, st.rival, RULES.maxEnergy);
    st.opponent.intents = [];
    for (const item of planned) {
      const idx = st.opponent.hand.findIndex((c) => c.uid === item.card.uid);
      if (idx !== -1) st.opponent.hand.splice(idx, 1);
      st.opponent.intents.push({ card: item.card, revealed: item.revealed });
    }
  }
  _applyTurnStartRivalPassive(instant) {
    const st = this.state;
    const bonus = computeRivalPassiveBonus(st.rival, st.opponent.intents);
    if (bonus.startWard > 0) {
      st.opponent.ward += bonus.startWard;
      if (!instant) this.anim.spawnPopup(LAYOUT.opponentHud.x + 130, LAYOUT.opponentHud.y + 112, `+${bonus.startWard} AEGIS`, '#5bd3ff', 0.9);
    }
  }
  _recomputeLiveChain(triggerEffects, instant) {
    const st = this.state;
    const prevCount = st.activeCombos?.triggers.length ?? 0;
    const combo = evaluateChainCombos(st.player.chain, st.relic.id);
    st.activeCombos = combo;
    st.activeClashes = [];
    st.player.chain.forEach((card, i) => {
      const intent = st.opponent.intents[i];
      if (!intent) return;
      const clash = evaluateCounterClash(card, intent.card);
      if (clash && intent.revealed) st.activeClashes.push({ slot: i, ...clash });
    });
    const anchor = LAYOUT.playerChainSlots[Math.max(0, st.player.chain.length - 1)];
    if (combo.energy > 0 && !st.resonanceEnergyGranted) {
      st.resonanceEnergyGranted = true;
      st.player.energy = Math.min(st.player.maxEnergy + 2, st.player.energy + combo.energy);
      if (!instant) this.anim.spawnPopup(anchor.x, anchor.y - 54, `+${combo.energy} AETHER`, '#ffc94d', 1.05);
    }
    if (combo.draw > 0 && !st.resonanceDrawGranted) {
      st.resonanceDrawGranted = true;
      this._drawCards(st.player, combo.draw, 'player', instant);
      if (!instant) this.anim.spawnPopup(anchor.x, anchor.y - 34, `+${combo.draw} CARD`, '#8ceaff', 0.98);
    }
    if (triggerEffects && !instant && st.player.chain.length >= 2) {
      const n = st.player.chain.length;
      const s1 = LAYOUT.playerChainSlots[n - 2];
      const s2 = LAYOUT.playerChainSlots[n - 1];
      const newest = combo.triggers.length > prevCount ? combo.triggers[combo.triggers.length - 1] : null;
      const arcCol = newest ? newest.color : SUITS[st.player.chain[n - 1].suit].bright;
      this.anim.triggerComboArc(s1.x, s1.y, s2.x, s2.y, arcCol, newest ? newest.label : '');
      if (newest) {
        this.audio.playComboChime(combo.triggers.length);
        this.anim.showBanner(newest.label, newest.detail, newest.color, 1.35);
      }
    }
  }
  _applyDamage(target, amount, pierce, tx, ty, instant) {
    if (amount <= 0) return 0;
    let rem = amount;
    if (!pierce && target.ward > 0) {
      const absorbed = Math.min(target.ward, rem);
      target.ward -= absorbed;
      rem -= absorbed;
      if (absorbed > 0 && !instant) this.anim.spawnPopup(tx + 34, ty - 12, `-${absorbed} WARD`, '#4cd6ff', 0.92);
    }
    if (rem > 0) {
      target.hp = Math.max(0, target.hp - rem);
      if (!instant) this.anim.spawnPopup(tx, ty - 34, `-${rem} HP`, pierce ? '#df9cff' : '#ff666e', rem >= 7 ? 1.3 : 1.08);
    }
    return rem;
  }
  _buildResolutionSteps(instant, hiddenStillConcealed) {
    const st = this.state;
    const chain = st.player.chain.slice();
    const intents = st.opponent.intents.slice();
    const combo = evaluateChainCombos(chain, st.relic.id);
    const penaltyBySlot = [0, 0];
    return [
      () => {
        let totalDmg = combo.damage + st.lensRevealBonus;
        let totalPierce = combo.pierceDamage;
        let totalWard = combo.ward;
        let totalHeal = combo.heal;
        let clashScore = 0;
        chain.forEach((card, i) => {
          if (card.pierce) totalPierce += card.damage ?? 0;
          else totalDmg += card.damage ?? 0;
          totalWard += card.ward ?? 0;
          totalHeal += card.heal ?? 0;
          const opp = intents[i];
          if (opp) {
            const clash = evaluateCounterClash(card, opp.card);
            if (clash) {
              totalDmg += clash.bonusDamage;
              totalWard += clash.bonusWard;
              penaltyBySlot[i] = clash.opponentPenalty;
              clashScore += clash.scoreBonus;
              st.countersLanded += 1;
            }
          }
        });
        if (combo.triggers.length > 0) {
          st.combosTriggered += combo.triggers.length;
          const best = combo.triggers.find((t) => t.id === 'cascade' || t.id === 'prism') ?? combo.triggers[combo.triggers.length - 1];
          const power = totalDmg + totalPierce + totalWard;
          if (power >= st.bestChainPower) { st.bestChainPower = power; st.bestComboLabel = best.label; }
        }
        if (totalWard > 0) {
          st.player.ward += totalWard;
          if (!instant) { this.audio.playWard(); this.anim.spawnPopup(LAYOUT.playerHud.x + 125, LAYOUT.playerHud.y + 18, `+${totalWard} WARD`, '#35c6ff', 1.05); }
        }
        if (totalHeal > 0) {
          const gained = Math.min(st.player.maxHp, st.player.hp + totalHeal) - st.player.hp;
          st.player.hp += gained;
          if (gained > 0 && !instant) { this.audio.playHeal(); this.anim.spawnPopup(LAYOUT.playerHud.x + 125, LAYOUT.playerHud.y - 10, `+${gained} HP`, '#3be898', 1.05); }
        }
        const totalStrike = totalDmg + totalPierce;
        const oX = LAYOUT.opponentHud.x + LAYOUT.opponentHud.w * 0.55;
        const oY = LAYOUT.opponentHud.y + LAYOUT.opponentHud.h * 0.5;
        if (totalStrike > 0) {
          if (!instant) {
            const origin = chain.length > 0 ? LAYOUT.playerChainSlots[chain.length - 1] : { x: LAYOUT.playerHandCenterX, y: LAYOUT.playerChainSlots[0].y };
            const col = chain.length > 0 ? SUITS[chain[chain.length - 1].suit].color : '#ffc94d';
            this.anim.triggerAttackBeam(origin.x, origin.y - 28, oX, oY, col, totalStrike >= 9);
            this.audio.playHit(totalStrike >= 9);
            if (totalStrike >= 9) { this.anim.triggerHitstop(0.065); this.anim.triggerScreenShake(9, 0.25); }
          }
          st.totalDamageDealt += this._applyDamage(st.opponent, totalDmg, false, oX, oY, instant) + this._applyDamage(st.opponent, totalPierce, true, oX + 20, oY - 22, instant);
        }
        const pts = Math.round(((totalStrike * 28) + totalWard * 12 + combo.scoreBonus + clashScore) * combo.multiplier);
        st.score += pts;
        st.lastTurnSummary = `Chain dealt ${totalStrike} power & +${totalWard} Ward (+${pts} pts).`;
        if (st.opponent.hp <= 0) this._triggerVictory(instant);
      },
      () => {
        if (st.screen !== SCREEN_PLAY) return;
        const oppCards = intents.map((it) => it.card);
        const oppCombo = evaluateChainCombos(oppCards);
        const passive = computeRivalPassiveBonus(st.rival, intents);
        let oppDmg = oppCombo.damage + passive.leadBonusDmg + (hiddenStillConcealed && st.rival.passive.id === 'eclipse_veil' ? 2 : 0);
        let oppPierce = oppCombo.pierceDamage;
        let oppWard = oppCombo.ward;
        let oppHeal = oppCombo.heal;
        oppCards.forEach((card, i) => {
          const raw = Math.max(0, (card.damage ?? 0) - (penaltyBySlot[i] ?? 0));
          if (card.pierce) oppPierce += raw; else oppDmg += raw;
          oppWard += card.ward ?? 0;
          oppHeal += card.heal ?? 0;
        });
        if (oppWard > 0) st.opponent.ward += oppWard;
        if (oppHeal > 0) st.opponent.hp = Math.min(st.opponent.maxHp, st.opponent.hp + oppHeal);
        const pX = LAYOUT.playerHud.x + LAYOUT.playerHud.w * 0.55;
        const pY = LAYOUT.playerHud.y + LAYOUT.playerHud.h * 0.45;
        const strike = oppDmg + oppPierce;
        if (strike > 0) {
          if (!instant) {
            const oSlot = LAYOUT.opponentIntentSlots[0];
            this.anim.triggerAttackBeam(oSlot.x, oSlot.y + 30, pX, pY, oppCards[0] ? SUITS[oppCards[0].suit].color : '#ff5d38', strike >= 9);
            this.audio.playHit(strike >= 9);
            this.anim.triggerScreenShake(strike >= 9 ? 8 : 4, 0.22);
          }
          this._applyDamage(st.player, oppDmg, false, pX, pY, instant);
          this._applyDamage(st.player, oppPierce, true, pX + 18, pY - 20, instant);
        }
        if (st.player.hp <= 0) this._triggerDefeat(instant);
      },
      () => {
        if (st.screen !== SCREEN_PLAY) return;
        st.player.discard.push(...st.player.chain);
        st.player.chain = [];
        st.opponent.discard.push(...st.opponent.intents.map((it) => it.card));
        st.opponent.intents = [];
        st.player.ward = Math.min(3, Math.floor(st.player.ward * 0.35));
        st.opponent.ward = Math.min(3, Math.floor(st.opponent.ward * 0.35));
        st.turn += 1;
        st.player.energy = st.player.maxEnergy;
        st.swapsLeft = RULES.swapsPerTurn;
        st.activeCombos = evaluateChainCombos([], st.relic.id);
        st.activeClashes = [];
        st.resonanceEnergyGranted = false;
        st.resonanceDrawGranted = false;
        st.compassBonusUsed = false;
        st.lensRevealBonus = 0;
        this._drawCards(st.player, Math.max(0, RULES.handLimit - st.player.hand.length), 'player', instant);
        this._stageOpponentIntents(instant);
        this._applyTurnStartRivalPassive(instant);
        st.phase = 'player';
        this.syncCardTargets(instant);
      },
    ];
  }
  _triggerVictory(instant) {
    const st = this.state;
    st.screen = SCREEN_VICTORY;
    st.phase = 'done';
    st.score += st.player.hp * 25 + Math.max(0, 12 - st.turn) * 60;
    st.lastTurnSummary = `Victory over ${st.rival.name} in ${st.turn} turns!`;
    this.syncCardTargets(instant);
    this.anim.triggerVictoryFlourish(1280, 720);
    if (!instant) { this.audio.playVictoryFanfare(); this.anim.showBanner('VICTORY!', `${st.rival.name} defeated`, '#ffe078', 2.4); }
  }
  _triggerDefeat(instant) {
    const st = this.state;
    st.screen = SCREEN_DEFEAT;
    st.phase = 'done';
    st.lastTurnSummary = `${st.rival.name} prevailed on Turn ${st.turn}.`;
    this.syncCardTargets(instant);
    this.anim.triggerDefeatEclipse(1280, 720);
    if (!instant) this.audio.playDefeatChord();
  }
}

export function createDuelEngine(anim, audio) { return new DuelEngine(anim, audio); }
