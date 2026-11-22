// Procedural Web Audio Foley & musical stinger synthesizer (zero external assets, offline-safe).

function createNoiseBuffer(ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = sampleRate;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x6d2b79f5;
  for (let i = 0; i < length; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

export function createSoundEngine() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;
  let noiseCursor = 0;

  function ensureContext() {
    if (ctx) return ctx;
    try {
      const AudioCtx =
        typeof globalThis !== 'undefined' &&
        (globalThis.AudioContext || globalThis.webkitAudioContext);
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.setValueAtTime(muted ? 0 : 0.78, ctx.currentTime);
      master.connect(ctx.destination);
      noiseBuffer = createNoiseBuffer(ctx);
      return ctx;
    } catch {
      ctx = null;
      master = null;
      return null;
    }
  }

  function ready() {
    if (muted) return null;
    const c = ensureContext();
    if (!c || !master) return null;
    try {
      if (c.state === 'suspended') {
        const res = c.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
      return c;
    } catch {
      return null;
    }
  }

  function tone(c, opts) {
    const start = opts.start ?? c.currentTime;
    const dur = Math.max(0.015, opts.dur ?? 0.14);
    const attack = Math.min(dur * 0.45, opts.attack ?? 0.008);
    const peak = Math.max(0.0002, opts.peak ?? 0.16);

    const osc = c.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, opts.freq || 220), start);
    if (opts.endFreq && opts.endFreq !== opts.freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), start + dur);
    }

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(peak, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    let last = osc;
    if (opts.filterFreq) {
      const filter = c.createBiquadFilter();
      filter.type = opts.filterType || 'lowpass';
      filter.frequency.setValueAtTime(opts.filterFreq, start);
      if (opts.filterEndFreq) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.filterEndFreq), start + dur);
      }
      filter.Q.setValueAtTime(opts.q ?? 1.2, start);
      last.connect(filter);
      last = filter;
    }

    last.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise(c, opts) {
    if (!noiseBuffer) return;
    const start = opts.start ?? c.currentTime;
    const dur = Math.max(0.015, opts.dur ?? 0.08);
    const attack = Math.min(dur * 0.4, opts.attack ?? 0.005);
    const peak = Math.max(0.0002, opts.peak ?? 0.12);

    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const offset = (noiseCursor * 0.173) % 0.65;
    noiseCursor += 1;

    const filter = c.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 1800, start);
    if (opts.endFreq && opts.endFreq !== opts.freq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.endFreq), start + dur);
    }
    filter.Q.setValueAtTime(opts.q ?? 1.6, start);

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(peak, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(start, offset, dur + 0.02);
    src.stop(start + dur + 0.025);
  }

  function safe(fn) {
    const c = ready();
    if (!c) return;
    try {
      fn(c, c.currentTime);
    } catch {
      // Audio playback must never raise runtime errors.
    }
  }

  function unlock() {
    const c = ensureContext();
    if (!c) return;
    try {
      if (c.state === 'suspended') {
        const res = c.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
    } catch {
      // Ignore locked audio state errors.
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    if (ctx && master) {
      try {
        master.gain.setTargetAtTime(muted ? 0 : 0.78, ctx.currentTime, 0.015);
      } catch {
        // Ignore gain scheduling errors.
      }
    }
  }

  function isMuted() {
    return muted;
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function playHover() {
    safe((c, t) => {
      noise(c, { start: t, dur: 0.036, peak: 0.075, attack: 0.003, filterType: 'bandpass', freq: 2750, endFreq: 3600, q: 2.6 });
      tone(c, { type: 'triangle', freq: 920, endFreq: 1240, start: t, dur: 0.028, peak: 0.025, attack: 0.003 });
    });
  }

  function playDeal(index = 0) {
    safe((c, t) => {
      const step = Math.max(0, Math.min(8, Number(index) || 0));
      const baseFreq = 1150 + step * 115;
      noise(c, { start: t, dur: 0.095, peak: 0.14, attack: 0.01, filterType: 'bandpass', freq: baseFreq * 0.75, endFreq: baseFreq * 1.45, q: 1.4 });
      tone(c, { type: 'sine', freq: 155 + step * 14, endFreq: 86 + step * 6, start: t + 0.025, dur: 0.065, peak: 0.075, attack: 0.004 });
    });
  }

  function playCardFlip() {
    safe((c, t) => {
      noise(c, { start: t, dur: 0.048, peak: 0.16, attack: 0.002, filterType: 'bandpass', freq: 3100, endFreq: 1450, q: 2.1 });
      tone(c, { type: 'triangle', freq: 640, endFreq: 250, start: t, dur: 0.055, peak: 0.095, attack: 0.002 });
    });
  }

  function playCardSnap(comboStep = 0) {
    safe((c, t) => {
      const scale = [523.25, 659.25, 783.99, 987.77, 1174.66];
      const idx = Math.max(0, Math.min(scale.length - 1, Math.floor(Number(comboStep) || 0)));
      const chimeFreq = scale[idx];
      tone(c, { type: 'sine', freq: 148, endFreq: 48, start: t, dur: 0.12, peak: 0.28, attack: 0.003 });
      noise(c, { start: t, dur: 0.042, peak: 0.15, attack: 0.002, filterType: 'bandpass', freq: 1550, endFreq: 800, q: 1.5 });
      tone(c, { type: 'triangle', freq: chimeFreq, endFreq: chimeFreq * 1.005, start: t + 0.012, dur: 0.24, peak: 0.11, attack: 0.006 });
      tone(c, { type: 'sine', freq: chimeFreq * 1.5, start: t + 0.018, dur: 0.2, peak: 0.055, attack: 0.008 });
    });
  }

  function playComboChime(tier = 1) {
    safe((c, t) => {
      const level = Math.max(1, Math.min(4, Math.floor(Number(tier) || 1)));
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].slice(0, level + 2);
      notes.forEach((freq, i) => {
        const at = t + i * 0.052;
        tone(c, { type: 'triangle', freq, start: at, dur: 0.34, peak: 0.11, attack: 0.008, filterFreq: 3600 });
        tone(c, { type: 'sine', freq: freq * 2, start: at + 0.008, dur: 0.24, peak: 0.045, attack: 0.01 });
      });
    });
  }

  function playCounterParry() {
    safe((c, t) => {
      tone(c, { type: 'sine', freq: 185, endFreq: 68, start: t, dur: 0.14, peak: 0.26, attack: 0.003 });
      noise(c, { start: t, dur: 0.06, peak: 0.2, attack: 0.002, filterType: 'highpass', freq: 2400, q: 1.2 });
      const partials = [1180, 1790, 2640, 3520];
      partials.forEach((freq, i) => {
        tone(c, {
          type: i % 2 === 0 ? 'triangle' : 'sine',
          freq,
          endFreq: freq * 0.992,
          start: t + 0.006,
          dur: 0.42 - i * 0.06,
          peak: 0.11 / (i + 1),
          attack: 0.003,
        });
      });
    });
  }

  function playHit(heavy = false) {
    safe((c, t) => {
      const isHeavy = Boolean(heavy);
      tone(c, {
        type: 'sine',
        freq: isHeavy ? 140 : 165,
        endFreq: isHeavy ? 32 : 46,
        start: t,
        dur: isHeavy ? 0.28 : 0.16,
        peak: isHeavy ? 0.38 : 0.26,
        attack: 0.003,
      });
      noise(c, {
        start: t,
        dur: isHeavy ? 0.13 : 0.07,
        peak: isHeavy ? 0.26 : 0.18,
        attack: 0.002,
        filterType: 'bandpass',
        freq: isHeavy ? 1400 : 1900,
        endFreq: 420,
        q: 0.9,
      });
      if (isHeavy) {
        tone(c, {
          type: 'sawtooth',
          freq: 112,
          endFreq: 42,
          start: t + 0.005,
          dur: 0.2,
          peak: 0.13,
          attack: 0.004,
          filterFreq: 520,
          filterEndFreq: 140,
        });
      }
    });
  }

  function playWard() {
    safe((c, t) => {
      const chord = [587.33, 880, 1174.66, 1760];
      chord.forEach((freq, i) => {
        tone(c, {
          type: 'sine',
          freq,
          endFreq: freq * 1.008,
          start: t + i * 0.022,
          dur: 0.38,
          peak: 0.095 / (1 + i * 0.25),
          attack: 0.012,
        });
      });
    });
  }

  function playHeal() {
    safe((c, t) => {
      const triad = [392.0, 493.88, 587.33, 783.99];
      triad.forEach((freq, i) => {
        const at = t + i * 0.06;
        tone(c, { type: 'triangle', freq, start: at, dur: 0.34, peak: 0.11, attack: 0.018, filterFreq: 2200 });
        tone(c, { type: 'sine', freq: freq * 0.5, start: at, dur: 0.32, peak: 0.05, attack: 0.02 });
      });
    });
  }

  function playTurnEnd() {
    safe((c, t) => {
      tone(c, { type: 'sine', freq: 245, endFreq: 118, start: t, dur: 0.075, peak: 0.2, attack: 0.003 });
      tone(c, { type: 'triangle', freq: 410, endFreq: 210, start: t + 0.004, dur: 0.045, peak: 0.08, attack: 0.002 });
      noise(c, { start: t + 0.035, dur: 0.22, peak: 0.085, attack: 0.03, filterType: 'bandpass', freq: 1100, endFreq: 3200, q: 2.2 });
    });
  }

  function playVictoryFanfare() {
    safe((c, t) => {
      const arp = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0, 1174.66];
      arp.forEach((freq, i) => {
        const at = t + i * 0.075;
        tone(c, { type: 'triangle', freq, start: at, dur: 0.55, peak: 0.12, attack: 0.01, filterFreq: 3200 });
        tone(c, { type: 'sine', freq: freq * 2, start: at + 0.01, dur: 0.38, peak: 0.04, attack: 0.012 });
      });
      const brass = [293.66, 440.0, 587.33];
      brass.forEach((freq) => {
        tone(c, {
          type: 'sawtooth',
          freq,
          start: t + 0.42,
          dur: 0.95,
          peak: 0.075,
          attack: 0.06,
          filterFreq: 1500,
          filterEndFreq: 680,
          q: 1.1,
        });
      });
    });
  }

  function playDefeatChord() {
    safe((c, t) => {
      const descent = [
        { freq: 220.0, endFreq: 207.65, at: 0, dur: 0.85 },
        { freq: 146.83, endFreq: 138.59, at: 0.14, dur: 0.95 },
        { freq: 110.0, endFreq: 98.0, at: 0.3, dur: 1.15 },
      ];
      descent.forEach((n) => {
        tone(c, {
          type: 'sawtooth',
          freq: n.freq,
          endFreq: n.endFreq,
          start: t + n.at,
          dur: n.dur,
          peak: 0.095,
          attack: 0.06,
          filterFreq: 620,
          filterEndFreq: 220,
          q: 1.2,
        });
        tone(c, {
          type: 'sine',
          freq: n.freq * 0.5,
          endFreq: n.endFreq * 0.5,
          start: t + n.at,
          dur: n.dur,
          peak: 0.12,
          attack: 0.05,
        });
      });
    });
  }

  return {
    unlock,
    setMuted,
    isMuted,
    toggleMute,
    playHover,
    playDeal,
    playCardFlip,
    playCardSnap,
    playComboChime,
    playCounterParry,
    playHit,
    playWard,
    playHeal,
    playTurnEnd,
    playVictoryFanfare,
    playDefeatChord,
  };
}
