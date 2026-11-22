// Tactile spring-physics card motion, 3D flips, combo arcs, combat impacts, and end-state flourishes.

import { VIEW, PALETTE, SUITS, SUIT_ORDER } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createAnimationEngine() {
  let rngSeed = 0x51a9c37d;
  const rings = [];
  const arcs = [];
  const beams = [];
  const particles = [];
  const popups = [];
  const confetti = [];
  const pendingWaves = [];

  const engine = {
    cards: new Map(),
    shake: { mag: 0, time: 0, duration: 0, ox: 0, oy: 0 },
    hitstop: 0,
    banner: null,
    flourishTimer: 0,
  };

  function rand() {
    rngSeed = (Math.imul(rngSeed, 1664525) + 1013904223) >>> 0;
    return rngSeed / 0xffffffff;
  }

  function randRange(min, max) {
    return min + rand() * (max - min);
  }

  function reset() {
    rngSeed = 0x51a9c37d;
    engine.cards.clear();
    rings.length = 0;
    arcs.length = 0;
    beams.length = 0;
    particles.length = 0;
    popups.length = 0;
    confetti.length = 0;
    pendingWaves.length = 0;
    engine.shake.mag = 0;
    engine.shake.time = 0;
    engine.shake.duration = 0;
    engine.shake.ox = 0;
    engine.shake.oy = 0;
    engine.hitstop = 0;
    engine.banner = null;
    engine.flourishTimer = 0;
  }

  function ensureCard(uid, startX = VIEW.width * 0.5, startY = VIEW.height * 0.5, faceUp = true) {
    let card = engine.cards.get(uid);
    if (!card) {
      const f = faceUp ? 1 : 0;
      card = {
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        tx: startX,
        ty: startY,
        rot: 0,
        vrot: 0,
        trot: 0,
        scale: 1,
        vscale: 0,
        tscale: 1,
        flip: f,
        tflip: f,
        tiltX: 0,
        tiltY: 0,
        z: 0,
        glow: 0,
        settlePulse: 0,
        delay: 0,
      };
      engine.cards.set(uid, card);
    }
    return card;
  }

  function setCardTarget(uid, target = {}) {
    const fallbackX = target.tx ?? target.x ?? VIEW.width * 0.5;
    const fallbackY = target.ty ?? target.y ?? VIEW.height * 0.5;
    const card = ensureCard(uid, fallbackX, fallbackY, target.tflip !== 0);
    if (target.tx !== undefined) card.tx = target.tx;
    if (target.ty !== undefined) card.ty = target.ty;
    if (target.trot !== undefined) card.trot = target.trot;
    if (target.tscale !== undefined) card.tscale = target.tscale;
    if (target.tflip !== undefined) card.tflip = target.tflip;
    if (target.z !== undefined) card.z = target.z;
    if (target.glow !== undefined) card.glow = target.glow;
    if (target.tiltX !== undefined) card.tiltX = target.tiltX;
    if (target.tiltY !== undefined) card.tiltY = target.tiltY;
    if (target.delay !== undefined) card.delay = Math.max(0, target.delay);
    return card;
  }

  function snapCardInstant(uid, target = {}) {
    const tx = target.tx ?? target.x ?? VIEW.width * 0.5;
    const ty = target.ty ?? target.y ?? VIEW.height * 0.5;
    const card = ensureCard(uid, tx, ty, target.tflip !== 0);
    card.tx = target.tx ?? target.x ?? card.tx;
    card.ty = target.ty ?? target.y ?? card.ty;
    card.trot = target.trot ?? target.rot ?? card.trot;
    card.tscale = target.tscale ?? target.scale ?? card.tscale;
    if (target.tflip !== undefined) card.tflip = target.tflip;
    if (target.z !== undefined) card.z = target.z;
    if (target.glow !== undefined) card.glow = target.glow;
    if (target.tiltX !== undefined) card.tiltX = target.tiltX;
    if (target.tiltY !== undefined) card.tiltY = target.tiltY;

    card.x = card.tx;
    card.y = card.ty;
    card.vx = 0;
    card.vy = 0;
    card.rot = card.trot;
    card.vrot = 0;
    card.scale = card.tscale;
    card.vscale = 0;
    card.flip = card.tflip;
    card.delay = 0;
    card.settlePulse = 0;
    return card;
  }

  function animateDealHand(uids, fromX, fromY, targets, faceUp = true) {
    for (let i = 0; i < uids.length; i += 1) {
      const uid = uids[i];
      const tgt = targets[i] || {};
      const card = ensureCard(uid, fromX, fromY, false);
      const tx = tgt.tx ?? tgt.x ?? fromX;
      const ty = tgt.ty ?? tgt.y ?? fromY;
      card.x = fromX;
      card.y = fromY;
      card.rot = -0.26 + i * 0.045;
      card.vrot = 1.6;
      card.scale = 0.76;
      card.vscale = 0.9;
      card.flip = 0;
      card.vx = (tx - fromX) * 1.15;
      card.vy = -220 - i * 16;
      setCardTarget(uid, {
        tx,
        ty,
        trot: tgt.trot ?? tgt.rot ?? 0,
        tscale: tgt.tscale ?? tgt.scale ?? 1,
        tflip: tgt.tflip !== undefined ? tgt.tflip : faceUp ? 1 : 0,
        z: tgt.z ?? i,
        glow: tgt.glow ?? 0,
        delay: i * 0.068,
      });
    }
  }

  function animateCardFlip(uid, faceUp) {
    const card = engine.cards.get(uid);
    if (!card) return;
    card.tflip = faceUp ? 1 : 0;
    card.vscale += 2.2;
    card.settlePulse = Math.max(card.settlePulse, 0.5);
  }

  function triggerScreenShake(magnitude = 6, duration = 0.22) {
    engine.shake.mag = Math.max(engine.shake.mag, magnitude);
    engine.shake.duration = Math.max(engine.shake.duration, duration);
    engine.shake.time = Math.max(engine.shake.time, duration);
  }

  function triggerHitstop(seconds = 0.06) {
    engine.hitstop = Math.max(engine.hitstop, seconds);
  }

  function triggerSnapImpact(x, y, color = PALETTE.gold, intensity = 1) {
    const power = clamp(intensity, 0.4, 2.4);
    rings.push({
      x,
      y,
      color,
      radius: 18,
      maxRadius: 82 + power * 36,
      age: 0,
      life: 0.36 + power * 0.08,
      lineWidth: 3.5 + power * 1.5,
    });
    const count = Math.round(12 + power * 8);
    for (let i = 0; i < count; i += 1) {
      const ang = (Math.PI * 2 * i) / count + randRange(-0.18, 0.18);
      const speed = randRange(120, 290) * power;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        size: randRange(2.2, 4.8),
        color: i % 3 === 0 ? PALETTE.goldBright : color,
        age: 0,
        life: randRange(0.24, 0.46),
        drag: 5.2,
        gravity: 90,
      });
    }
    triggerScreenShake(3.2 * power, 0.14);
    for (const card of engine.cards.values()) {
      const dist = Math.hypot(card.tx - x, card.ty - y);
      if (dist < 110) {
        card.settlePulse = Math.max(card.settlePulse, Math.min(1, 0.85 * power));
        card.vscale += 1.4 * power;
      }
    }
  }

  function triggerComboArc(x1, y1, x2, y2, color = PALETTE.goldBright, label = '') {
    const mx = (x1 + x2) * 0.5;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const my = (y1 + y2) * 0.5 - Math.max(46, dist * 0.24);
    arcs.push({ x1, y1, cx: mx, cy: my, x2, y2, color, label, age: 0, life: 0.85 });
  }

  function triggerAttackBeam(fromX, fromY, toX, toY, color = SUITS.solar.color, heavy = false) {
    const life = heavy ? 0.44 : 0.32;
    beams.push({ fromX, fromY, toX, toY, color, heavy: Boolean(heavy), age: 0, life });
    const count = heavy ? 22 : 12;
    const baseAngle = Math.atan2(toY - fromY, toX - fromX);
    for (let i = 0; i < count; i += 1) {
      const ang = baseAngle + Math.PI + randRange(-1.1, 1.1);
      const spd = randRange(90, heavy ? 360 : 240);
      particles.push({
        x: toX,
        y: toY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: randRange(2.4, heavy ? 6.0 : 4.2),
        color: i % 4 === 0 ? PALETTE.ivory : color,
        age: 0,
        life: randRange(0.24, heavy ? 0.54 : 0.38),
        drag: 4.5,
        gravity: 120,
      });
    }
    if (heavy) triggerScreenShake(8.5, 0.24);
  }

  function spawnPopup(x, y, text, color = PALETTE.ivory, scale = 1) {
    popups.push({
      x: x + randRange(-14, 14),
      y,
      vy: -88,
      text: String(text),
      color,
      scale,
      age: 0,
      life: 1.05,
    });
  }

  function showBanner(text, subtext = '', color = PALETTE.gold, duration = 1.6) {
    engine.banner = {
      text: String(text || ''),
      subtext: String(subtext || ''),
      color: color || PALETTE.gold,
      timer: duration,
      maxTimer: duration,
    };
  }

  function spawnVictoryWave(width, height, waveIndex) {
    const suitColors = SUIT_ORDER.map((id) => SUITS[id].bright);
    const colors = [PALETTE.gold, PALETTE.goldBright, PALETTE.ivory, ...suitColors];
    const count = waveIndex === 0 ? 70 : 45;
    for (let i = 0; i < count; i += 1) {
      const fromSide = i % 3 !== 0;
      const startX = fromSide ? (i % 2 === 0 ? width * 0.14 : width * 0.86) : randRange(width * 0.12, width * 0.88);
      const startY = fromSide ? height * 0.52 : -24;
      const vx = fromSide
        ? (startX < width * 0.5 ? randRange(120, 420) : randRange(-420, -120))
        : randRange(-80, 80);
      const vy = fromSide ? randRange(-520, -240) : randRange(50, 170);
      confetti.push({
        kind: i % 5 === 0 ? 'sparkle' : 'ribbon',
        x: startX,
        y: startY,
        vx,
        vy,
        w: randRange(6, 12),
        h: randRange(4, 7),
        rot: randRange(0, Math.PI * 2),
        vrot: randRange(-7, 7),
        phase: randRange(0, Math.PI * 2),
        color: colors[i % colors.length],
        age: 0,
        life: randRange(2.4, 3.8),
        gravity: i % 5 === 0 ? 40 : 280,
      });
    }
  }

  function triggerVictoryFlourish(width = VIEW.width, height = VIEW.height) {
    engine.flourishTimer = 3.6;
    spawnVictoryWave(width, height, 0);
    pendingWaves.push({ delay: 0.45, width, height, index: 1 });
    pendingWaves.push({ delay: 0.95, width, height, index: 2 });
  }

  function triggerDefeatEclipse(width = VIEW.width, height = VIEW.height) {
    engine.flourishTimer = 3.8;
    const colors = [SUITS.eclipse.color, SUITS.eclipse.bright, PALETTE.danger, PALETTE.hpRed];
    for (let i = 0; i < 68; i += 1) {
      confetti.push({
        kind: 'ember',
        x: randRange(0, width),
        y: randRange(height * 0.25, height + 60),
        vx: randRange(-26, 26),
        vy: randRange(-72, -24),
        w: randRange(2.5, 6.2),
        h: 0,
        rot: 0,
        vrot: 0,
        phase: randRange(0, Math.PI * 2),
        color: colors[i % colors.length],
        age: 0,
        life: randRange(2.6, 4.4),
        gravity: -8,
      });
    }
  }

  function step(dt) {
    const rawDt = clamp(Number(dt) || 0, 0, 0.05);
    if (rawDt <= 0) return;

    if (engine.shake.time > 0) {
      engine.shake.time = Math.max(0, engine.shake.time - rawDt);
      const ratio = engine.shake.duration > 0 ? engine.shake.time / engine.shake.duration : 0;
      const amp = engine.shake.mag * ratio * ratio;
      engine.shake.ox = (rand() * 2 - 1) * amp;
      engine.shake.oy = (rand() * 2 - 1) * amp;
      if (engine.shake.time <= 0) {
        engine.shake.mag = 0;
        engine.shake.ox = 0;
        engine.shake.oy = 0;
      }
    }

    if (engine.banner) {
      engine.banner.timer -= rawDt;
      if (engine.banner.timer <= 0) engine.banner = null;
    }

    if (engine.flourishTimer > 0) {
      engine.flourishTimer = Math.max(0, engine.flourishTimer - rawDt);
    }

    for (let i = pendingWaves.length - 1; i >= 0; i -= 1) {
      pendingWaves[i].delay -= rawDt;
      if (pendingWaves[i].delay <= 0) {
        const w = pendingWaves.splice(i, 1)[0];
        spawnVictoryWave(w.width, w.height, w.index);
      }
    }

    if (engine.hitstop > 0) {
      engine.hitstop = Math.max(0, engine.hitstop - rawDt);
      return;
    }

    const posK = 230;
    const posD = 24;
    const rotK = 195;
    const rotD = 22;
    const sclK = 260;
    const sclD = 22;

    for (const c of engine.cards.values()) {
      if (c.settlePulse > 0) c.settlePulse = Math.max(0, c.settlePulse - rawDt * 3.2);
      if (c.delay > 0) {
        c.delay = Math.max(0, c.delay - rawDt);
        continue;
      }

      c.vx += ((c.tx - c.x) * posK - c.vx * posD) * rawDt;
      c.vy += ((c.ty - c.y) * posK - c.vy * posD) * rawDt;
      c.x += c.vx * rawDt;
      c.y += c.vy * rawDt;
      if (Math.abs(c.tx - c.x) < 0.08 && Math.abs(c.vx) < 0.4) {
        c.x = c.tx;
        c.vx = 0;
      }
      if (Math.abs(c.ty - c.y) < 0.08 && Math.abs(c.vy) < 0.4) {
        c.y = c.ty;
        c.vy = 0;
      }

      c.vrot += ((c.trot - c.rot) * rotK - c.vrot * rotD) * rawDt;
      c.rot += c.vrot * rawDt;
      if (Math.abs(c.trot - c.rot) < 0.001 && Math.abs(c.vrot) < 0.01) {
        c.rot = c.trot;
        c.vrot = 0;
      }

      c.vscale += ((c.tscale - c.scale) * sclK - c.vscale * sclD) * rawDt;
      c.scale += c.vscale * rawDt;
      if (Math.abs(c.tscale - c.scale) < 0.001 && Math.abs(c.vscale) < 0.01) {
        c.scale = c.tscale;
        c.vscale = 0;
      }

      const df = c.tflip - c.flip;
      if (Math.abs(df) < 0.003) c.flip = c.tflip;
      else c.flip += df * Math.min(1, rawDt * 13);
    }

    for (let i = rings.length - 1; i >= 0; i -= 1) {
      rings[i].age += rawDt;
      if (rings[i].age >= rings[i].life) rings.splice(i, 1);
    }

    for (let i = arcs.length - 1; i >= 0; i -= 1) {
      arcs[i].age += rawDt;
      if (arcs[i].age >= arcs[i].life) arcs.splice(i, 1);
    }

    for (let i = beams.length - 1; i >= 0; i -= 1) {
      beams[i].age += rawDt;
      if (beams[i].age >= beams[i].life) beams.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.age += rawDt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const damp = Math.max(0, 1 - p.drag * rawDt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * rawDt;
      p.x += p.vx * rawDt;
      p.y += p.vy * rawDt;
    }

    for (let i = popups.length - 1; i >= 0; i -= 1) {
      const p = popups[i];
      p.age += rawDt;
      if (p.age >= p.life) {
        popups.splice(i, 1);
        continue;
      }
      p.y += p.vy * rawDt;
      p.vy *= Math.max(0, 1 - 2.6 * rawDt);
    }

    for (let i = confetti.length - 1; i >= 0; i -= 1) {
      const c = confetti[i];
      c.age += rawDt;
      if (c.age >= c.life) {
        confetti.splice(i, 1);
        continue;
      }
      c.vy += c.gravity * rawDt;
      c.vx *= c.kind === 'ember' ? 0.995 : Math.max(0, 1 - 1.1 * rawDt);
      c.x += (c.vx + Math.sin(c.age * 4.5 + c.phase) * (c.kind === 'ember' ? 18 : 28)) * rawDt;
      c.y += c.vy * rawDt;
      c.rot += c.vrot * rawDt;
    }
  }

  function renderBackEffects(ctx) {
    ctx.save();
    for (const r of rings) {
      const t = clamp(r.age / r.life, 0, 1);
      const ease = 1 - (1 - t) * (1 - t);
      const rad = r.radius + (r.maxRadius - r.radius) * ease;
      const alpha = (1 - t) * 0.85;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, r.lineWidth * (1 - t * 0.65));
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const a of arcs) {
      const t = clamp(a.age / a.life, 0, 1);
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.quadraticCurveTo(a.cx, a.cy, a.x2, a.y2);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.ivory;
      ctx.lineWidth = 2;
      ctx.stroke();

      const u = clamp(t * 1.45, 0, 1);
      const inv = 1 - u;
      const px = inv * inv * a.x1 + 2 * inv * u * a.cx + u * u * a.x2;
      const py = inv * inv * a.y1 + 2 * inv * u * a.cy + u * u * a.y2;
      ctx.fillStyle = PALETTE.ivory;
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fill();

      if (a.label) {
        const lx = 0.25 * a.x1 + 0.5 * a.cx + 0.25 * a.x2;
        const ly = 0.25 * a.y1 + 0.5 * a.cy + 0.25 * a.y2 - 14;
        ctx.font = '700 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = PALETTE.ink;
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 4;
        ctx.strokeText(a.label, lx, ly);
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillText(a.label, lx, ly);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function renderFrontEffects(ctx) {
    ctx.save();

    for (const b of beams) {
      const t = clamp(b.age / b.life, 0, 1);
      const headT = clamp(t * 2.4, 0, 1);
      const tailT = clamp((t - 0.16) * 1.65, 0, 1);
      const sx = b.fromX + (b.toX - b.fromX) * tailT;
      const sy = b.fromY + (b.toY - b.fromY) * tailT;
      const ex = b.fromX + (b.toX - b.fromX) * headT;
      const ey = b.fromY + (b.toY - b.fromY) * headT;
      const alpha = 1 - Math.pow(t, 1.8);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.heavy ? 24 : 14;
      ctx.lineWidth = b.heavy ? 12 : 7;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.ivory;
      ctx.lineWidth = b.heavy ? 4.5 : 2.5;
      ctx.stroke();

      ctx.fillStyle = PALETTE.ivory;
      ctx.beginPath();
      ctx.arc(ex, ey, b.heavy ? 9 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of particles) {
      const t = clamp(p.age / p.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, p.size * (1 - t * 0.5)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const c of confetti) {
      const t = clamp(c.age / c.life, 0, 1);
      const fade = t > 0.72 ? (1 - t) / 0.28 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(fade, 0, 1);
      ctx.translate(c.x, c.y);
      if (c.kind === 'ember') {
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, c.w * (0.7 + 0.3 * Math.sin(c.age * 7 + c.phase)), 0, Math.PI * 2);
        ctx.fill();
      } else if (c.kind === 'sparkle') {
        const s = c.w * (0.65 + 0.45 * Math.sin(c.age * 10 + c.phase));
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.28, -s * 0.28);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.28, s * 0.28);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.28, s * 0.28);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.28, -s * 0.28);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.rotate(c.rot);
        ctx.scale(1, Math.cos(c.age * 9 + c.phase));
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      }
      ctx.restore();
    }

    for (const p of popups) {
      const t = clamp(p.age / p.life, 0, 1);
      const pop = t < 0.16 ? 0.65 + (t / 0.16) * 0.55 : t < 0.28 ? 1.2 - ((t - 0.16) / 0.12) * 0.2 : 1;
      const alpha = t > 0.65 ? (1 - t) / 0.35 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale * pop, p.scale * pop);
      ctx.font = '800 24px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = PALETTE.ink;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }

    if (engine.banner) {
      const b = engine.banner;
      const elapsed = b.maxTimer - b.timer;
      const fadeIn = clamp(elapsed / 0.18, 0, 1);
      const fadeOut = clamp(b.timer / 0.28, 0, 1);
      const alpha = Math.min(fadeIn, fadeOut);
      const cx = VIEW.width * 0.5;
      const cy = VIEW.height * 0.34;
      const halfW = 240;

      ctx.save();
      ctx.globalAlpha = alpha;
      const bg = ctx.createLinearGradient(cx - halfW, cy, cx + halfW, cy);
      bg.addColorStop(0, 'rgba(10, 18, 16, 0)');
      bg.addColorStop(0.2, 'rgba(10, 18, 16, 0.88)');
      bg.addColorStop(0.8, 'rgba(10, 18, 16, 0.88)');
      bg.addColorStop(1, 'rgba(10, 18, 16, 0)');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - halfW, cy - 36, halfW * 2, b.subtext ? 74 : 56);

      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - halfW * 0.78, cy - 36);
      ctx.lineTo(cx + halfW * 0.78, cy - 36);
      ctx.moveTo(cx - halfW * 0.78, cy + (b.subtext ? 38 : 20));
      ctx.lineTo(cx + halfW * 0.78, cy + (b.subtext ? 38 : 20));
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 28px Georgia, serif';
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.fillText(b.text, cx, b.subtext ? cy - 8 : cy - 8);
      if (b.subtext) {
        ctx.shadowBlur = 0;
        ctx.font = '600 15px Georgia, serif';
        ctx.fillStyle = PALETTE.ivory;
        ctx.fillText(b.subtext, cx, cy + 19);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  return Object.assign(engine, {
    reset,
    ensureCard,
    setCardTarget,
    snapCardInstant,
    animateDealHand,
    animateCardFlip,
    triggerSnapImpact,
    triggerComboArc,
    triggerAttackBeam,
    spawnPopup,
    showBanner,
    triggerScreenShake,
    triggerHitstop,
    triggerVictoryFlourish,
    triggerDefeatEclipse,
    step,
    renderBackEffects,
    renderFrontEffects,
  });
}
