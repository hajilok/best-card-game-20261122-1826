// Sunstone Gambit entrypoint: modular game loop, responsive HiDPI canvas, input controller, and shot staging.

import { RULES, VIEW } from './config.js';
import { DuelEngine } from './rules.js';
import { AnimationEngine } from './animations.js';
import { SoundEngine } from './audio.js';
import { TableRenderer } from './renderer.js';
import { attachInputController } from './input.js';
import { stageScreenshotScene } from './shots.js';

const canvas = document.getElementById('table-canvas');
const statusEl = document.getElementById('sr-status');
const ctx = canvas.getContext('2d');

const audio = new SoundEngine();
const anim = new AnimationEngine();
const engine = new DuelEngine(anim, audio);
const renderer = new TableRenderer();

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(window.innerWidth));
  const h = Math.max(1, Math.floor(window.innerHeight));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(canvas.width / VIEW.width, 0, 0, canvas.height / VIEW.height, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

attachInputController(canvas, engine, anim, audio, announce);

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number(params.get('seed') ?? '7');
const activeSeed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : 7;

if (shotParam) {
  stageScreenshotScene(shotParam, activeSeed, engine, anim);
  renderer.render(ctx, engine.state, anim, audio);
} else {
  engine.openTitle(activeSeed);
  let lastTs = performance.now();
  let acc = 0;

  function frame(now) {
    acc += Math.min(0.1, Math.max(0, (now - lastTs) / 1000));
    lastTs = now;
    while (acc >= RULES.stepSeconds) {
      engine.step(RULES.stepSeconds);
      acc -= RULES.stepSeconds;
    }
    renderer.render(ctx, engine.state, anim, audio);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.__SUNSTONE__ = {
  getState: () => ({
    screen: engine.state.screen,
    turn: engine.state.turn,
    phase: engine.state.phase,
    score: engine.state.score,
    relic: engine.state.relic.id,
    rival: engine.state.rival.id,
    playerHp: engine.state.player.hp,
    playerWard: engine.state.player.ward,
    playerEnergy: engine.state.player.energy,
    playerHandCount: engine.state.player.hand.length,
    playerChainCount: engine.state.player.chain.length,
    opponentHp: engine.state.opponent.hp,
    opponentWard: engine.state.opponent.ward,
    opponentHandCount: engine.state.opponent.hand.length,
    opponentIntentCount: engine.state.opponent.intents.length,
    combosTriggered: engine.state.combosTriggered,
    countersLanded: engine.state.countersLanded,
    bestComboLabel: engine.state.bestComboLabel,
    totalDamageDealt: engine.state.totalDamageDealt,
    muted: audio.isMuted(),
  }),
};
