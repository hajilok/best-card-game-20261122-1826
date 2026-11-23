// Procedural Web Audio Foley & musical stinger synthesizer (zero external assets, offline-safe).

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.noiseCursor = 0;
  }

  unlock() {
    const c = this._ensure();
    if (c && c.state === 'suspended') {
      try { c.resume()?.catch?.(() => {}); } catch { /* ignore */ }
    }
  }

  setMuted(next) {
    this.muted = Boolean(next);
    if (this.ctx && this.master) {
      try { this.master.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime, 0.015); } catch { /* ignore */ }
    }
  }

  isMuted() { return this.muted; }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playHover() {
    this._safe((c, t) => {
      this._noise(c, { start: t, dur: 0.036, peak: 0.075, freq: 2750, endFreq: 3600, q: 2.6 });
      this._tone(c, { type: 'triangle', freq: 920, endFreq: 1240, start: t, dur: 0.028, peak: 0.025 });
    });
  }

  playDeal(index = 0) {
    this._safe((c, t) => {
      const s = Math.max(0, Math.min(8, Number(index) || 0));
      const f = 1150 + s * 115;
      this._noise(c, { start: t, dur: 0.095, peak: 0.14, freq: f * 0.75, endFreq: f * 1.45, q: 1.4 });
      this._tone(c, { type: 'sine', freq: 155 + s * 14, endFreq: 86 + s * 6, start: t + 0.025, dur: 0.065, peak: 0.075 });
    });
  }

  playCardFlip() {
    this._safe((c, t) => {
      this._noise(c, { start: t, dur: 0.048, peak: 0.16, freq: 3100, endFreq: 1450, q: 2.1 });
      this._tone(c, { type: 'triangle', freq: 640, endFreq: 250, start: t, dur: 0.055, peak: 0.095 });
    });
  }

  playCardSnap(comboStep = 0) {
    this._safe((c, t) => {
      const scale = [523.25, 659.25, 783.99, 987.77, 1174.66];
      const chime = scale[Math.max(0, Math.min(4, Math.floor(Number(comboStep) || 0)))];
      this._tone(c, { type: 'sine', freq: 148, endFreq: 48, start: t, dur: 0.12, peak: 0.28 });
      this._noise(c, { start: t, dur: 0.042, peak: 0.15, freq: 1550, endFreq: 800, q: 1.5 });
      this._tone(c, { type: 'triangle', freq: chime, endFreq: chime * 1.005, start: t + 0.012, dur: 0.24, peak: 0.11 });
      this._tone(c, { type: 'sine', freq: chime * 1.5, start: t + 0.018, dur: 0.2, peak: 0.055 });
    });
  }

  playComboChime(tier = 1) {
    this._safe((c, t) => {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].slice(0, Math.min(6, Math.max(3, tier + 2)));
      notes.forEach((freq, i) => {
        const at = t + i * 0.052;
        this._tone(c, { type: 'triangle', freq, start: at, dur: 0.34, peak: 0.11, filterFreq: 3600 });
        this._tone(c, { type: 'sine', freq: freq * 2, start: at + 0.008, dur: 0.24, peak: 0.045 });
      });
    });
  }

  playCounterParry() {
    this._safe((c, t) => {
      this._tone(c, { type: 'sine', freq: 185, endFreq: 68, start: t, dur: 0.14, peak: 0.26 });
      this._noise(c, { start: t, dur: 0.06, peak: 0.2, filterType: 'highpass', freq: 2400, q: 1.2 });
      [1180, 1790, 2640, 3520].forEach((freq, i) => {
        this._tone(c, { type: i % 2 === 0 ? 'triangle' : 'sine', freq, endFreq: freq * 0.992, start: t + 0.006, dur: 0.42 - i * 0.06, peak: 0.11 / (i + 1) });
      });
    });
  }

  playHit(heavy = false) {
    this._safe((c, t) => {
      this._tone(c, { type: 'sine', freq: heavy ? 140 : 165, endFreq: heavy ? 32 : 46, start: t, dur: heavy ? 0.28 : 0.16, peak: heavy ? 0.38 : 0.26 });
      this._noise(c, { start: t, dur: heavy ? 0.13 : 0.07, peak: heavy ? 0.26 : 0.18, freq: heavy ? 1400 : 1900, endFreq: 420, q: 0.9 });
      if (heavy) this._tone(c, { type: 'sawtooth', freq: 112, endFreq: 42, start: t + 0.005, dur: 0.2, peak: 0.13, filterFreq: 520, filterEndFreq: 140 });
    });
  }

  playWard() {
    this._safe((c, t) => {
      [587.33, 880, 1174.66, 1760].forEach((freq, i) => {
        this._tone(c, { type: 'sine', freq, endFreq: freq * 1.008, start: t + i * 0.022, dur: 0.38, peak: 0.095 / (1 + i * 0.25) });
      });
    });
  }

  playHeal() {
    this._safe((c, t) => {
      [392.0, 493.88, 587.33, 783.99].forEach((freq, i) => {
        const at = t + i * 0.06;
        this._tone(c, { type: 'triangle', freq, start: at, dur: 0.34, peak: 0.11, filterFreq: 2200 });
        this._tone(c, { type: 'sine', freq: freq * 0.5, start: at, dur: 0.32, peak: 0.05 });
      });
    });
  }

  playTurnEnd() {
    this._safe((c, t) => {
      this._tone(c, { type: 'sine', freq: 245, endFreq: 118, start: t, dur: 0.075, peak: 0.2 });
      this._noise(c, { start: t + 0.035, dur: 0.22, peak: 0.085, freq: 1100, endFreq: 3200, q: 2.2 });
    });
  }

  playVictoryFanfare() {
    this._safe((c, t) => {
      [293.66, 369.99, 440.0, 587.33, 739.99, 880.0, 1174.66].forEach((freq, i) => {
        const at = t + i * 0.075;
        this._tone(c, { type: 'triangle', freq, start: at, dur: 0.55, peak: 0.12, filterFreq: 3200 });
        this._tone(c, { type: 'sine', freq: freq * 2, start: at + 0.01, dur: 0.38, peak: 0.04 });
      });
      [293.66, 440.0, 587.33].forEach((freq) => {
        this._tone(c, { type: 'sawtooth', freq, start: t + 0.42, dur: 0.95, peak: 0.075, filterFreq: 1500, filterEndFreq: 680 });
      });
    });
  }

  playDefeatChord() {
    this._safe((c, t) => {
      [[220, 207.65, 0, 0.85], [146.83, 138.59, 0.14, 0.95], [110, 98, 0.3, 1.15]].forEach(([f, ef, at, dur]) => {
        this._tone(c, { type: 'sawtooth', freq: f, endFreq: ef, start: t + at, dur, peak: 0.095, filterFreq: 620, filterEndFreq: 220 });
        this._tone(c, { type: 'sine', freq: f * 0.5, endFreq: ef * 0.5, start: t + at, dur, peak: 0.12 });
      });
    });
  }

  _ensure() {
    if (this.ctx) return this.ctx;
    try {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime);
      this.master.connect(this.ctx.destination);
      const sr = this.ctx.sampleRate || 44100;
      const buf = this.ctx.createBuffer(1, sr, sr);
      const data = buf.getChannelData(0);
      let s = 0x6d2b79f5;
      for (let i = 0; i < sr; i += 1) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        data[i] = (s / 0xffffffff) * 2 - 1;
      }
      this.noiseBuffer = buf;
      return this.ctx;
    } catch {
      return null;
    }
  }

  _safe(fn) {
    if (this.muted) return;
    const c = this._ensure();
    if (!c || !this.master) return;
    try {
      if (c.state === 'suspended') c.resume()?.catch?.(() => {});
      fn(c, c.currentTime);
    } catch { /* ignore */ }
  }

  _tone(c, o) {
    const start = o.start ?? c.currentTime;
    const dur = Math.max(0.015, o.dur ?? 0.14);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, o.freq || 220), start);
    if (o.endFreq && o.endFreq !== o.freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.endFreq), start + dur);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(Math.max(0.0002, o.peak ?? 0.16), start + Math.min(dur * 0.4, 0.008));
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node = osc;
    if (o.filterFreq) {
      const flt = c.createBiquadFilter();
      flt.type = o.filterType || 'lowpass';
      flt.frequency.setValueAtTime(o.filterFreq, start);
      if (o.filterEndFreq) flt.frequency.exponentialRampToValueAtTime(Math.max(40, o.filterEndFreq), start + dur);
      node.connect(flt);
      node = flt;
    }
    node.connect(env);
    env.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  _noise(c, o) {
    if (!this.noiseBuffer) return;
    const start = o.start ?? c.currentTime;
    const dur = Math.max(0.015, o.dur ?? 0.08);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const off = (this.noiseCursor++ * 0.173) % 0.65;
    const flt = c.createBiquadFilter();
    flt.type = o.filterType || 'bandpass';
    flt.frequency.setValueAtTime(o.freq || 1800, start);
    if (o.endFreq && o.endFreq !== o.freq) flt.frequency.exponentialRampToValueAtTime(Math.max(60, o.endFreq), start + dur);
    flt.Q.setValueAtTime(o.q ?? 1.6, start);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(Math.max(0.0002, o.peak ?? 0.12), start + Math.min(dur * 0.35, 0.005));
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(flt);
    flt.connect(env);
    env.connect(this.master);
    src.start(start, off, dur + 0.02);
    src.stop(start + dur + 0.025);
  }
}

export function createSoundEngine() { return new SoundEngine(); }
