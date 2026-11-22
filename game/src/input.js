// Unified Mouse (hover tilt, click, drag-to-arena) and Keyboard controller for Sunstone Gambit.

import { CARD, LAYOUT, VIEW } from './config.js';
import { RIVALS } from './cards.js';
import { SCREEN_DEFEAT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './rules.js';

export function attachInputController(canvas, engine, anim, audio, onAnnounce) {
  let pointerDownX = 0;
  let pointerDownY = 0;
  let pressedCardIndex = -1;

  function toLogicalCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW.width / Math.max(1, rect.width);
    const scaleY = VIEW.height / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function hitRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function hitHandCard(px, py) {
    const hand = engine.state.player.hand;
    // Check top-most (highest z) first
    for (let i = hand.length - 1; i >= 0; i -= 1) {
      const a = anim.cards.get(hand[i].uid);
      if (!a) continue;
      const hw = (CARD.width * a.scale) / 2;
      const hh = (CARD.height * a.scale) / 2;
      if (px >= a.x - hw && px <= a.x + hw && py >= a.y - hh && py <= a.y + hh) {
        return i;
      }
    }
    return -1;
  }

  function handlePointerMove(ev) {
    const { x, y } = toLogicalCoords(ev.clientX, ev.clientY);
    const st = engine.state;

    if (st.screen !== SCREEN_PLAY || st.helpOpen) {
      canvas.style.cursor = 'pointer';
      return;
    }

    if (st.phase !== 'player') {
      canvas.style.cursor = 'default';
      return;
    }

    if (pressedCardIndex >= 0) {
      const dist = Math.hypot(x - pointerDownX, y - pointerDownY);
      if (dist > 10 && st.draggingHandIndex < 0 && !st.swapMode) {
        st.draggingHandIndex = pressedCardIndex;
      }
      if (st.draggingHandIndex >= 0) {
        st.dragX = x;
        st.dragY = y;
        engine.syncCardTargets(false);
        canvas.style.cursor = 'grabbing';
        return;
      }
    }

    const hovered = hitHandCard(x, y);
    if (hovered !== st.hoveredHandIndex) {
      st.hoveredHandIndex = hovered;
      if (hovered >= 0) audio.playHover();
      engine.syncCardTargets(false);
    }

    // Update subtle 3D hover tilt on hovered card
    if (hovered >= 0) {
      const card = st.player.hand[hovered];
      const a = anim.cards.get(card.uid);
      if (a) {
        a.tiltX = Math.max(-1, Math.min(1, (x - a.x) / (CARD.width * 0.5)));
        a.tiltY = Math.max(-1, Math.min(1, (y - a.y) / (CARD.height * 0.5)));
      }
    }

    const overAction =
      hovered >= 0 ||
      hitRect(x, y, LAYOUT.endTurnBtn) ||
      hitRect(x, y, LAYOUT.swapBtn) ||
      y <= LAYOUT.topBarH + 4;
    canvas.style.cursor = overAction ? 'pointer' : 'default';
  }

  function handlePointerDown(ev) {
    audio.unlock();
    const { x, y } = toLogicalCoords(ev.clientX, ev.clientY);
    const st = engine.state;
    pointerDownX = x;
    pointerDownY = y;
    pressedCardIndex = -1;

    if (st.screen === SCREEN_TITLE) {
      // Check rival selector cards
      for (let i = 0; i < RIVALS.length; i += 1) {
        const rx = VIEW.width / 2 - 392 + i * 268;
        if (hitRect(x, y, { x: rx, y: 468, w: 248, h: 64 })) {
          st.rivalIndex = i;
          audio.playHover();
          return;
        }
      }
      // Play Duel CTA
      if (hitRect(x, y, { x: VIEW.width / 2 - 144, y: 558, w: 288, h: 62 })) {
        engine.startDuel(st.rivalIndex, st.seed + 1);
        onAnnounce(`Started duel against ${st.rival.name}.`);
      }
      return;
    }

    if (st.screen === SCREEN_VICTORY || st.screen === SCREEN_DEFEAT) {
      const btnY = (VIEW.height - 436) / 2 + 436 - 76;
      if (hitRect(x, y, { x: VIEW.width / 2 - 224, y: btnY, w: 208, h: 52 })) {
        const nextRival = st.screen === SCREEN_VICTORY ? (st.rivalIndex + 1) % RIVALS.length : st.rivalIndex;
        engine.startDuel(nextRival, st.seed + 3);
        onAnnounce(`Started duel against ${st.rival.name}.`);
      } else if (hitRect(x, y, { x: VIEW.width / 2 + 16, y: btnY, w: 208, h: 52 })) {
        engine.openTitle(st.seed);
      }
      return;
    }

    if (st.helpOpen) {
      st.helpOpen = false;
      audio.playHover();
      return;
    }

    // Top bar mini buttons
    if (hitRect(x, y, { x: 980, y: 22, w: 86, h: 32 })) {
      st.helpOpen = !st.helpOpen;
      audio.playHover();
      return;
    }
    if (hitRect(x, y, { x: 1076, y: 22, w: 88, h: 32 })) {
      audio.toggleMute();
      return;
    }
    if (hitRect(x, y, { x: 1174, y: 22, w: 78, h: 32 })) {
      engine.openTitle(st.seed);
      return;
    }

    // End Turn / Resolve CTA
    if (hitRect(x, y, LAYOUT.endTurnBtn)) {
      if (engine.endTurn(false)) onAnnounce('Resolving Ritual Chain clash.');
      return;
    }

    // Swap CTA
    if (hitRect(x, y, LAYOUT.swapBtn)) {
      if (st.phase === 'player' && st.swapsLeft > 0) {
        st.swapMode = !st.swapMode;
        audio.playHover();
      }
      return;
    }

    // Hand card click or drag start (only during active player phase)
    if (st.phase !== 'player') return;
    const cardIdx = hitHandCard(x, y);
    if (cardIdx >= 0) {
      pressedCardIndex = cardIdx;
      st.selectedHandIndex = cardIdx;
      engine.syncCardTargets(false);
    }
  }

  function handlePointerUp(ev) {
    const { x, y } = toLogicalCoords(ev.clientX, ev.clientY);
    const st = engine.state;
    if (st.screen !== SCREEN_PLAY) return;

    if (st.draggingHandIndex >= 0) {
      const idx = st.draggingHandIndex;
      st.draggingHandIndex = -1;
      pressedCardIndex = -1;
      if (y < 515) {
        if (engine.playCardFromHand(idx, false)) {
          onAnnounce(st.lastTurnSummary);
        } else {
          engine.syncCardTargets(false);
        }
      } else {
        engine.syncCardTargets(false);
      }
      return;
    }

    if (pressedCardIndex >= 0) {
      const idx = pressedCardIndex;
      pressedCardIndex = -1;
      if (st.swapMode) {
        if (engine.swapHandCard(idx, false)) onAnnounce(st.lastTurnSummary);
      } else if (engine.playCardFromHand(idx, false)) {
        onAnnounce(st.lastTurnSummary);
      }
    }
  }

  function handleKeyDown(ev) {
    audio.unlock();
    const st = engine.state;
    const key = ev.key;

    if (key === 'm' || key === 'M') {
      audio.toggleMute();
      return;
    }
    if (key === 'h' || key === 'H' || key === '?') {
      if (st.screen === SCREEN_PLAY) {
        st.helpOpen = !st.helpOpen;
        audio.playHover();
      }
      return;
    }
    if (key === 'Escape') {
      st.helpOpen = false;
      st.swapMode = false;
      st.selectedHandIndex = -1;
      engine.syncCardTargets(false);
      return;
    }

    if (st.screen === SCREEN_TITLE) {
      if (key === 'ArrowLeft') {
        st.rivalIndex = (st.rivalIndex + RIVALS.length - 1) % RIVALS.length;
        audio.playHover();
      } else if (key === 'ArrowRight') {
        st.rivalIndex = (st.rivalIndex + 1) % RIVALS.length;
        audio.playHover();
      } else if (key === 'Enter' || key === ' ') {
        ev.preventDefault();
        engine.startDuel(st.rivalIndex, st.seed + 1);
        onAnnounce(`Started duel against ${st.rival.name}.`);
      }
      return;
    }

    if (st.screen === SCREEN_VICTORY || st.screen === SCREEN_DEFEAT) {
      if (key === 'Enter' || key === ' ' || key === 'r' || key === 'R') {
        ev.preventDefault();
        const nextRival = st.screen === SCREEN_VICTORY ? (st.rivalIndex + 1) % RIVALS.length : st.rivalIndex;
        engine.startDuel(nextRival, st.seed + 3);
      } else if (key === 't' || key === 'T') {
        engine.openTitle(st.seed);
      }
      return;
    }

    if (st.helpOpen || st.phase !== 'player') return;

    // Numeric keys 1-6 play hand cards immediately (or swap if swapMode is active)
    if (key >= '1' && key <= '6') {
      const idx = Number(key) - 1;
      if (st.swapMode) engine.swapHandCard(idx, false);
      else engine.playCardFromHand(idx, false);
      return;
    }

    if (key === 'ArrowLeft') {
      const n = st.player.hand.length;
      if (n > 0) {
        st.selectedHandIndex = st.selectedHandIndex <= 0 ? n - 1 : st.selectedHandIndex - 1;
        audio.playHover();
        engine.syncCardTargets(false);
      }
    } else if (key === 'ArrowRight') {
      const n = st.player.hand.length;
      if (n > 0) {
        st.selectedHandIndex = (st.selectedHandIndex + 1) % n;
        audio.playHover();
        engine.syncCardTargets(false);
      }
    } else if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      if (st.selectedHandIndex >= 0) {
        if (st.swapMode) engine.swapHandCard(st.selectedHandIndex, false);
        else engine.playCardFromHand(st.selectedHandIndex, false);
      } else {
        engine.endTurn(false);
      }
    } else if (key === 'e' || key === 'E') {
      engine.endTurn(false);
    } else if (key === 's' || key === 'S') {
      if (st.selectedHandIndex >= 0) {
        engine.swapHandCard(st.selectedHandIndex, false);
      } else if (st.swapsLeft > 0) {
        st.swapMode = !st.swapMode;
        audio.playHover();
      }
    } else if (key === 'r' || key === 'R') {
      engine.startDuel(st.rivalIndex, st.seed + 1);
    }
  }

  function cancelActiveDrag() {
    if (pressedCardIndex >= 0 || engine.state.draggingHandIndex >= 0) {
      pressedCardIndex = -1;
      engine.state.draggingHandIndex = -1;
      engine.syncCardTargets(false);
    }
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', cancelActiveDrag);
  window.addEventListener('blur', cancelActiveDrag);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', cancelActiveDrag);
    window.removeEventListener('blur', cancelActiveDrag);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
