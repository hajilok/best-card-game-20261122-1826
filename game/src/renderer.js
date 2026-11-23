// Candlelit observatory tabletop renderer, HUD, clash arena, and thumbnail-proof Title/Victory/Defeat screens.

import { CARD, LAYOUT, PALETTE, SUIT_ORDER, SUITS, VIEW } from './config.js';
import { CARD_CATALOG, RELICS, RIVALS } from './cards.js';
import { previewCardSynergy } from './combos.js';
import { computeRivalPassiveBonus } from './opponent-ai.js';
import { drawCardBack, drawCardFace, drawSuitEmblem, renderCardTransform } from './card-art.js';
import { drawRelicEmblem, drawRivalPortrait, drawStatIcon, drawSunkeeperPortrait } from './portraits.js';
import { SCREEN_DEFEAT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './rules.js';

const HERO_CARDS = ['sol_nova', 'tid_maelstrom', 'ver_bloom', 'ecl_zenith']
  .map((id) => CARD_CATALOG.find((c) => c.id === id));
const FU = 'Trebuchet MS,sans-serif';
const FT = 'Trebuchet MS,Georgia,serif';
const GA = (a) => `rgba(230,190,108,${a})`;
const WA = (a) => `rgba(255,255,255,${a})`;
const IA = (a) => `rgba(248,242,228,${a})`;

export class TableRenderer {
  constructor() {
    this._feltPattern = null;
  }
  render(ctx, state, anim, audio) {
    ctx.save();
    ctx.translate(anim.shake?.ox ?? 0, anim.shake?.oy ?? 0);
    this.drawObservatoryTable(ctx, state.time);
    if (state.screen === SCREEN_TITLE) {
      this.drawTitleScreen(ctx, state);
      ctx.restore();
      return;
    }
    this.drawTopBar(ctx, state, audio);
    this.drawDeckAndDiscard(ctx, state);
    this.drawCombatantHud(ctx, LAYOUT.opponentHud, state.rival.name, state.rival.title, state.opponent, state.rival.accent, false, state);
    this.drawCombatantHud(ctx, LAYOUT.playerHud, 'You · Sunkeeper', state.relic.name, state.player, PALETTE.gold, true, state);
    this.drawClashArena(ctx, state);
    this.drawComboTacticsPanel(ctx, state);
    this.drawActionButtons(ctx, state);
    anim.renderBackEffects(ctx);
    this.drawAllCards(ctx, state, anim);
    this.drawHoverOrDragArc(ctx, state, anim);
    if (state.screen === SCREEN_VICTORY) this.drawVictoryOverlay(ctx, state, anim);
    else if (state.screen === SCREEN_DEFEAT) this.drawDefeatOverlay(ctx, state, anim);
    else {
      anim.renderFrontEffects(ctx);
      if (state.helpOpen) this.drawHelpModal(ctx);
    }
    ctx.restore();
  }
  drawObservatoryTable(ctx, time) {
    const rail = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    rail.addColorStop(0, '#462617'); rail.addColorStop(0.5, '#29150c'); rail.addColorStop(1, '#180c07');
    ctx.fillStyle = rail; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const pad = 14;
    this._roundedRect(ctx, pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2, 22);
    ctx.save();
    ctx.clip();
    const felt = ctx.createRadialGradient(566, 336, 70, 620, 360, 780);
    felt.addColorStop(0, '#1e5445'); felt.addColorStop(0.52, '#0f3028'); felt.addColorStop(1, '#061411');
    ctx.fillStyle = felt; ctx.fillRect(pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2);
    const pat = this._getFeltPattern(ctx);
    if (pat) { ctx.globalAlpha = 0.55; ctx.fillStyle = pat; ctx.fillRect(pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2); ctx.globalAlpha = 1; }
    for (const [lx, ly, rad, a] of [[70, 56, 310, 0.16], [1210, 56, 310, 0.15], [566, 324, 340, 0.08]]) {
      const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, rad);
      g.addColorStop(0, `rgba(255, 198, 108, ${a})`); g.addColorStop(1, 'rgba(255, 198, 108, 0)');
      ctx.fillStyle = g; ctx.fillRect(pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2);
    }
    const cx = 566;
    const cy = 324;
    ctx.strokeStyle = 'rgba(238, 200, 120, 0.22)'; ctx.lineWidth = 1.6;
    for (const r of [122, 206, 298]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(time * 0.025);
    ctx.strokeStyle = 'rgba(238, 200, 120, 0.2)';
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (i % 3 === 0 ? 188 : 196), Math.sin(a) * (i % 3 === 0 ? 188 : 196));
      ctx.lineTo(Math.cos(a) * 206, Math.sin(a) * 206);
      ctx.stroke();
    }
    ctx.restore();
    const div = ctx.createLinearGradient(290, 320, 825, 320);
    div.addColorStop(0, 'rgba(230,190,108,0)'); div.addColorStop(0.5, 'rgba(245,210,130,0.34)'); div.addColorStop(1, 'rgba(230,190,108,0)');
    ctx.strokeStyle = div; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(290, 320); ctx.lineTo(825, 320); ctx.stroke();
    ctx.restore();
    this._panel(ctx, pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2, 22, null, 'rgba(238,198,118,0.58)', 2.6);
    for (const [bx, by, sx, sy] of [[24, 24, 1, 1], [VIEW.width - 24, 24, -1, 1], [24, VIEW.height - 24, 1, -1], [VIEW.width - 24, VIEW.height - 24, -1, -1]]) {
      ctx.save();
      ctx.strokeStyle = PALETTE.goldBright; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by + sy * 22); ctx.lineTo(bx, by); ctx.lineTo(bx + sx * 22, by); ctx.stroke();
      ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(bx + sx * 6, by + sy * 6, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  drawTopBar(ctx, state, audio) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 15, 13, 0.9)';
    ctx.fillRect(14, 14, VIEW.width - 28, LAYOUT.topBarH - 10);
    ctx.strokeStyle = GA(0.4); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14, LAYOUT.topBarH + 4); ctx.lineTo(VIEW.width - 14, LAYOUT.topBarH + 4); ctx.stroke();
    drawSuitEmblem(ctx, 'solar', 42, 37, 12, { glow: true });
    this._text(ctx, 'SUNSTONE GAMBIT', 62, 37, `800 18.5px ${FU}`, PALETTE.goldBright, 'left');
    this._panel(ctx, 240, 21, 256, 32, 16, GA(0.14), null);
    this._text(ctx, `MATCH ${state.rivalIndex + 1}/${RIVALS.length} · TURN ${state.turn} · ${state.rival.name.toUpperCase()}`, 368, 37, `700 11.8px ${FU}`, PALETTE.ivory);
    const lx = 516;
    this._panel(ctx, lx - 12, 20, 272, 34, 17, 'rgba(12,28,24,0.92)', GA(0.28), 1.2);
    ['solar', 'verdant', 'tide', 'solar'].forEach((sid, idx) => {
      drawSuitEmblem(ctx, sid, lx + 4 + idx * 32, 37, 9);
      if (idx < 3) this._text(ctx, '>', lx + 20 + idx * 32, 37, `800 13px ${FU}`, PALETTE.gold);
    });
    this._text(ctx, '·', lx + 115, 37, `800 13px ${FU}`, '#d4a6ff');
    drawSuitEmblem(ctx, 'eclipse', lx + 129, 37, 9);
    this._text(ctx, 'PIERCE · ◆COST ●VAL', lx + 200, 37, `700 9.5px ${FU}`, '#e5d4ff');
    this._panel(ctx, 796, 21, 166, 34, 17, 'rgba(255,201,77,0.18)', 'rgba(255,201,77,0.6)', 1.3);
    this._text(ctx, `SCORE  ${state.score}`, 879, 38, `900 15.5px ${FU}`, PALETTE.goldBright);
    for (const [x, w, lbl, active] of [
      [978, 88, 'RULES (H)', state.helpOpen],
      [1076, 90, audio.isMuted() ? 'MUTED (M)' : 'SOUND (M)', !audio.isMuted()],
      [1176, 76, 'TITLE', false],
    ]) {
      this._panel(ctx, x, 22, w, 32, 8, active ? GA(0.25) : WA(0.08), active ? PALETTE.gold : GA(0.35), 1.2);
      this._text(ctx, lbl, x + w / 2, 38, `700 12px ${FU}`, PALETTE.ivory);
    }
    ctx.restore();
  }
  drawDeckAndDiscard(ctx, state) {
    if (state.player.deck.length > 0) {
      const layers = Math.min(5, Math.max(2, Math.ceil(state.player.deck.length / 4)));
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
      this._panel(ctx, LAYOUT.deckPile.x - 36, LAYOUT.deckPile.y - 50, 72, 100, 8, '#0c0d1c', null);
      ctx.restore();
      for (let k = 0; k < layers; k += 1) {
        ctx.save();
        ctx.translate(LAYOUT.deckPile.x - k * 2.2, LAYOUT.deckPile.y - k * 2.2);
        ctx.scale(0.54, 0.54);
        drawCardBack(ctx, CARD.width, CARD.height, PALETTE.gold);
        ctx.restore();
      }
      this._text(ctx, `DRAW (${state.player.deck.length})`, LAYOUT.deckPile.x - 2, LAYOUT.deckPile.y + 64, `800 11px ${FU}`, PALETTE.goldBright);
    }
    this._panel(ctx, LAYOUT.discardPile.x - 38, LAYOUT.discardPile.y - 52, 76, 104, 9, 'rgba(0,0,0,0.26)', GA(0.34), 1.4);
    if (state.player.discard.length > 0) {
      ctx.save();
      ctx.translate(LAYOUT.discardPile.x, LAYOUT.discardPile.y);
      ctx.rotate(0.05);
      ctx.scale(0.54, 0.54);
      drawCardFace(ctx, state.player.discard[state.player.discard.length - 1], CARD.width, CARD.height, { playable: true, time: state.time });
      ctx.restore();
    }
    this._text(ctx, `DISCARD (${state.player.discard.length})`, LAYOUT.discardPile.x, LAYOUT.discardPile.y + 64, `700 11px ${FU}`, IA(0.82));
  }
  drawCombatantHud(ctx, box, label, subtitle, combatant, accent, isPlayer, state) {
    ctx.save();
    this._panel(ctx, box.x, box.y, box.w, box.h, 14, 'rgba(8,17,15,0.92)', isPlayer ? 'rgba(238,198,118,0.62)' : `${accent}aa`, 2);
    if (isPlayer) drawSunkeeperPortrait(ctx, box.x + 30, box.y + 30, 20);
    else drawRivalPortrait(ctx, state.rival.id, box.x + 30, box.y + 30, 20);
    this._text(ctx, label, box.x + 58, box.y + 22, `800 16.5px ${FU}`, PALETTE.ivory, 'left');
    this._text(ctx, subtitle, box.x + 58, box.y + 40, `600 11px ${FU}`, isPlayer ? PALETTE.goldBright : IA(0.72), 'left');
    const barX = box.x + 14;
    const barY = box.y + 60;
    const barW = box.w - 28;
    const barH = 26;
    const hpRatio = Math.max(0, Math.min(1, combatant.hp / combatant.maxHp));
    this._panel(ctx, barX, barY, barW, barH, 8, '#261014', null);
    if (hpRatio > 0) {
      const g = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
      g.addColorStop(0, '#c82936'); g.addColorStop(1, '#ff636d');
      this._panel(ctx, barX, barY, Math.max(12, barW * hpRatio), barH, 8, g, null);
    }
    this._panel(ctx, barX, barY, barW, barH, 8, null, WA(0.28), 1.2);
    drawStatIcon(ctx, 'heart', barX + 54, barY + 13, 6.5, '#ff7380');
    this._text(ctx, `${combatant.hp} / ${combatant.maxHp} HP`, barX + barW / 2 + 10, barY + 14, `900 16px ${FU}`, '#ffffff');
    const rowY = box.y + 98;
    this._panel(ctx, barX, rowY, 98, 28, 7, combatant.ward > 0 ? 'rgba(37,184,255,0.26)' : WA(0.06), combatant.ward > 0 ? '#5cd8ff' : WA(0.14), 1.2);
    drawStatIcon(ctx, 'shield', barX + 16, rowY + 14, 6.8, combatant.ward > 0 ? '#4fd2ff' : '#6c7c88');
    this._text(ctx, `${combatant.ward} WARD`, barX + 58, rowY + 15, `800 13px ${FU}`, combatant.ward > 0 ? '#a8f2ff' : WA(0.55));
    this._panel(ctx, barX + 106, rowY, 102, 28, 7, WA(0.06), GA(0.28), 1.2);
    this._text(ctx, `DECK ${combatant.deck.length}`, barX + 157, rowY + 15, `700 12.5px ${FU}`, PALETTE.goldBright);
    if (isPlayer) {
      const orbY = box.y + 143;
      this._text(ctx, 'AETHER', barX, orbY, `800 12px ${FU}`, PALETTE.gold, 'left');
      const slots = Math.max(combatant.maxEnergy, combatant.energy);
      const step = slots > 4 ? 17 : 22;
      for (let i = 0; i < slots; i += 1) {
        drawStatIcon(ctx, 'aether', barX + 68 + i * step, orbY, 6.6, i < combatant.energy ? '#ffc94d' : WA(0.14));
      }
      this._text(ctx, `${combatant.energy}/${combatant.maxEnergy}`, box.x + box.w - 14, orbY + 1, `900 14px ${FU}`, PALETTE.goldBright, 'right');
      drawRelicEmblem(ctx, state.relic.id, barX + 12, box.y + 169, 9.5);
      this._text(ctx, state.relic.shortText, barX + 27, box.y + 169, `700 10.2px ${FU}`, state.relic.color, 'left');
    } else {
      const py = box.y + 140;
      this._panel(ctx, barX, py, barW, 24, 7, WA(0.06), `${accent}66`, 1);
      this._text(ctx, `${state.rival.passive.name}: ${state.rival.passive.text}`, barX + barW / 2, py + 12.5, `700 10.5px ${FU}`, '#e4f0ec');
    }
    ctx.restore();
  }
  drawClashArena(ctx, state) {
    ctx.save();
    this._panel(ctx, 412, 60, 290, 62, 14, 'rgba(5, 13, 12, 0.42)', GA(0.22), 1.2);
    LAYOUT.opponentIntentSlots.forEach((slot, i) => {
      const w = CARD.width * 0.80;
      const h = CARD.height * 0.80;
      const intent = state.opponent.intents[i];
      ctx.setLineDash([6, 5]);
      this._panel(ctx, slot.x - w / 2, slot.y - h / 2, w, h, 11, 'rgba(0,0,0,0.28)', intent?.revealed ? 'rgba(255,118,92,0.68)' : 'rgba(255,165,92,0.52)', 2);
      ctx.setLineDash([]);
      if (intent) {
        const suit = SUITS[intent.card.suit];
        const tag = intent.revealed ? `INTENT · ${suit.name.toUpperCase()} ${intent.card.value}` : `HIDDEN · ${suit.name.toUpperCase()} AURA`;
        const py = slot.y - h / 2 - 20;
        this._panel(ctx, slot.x - 66, py, 132, 18, 9, intent.revealed ? 'rgba(185,40,32,0.94)' : `${suit.dark}f0`, suit.bright, 1.2);
        this._text(ctx, tag, slot.x, py + 9.5, `800 9.5px ${FU}`, '#ffffff');
      }
    });
    const isDragging = state.draggingHandIndex >= 0;
    const hoveredIdx = state.hoveredHandIndex;
    const hoverHints = hoveredIdx >= 0 && state.player.hand[hoveredIdx]
      ? previewCardSynergy(state.player.hand[hoveredIdx], state.player.chain, state.opponent.intents, state.relic.id)
      : [];
    const nextSlotIdx = state.player.chain.length;
    LAYOUT.playerChainSlots.forEach((slot, i) => {
      const w = CARD.width * 0.82;
      const h = CARD.height * 0.82;
      const filled = i < nextSlotIdx;
      const nextOpen = i === nextSlotIdx;
      const previewGlow = nextOpen && (isDragging || hoveredIdx >= 0);
      this._panel(
        ctx, slot.x - w / 2, slot.y - h / 2, w, h, 11,
        filled ? 'rgba(230,190,108,0.08)' : previewGlow ? 'rgba(255,224,120,0.16)' : 'rgba(0,0,0,0.26)',
        previewGlow ? '#ffe68c' : nextOpen ? GA(0.65) : GA(0.28),
        previewGlow ? 2.6 : 1.5,
      );
      if (!filled) {
        this._text(ctx, `CHAIN SLOT ${i + 1}`, slot.x, slot.y - 10, `800 11.5px ${FU}`, previewGlow ? '#fff0bd' : GA(0.45));
        this._text(ctx, i < 2 ? `Clashes Slot ${i + 1}` : '+3 Power Finisher', slot.x, slot.y + 10, `700 10.5px ${FU}`, previewGlow ? '#ffd875' : GA(0.34));
      }
    });
    if (hoverHints.length > 0 && nextSlotIdx < 3) {
      const targetSlot = LAYOUT.playerChainSlots[nextSlotIdx];
      const lbl = hoverHints[0].label;
      const bw = Math.min(204, Math.max(122, lbl.length * 6.8 + 22));
      const by = targetSlot.y - (CARD.height * 0.82) / 2 - 26;
      this._panel(ctx, targetSlot.x - bw / 2, by, bw, 22, 11, '#221706', PALETTE.goldBright, 1.8);
      this._text(ctx, lbl, targetSlot.x, by + 11.5, `900 10.5px ${FU}`, PALETTE.goldBright);
    }
    for (let i = 0; i < state.player.chain.length - 1; i += 1) {
      const a = LAYOUT.playerChainSlots[i];
      const b = LAYOUT.playerChainSlots[i + 1];
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, SUITS[state.player.chain[i].suit].bright);
      grad.addColorStop(1, SUITS[state.player.chain[i + 1].suit].bright);
      ctx.strokeStyle = grad; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(a.x + 54, a.y); ctx.lineTo(b.x - 54, b.y); ctx.stroke();
    }
    for (let i = 0; i < Math.min(2, state.opponent.intents.length); i += 1) {
      const oSlot = LAYOUT.opponentIntentSlots[i];
      const pSlot = LAYOUT.playerChainSlots[i];
      const clash = state.activeClashes.find((c) => c.slot === i);
      ctx.strokeStyle = clash ? clash.color : GA(0.22);
      ctx.lineWidth = clash ? 3.2 : 1.5;
      ctx.beginPath(); ctx.moveTo(oSlot.x, oSlot.y + 76); ctx.lineTo(pSlot.x, pSlot.y - 78); ctx.stroke();
      if (clash) {
        const badgeText = `${clash.label} -${clash.opponentPenalty}`;
        this._panel(ctx, oSlot.x - 74, 309, 148, 22, 11, '#092420', clash.color, 1.8);
        this._text(ctx, badgeText, oSlot.x, 320.5, `900 10px ${FU}`, clash.color);
      }
    }
    ctx.restore();
  }
  drawComboTacticsPanel(ctx, state) {
    const { x, y, w, h } = LAYOUT.tacticsPanel;
    ctx.save();
    this._panel(ctx, x, y, w, h, 16, 'rgba(8,18,16,0.9)', GA(0.46), 1.8);
    this._text(ctx, 'RITUAL CHAIN & TACTICS', x + 18, y + 25, `800 15px ${FU}`, PALETTE.goldBright, 'left');
    const combo = state.activeCombos;
    const mult = combo ? combo.multiplier : 1;
    this._panel(ctx, x + w - 92, y + 12, 76, 26, 13, mult > 1 ? 'rgba(255,201,77,0.24)' : WA(0.08), mult > 1 ? '#ffc94d' : WA(0.2), 1.2);
    this._text(ctx, `×${mult.toFixed(2)} PTS`, x + w - 54, y + 25, `800 13px ${FU}`, mult > 1 ? '#ffe899' : '#c6d4ce');
    let dmg = (combo?.damage ?? 0) + (state.lensRevealBonus ?? 0);
    let pierce = combo?.pierceDamage ?? 0;
    let ward = combo?.ward ?? 0;
    let heal = combo?.heal ?? 0;
    for (const c of state.player.chain) {
      if (c.pierce) pierce += c.damage ?? 0; else dmg += c.damage ?? 0;
      ward += c.ward ?? 0; heal += c.heal ?? 0;
    }
    for (const cl of state.activeClashes) { dmg += cl.bonusDamage; ward += cl.bonusWard; }
    [
      ['STRIKE', `${dmg + pierce}`, '#ff7456', 'rgba(255,93,56,0.16)'],
      ['WARD', `${ward}`, '#5bd3ff', 'rgba(37,184,255,0.16)'],
      ['MEND', `+${heal}`, '#5cf0a8', 'rgba(41,219,132,0.16)'],
    ].forEach(([lbl, val, col, bg], idx) => {
      const sx = x + 16 + idx * 128;
      this._panel(ctx, sx, y + 50, 120, 54, 10, bg, `${col}66`, 1.2);
      this._text(ctx, val, sx + 60, y + 71, `900 22px ${FU}`, col);
      this._text(ctx, lbl, sx + 60, y + 92, `700 10px ${FU}`, IA(0.82));
    });
    let cy = y + 122;
    this._text(ctx, 'ACTIVE SYNERGIES', x + 18, cy, `800 12px ${FU}`, 'rgba(230,190,108,0.88)', 'left');
    cy += 14;
    const badges = [
      ...(combo?.triggers ?? []),
      ...state.activeClashes.map((c) => ({ label: c.label, detail: `+${c.bonusDamage} DMG · Rival -${c.opponentPenalty} Power`, color: c.color })),
    ];
    if (badges.length === 0) {
      this._panel(ctx, x + 16, cy, w - 32, 66, 10, WA(0.04), null);
      this._text(ctx, '• 2+ Same Suit = Resonance · 3 Rising Values = Cascade', x + 26, cy + 17, `600 11.5px ${FU}`, IA(0.75), 'left');
      this._text(ctx, '• Slot 3 grants +3 Finisher Bonus · Click staged card to retract', x + 26, cy + 35, `600 11.5px ${FU}`, IA(0.75), 'left');
      this._text(ctx, '• Counter rival Slot 1 suit for Parry bonus & -3 Power!', x + 26, cy + 53, `600 11.5px ${FU}`, IA(0.75), 'left');
    } else {
      for (const b of badges.slice(0, 3)) {
        this._panel(ctx, x + 16, cy, w - 32, 34, 9, WA(0.07), `${b.color}aa`, 1.4);
        this._text(ctx, b.label, x + 26, cy + 12, `800 11.5px ${FU}`, b.color, 'left');
        this._text(ctx, b.detail, x + 26, cy + 25, `600 10.5px ${FU}`, PALETTE.ivory, 'left');
        cy += 38;
      }
    }
    const ty = y + h - 86;
    this._panel(ctx, x + 16, ty, w - 32, 50, 10, 'rgba(180,42,42,0.2)', 'rgba(255,102,110,0.48)', 1.2);
    const lead = state.opponent.intents[0];
    const leadClash = state.activeClashes.find((c) => c.slot === 0);
    const passive = computeRivalPassiveBonus(state.rival, state.opponent.intents);
    const leadDmg = lead ? Math.max(0, (lead.card.damage ?? 0) + passive.leadBonusDmg - (leadClash?.opponentPenalty ?? 0)) : 0;
    this._text(ctx, `RIVAL LEAD THREAT · INCOMING: ${leadDmg} + ? DMG`, x + 26, ty + 15, `800 10.5px ${FU}`, '#ffa3a8', 'left');
    if (lead) {
      const counterSuit = SUITS[SUITS[lead.card.suit].counteredBy];
      this._text(ctx, `${lead.card.name} (${lead.card.shortText})`, x + 26, ty + 34, `700 12.5px ${FU}`, PALETTE.ivory, 'left');
      this._text(ctx, `Counter: ${counterSuit.name.toUpperCase()}`, x + w - 24, ty + 34, `800 11px ${FU}`, counterSuit.bright, 'right');
    }
    this._text(ctx, state.lastTurnSummary.slice(0, 58), x + 18, y + h - 18, `600 11px ${FU}`, IA(0.72), 'left');
    ctx.restore();
  }
  drawActionButtons(ctx, state) {
    ctx.save();
    const eb = LAYOUT.endTurnBtn;
    const ready = state.phase === 'player';
    const hasChain = state.player.chain.length > 0;
    const g = ctx.createLinearGradient(eb.x, eb.y, eb.x, eb.y + eb.h);
    if (!ready) { g.addColorStop(0, '#3a4240'); g.addColorStop(1, '#262d2b'); }
    else if (hasChain) { g.addColorStop(0, '#ffd46b'); g.addColorStop(1, '#c97b1c'); }
    else { g.addColorStop(0, '#2c6e5c'); g.addColorStop(1, '#1a473b'); }
    this._panel(ctx, eb.x, eb.y, eb.w, eb.h, 13, g, hasChain ? '#fff3c4' : PALETTE.gold, 2.2);
    this._text(ctx, hasChain ? 'RESOLVE CLASH (E)' : 'END TURN (E)', eb.x + eb.w / 2, eb.y + eb.h / 2, `900 17.5px ${FU}`, hasChain ? '#1b1104' : PALETTE.ivory);
    const sb = LAYOUT.swapBtn;
    const canSwap = ready && state.swapsLeft > 0 && state.player.hand.length > 0;
    this._panel(ctx, sb.x, sb.y, sb.w, sb.h, 11, state.swapMode ? 'rgba(37,184,255,0.34)' : canSwap ? 'rgba(20,48,44,0.92)' : 'rgba(20,26,25,0.6)', state.swapMode ? '#8ceaff' : canSwap ? 'rgba(140,234,255,0.58)' : WA(0.14), 1.6);
    this._text(ctx, state.swapMode ? 'CLICK CARD TO SWAP' : `SWAP CARD (S) · ${state.swapsLeft} LEFT`, sb.x + sb.w / 2, sb.y + sb.h / 2, `800 13px ${FU}`, canSwap ? '#d4f6ff' : WA(0.35));
    ctx.restore();
  }
  drawAllCards(ctx, state, anim) {
    const entries = [];
    for (const card of state.opponent.hand) {
      const a = anim.cards.get(card.uid);
      if (a) entries.push({ card, anim: a, opts: { playable: true, time: state.time } });
    }
    state.opponent.intents.forEach((intent, idx) => {
      const a = anim.cards.get(intent.card.uid);
      if (!a) return;
      const clash = state.activeClashes.find((c) => c.slot === idx);
      const reduced = intent.revealed && clash && (intent.card.damage ?? 0) > 0
        ? `${intent.card.damage} → ${Math.max(0, intent.card.damage - clash.opponentPenalty)} DMG`
        : null;
      entries.push({
        card: intent.card,
        anim: a,
        opts: { playable: true, foil: intent.revealed, suitTellId: intent.revealed ? null : intent.card.suit, reductionBadge: reduced, time: state.time },
      });
    });
    for (const card of state.player.chain) {
      const a = anim.cards.get(card.uid);
      if (a) entries.push({ card, anim: a, opts: { playable: true, selected: true, foil: true, time: state.time } });
    }
    state.player.hand.forEach((card, i) => {
      const a = anim.cards.get(card.uid);
      if (!a) return;
      const playable = state.phase === 'player' && card.cost <= state.player.energy && state.player.chain.length < 3;
      const hovered = state.hoveredHandIndex === i || state.draggingHandIndex === i;
      const selected = state.selectedHandIndex === i;
      const hints = previewCardSynergy(card, state.player.chain, state.opponent.intents, state.relic.id);
      entries.push({
        card, anim: a,
        opts: { playable: playable || state.swapMode, hovered, selected, foil: Boolean(card.rare || hints.length > 0), counterHint: null, time: state.time, hotkey: i + 1 },
      });
    });
    entries.sort((u, v) => (u.anim.z ?? 0) - (v.anim.z ?? 0));
    for (const item of entries) {
      renderCardTransform(ctx, item.card, item.anim, item.opts);
      if (item.opts.hotkey && state.draggingHandIndex !== item.opts.hotkey - 1) {
        const bx = item.anim.x;
        const by = Math.min(VIEW.height - 12, item.anim.y + (CARD.height * item.anim.scale) / 2 + 10);
        ctx.save();
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,17,15,0.92)'; ctx.fill();
        ctx.strokeStyle = GA(0.75); ctx.lineWidth = 1.3; ctx.stroke();
        this._text(ctx, String(item.opts.hotkey), bx, by + 0.5, `800 11px ${FU}`, PALETTE.goldBright);
        ctx.restore();
      }
    }
  }
  drawHoverOrDragArc(ctx, state, anim) {
    if (state.screen !== SCREEN_PLAY || state.player.chain.length >= 3) return;
    const nextSlot = LAYOUT.playerChainSlots[state.player.chain.length];
    let sx = 0; let sy = 0; let active = false;
    if (state.draggingHandIndex >= 0) {
      sx = state.dragX; sy = state.dragY - 40; active = true;
    } else if (state.hoveredHandIndex >= 0 && state.player.hand[state.hoveredHandIndex]) {
      const card = state.player.hand[state.hoveredHandIndex];
      if (card.cost <= state.player.energy) {
        const a = anim.cards.get(card.uid);
        if (a) { sx = a.x + 12; sy = a.y - 86; active = true; }
      }
    }
    if (!active) return;
    ctx.save();
    const g = ctx.createLinearGradient(sx, sy, nextSlot.x, nextSlot.y + 42);
    g.addColorStop(0, '#ffe885'); g.addColorStop(1, '#6ef7c0');
    ctx.strokeStyle = g; ctx.lineWidth = 3.6; ctx.setLineDash([9, 6]);
    ctx.shadowColor = '#ffd86b'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + nextSlot.x) * 0.5 + 34, Math.min(sy, nextSlot.y) + 28, nextSlot.x, nextSlot.y + 52);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff5bd';
    ctx.beginPath(); ctx.arc(nextSlot.x, nextSlot.y + 52, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawTitleScreen(ctx, state) {
    ctx.save();
    const veil = ctx.createRadialGradient(VIEW.width / 2, 260, 140, VIEW.width / 2, VIEW.height / 2, 760);
    veil.addColorStop(0, 'rgba(18, 52, 42, 0.16)'); veil.addColorStop(1, 'rgba(4, 10, 9, 0.82)');
    ctx.fillStyle = veil; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const halo = ctx.createRadialGradient(VIEW.width / 2, 278, 20, VIEW.width / 2, 278, 340);
    halo.addColorStop(0, 'rgba(255, 212, 112, 0.24)'); halo.addColorStop(0.55, 'rgba(41, 219, 132, 0.08)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    drawSuitEmblem(ctx, 'solar', VIEW.width / 2 - 366, 78, 25, { glow: true });
    drawSuitEmblem(ctx, 'eclipse', VIEW.width / 2 + 366, 78, 25, { glow: true });
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 20;
    this._text(ctx, 'SUNSTONE GAMBIT', VIEW.width / 2, 78, `900 68px ${FT}`, PALETTE.goldBright);
    ctx.shadowBlur = 0;
    this._text(ctx, 'TACTICAL SUIT-COMBO CARD DUEL · READ, CHAIN & COUNTER YOUR RIVAL', VIEW.width / 2, 128, `700 16.5px ${FU}`, '#d2ece2');
    HERO_CARDS.forEach((card, i) => {
      if (!card) return;
      const offset = i - 1.5;
      ctx.save();
      ctx.translate(VIEW.width / 2 + offset * 162, 274 + Math.abs(offset) * 14 + Math.sin(state.time * 1.9 + i * 0.9) * 3.5);
      ctx.rotate(offset * 0.08); ctx.scale(1.04, 1.04);
      ctx.shadowColor = 'rgba(0,0,0,0.62)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 12;
      drawCardFace(ctx, card, CARD.width, CARD.height, { playable: true, foil: true, time: state.time + i * 0.6 });
      ctx.restore();
    });
    RIVALS.forEach((rival, idx) => {
      const rx = VIEW.width / 2 - 418 + idx * 284;
      const sel = state.rivalIndex === idx;
      this._panel(ctx, rx, 412, 268, 66, 12, sel ? GA(0.22) : 'rgba(8,18,16,0.88)', sel ? PALETTE.goldBright : GA(0.34), sel ? 2.5 : 1.4);
      drawRivalPortrait(ctx, rival.id, rx + 32, 445, 22);
      this._text(ctx, `${rival.name} (${rival.hp} HP)`, rx + 62, 434, `800 14.5px ${FU}`, PALETTE.ivory, 'left');
      this._text(ctx, `${rival.passive.name}: ${rival.passive.text}`, rx + 62, 456, `700 11.5px ${FU}`, rival.accent, 'left');
    });
    RELICS.forEach((relic, idx) => {
      const rx = VIEW.width / 2 - 418 + idx * 284;
      const sel = state.relicIndex === idx;
      this._panel(ctx, rx, 492, 268, 42, 10, sel ? 'rgba(255,212,102,0.18)' : 'rgba(8,18,16,0.78)', sel ? relic.color : GA(0.25), sel ? 2 : 1.2);
      drawRelicEmblem(ctx, relic.id, rx + 24, 513, 13);
      this._text(ctx, relic.name, rx + 44, 506, `800 12.5px ${FU}`, PALETTE.goldBright, 'left');
      this._text(ctx, relic.shortText, rx + 44, 522, `600 10.5px ${FU}`, relic.color, 'left');
    });
    const playGrad = ctx.createLinearGradient(0, 554, 0, 622);
    playGrad.addColorStop(0, '#ffe07d'); playGrad.addColorStop(1, '#d17f18');
    this._panel(ctx, VIEW.width / 2 - 166, 554, 332, 68, 16, playGrad, '#fff7d6', 2.8);
    this._text(ctx, 'PLAY DUEL  ▶', VIEW.width / 2, 589, `900 28px ${FU}`, '#1b1004');
    this._text(ctx, 'MOUSE: Click / Drag Cards   ·   KEYBOARD: 1–5 Play · ←/→ Select · S Swap · E Resolve · H Rules · M Audio', VIEW.width / 2, 648, `700 13px ${FU}`, 'rgba(220,240,232,0.88)');
    [184, 412, 672, 938].forEach((lx, idx) => {
      const s = SUITS[SUIT_ORDER[idx]];
      drawSuitEmblem(ctx, s.id, lx, 680, 9.5);
      this._text(ctx, `${s.name}: ${s.resonanceText}`, lx + 17, 681, `700 12.5px ${FU}`, s.bright, 'left');
    });
    ctx.restore();
  }
  drawVictoryOverlay(ctx, state, anim) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 22, 15, 0.56)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.translate(VIEW.width / 2, VIEW.height / 2 - 10);
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2 + state.time * 0.08;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 720, a - 0.08, a + 0.08); ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 220, 110, 0.14)' : 'rgba(60, 232, 152, 0.07)';
      ctx.fill();
    }
    ctx.restore();
    this._drawEndModal(ctx, state, anim, {
      suit: 'solar', title: 'VICTORY!', titleCol: '#ffec9c', shadow: 'rgba(255,208,72,0.6)',
      bg: 'rgba(9,28,21,0.94)', border: '#ffe68c', statBorder: 'rgba(255,224,130,0.4)',
      sub: `${state.rival.name} vanquished in ${state.turn} turns · Best: ${state.bestComboLabel}`,
      stats: [
        ['FINAL SCORE', String(state.score), '#ffe27a'],
        ['LIFE LEFT', `${state.player.hp}/${state.player.maxHp}`, '#5cf0a8'],
        ['COMBOS · PARRIES', `${state.combosTriggered} · ${state.countersLanded}`, '#8ceaff'],
      ],
      cta: 'NEXT RIVAL (ENTER)', ctaBg: '#f5c252', ctaBorder: '#fff7d6', ctaFg: '#1b1104',
    });
    ctx.restore();
  }
  drawDefeatOverlay(ctx, state, anim) {
    ctx.save();
    ctx.fillStyle = 'rgba(22, 6, 14, 0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const corona = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 40, VIEW.width / 2, VIEW.height / 2, 520);
    corona.addColorStop(0, 'rgba(255, 62, 92, 0.32)'); corona.addColorStop(0.55, 'rgba(138, 52, 198, 0.16)'); corona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = corona; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.strokeStyle = 'rgba(255, 92, 118, 0.24)'; ctx.lineWidth = 3;
    for (const [x1, y1, x2, y2] of [[80, 70, 440, 290], [1200, 90, 840, 290], [110, 650, 460, 440], [1180, 640, 830, 440]]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    this._drawEndModal(ctx, state, anim, {
      suit: 'eclipse', title: 'DEFEAT', titleCol: '#ff8090', shadow: 'rgba(255,72,102,0.55)',
      bg: 'rgba(26,9,18,0.95)', border: '#ff667a', statBorder: 'rgba(255,112,130,0.4)',
      sub: `${state.rival.name} prevailed on Turn ${state.turn} · Best: ${state.bestComboLabel}`,
      stats: [
        ['FINAL SCORE', String(state.score), '#ffe078'],
        ['DAMAGE DEALT', `${state.totalDamageDealt} DMG`, '#ff8c70'],
        ['COMBOS · PARRIES', `${state.combosTriggered} · ${state.countersLanded}`, '#dfadff'],
      ],
      cta: 'REMATCH (ENTER)', ctaBg: '#e8455d', ctaBorder: '#ffd6dc', ctaFg: '#ffffff',
    });
    ctx.restore();
  }
  _drawEndModal(ctx, state, anim, cfg) {
    if (anim) anim.renderFrontEffects(ctx);
    const mw = 680; const mh = 390;
    const mx = (VIEW.width - mw) / 2; const my = (VIEW.height - mh) / 2;
    this._panel(ctx, mx, my, mw, mh, 24, cfg.bg, cfg.border, 3.5);
    drawSuitEmblem(ctx, cfg.suit, VIEW.width / 2, my + 42, 26, { glow: true });
    ctx.shadowColor = cfg.shadow; ctx.shadowBlur = 18;
    this._text(ctx, cfg.title, VIEW.width / 2, my + 108, `900 76px ${FT}`, cfg.titleCol);
    ctx.shadowBlur = 0;
    this._text(ctx, cfg.sub, VIEW.width / 2, my + 162, `700 17px ${FU}`, PALETTE.ivory);
    cfg.stats.forEach(([k, v, c], i) => {
      const sx = mx + 32 + i * 212;
      this._panel(ctx, sx, my + 190, 194, 92, 13, WA(0.08), cfg.statBorder, 1.5);
      this._text(ctx, k, sx + 97, my + 214, `800 12px ${FU}`, IA(0.78));
      this._text(ctx, v, sx + 97, my + 252, `900 34px ${FU}`, c);
    });
    const btnY = my + mh - 74;
    this._panel(ctx, VIEW.width / 2 - 226, btnY, 212, 54, 13, cfg.ctaBg, cfg.ctaBorder, 2);
    this._text(ctx, cfg.cta, VIEW.width / 2 - 120, btnY + 27, `900 16px ${FU}`, cfg.ctaFg);
    this._panel(ctx, VIEW.width / 2 + 14, btnY, 212, 54, 13, WA(0.14), PALETTE.goldBright, 2);
    this._text(ctx, 'TITLE SCREEN (T)', VIEW.width / 2 + 120, btnY + 27, `900 16px ${FU}`, PALETTE.ivory);
  }
  drawHelpModal(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 10, 9, 0.8)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const x = (VIEW.width - 700) / 2; const y = (VIEW.height - 420) / 2;
    this._panel(ctx, x, y, 700, 420, 18, '#0c201b', PALETTE.gold, 2.4);
    this._text(ctx, 'HOW TO PLAY SUNSTONE GAMBIT', VIEW.width / 2, y + 40, `900 26px ${FU}`, PALETTE.goldBright);
    [
      '1. Spend up to 4 Aether each turn to stage up to 3 cards into the Ritual Chain.',
      '2. Slot 3 always grants a +3 Power FINISHER BONUS! Click a staged card to retract & reorder.',
      '3. Combine cards via Suit Resonance (2+ same suit), Twin Echo (equal values),',
      '   Ascending Cascade (e.g. 2→4→7), or Prismatic Triad (3 suits) + your chosen Relic.',
      '4. Read your rival’s telegraphed Slot 1 card & hidden suit aura to COUNTER:',
      '   Solar > Verdant > Tide > Solar · Eclipse pierces Ward & reveals hidden cards!',
      '5. Controls: Click / Drag cards · Keys 1–5 play · ←/→ select · S Swap · E Resolve · H Rules.',
    ].forEach((line, i) => this._text(ctx, line, x + 34, y + 92 + i * 34, `600 14px ${FU}`, PALETTE.ivory, 'left'));
    this._panel(ctx, VIEW.width / 2 - 110, y + 350, 220, 46, 12, '#f2be54', PALETTE.goldBright, 1.8);
    this._text(ctx, 'CLOSE RULES (H)', VIEW.width / 2, y + 373, `900 15px ${FU}`, '#1b1104');
    ctx.restore();
  }
  _getFeltPattern(ctx) {
    if (!this._feltPattern) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#0f2c25'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,240,200,0.026)';
      for (let y = 0; y < 64; y += 4) for (let x = y % 8 === 0 ? 0 : 2; x < 64; x += 4) g.fillRect(x, y, 2, 1);
      g.fillStyle = 'rgba(0,0,0,0.05)';
      for (let y = 2; y < 64; y += 6) g.fillRect(0, y, 64, 1);
      this._feltPattern = c;
    }
    return ctx.createPattern(this._feltPattern, 'repeat');
  }
  _roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
  }
  _panel(ctx, x, y, w, h, r, fill, stroke, lw = 1.4) {
    this._roundedRect(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  _txt(ctx, text, x, y, w, sz, color, align = 'center') {
    this._text(ctx, text, x, y, `${w} ${sz}px ${FU}`, color, align);
  }
  _text(ctx, text, x, y, font, color, align = 'center') {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
}

export function createTableRenderer() { return new TableRenderer(); }
