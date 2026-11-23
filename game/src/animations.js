// Tactile spring-physics card motion, 3D flips, swoosh trails, snap rings, combo arcs, and flourishes.

import { VIEW, PALETTE, SUITS, SUIT_ORDER } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class AnimationEngine {
  constructor() {
    this.cards = new Map();
    this.shake = { mag: 0, time: 0, duration: 0, ox: 0, oy: 0 };
    this.hitstop = 0;
    this.banner = null;
    this.flourishTimer = 0;
    this._seed = 0x51a9c37d;
    this._rings = [];
    this._swooshes = [];
    this._arcs = [];
    this._beams = [];
    this._particles = [];
    this._popups = [];
    this._confetti = [];
    this._pendingWaves = [];
  }
  reset() {
    this._seed = 0x51a9c37d;
    this.cards.clear();
    this._rings.length = 0;
    this._swooshes.length = 0;
    this._arcs.length = 0;
    this._beams.length = 0;
    this._particles.length = 0;
    this._popups.length = 0;
    this._confetti.length = 0;
    this._pendingWaves.length = 0;
    Object.assign(this.shake, { mag: 0, time: 0, duration: 0, ox: 0, oy: 0 });
    this.hitstop = 0;
    this.banner = null;
    this.flourishTimer = 0;
  }
  ensureCard(uid, startX = VIEW.width * 0.5, startY = VIEW.height * 0.5, faceUp = true) {
    let c = this.cards.get(uid);
    if (!c) {
      const f = faceUp ? 1 : 0;
      c = {
        x: startX, y: startY, vx: 0, vy: 0, tx: startX, ty: startY,
        rot: 0, vrot: 0, trot: 0, scale: 1, vscale: 0, tscale: 1,
        flip: f, tflip: f, tiltX: 0, tiltY: 0, z: 0, glow: 0, settlePulse: 0, delay: 0,
      };
      this.cards.set(uid, c);
    }
    return c;
  }
  setCardTarget(uid, t = {}) {
    const c = this.ensureCard(uid, t.tx ?? t.x ?? VIEW.width * 0.5, t.ty ?? t.y ?? VIEW.height * 0.5, t.tflip !== 0);
    if (t.tx !== undefined) c.tx = t.tx;
    if (t.ty !== undefined) c.ty = t.ty;
    if (t.trot !== undefined) c.trot = t.trot;
    if (t.tscale !== undefined) c.tscale = t.tscale;
    if (t.tflip !== undefined) c.tflip = t.tflip;
    if (t.z !== undefined) c.z = t.z;
    if (t.glow !== undefined) c.glow = t.glow;
    if (t.tiltX !== undefined) c.tiltX = t.tiltX;
    if (t.tiltY !== undefined) c.tiltY = t.tiltY;
    if (t.delay !== undefined) c.delay = Math.max(0, t.delay);
    return c;
  }
  snapCardInstant(uid, t = {}) {
    const c = this.setCardTarget(uid, t);
    c.x = c.tx; c.y = c.ty; c.vx = 0; c.vy = 0;
    c.rot = c.trot; c.vrot = 0;
    c.scale = c.tscale; c.vscale = 0;
    c.flip = c.tflip; c.delay = 0; c.settlePulse = 0;
    return c;
  }
  animateDealHand(uids, fromX, fromY, targets, faceUp = true) {
    for (let i = 0; i < uids.length; i += 1) {
      const uid = uids[i];
      const tgt = targets[i] || {};
      const c = this.ensureCard(uid, fromX, fromY, false);
      const tx = tgt.tx ?? tgt.x ?? fromX;
      const ty = tgt.ty ?? tgt.y ?? fromY;
      c.x = fromX; c.y = fromY; c.rot = -0.26 + i * 0.045; c.vrot = 1.6;
      c.scale = 0.74; c.vscale = 0.9; c.flip = 0;
      c.vx = (tx - fromX) * 1.15; c.vy = -220 - i * 16;
      this.setCardTarget(uid, {
        tx, ty, trot: tgt.trot ?? tgt.rot ?? 0, tscale: tgt.tscale ?? tgt.scale ?? 1,
        tflip: tgt.tflip !== undefined ? tgt.tflip : (faceUp ? 1 : 0),
        z: tgt.z ?? i, glow: tgt.glow ?? 0, delay: i * 0.068,
      });
    }
  }
  animateCardFlip(uid, faceUp) {
    const c = this.cards.get(uid);
    if (!c) return;
    c.tflip = faceUp ? 1 : 0;
    c.vscale += 2.2;
    c.settlePulse = Math.max(c.settlePulse, 0.5);
  }
  triggerMotionSwoosh(fromX, fromY, toX, toY, color = PALETTE.goldBright) {
    const cx = (fromX + toX) * 0.5 - 38;
    const cy = Math.min(fromY, toY) + 52;
    this._swooshes.push({ fromX, fromY, cx, cy, toX, toY, color, age: 0, life: 0.55 });
  }
  triggerSnapImpact(x, y, color = PALETTE.gold, intensity = 1) {
    const power = clamp(intensity, 0.5, 2.2);
    this._rings.push({ x, y, color, radius: 66, maxRadius: 112 + power * 24, age: 0, life: 0.42, lineWidth: 3.4 + power });
    const count = Math.round(14 + power * 6);
    for (let i = 0; i < count; i += 1) {
      const ang = (Math.PI * 2 * i) / count + this._randRange(-0.14, 0.14);
      const startR = 60 + this._randRange(0, 12);
      const spd = this._randRange(80, 190) * power;
      this._particles.push({
        x: x + Math.cos(ang) * startR, y: y + Math.sin(ang) * startR,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        size: this._randRange(2.4, 4.6), color: i % 3 === 0 ? PALETTE.goldBright : color,
        age: 0, life: this._randRange(0.28, 0.48), drag: 4.8, gravity: 55,
      });
    }
    this.triggerScreenShake(3 * power, 0.14);
    for (const card of this.cards.values()) {
      if (Math.hypot(card.tx - x, card.ty - y) < 110) {
        card.settlePulse = Math.max(card.settlePulse, Math.min(1, 0.8 * power));
        card.vscale += 1.3 * power;
      }
    }
  }
  triggerComboArc(x1, y1, x2, y2, color = PALETTE.goldBright, label = '') {
    const mx = (x1 + x2) * 0.5;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    this._arcs.push({ x1, y1, cx: mx, cy: (y1 + y2) * 0.5 - Math.max(42, dist * 0.24), x2, y2, color, label, age: 0, life: 0.9 });
  }
  triggerAttackBeam(fromX, fromY, toX, toY, color = SUITS.solar.color, heavy = false) {
    this._beams.push({ fromX, fromY, toX, toY, color, heavy: Boolean(heavy), age: 0, life: heavy ? 0.44 : 0.32 });
    const count = heavy ? 22 : 12;
    const base = Math.atan2(toY - fromY, toX - fromX);
    for (let i = 0; i < count; i += 1) {
      const a = base + Math.PI + this._randRange(-1.1, 1.1);
      const spd = this._randRange(90, heavy ? 350 : 230);
      this._particles.push({
        x: toX, y: toY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        size: this._randRange(2.4, heavy ? 5.8 : 4.2), color: i % 4 === 0 ? PALETTE.ivory : color,
        age: 0, life: this._randRange(0.24, heavy ? 0.52 : 0.36), drag: 4.5, gravity: 110,
      });
    }
    if (heavy) this.triggerScreenShake(8.5, 0.24);
  }
  spawnPopup(x, y, text, color = PALETTE.ivory, scale = 1) {
    this._popups.push({ x: x + this._randRange(-12, 12), y, vy: -82, text: String(text), color, scale, age: 0, life: 1.05 });
  }
  showBanner(text, subtext = '', color = PALETTE.gold, duration = 1.55) {
    this.banner = { text: String(text || ''), subtext: String(subtext || ''), color, timer: duration, maxTimer: duration };
  }
  triggerScreenShake(magnitude = 6, duration = 0.22) {
    this.shake.mag = Math.max(this.shake.mag, magnitude);
    this.shake.duration = Math.max(this.shake.duration, duration);
    this.shake.time = Math.max(this.shake.time, duration);
  }
  triggerHitstop(seconds = 0.06) {
    this.hitstop = Math.max(this.hitstop, seconds);
  }
  triggerVictoryFlourish(width = VIEW.width, height = VIEW.height) {
    this.flourishTimer = 3.8;
    this._spawnVictoryWave(width, height, 0);
    this._pendingWaves.push({ delay: 0.32, width, height, index: 1 });
    this._pendingWaves.push({ delay: 0.72, width, height, index: 2 });
  }
  triggerDefeatEclipse(width = VIEW.width, height = VIEW.height) {
    this.flourishTimer = 3.8;
    const colors = ['#ff5568', '#ff8596', SUITS.eclipse.color, SUITS.eclipse.bright];
    for (let i = 0; i < 86; i += 1) {
      this._confetti.push({
        kind: i % 4 === 0 ? 'sparkle' : 'ember',
        x: this._randRange(20, width - 20), y: this._randRange(height * 0.12, height + 40),
        vx: this._randRange(-32, 32), vy: this._randRange(-84, -28),
        w: this._randRange(4.2, 9.5), h: 0, rot: 0, vrot: 0, phase: this._randRange(0, Math.PI * 2),
        color: colors[i % colors.length], age: 0, life: this._randRange(2.8, 4.4), gravity: -8,
      });
    }
  }
  step(dt) {
    const rawDt = clamp(Number(dt) || 0, 0, 0.05);
    if (rawDt <= 0) return;
    if (this.shake.time > 0) {
      this.shake.time = Math.max(0, this.shake.time - rawDt);
      const r = this.shake.duration > 0 ? this.shake.time / this.shake.duration : 0;
      const amp = this.shake.mag * r * r;
      this.shake.ox = (this._rand() * 2 - 1) * amp;
      this.shake.oy = (this._rand() * 2 - 1) * amp;
      if (this.shake.time <= 0) Object.assign(this.shake, { mag: 0, ox: 0, oy: 0 });
    }
    if (this.banner) {
      this.banner.timer -= rawDt;
      if (this.banner.timer <= 0) this.banner = null;
    }
    if (this.flourishTimer > 0) this.flourishTimer = Math.max(0, this.flourishTimer - rawDt);
    for (let i = this._pendingWaves.length - 1; i >= 0; i -= 1) {
      this._pendingWaves[i].delay -= rawDt;
      if (this._pendingWaves[i].delay <= 0) {
        const w = this._pendingWaves.splice(i, 1)[0];
        this._spawnVictoryWave(w.width, w.height, w.index);
      }
    }
    if (this.hitstop > 0) { this.hitstop = Math.max(0, this.hitstop - rawDt); return; }
    for (const c of this.cards.values()) {
      if (c.settlePulse > 0) c.settlePulse = Math.max(0, c.settlePulse - rawDt * 3.2);
      if (c.delay > 0) { c.delay = Math.max(0, c.delay - rawDt); continue; }
      c.vx += ((c.tx - c.x) * 230 - c.vx * 24) * rawDt;
      c.vy += ((c.ty - c.y) * 230 - c.vy * 24) * rawDt;
      c.x += c.vx * rawDt; c.y += c.vy * rawDt;
      if (Math.abs(c.tx - c.x) < 0.08 && Math.abs(c.vx) < 0.4) { c.x = c.tx; c.vx = 0; }
      if (Math.abs(c.ty - c.y) < 0.08 && Math.abs(c.vy) < 0.4) { c.y = c.ty; c.vy = 0; }
      c.vrot += ((c.trot - c.rot) * 195 - c.vrot * 22) * rawDt;
      c.rot += c.vrot * rawDt;
      c.vscale += ((c.tscale - c.scale) * 260 - c.vscale * 22) * rawDt;
      c.scale += c.vscale * rawDt;
      const df = c.tflip - c.flip;
      c.flip = Math.abs(df) < 0.003 ? c.tflip : c.flip + df * Math.min(1, rawDt * 13);
    }
    for (const list of [this._rings, this._swooshes, this._arcs, this._beams]) {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        list[i].age += rawDt;
        if (list[i].age >= list[i].life) list.splice(i, 1);
      }
    }
    for (let i = this._particles.length - 1; i >= 0; i -= 1) {
      const p = this._particles[i];
      p.age += rawDt;
      if (p.age >= p.life) { this._particles.splice(i, 1); continue; }
      const d = Math.max(0, 1 - p.drag * rawDt);
      p.vx *= d; p.vy = p.vy * d + p.gravity * rawDt;
      p.x += p.vx * rawDt; p.y += p.vy * rawDt;
    }
    for (let i = this._popups.length - 1; i >= 0; i -= 1) {
      const p = this._popups[i];
      p.age += rawDt;
      if (p.age >= p.life) { this._popups.splice(i, 1); continue; }
      p.y += p.vy * rawDt; p.vy *= Math.max(0, 1 - 2.6 * rawDt);
    }
    for (let i = this._confetti.length - 1; i >= 0; i -= 1) {
      const c = this._confetti[i];
      c.age += rawDt;
      if (c.age >= c.life) { this._confetti.splice(i, 1); continue; }
      c.vy += c.gravity * rawDt;
      c.vx *= c.kind === 'ember' ? 0.995 : Math.max(0, 1 - 1.0 * rawDt);
      c.x += (c.vx + Math.sin(c.age * 4.5 + c.phase) * (c.kind === 'ember' ? 18 : 28)) * rawDt;
      c.y += c.vy * rawDt;
      c.rot += c.vrot * rawDt;
    }
  }
  renderBackEffects(ctx) {
    ctx.save();
    for (const s of this._swooshes) {
      const t = clamp(s.age / s.life, 0, 1);
      const alpha = (1 - t) * 0.85;
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(s.fromX, s.fromY, s.toX, s.toY);
      g.addColorStop(0, 'rgba(255,240,189,0)');
      g.addColorStop(0.55, s.color);
      g.addColorStop(1, '#ffffff');
      ctx.strokeStyle = g;
      ctx.lineWidth = 10 * (1 - t * 0.45);
      ctx.lineCap = 'round';
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(s.fromX, s.fromY);
      ctx.quadraticCurveTo(s.cx, s.cy, s.toX, s.toY);
      ctx.stroke();
      ctx.restore();
    }
    for (const r of this._rings) {
      const t = clamp(r.age / r.life, 0, 1);
      const rad = r.radius + (r.maxRadius - r.radius) * (1 - (1 - t) * (1 - t));
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.88;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1.2, r.lineWidth * (1 - t * 0.6));
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  renderFrontEffects(ctx) {
    ctx.save();
    for (const a of this._arcs) {
      const t = clamp(a.age / a.life, 0, 1);
      const alpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * 0.92;
      ctx.strokeStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.quadraticCurveTo(a.cx, a.cy, a.x2, a.y2); ctx.stroke();
      ctx.strokeStyle = PALETTE.ivory; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    for (const b of this._beams) {
      const t = clamp(b.age / b.life, 0, 1);
      const ht = clamp(t * 2.4, 0, 1);
      const tt = clamp((t - 0.16) * 1.65, 0, 1);
      const sx = b.fromX + (b.toX - b.fromX) * tt;
      const sy = b.fromY + (b.toY - b.fromY) * tt;
      const ex = b.fromX + (b.toX - b.fromX) * ht;
      const ey = b.fromY + (b.toY - b.fromY) * ht;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = 1 - Math.pow(t, 1.8);
      ctx.strokeStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = b.heavy ? 24 : 14;
      ctx.lineWidth = b.heavy ? 12 : 7;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = PALETTE.ivory; ctx.lineWidth = b.heavy ? 4.5 : 2.5; ctx.stroke();
      ctx.restore();
    }
    for (const p of this._particles) {
      const t = clamp(p.age / p.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size * (1 - t * 0.45)), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const c of this._confetti) {
      const t = clamp(c.age / c.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = t > 0.72 ? (1 - t) / 0.28 : 1;
      ctx.translate(c.x, c.y);
      if (c.kind === 'ember') {
        ctx.fillStyle = c.color; ctx.shadowColor = c.color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(0, 0, c.w * (0.75 + 0.25 * Math.sin(c.age * 7 + c.phase)), 0, Math.PI * 2); ctx.fill();
      } else if (c.kind === 'sparkle') {
        const s = c.w * (0.75 + 0.35 * Math.sin(c.age * 10 + c.phase));
        ctx.fillStyle = c.color; ctx.shadowColor = c.color; ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.3, -s * 0.3); ctx.lineTo(s, 0); ctx.lineTo(s * 0.3, s * 0.3);
        ctx.lineTo(0, s); ctx.lineTo(-s * 0.3, s * 0.3); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.3, -s * 0.3);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.rotate(c.rot); ctx.scale(1, Math.cos(c.age * 8 + c.phase));
        ctx.fillStyle = c.color; ctx.shadowColor = c.color; ctx.shadowBlur = 6;
        ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      }
      ctx.restore();
    }
    for (const p of this._popups) {
      const t = clamp(p.age / p.life, 0, 1);
      const pop = t < 0.16 ? 0.65 + (t / 0.16) * 0.55 : 1;
      ctx.save();
      ctx.globalAlpha = t > 0.65 ? (1 - t) / 0.35 : 1;
      ctx.translate(p.x, p.y); ctx.scale(p.scale * pop, p.scale * pop);
      ctx.font = '900 22px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = PALETTE.ink;
      ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    if (this.banner) {
      const b = this.banner;
      const alpha = Math.min(clamp((b.maxTimer - b.timer) / 0.18, 0, 1), clamp(b.timer / 0.28, 0, 1));
      const cx = VIEW.width * 0.5;
      const cy = VIEW.height * 0.33;
      ctx.save();
      ctx.globalAlpha = alpha;
      const bg = ctx.createLinearGradient(cx - 240, cy, cx + 240, cy);
      bg.addColorStop(0, 'rgba(10,18,16,0)'); bg.addColorStop(0.2, 'rgba(10,18,16,0.9)');
      bg.addColorStop(0.8, 'rgba(10,18,16,0.9)'); bg.addColorStop(1, 'rgba(10,18,16,0)');
      ctx.fillStyle = bg; ctx.fillRect(cx - 240, cy - 34, 480, 68);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 26px "Trebuchet MS", Georgia, serif';
      ctx.fillStyle = b.color; ctx.fillText(b.text, cx, cy - 7);
      if (b.subtext) { ctx.font = '700 14px "Trebuchet MS", sans-serif'; ctx.fillStyle = PALETTE.ivory; ctx.fillText(b.subtext, cx, cy + 17); }
      ctx.restore();
    }
    ctx.restore();
  }
  _rand() {
    this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0;
    return this._seed / 0xffffffff;
  }
  _randRange(min, max) { return min + this._rand() * (max - min); }
  _spawnVictoryWave(width, height, wave) {
    const suitColors = SUIT_ORDER.map((id) => SUITS[id].bright);
    const colors = ['#ffe57a', '#ffbe3d', '#ffffff', ...suitColors];
    const count = wave === 0 ? 96 : 56;
    for (let i = 0; i < count; i += 1) {
      const side = i % 3 !== 0;
      const startX = side ? (i % 2 === 0 ? width * 0.1 : width * 0.9) : this._randRange(width * 0.08, width * 0.92);
      const startY = side ? height * 0.54 : -18;
      const vx = side ? (startX < width * 0.5 ? this._randRange(140, 480) : this._randRange(-480, -140)) : this._randRange(-90, 90);
      const vy = side ? this._randRange(-540, -220) : this._randRange(60, 200);
      this._confetti.push({
        kind: i % 4 === 0 ? 'sparkle' : 'ribbon',
        x: startX, y: startY, vx, vy,
        w: i % 4 === 0 ? this._randRange(10, 18) : this._randRange(10, 18),
        h: this._randRange(6, 10),
        rot: this._randRange(0, Math.PI * 2), vrot: this._randRange(-7, 7),
        phase: this._randRange(0, Math.PI * 2), color: colors[i % colors.length],
        age: 0, life: this._randRange(2.5, 4.0), gravity: i % 4 === 0 ? 45 : 260,
      });
    }
  }
}

export function createAnimationEngine() { return new AnimationEngine(); }
