// Unified Mouse (hover tilt, click, drag-to-arena, chain retract) and Keyboard controller.

import { CARD, LAYOUT, VIEW } from './config.js';
import { RELICS, RIVALS } from './cards.js';
import { SCREEN_DEFEAT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './rules.js';

export function attachInputController(canvas, engine, anim, audio, onAnnounce) {
  let downX = 0; let downY = 0; let pressedIdx = -1;

  const toLogical = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left) * (VIEW.width / Math.max(1, r.width)), y: (cy - r.top) * (VIEW.height / Math.max(1, r.height)) };
  };
  const hitRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  function hitCardList(list, px, py) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const a = anim.cards.get(list[i].uid);
      if (!a) continue;
      const hw = (CARD.width * a.scale) / 2;
      const hh = (CARD.height * a.scale) / 2;
      if (px >= a.x - hw && px <= a.x + hw && py >= a.y - hh && py <= a.y + hh) return i;
    }
    return -1;
  }

  function handlePointerMove(ev) {
    const { x, y } = toLogical(ev.clientX, ev.clientY);
    const st = engine.state;
    if (st.screen !== SCREEN_PLAY || st.helpOpen) { canvas.style.cursor = 'pointer'; return; }
    if (st.phase !== 'player') { canvas.style.cursor = 'default'; return; }

    if (pressedIdx >= 0) {
      if (Math.hypot(x - downX, y - downY) > 10 && st.draggingHandIndex < 0 && !st.swapMode) st.draggingHandIndex = pressedIdx;
      if (st.draggingHandIndex >= 0) {
        st.dragX = x; st.dragY = y; engine.syncCardTargets(false); canvas.style.cursor = 'grabbing'; return;
      }
    }

    const hovered = hitCardList(st.player.hand, x, y);
    if (hovered !== st.hoveredHandIndex) {
      st.hoveredHandIndex = hovered;
      if (hovered >= 0) audio.playHover();
      engine.syncCardTargets(false);
    }
    if (hovered >= 0) {
      const a = anim.cards.get(st.player.hand[hovered].uid);
      if (a) {
        a.tiltX = Math.max(-1, Math.min(1, (x - a.x) / (CARD.width * 0.5)));
        a.tiltY = Math.max(-1, Math.min(1, (y - a.y) / (CARD.height * 0.5)));
      }
    }

    const overChain = hitCardList(st.player.chain, x, y) >= 0;
    const interactive = hovered >= 0 || overChain || hitRect(x, y, LAYOUT.endTurnBtn) || hitRect(x, y, LAYOUT.swapBtn) || y <= LAYOUT.topBarH + 4;
    canvas.style.cursor = interactive ? 'pointer' : 'default';
  }

  function handlePointerDown(ev) {
    audio.unlock();
    const { x, y } = toLogical(ev.clientX, ev.clientY);
    const st = engine.state;
    downX = x; downY = y; pressedIdx = -1;

    if (st.screen === SCREEN_TITLE) {
      for (let i = 0; i < RIVALS.length; i += 1) {
        const rx = VIEW.width / 2 - 418 + i * 284;
        if (hitRect(x, y, { x: rx, y: 412, w: 268, h: 66 })) { st.rivalIndex = i; audio.playHover(); return; }
      }
      for (let i = 0; i < RELICS.length; i += 1) {
        const rx = VIEW.width / 2 - 418 + i * 284;
        if (hitRect(x, y, { x: rx, y: 492, w: 268, h: 42 })) { st.relicIndex = i; st.relic = RELICS[i]; audio.playHover(); return; }
      }
      if (hitRect(x, y, { x: VIEW.width / 2 - 166, y: 554, w: 332, h: 68 })) {
        engine.startDuel(st.rivalIndex, st.seed + 1);
        onAnnounce(`Started duel against ${st.rival.name}.`);
      }
      return;
    }

    if (st.screen === SCREEN_VICTORY || st.screen === SCREEN_DEFEAT) {
      const btnY = (VIEW.height - 390) / 2 + 390 - 74;
      if (hitRect(x, y, { x: VIEW.width / 2 - 226, y: btnY, w: 212, h: 54 })) {
        const nextRival = st.screen === SCREEN_VICTORY ? (st.rivalIndex + 1) % RIVALS.length : st.rivalIndex;
        engine.startDuel(nextRival, st.seed + 3);
      } else if (hitRect(x, y, { x: VIEW.width / 2 + 14, y: btnY, w: 212, h: 54 })) {
        engine.openTitle(st.seed);
      }
      return;
    }

    if (st.helpOpen) { st.helpOpen = false; audio.playHover(); return; }

    if (hitRect(x, y, { x: 978, y: 22, w: 88, h: 32 })) { st.helpOpen = !st.helpOpen; audio.playHover(); return; }
    if (hitRect(x, y, { x: 1076, y: 22, w: 90, h: 32 })) { audio.toggleMute(); return; }
    if (hitRect(x, y, { x: 1176, y: 22, w: 76, h: 32 })) { engine.openTitle(st.seed); return; }
    if (hitRect(x, y, LAYOUT.endTurnBtn)) { if (engine.endTurn(false)) onAnnounce('Resolving clash.'); return; }
    if (hitRect(x, y, LAYOUT.swapBtn)) {
      if (st.phase === 'player' && st.swapsLeft > 0) { st.swapMode = !st.swapMode; audio.playHover(); }
      return;
    }

    if (st.phase !== 'player') return;

    // Click staged chain card to retract it back to hand (if retractable)
    const chainIdx = hitCardList(st.player.chain, x, y);
    if (chainIdx >= 0) {
      if (engine.retractChainCard(chainIdx, false)) onAnnounce(st.lastTurnSummary);
      return;
    }

    const handIdx = hitCardList(st.player.hand, x, y);
    if (handIdx >= 0) { pressedIdx = handIdx; st.selectedHandIndex = handIdx; engine.syncCardTargets(false); }
  }

  function handlePointerUp(ev) {
    const { y } = toLogical(ev.clientX, ev.clientY);
    const st = engine.state;
    if (st.screen !== SCREEN_PLAY) return;

    if (st.draggingHandIndex >= 0) {
      const idx = st.draggingHandIndex;
      st.draggingHandIndex = -1; pressedIdx = -1;
      if (y < 515 && engine.playCardFromHand(idx, false)) onAnnounce(st.lastTurnSummary);
      else engine.syncCardTargets(false);
      return;
    }
    if (pressedIdx >= 0) {
      const idx = pressedIdx; pressedIdx = -1;
      if (st.swapMode) { if (engine.swapHandCard(idx, false)) onAnnounce(st.lastTurnSummary); }
      else if (engine.playCardFromHand(idx, false)) onAnnounce(st.lastTurnSummary);
    }
  }

  function handleKeyDown(ev) {
    audio.unlock();
    const st = engine.state;
    const key = ev.key;
    if (key === 'm' || key === 'M') { audio.toggleMute(); return; }
    if (key === 'h' || key === 'H' || key === '?') { if (st.screen === SCREEN_PLAY) { st.helpOpen = !st.helpOpen; audio.playHover(); } return; }
    if (key === 'Escape') { st.helpOpen = false; st.swapMode = false; st.selectedHandIndex = -1; engine.syncCardTargets(false); return; }

    if (st.screen === SCREEN_TITLE) {
      if (key === 'ArrowLeft') { st.rivalIndex = (st.rivalIndex + RIVALS.length - 1) % RIVALS.length; audio.playHover(); }
      else if (key === 'ArrowRight') { st.rivalIndex = (st.rivalIndex + 1) % RIVALS.length; audio.playHover(); }
      else if (key === 'ArrowUp' || key === 'ArrowDown') {
        st.relicIndex = (st.relicIndex + (key === 'ArrowDown' ? 1 : RELICS.length - 1)) % RELICS.length;
        st.relic = RELICS[st.relicIndex]; audio.playHover();
      } else if (key >= '1' && key <= '3') {
        st.relicIndex = Number(key) - 1; st.relic = RELICS[st.relicIndex]; audio.playHover();
      } else if (key === 'Enter' || key === ' ') { ev.preventDefault(); engine.startDuel(st.rivalIndex, st.seed + 1); }
      return;
    }
    if (st.screen === SCREEN_VICTORY || st.screen === SCREEN_DEFEAT) {
      if (key === 'Enter' || key === ' ' || key === 'r' || key === 'R') {
        ev.preventDefault();
        engine.startDuel(st.screen === SCREEN_VICTORY ? (st.rivalIndex + 1) % RIVALS.length : st.rivalIndex, st.seed + 3);
      } else if (key === 't' || key === 'T') engine.openTitle(st.seed);
      return;
    }
    if (st.helpOpen || st.phase !== 'player') return;

    if (key >= '1' && key <= '6') {
      const idx = Number(key) - 1;
      if (st.swapMode) engine.swapHandCard(idx, false);
      else engine.playCardFromHand(idx, false);
    } else if (key === 'ArrowLeft' && st.player.hand.length > 0) {
      st.selectedHandIndex = st.selectedHandIndex <= 0 ? st.player.hand.length - 1 : st.selectedHandIndex - 1;
      audio.playHover(); engine.syncCardTargets(false);
    } else if (key === 'ArrowRight' && st.player.hand.length > 0) {
      st.selectedHandIndex = (st.selectedHandIndex + 1) % st.player.hand.length;
      audio.playHover(); engine.syncCardTargets(false);
    } else if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      if (st.selectedHandIndex >= 0) {
        if (st.swapMode) engine.swapHandCard(st.selectedHandIndex, false);
        else engine.playCardFromHand(st.selectedHandIndex, false);
      } else engine.endTurn(false);
    } else if (key === 'e' || key === 'E') engine.endTurn(false);
    else if (key === 's' || key === 'S') {
      if (st.selectedHandIndex >= 0) engine.swapHandCard(st.selectedHandIndex, false);
      else if (st.swapsLeft > 0) { st.swapMode = !st.swapMode; audio.playHover(); }
    } else if (key === 'r' || key === 'R') engine.startDuel(st.rivalIndex, st.seed + 1);
  }

  function cancelDrag() {
    if (pressedIdx >= 0 || engine.state.draggingHandIndex >= 0) {
      pressedIdx = -1; engine.state.draggingHandIndex = -1; engine.syncCardTargets(false);
    }
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', cancelDrag);
  window.addEventListener('blur', cancelDrag);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', cancelDrag);
    window.removeEventListener('blur', cancelDrag);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
