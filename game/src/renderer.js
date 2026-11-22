// Atmospheric observatory card-table renderer, HUD, combo panel, and Title/Victory/Defeat screens.

import { CARD, LAYOUT, PALETTE, SUIT_ORDER, SUITS, VIEW } from './config.js';
import { CARD_CATALOG, RIVALS } from './cards.js';
import { previewCardSynergy } from './combos.js';
import { drawCardBack, drawCardFace, drawSuitEmblem, renderCardTransform } from './card-art.js';
import { SCREEN_DEFEAT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './rules.js';

const HERO_CARDS = ['sol_nova', 'tid_maelstrom', 'ver_bloom', 'ecl_zenith']
  .map((id) => CARD_CATALOG.find((c) => c.id === id));

const FONT_UI = '"Trebuchet MS", sans-serif';
const FONT_TITLE = '"Trebuchet MS", Georgia, serif';

export function createTableRenderer() {
  let feltPatternCanvas = null;

  function getFeltPattern(ctx) {
    if (!feltPatternCanvas) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#0f2c25';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255, 240, 200, 0.024)';
      for (let y = 0; y < 64; y += 4) {
        for (let x = y % 8 === 0 ? 0 : 2; x < 64; x += 4) g.fillRect(x, y, 2, 1);
      }
      g.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let y = 2; y < 64; y += 6) g.fillRect(0, y, 64, 1);
      feltPatternCanvas = c;
    }
    return ctx.createPattern(feltPatternCanvas, 'repeat');
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawPanel(ctx, x, y, w, h, r, fill, stroke, lw = 1.4) {
    roundedRectPath(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }

  function drawText(ctx, text, x, y, font, color, align = 'center') {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function drawTabletopBackground(ctx, time) {
    const railGrad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    railGrad.addColorStop(0, '#3e2316');
    railGrad.addColorStop(0.5, '#26140c');
    railGrad.addColorStop(1, '#1b0e08');
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const pad = 14;
    roundedRectPath(ctx, pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2, 22);
    ctx.save();
    ctx.clip();

    const feltGrad = ctx.createRadialGradient(VIEW.width * 0.5, VIEW.height * 0.48, 60, VIEW.width * 0.5, VIEW.height * 0.5, 760);
    feltGrad.addColorStop(0, '#19473b');
    feltGrad.addColorStop(0.55, '#0e2c25');
    feltGrad.addColorStop(1, '#061512');
    ctx.fillStyle = feltGrad;
    ctx.fillRect(pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2);

    const pat = getFeltPattern(ctx);
    if (pat) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = pat;
      ctx.fillRect(pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2);
      ctx.globalAlpha = 1;
    }

    // Inlaid brass observatory astrolabe rings
    const cx = 568;
    const cy = 330;
    ctx.strokeStyle = 'rgba(230, 190, 108, 0.14)';
    ctx.lineWidth = 1.5;
    for (const radius of [128, 215, 310]) {
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.025);
    ctx.strokeStyle = 'rgba(230, 190, 108, 0.12)';
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      const r1 = i % 3 === 0 ? 198 : 206;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * 215, Math.sin(a) * 215);
      ctx.stroke();
    }
    ctx.restore();

    const divGrad = ctx.createLinearGradient(280, 316, 860, 316);
    divGrad.addColorStop(0, 'rgba(230,190,108,0)');
    divGrad.addColorStop(0.5, 'rgba(230,190,108,0.28)');
    divGrad.addColorStop(1, 'rgba(230,190,108,0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(280, 316); ctx.lineTo(860, 316); ctx.stroke();
    ctx.restore();

    drawPanel(ctx, pad, pad, VIEW.width - pad * 2, VIEW.height - pad * 2, 22, null, 'rgba(230,190,108,0.45)', 2.5);
  }

  function drawTopBar(ctx, state, audio) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 15, 13, 0.86)';
    ctx.fillRect(14, 14, VIEW.width - 28, LAYOUT.topBarH - 10);
    ctx.strokeStyle = 'rgba(230, 190, 108, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14, LAYOUT.topBarH + 4); ctx.lineTo(VIEW.width - 14, LAYOUT.topBarH + 4); ctx.stroke();

    drawSuitEmblem(ctx, 'solar', 44, 38, 12);
    drawText(ctx, 'SUNSTONE GAMBIT', 64, 38, `800 19px ${FONT_UI}`, PALETTE.goldBright, 'left');

    drawPanel(ctx, 254, 21, 274, 32, 16, 'rgba(230,190,108,0.14)', null);
    drawText(ctx, `MATCH ${state.rivalIndex + 1}/${RIVALS.length} · TURN ${state.turn} · ${state.rival.name.toUpperCase()}`, 391, 37, `700 12.5px ${FONT_UI}`, PALETTE.ivory);

    // Compact geometric Suit Counter Triangle legend
    const lx = 556;
    drawPanel(ctx, lx - 14, 20, 224, 34, 17, 'rgba(12,28,24,0.9)', 'rgba(230,190,108,0.25)', 1.2);
    drawSuitEmblem(ctx, 'solar', lx + 6, 37, 10);
    drawText(ctx, '>', lx + 25, 37, `800 13px ${FONT_UI}`, PALETTE.gold);
    drawSuitEmblem(ctx, 'verdant', lx + 44, 37, 10);
    drawText(ctx, '>', lx + 63, 37, `800 13px ${FONT_UI}`, PALETTE.gold);
    drawSuitEmblem(ctx, 'tide', lx + 82, 37, 10);
    drawText(ctx, '>', lx + 101, 37, `800 13px ${FONT_UI}`, PALETTE.gold);
    drawSuitEmblem(ctx, 'solar', lx + 120, 37, 10);
    drawText(ctx, '·', lx + 137, 37, `800 13px ${FONT_UI}`, '#d4a6ff');
    drawSuitEmblem(ctx, 'eclipse', lx + 153, 37, 10);
    drawText(ctx, 'PIERCE', lx + 184, 37, `700 11px ${FONT_UI}`, '#e5c2ff');

    drawPanel(ctx, 792, 21, 168, 34, 17, 'rgba(255,201,77,0.16)', 'rgba(255,201,77,0.55)', 1.2);
    drawText(ctx, `SCORE  ${state.score}`, 876, 38, `800 15px ${FONT_UI}`, PALETTE.goldBright);

    for (const [x, w, lbl, active] of [
      [980, 86, 'RULES (H)', state.helpOpen],
      [1076, 88, audio.isMuted() ? 'MUTED (M)' : 'SOUND (M)', !audio.isMuted()],
      [1174, 78, 'TITLE', false],
    ]) {
      drawPanel(ctx, x, 22, w, 32, 8, active ? 'rgba(230,190,108,0.25)' : 'rgba(255,255,255,0.08)', active ? PALETTE.gold : 'rgba(230,190,108,0.35)', 1.2);
      drawText(ctx, lbl, x + w / 2, 38, `700 12px ${FONT_UI}`, PALETTE.ivory);
    }
    ctx.restore();
  }

  function drawCombatantHud(ctx, box, label, subtitle, combatant, accent, isPlayer, emblemSuit) {
    ctx.save();
    drawPanel(ctx, box.x, box.y, box.w, box.h, 14, 'rgba(8,17,15,0.9)', isPlayer ? 'rgba(230,190,108,0.55)' : `${accent}99`, 2);
    drawSuitEmblem(ctx, emblemSuit, box.x + 26, box.y + 26, 13);
    drawText(ctx, label, box.x + 46, box.y + 22, `800 17px ${FONT_UI}`, PALETTE.ivory, 'left');
    drawText(ctx, subtitle, box.x + 46, box.y + 39, `600 11px ${FONT_UI}`, 'rgba(248,242,228,0.65)', 'left');

    const barX = box.x + 14;
    const barY = box.y + 56;
    const barW = box.w - 28;
    const barH = 26;
    const hpRatio = Math.max(0, Math.min(1, combatant.hp / combatant.maxHp));
    drawPanel(ctx, barX, barY, barW, barH, 8, '#251013', null);
    if (hpRatio > 0) {
      const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
      hpGrad.addColorStop(0, '#c82936');
      hpGrad.addColorStop(1, '#ff636d');
      drawPanel(ctx, barX, barY, Math.max(12, barW * hpRatio), barH, 8, hpGrad, null);
    }
    drawPanel(ctx, barX, barY, barW, barH, 8, null, 'rgba(255,255,255,0.25)', 1.2);
    drawText(ctx, `♥  ${combatant.hp} / ${combatant.maxHp} HP`, barX + barW / 2, barY + barH / 2 + 1, `900 16px ${FONT_UI}`, '#ffffff');

    const rowY = box.y + 98;
    drawPanel(ctx, barX, rowY, 96, 28, 7, combatant.ward > 0 ? 'rgba(37,184,255,0.25)' : 'rgba(255,255,255,0.06)', combatant.ward > 0 ? '#4dd2ff' : 'rgba(255,255,255,0.14)', 1.2);
    drawText(ctx, `🛡 ${combatant.ward} WARD`, barX + 48, rowY + 15, `800 14px ${FONT_UI}`, combatant.ward > 0 ? '#9beeff' : 'rgba(255,255,255,0.55)');
    drawPanel(ctx, barX + 106, rowY, 98, 28, 7, 'rgba(255,255,255,0.06)', 'rgba(230,190,108,0.25)', 1.2);
    drawText(ctx, `DECK ${combatant.deck.length}`, barX + 155, rowY + 15, `700 13px ${FONT_UI}`, PALETTE.goldBright);

    if (isPlayer) {
      const orbY = box.y + 148;
      drawText(ctx, 'AETHER', barX, orbY, `800 13px ${FONT_UI}`, PALETTE.gold, 'left');
      const slots = Math.max(combatant.maxEnergy, combatant.energy);
      for (let i = 0; i < slots; i += 1) {
        const filled = i < combatant.energy;
        ctx.save();
        ctx.translate(barX + 74 + i * 26, orbY);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = filled ? '#ffc94d' : 'rgba(255,255,255,0.12)';
        ctx.strokeStyle = filled ? '#fff3bf' : 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1.6;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
      }
      drawText(ctx, `${combatant.energy}/${combatant.maxEnergy}`, box.x + box.w - 14, orbY + 1, `900 15px ${FONT_UI}`, PALETTE.goldBright, 'right');
    }
    ctx.restore();
  }

  function drawArenaSlots(ctx, state) {
    ctx.save();
    LAYOUT.opponentIntentSlots.forEach((slot, i) => {
      const w = CARD.width * 0.77;
      const h = CARD.height * 0.77;
      const intent = state.opponent.intents[i];
      ctx.setLineDash([6, 5]);
      drawPanel(ctx, slot.x - w / 2, slot.y - h / 2, w, h, 11, 'rgba(0,0,0,0.28)', intent?.revealed ? 'rgba(255,118,92,0.65)' : 'rgba(184,109,255,0.45)', 2);
      ctx.setLineDash([]);

      if (intent) {
        const suit = SUITS[intent.card.suit];
        const tag = intent.revealed ? `INTENT · ${suit.name.toUpperCase()} ${intent.card.value}` : `HIDDEN · ${suit.name.toUpperCase()} AURA`;
        const py = slot.y - h / 2 - 20;
        drawPanel(ctx, slot.x - 66, py, 132, 18, 9, intent.revealed ? 'rgba(185,40,32,0.92)' : `${suit.dark}ee`, suit.bright, 1);
        drawText(ctx, tag, slot.x, py + 9.5, `800 9.5px ${FONT_UI}`, '#ffffff');
      }
    });

    const isDragging = state.draggingHandIndex >= 0;
    LAYOUT.playerChainSlots.forEach((slot, i) => {
      const w = CARD.width * 0.78;
      const h = CARD.height * 0.78;
      const filled = i < state.player.chain.length;
      const nextOpen = i === state.player.chain.length;
      drawPanel(
        ctx, slot.x - w / 2, slot.y - h / 2, w, h, 11,
        filled ? 'rgba(230,190,108,0.08)' : nextOpen && isDragging ? 'rgba(255,224,120,0.18)' : 'rgba(0,0,0,0.25)',
        nextOpen ? (isDragging ? '#ffe58f' : 'rgba(230,190,108,0.65)') : 'rgba(230,190,108,0.28)',
        nextOpen ? 2.2 : 1.5,
      );
      if (!filled) {
        drawText(ctx, `CHAIN SLOT ${i + 1}`, slot.x, slot.y - 8, `800 11px ${FONT_UI}`, nextOpen ? 'rgba(255,232,165,0.65)' : 'rgba(230,190,108,0.32)');
        drawText(ctx, i < 2 ? `Clashes Slot ${i + 1}` : 'Finisher Bonus', slot.x, slot.y + 10, `600 10px ${FONT_UI}`, nextOpen ? 'rgba(255,232,165,0.55)' : 'rgba(230,190,108,0.28)');
      }
    });

    for (let i = 0; i < state.player.chain.length - 1; i += 1) {
      const a = LAYOUT.playerChainSlots[i];
      const b = LAYOUT.playerChainSlots[i + 1];
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, SUITS[state.player.chain[i].suit].bright);
      grad.addColorStop(1, SUITS[state.player.chain[i + 1].suit].bright);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a.x + 50, a.y); ctx.lineTo(b.x - 50, b.y); ctx.stroke();
    }

    for (let i = 0; i < Math.min(2, state.opponent.intents.length); i += 1) {
      const oSlot = LAYOUT.opponentIntentSlots[i];
      const pSlot = LAYOUT.playerChainSlots[i];
      const clash = state.activeClashes.find((c) => c.slot === i);
      ctx.strokeStyle = clash ? clash.color : 'rgba(230,190,108,0.22)';
      ctx.lineWidth = clash ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(oSlot.x, oSlot.y + 72); ctx.lineTo(pSlot.x, pSlot.y - 74); ctx.stroke();
      if (clash) {
        drawPanel(ctx, oSlot.x - 62, 304, 124, 22, 11, '#0f201a', clash.color, 1.6);
        drawText(ctx, clash.label, oSlot.x, 315.5, `800 10px ${FONT_UI}`, clash.color);
      }
    }
    ctx.restore();
  }

  function drawComboTacticsPanel(ctx, state) {
    const x = 838;
    const y = 128;
    const w = 406;
    const h = 398;
    ctx.save();
    drawPanel(ctx, x, y, w, h, 16, 'rgba(8,18,16,0.88)', 'rgba(230,190,108,0.42)', 1.8);
    drawText(ctx, 'RITUAL CHAIN & TACTICS', x + 18, y + 26, `800 15px ${FONT_UI}`, PALETTE.goldBright, 'left');

    const combo = state.activeCombos;
    const mult = combo ? combo.multiplier : 1;
    drawPanel(ctx, x + w - 92, y + 12, 76, 26, 13, mult > 1 ? 'rgba(255,201,77,0.24)' : 'rgba(255,255,255,0.08)', mult > 1 ? '#ffc94d' : 'rgba(255,255,255,0.2)', 1.2);
    drawText(ctx, `×${mult.toFixed(2)} PTS`, x + w - 54, y + 25, `800 13px ${FONT_UI}`, mult > 1 ? '#ffe899' : '#c6d4ce');

    let dmg = combo?.damage ?? 0;
    let pierce = combo?.pierceDamage ?? 0;
    let ward = combo?.ward ?? 0;
    let heal = combo?.heal ?? 0;
    for (const c of state.player.chain) {
      if (c.pierce) pierce += c.damage ?? 0;
      else dmg += c.damage ?? 0;
      ward += c.ward ?? 0;
      heal += c.heal ?? 0;
    }
    for (const cl of state.activeClashes) { dmg += cl.bonusDamage; ward += cl.bonusWard; }

    [
      ['STRIKE', `${dmg + pierce}`, '#ff7456', 'rgba(255,93,56,0.16)'],
      ['WARD', `${ward}`, '#5bd3ff', 'rgba(37,184,255,0.16)'],
      ['MEND', `+${heal}`, '#5cf0a8', 'rgba(41,219,132,0.16)'],
    ].forEach(([lbl, val, col, bg], idx) => {
      const sx = x + 16 + idx * 126;
      drawPanel(ctx, sx, y + 54, 118, 56, 10, bg, `${col}66`, 1.2);
      drawText(ctx, val, sx + 59, y + 77, `900 22px ${FONT_UI}`, col);
      drawText(ctx, lbl, sx + 59, y + 98, `700 10px ${FONT_UI}`, 'rgba(248,242,228,0.8)');
    });

    let cy = y + 132;
    drawText(ctx, 'ACTIVE SYNERGIES', x + 18, cy, `800 12px ${FONT_UI}`, 'rgba(230,190,108,0.85)', 'left');
    cy += 16;

    const badges = [
      ...(combo?.triggers ?? []),
      ...state.activeClashes.map((c) => ({ label: c.label, detail: `+${c.bonusDamage} DMG · Rival -${c.opponentPenalty} Power`, color: c.color })),
    ];

    if (badges.length === 0) {
      drawPanel(ctx, x + 16, cy, w - 32, 68, 10, 'rgba(255,255,255,0.04)', null);
      drawText(ctx, '• Match 2+ Suits for Elemental Resonance', x + 28, cy + 18, `600 12px ${FONT_UI}`, 'rgba(248,242,228,0.72)', 'left');
      drawText(ctx, '• Match Values (Pair) or ascend (2→4→7) for Cascade', x + 28, cy + 37, `600 12px ${FONT_UI}`, 'rgba(248,242,228,0.72)', 'left');
      drawText(ctx, '• Counter opponent Slot 1 suit for Parry bonus!', x + 28, cy + 56, `600 12px ${FONT_UI}`, 'rgba(248,242,228,0.72)', 'left');
    } else {
      for (const b of badges.slice(0, 3)) {
        drawPanel(ctx, x + 16, cy, w - 32, 36, 9, 'rgba(255,255,255,0.07)', `${b.color}aa`, 1.4);
        drawText(ctx, b.label, x + 28, cy + 13, `800 12px ${FONT_UI}`, b.color, 'left');
        drawText(ctx, b.detail, x + 28, cy + 27, `600 11px ${FONT_UI}`, PALETTE.ivory, 'left');
        cy += 42;
      }
    }

    const ty = y + h - 102;
    drawPanel(ctx, x + 16, ty, w - 32, 54, 10, 'rgba(180,42,42,0.18)', 'rgba(255,102,110,0.45)', 1.2);
    drawText(ctx, 'RIVAL TELEGRAPHED LEAD', x + 28, ty + 16, `800 11px ${FONT_UI}`, '#ff989e', 'left');
    const lead = state.opponent.intents[0];
    if (lead) {
      const counterSuit = SUITS[SUITS[lead.card.suit].counteredBy];
      drawText(ctx, `${lead.card.name} (${lead.card.shortText})`, x + 28, ty + 36, `700 13px ${FONT_UI}`, PALETTE.ivory, 'left');
      drawText(ctx, `Counter: ${counterSuit.name.toUpperCase()}`, x + w - 26, ty + 36, `800 11px ${FONT_UI}`, counterSuit.bright, 'right');
    }
    drawText(ctx, state.lastTurnSummary.slice(0, 56), x + 18, y + h - 22, `600 11px ${FONT_UI}`, 'rgba(248,242,228,0.72)', 'left');
    ctx.restore();
  }

  function drawActionButtons(ctx, state) {
    ctx.save();
    const eb = LAYOUT.endTurnBtn;
    const ready = state.phase === 'player';
    const hasChain = state.player.chain.length > 0;
    const btnGrad = ctx.createLinearGradient(eb.x, eb.y, eb.x, eb.y + eb.h);
    if (!ready) { btnGrad.addColorStop(0, '#3a4240'); btnGrad.addColorStop(1, '#262d2b'); }
    else if (hasChain) { btnGrad.addColorStop(0, '#f2be54'); btnGrad.addColorStop(1, '#c77c1f'); }
    else { btnGrad.addColorStop(0, '#2c6e5c'); btnGrad.addColorStop(1, '#1a473b'); }
    drawPanel(ctx, eb.x, eb.y, eb.w, eb.h, 13, btnGrad, hasChain ? '#fff1bd' : PALETTE.gold, 2);
    drawText(ctx, hasChain ? 'RESOLVE CLASH (E)' : 'END TURN (E)', eb.x + eb.w / 2, eb.y + eb.h / 2, `900 17px ${FONT_UI}`, hasChain ? '#1b1104' : PALETTE.ivory);

    const sb = LAYOUT.swapBtn;
    const canSwap = ready && state.swapsLeft > 0 && state.player.hand.length > 0;
    drawPanel(
      ctx, sb.x, sb.y, sb.w, sb.h, 11,
      state.swapMode ? 'rgba(37,184,255,0.34)' : canSwap ? 'rgba(20,48,44,0.92)' : 'rgba(20,26,25,0.6)',
      state.swapMode ? '#8ceaff' : canSwap ? 'rgba(140,234,255,0.55)' : 'rgba(255,255,255,0.14)',
      1.6,
    );
    drawText(ctx, state.swapMode ? 'CLICK CARD TO SWAP' : `SWAP CARD (S) · ${state.swapsLeft} LEFT`, sb.x + sb.w / 2, sb.y + sb.h / 2, `800 13px ${FONT_UI}`, canSwap ? '#d4f6ff' : 'rgba(255,255,255,0.35)');
    ctx.restore();
  }

  function drawAllCards(ctx, state, anim) {
    const entries = [];
    for (const card of state.opponent.hand) {
      const a = anim.cards.get(card.uid);
      if (a) entries.push({ card, anim: a, opts: { playable: true, time: state.time } });
    }
    for (const intent of state.opponent.intents) {
      const a = anim.cards.get(intent.card.uid);
      if (a) entries.push({ card: intent.card, anim: a, opts: { playable: true, foil: intent.revealed, time: state.time } });
    }
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
      const hints = previewCardSynergy(card, state.player.chain, state.opponent.intents);
      entries.push({
        card,
        anim: a,
        opts: {
          playable: playable || state.swapMode,
          hovered,
          selected,
          foil: Boolean(card.rare || hints.length > 0),
          counterHint: (hovered || selected) && hints.length > 0 ? hints[0].label : null,
          time: state.time,
          hotkey: i + 1,
        },
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
        ctx.fillStyle = 'rgba(8,17,15,0.9)'; ctx.fill();
        ctx.strokeStyle = 'rgba(230,190,108,0.72)'; ctx.lineWidth = 1.3; ctx.stroke();
        drawText(ctx, String(item.opts.hotkey), bx, by + 0.5, `800 11px ${FONT_UI}`, PALETTE.goldBright);
        ctx.restore();
      }
    }
  }

  function drawTitleScreen(ctx, state) {
    ctx.save();
    const veil = ctx.createRadialGradient(VIEW.width / 2, 260, 120, VIEW.width / 2, VIEW.height / 2, 760);
    veil.addColorStop(0, 'rgba(10, 28, 24, 0.25)');
    veil.addColorStop(1, 'rgba(4, 10, 9, 0.84)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    drawSuitEmblem(ctx, 'solar', VIEW.width / 2 - 294, 92, 22, { glow: true });
    drawSuitEmblem(ctx, 'eclipse', VIEW.width / 2 + 294, 92, 22, { glow: true });
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18;
    drawText(ctx, 'SUNSTONE GAMBIT', VIEW.width / 2, 92, `900 54px ${FONT_TITLE}`, PALETTE.goldBright);
    ctx.shadowBlur = 0;
    drawText(ctx, 'TACTICAL SUIT-COMBO CARD DUEL · READ, CHAIN & COUNTER YOUR RIVAL', VIEW.width / 2, 138, `700 17px ${FONT_UI}`, '#cbe6dc');

    HERO_CARDS.forEach((card, i) => {
      if (!card) return;
      const offset = i - 1.5;
      ctx.save();
      ctx.translate(VIEW.width / 2 + offset * 158, 304 + Math.abs(offset) * 16 + Math.sin(state.time * 1.9 + i * 0.9) * 4);
      ctx.rotate(offset * 0.085);
      ctx.scale(1.06, 1.06);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 12;
      drawCardFace(ctx, card, CARD.width, CARD.height, { playable: true, foil: true, time: state.time + i * 0.6 });
      ctx.restore();
    });

    drawText(ctx, 'CHOOSE YOUR RIVAL', VIEW.width / 2, 450, `800 13px ${FONT_UI}`, PALETTE.gold);
    RIVALS.forEach((rival, idx) => {
      const rx = VIEW.width / 2 - 392 + idx * 268;
      const sel = state.rivalIndex === idx;
      drawPanel(ctx, rx, 468, 248, 64, 12, sel ? 'rgba(230,190,108,0.2)' : 'rgba(8,18,16,0.84)', sel ? PALETTE.goldBright : 'rgba(230,190,108,0.32)', sel ? 2.4 : 1.4);
      const suitId = rival.id === 'pyromancer' ? 'solar' : rival.id === 'sovereign' ? 'eclipse' : 'tide';
      drawSuitEmblem(ctx, suitId, rx + 28, 500, 15);
      drawText(ctx, rival.name, rx + 52, 491, `800 16px ${FONT_UI}`, PALETTE.ivory, 'left');
      drawText(ctx, `${rival.hp} HP · ${rival.title}`, rx + 52, 512, `600 12px ${FONT_UI}`, 'rgba(248,242,228,0.7)', 'left');
    });

    const playGrad = ctx.createLinearGradient(0, 558, 0, 620);
    playGrad.addColorStop(0, '#ffd875');
    playGrad.addColorStop(1, '#d1841d');
    drawPanel(ctx, VIEW.width / 2 - 144, 558, 288, 62, 15, playGrad, '#fff5d1', 2.5);
    drawText(ctx, 'PLAY DUEL  ▶', VIEW.width / 2, 590, `900 24px ${FONT_UI}`, '#1b1004');
    drawText(ctx, 'MOUSE: Click / Drag Cards   ·   KEYBOARD: 1–5 Play · ←/→ Select · S Swap · E Resolve Clash · H Rules · M Audio', VIEW.width / 2, 654, `700 13px ${FONT_UI}`, 'rgba(220,240,232,0.85)');

    [184, 412, 672, 938].forEach((lx, idx) => {
      const s = SUITS[SUIT_ORDER[idx]];
      drawSuitEmblem(ctx, s.id, lx, 684, 9.5);
      drawText(ctx, `${s.name}: ${s.resonanceText}`, lx + 17, 685, `700 12.5px ${FONT_UI}`, s.bright, 'left');
    });
    ctx.restore();
  }

  function drawEndOverlay(ctx, state, isVictory, anim) {
    ctx.save();
    ctx.fillStyle = isVictory ? 'rgba(6, 20, 14, 0.68)' : 'rgba(18, 6, 12, 0.74)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const aura = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 30, VIEW.width / 2, VIEW.height / 2, 420);
    aura.addColorStop(0, isVictory ? 'rgba(255, 214, 102, 0.30)' : 'rgba(232, 69, 93, 0.24)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (anim) anim.renderFrontEffects(ctx);

    const mw = 640;
    const mh = 436;
    const mx = (VIEW.width - mw) / 2;
    const my = (VIEW.height - mh) / 2;
    drawPanel(ctx, mx, my, mw, mh, 22, isVictory ? 'rgba(10,28,22,0.95)' : 'rgba(24,11,18,0.95)', isVictory ? '#ffe28a' : '#ff6878', 3);
    drawSuitEmblem(ctx, isVictory ? 'solar' : 'eclipse', VIEW.width / 2, my + 48, 24);
    drawText(ctx, isVictory ? 'VICTORY!' : 'DEFEAT', VIEW.width / 2, my + 104, `900 50px ${FONT_TITLE}`, isVictory ? '#ffe896' : '#ff7b88');
    drawText(
      ctx,
      isVictory
        ? `${state.rival.name} vanquished in ${state.turn} turns — the Sunstone shines!`
        : `${state.rival.name} claimed the table on Turn ${state.turn} — study their tell & strike back!`,
      VIEW.width / 2, my + 146, `700 16px ${FONT_UI}`, PALETTE.ivory,
    );

    [
      ['FINAL SCORE', String(state.score), '#ffe078'],
      ['LIFE REMAINING', `${state.player.hp} / ${state.player.maxHp}`, isVictory ? '#5cf0a8' : '#ff7b88'],
      ['DAMAGE DEALT', String(state.totalDamageDealt), '#ff8f6b'],
      ['COMBOS TRIGGERED', String(state.combosTriggered), '#8ceaff'],
      ['COUNTERS LANDED', String(state.countersLanded), '#dfadff'],
      ['BEST SYNERGY', state.bestComboLabel, PALETTE.ivory],
    ].forEach(([k, v, c], i) => {
      const sx = mx + 34 + (i % 3) * 194;
      const sy = my + 178 + Math.floor(i / 3) * 78;
      drawPanel(ctx, sx, sy, 182, 66, 11, 'rgba(255,255,255,0.06)', 'rgba(230,190,108,0.25)', 1.2);
      drawText(ctx, k, sx + 91, sy + 19, `700 10px ${FONT_UI}`, 'rgba(248,242,228,0.65)');
      drawText(ctx, v, sx + 91, sy + 44, v.length > 10 ? `800 13px ${FONT_UI}` : `900 22px ${FONT_UI}`, c);
    });

    const btnY = my + mh - 76;
    drawPanel(ctx, VIEW.width / 2 - 224, btnY, 208, 52, 12, isVictory ? '#f2be54' : '#e8455d', PALETTE.goldBright, 1.8);
    drawText(ctx, isVictory ? 'NEXT RIVAL (ENTER)' : 'REMATCH (ENTER)', VIEW.width / 2 - 120, btnY + 26, `900 15px ${FONT_UI}`, isVictory ? '#1b1104' : '#ffffff');
    drawPanel(ctx, VIEW.width / 2 + 16, btnY, 208, 52, 12, 'rgba(255,255,255,0.14)', PALETTE.goldBright, 1.8);
    drawText(ctx, 'TITLE SCREEN (T)', VIEW.width / 2 + 120, btnY + 26, `900 15px ${FONT_UI}`, PALETTE.ivory);
    ctx.restore();
  }

  function drawHelpModal(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 10, 9, 0.78)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const x = (VIEW.width - 680) / 2;
    const y = (VIEW.height - 420) / 2;
    drawPanel(ctx, x, y, 680, 420, 18, '#0c201b', PALETTE.gold, 2.4);
    drawText(ctx, 'HOW TO PLAY SUNSTONE GAMBIT', VIEW.width / 2, y + 40, `900 26px ${FONT_UI}`, PALETTE.goldBright);
    [
      '1. Spend up to 4 Aether each turn to stage up to 3 cards into the Ritual Chain.',
      '2. Combine cards in MULTIPLE ways: Same-Suit Resonance (2+ cards), Twin Echo (equal values),',
      '   Ascending Cascade (3 strictly rising values, e.g. 2→4→7), or Prismatic Triad (3 suits).',
      '3. Read your rival’s telegraphed Slot 1 card and COUNTER it for Parry bonus + Enemy Stagger:',
      '   Solar beats Verdant · Verdant beats Tide · Tide beats Solar · Eclipse pierces Ward & reveals!',
      '4. Press RESOLVE CLASH (E) to unleash your chain, block incoming damage with Ward, and win!',
      '5. Controls: Click or Drag cards · Keys 1–5 play · ←/→ select · S free Swap · H toggle help.',
    ].forEach((line, i) => drawText(ctx, line, x + 36, y + 94 + i * 34, `600 14px ${FONT_UI}`, PALETTE.ivory, 'left'));
    drawPanel(ctx, VIEW.width / 2 - 110, y + 348, 220, 46, 12, '#f2be54', PALETTE.goldBright, 1.8);
    drawText(ctx, 'CLOSE RULES (H)', VIEW.width / 2, y + 371, `900 15px ${FONT_UI}`, '#1b1104');
    ctx.restore();
  }

  function render(ctx, state, anim, audio) {
    ctx.save();
    ctx.translate(anim.shake?.ox ?? 0, anim.shake?.oy ?? 0);
    drawTabletopBackground(ctx, state.time);

    if (state.screen === SCREEN_TITLE) {
      drawTitleScreen(ctx, state);
      ctx.restore();
      return;
    }

    drawTopBar(ctx, state, audio);

    if (state.player.deck.length > 0) {
      const layers = Math.min(3, Math.ceil(state.player.deck.length / 6));
      for (let k = 0; k < layers; k += 1) {
        ctx.save();
        ctx.translate(LAYOUT.deckPile.x - k * 2, LAYOUT.deckPile.y - k * 2);
        ctx.scale(0.52, 0.52);
        drawCardBack(ctx, CARD.width, CARD.height, PALETTE.gold);
        ctx.restore();
      }
      drawText(ctx, `DRAW (${state.player.deck.length})`, LAYOUT.deckPile.x, LAYOUT.deckPile.y + 62, `800 11px ${FONT_UI}`, PALETTE.goldBright);
    }

    drawPanel(ctx, LAYOUT.discardPile.x - 36, LAYOUT.discardPile.y - 50, 72, 100, 8, 'rgba(0,0,0,0.28)', 'rgba(230,190,108,0.3)', 1.4);
    if (state.player.discard.length > 0) {
      ctx.save();
      ctx.translate(LAYOUT.discardPile.x, LAYOUT.discardPile.y);
      ctx.scale(0.52, 0.52);
      drawCardFace(ctx, state.player.discard[state.player.discard.length - 1], CARD.width, CARD.height, { playable: false, time: state.time });
      ctx.restore();
    }
    drawText(ctx, `DISCARD (${state.player.discard.length})`, LAYOUT.discardPile.x, LAYOUT.discardPile.y + 62, `700 11px ${FONT_UI}`, 'rgba(248,242,228,0.72)');

    const oppSuit = state.rival.id === 'pyromancer' ? 'solar' : state.rival.id === 'sovereign' ? 'eclipse' : 'tide';
    drawCombatantHud(ctx, LAYOUT.opponentHud, state.rival.name, state.rival.title, state.opponent, state.rival.accent, false, oppSuit);
    drawCombatantHud(ctx, LAYOUT.playerHud, 'You · Sunkeeper', 'Master of the Table', state.player, PALETTE.gold, true, 'solar');

    drawArenaSlots(ctx, state);
    drawComboTacticsPanel(ctx, state);
    drawActionButtons(ctx, state);

    anim.renderBackEffects(ctx);
    drawAllCards(ctx, state, anim);

    if (state.draggingHandIndex >= 0) {
      const nextSlot = LAYOUT.playerChainSlots[Math.min(2, state.player.chain.length)];
      ctx.save();
      ctx.strokeStyle = '#ffe58f';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.moveTo(state.dragX, state.dragY - 40);
      ctx.quadraticCurveTo((state.dragX + nextSlot.x) / 2, Math.min(state.dragY, nextSlot.y) - 90, nextSlot.x, nextSlot.y);
      ctx.stroke();
      ctx.restore();
    }

    if (state.screen === SCREEN_VICTORY) drawEndOverlay(ctx, state, true, anim);
    else if (state.screen === SCREEN_DEFEAT) drawEndOverlay(ctx, state, false, anim);
    else {
      anim.renderFrontEffects(ctx);
      if (state.helpOpen) drawHelpModal(ctx);
    }

    ctx.restore();
  }

  return { render };
}
