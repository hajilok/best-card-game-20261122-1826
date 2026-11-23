// Custom vector character portraits, Sunstone relic medallions, and crisp HUD stat icons.
import { PALETTE, SUITS } from './config.js';

const circ = (ctx, x, y, r, fill, stroke, lw = 1.4) => {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
};
const poly = (ctx, pts, fill, stroke, lw = 1.2) => {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
};

export function drawRivalPortrait(ctx, rivalId, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy);
  const bg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
  const [c0, c1, acc] = rivalId === 'pyromancer' ? ['#5a1e10', '#1b0704', SUITS.solar.bright]
    : rivalId === 'sovereign' ? ['#3e1a66', '#120621', SUITS.eclipse.bright] : ['#10466b', '#061826', SUITS.tide.bright];
  bg.addColorStop(0, c0); bg.addColorStop(1, c1);
  circ(ctx, 0, 0, r, bg);
  ctx.save(); ctx.clip();

  if (rivalId === 'pyromancer') {
    for (let i = -2; i <= 2; i += 1) {
      const a = -Math.PI / 2 + i * 0.34;
      poly(ctx, [
        [Math.cos(a - 0.14) * r * 0.38, -r * 0.1 + Math.sin(a - 0.14) * r * 0.38],
        [Math.cos(a) * r * 0.96, -r * 0.1 + Math.sin(a) * r * 0.96],
        [Math.cos(a + 0.14) * r * 0.38, -r * 0.1 + Math.sin(a + 0.14) * r * 0.38],
      ], '#ff6b3d');
    }
    ctx.beginPath(); ctx.arc(0, r * 0.72, r * 0.68, Math.PI, 0); ctx.fillStyle = '#260b07'; ctx.fill();
    circ(ctx, 0, -r * 0.04, r * 0.38, '#f2caa8');
    poly(ctx, [[-r * 0.42, -r * 0.24], [0, -r * 0.48], [r * 0.42, -r * 0.24], [r * 0.3, -r * 0.02], [0, -r * 0.12], [-r * 0.3, -r * 0.02]], PALETTE.gold);
    for (const dx of [-0.14, 0.14]) { ctx.beginPath(); ctx.ellipse(r * dx, r * 0.02, r * 0.08, r * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff3b0'; ctx.fill(); }
  } else if (rivalId === 'sovereign') {
    ctx.strokeStyle = '#e5c2ff'; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.72, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * 0.76, r * 0.72, Math.PI, 0); ctx.fillStyle = '#1d0b33'; ctx.fill();
    poly(ctx, [[0, -r * 0.56], [r * 0.42, -r * 0.12], [r * 0.28, r * 0.42], [0, r * 0.54], [-r * 0.28, r * 0.42], [-r * 0.42, -r * 0.12]], '#e8c47a');
    poly(ctx, [[0, -r * 0.52], [r * 0.38, -r * 0.12], [0, r * 0.48]], '#220b3d');
    for (const dx of [-0.14, 0.14]) circ(ctx, r * dx, -r * 0.02, r * 0.075, '#e9c4ff');
  } else {
    ctx.beginPath(); ctx.arc(0, r * 0.78, r * 0.76, Math.PI, 0); ctx.fillStyle = '#0c2c42'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.66); ctx.quadraticCurveTo(r * 0.62, -r * 0.34, r * 0.54, r * 0.42);
    ctx.lineTo(-r * 0.54, r * 0.42); ctx.quadraticCurveTo(-r * 0.62, -r * 0.34, 0, -r * 0.66); ctx.fillStyle = '#154d73'; ctx.fill();
    circ(ctx, 0, r * 0.02, r * 0.34, '#081a28');
    for (const dx of [-0.15, 0.15]) circ(ctx, r * dx, -r * 0.02, r * 0.12, '#8ceaff', PALETTE.goldBright, r * 0.06);
    ctx.beginPath(); ctx.moveTo(-r * 0.03, -r * 0.02); ctx.lineTo(r * 0.03, -r * 0.02); ctx.strokeStyle = PALETTE.goldBright; ctx.lineWidth = r * 0.05; ctx.stroke();
  }
  ctx.restore();
  circ(ctx, 0, 0, r, null, PALETTE.goldBright, Math.max(2, r * 0.11));
  circ(ctx, 0, 0, r - 2.4, null, acc, 1.2);
  ctx.restore();
}

export function drawSunkeeperPortrait(ctx, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy);
  const bg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  bg.addColorStop(0, '#225948'); bg.addColorStop(1, '#091f19');
  circ(ctx, 0, 0, r, bg);
  ctx.save(); ctx.clip();
  circ(ctx, 0, -r * 0.08, r * 0.66, null, 'rgba(255,224,130,0.55)', r * 0.08);
  ctx.beginPath(); ctx.arc(0, r * 0.78, r * 0.74, Math.PI, 0); ctx.fillStyle = '#154235'; ctx.fill();
  poly(ctx, [[0, -r * 0.56], [r * 0.42, -r * 0.16], [r * 0.34, r * 0.36], [0, r * 0.48], [-r * 0.34, r * 0.36], [-r * 0.42, -r * 0.16]], PALETTE.gold);
  ctx.fillStyle = '#0d261e'; ctx.fillRect(-r * 0.28, -r * 0.08, r * 0.56, r * 0.18);
  for (const dx of [-0.12, 0.12]) circ(ctx, r * dx, 0, r * 0.06, '#fff5bd');
  ctx.restore();
  circ(ctx, 0, 0, r, null, PALETTE.goldBright, Math.max(2, r * 0.11));
  ctx.restore();
}

export function drawRelicEmblem(ctx, relicId, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy);
  circ(ctx, 0, 0, r, '#12241f', PALETTE.goldBright, 1.8);
  if (relicId === 'prism') {
    poly(ctx, [[0, -r * 0.65], [r * 0.58, r * 0.45], [-r * 0.58, r * 0.45]], '#ffcf5c', '#fff', 1.2);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.65); ctx.lineTo(0, r * 0.45); ctx.strokeStyle = '#ff5d38'; ctx.stroke();
  } else if (relicId === 'compass') {
    circ(ctx, 0, 0, r * 0.58, null, '#6fe3ff', 1.4);
    poly(ctx, [[0, -r * 0.62], [r * 0.22, 0], [0, r * 0.62], [-r * 0.22, 0]], '#4ad2ff');
    circ(ctx, 0, 0, r * 0.14, '#fff');
  } else {
    ctx.beginPath(); ctx.moveTo(-r * 0.64, 0); ctx.quadraticCurveTo(0, -r * 0.56, r * 0.64, 0); ctx.quadraticCurveTo(0, r * 0.56, -r * 0.64, 0); ctx.closePath();
    ctx.fillStyle = '#c580ff'; ctx.fill(); ctx.strokeStyle = PALETTE.goldBright; ctx.lineWidth = 1.2; ctx.stroke();
    circ(ctx, 0, 0, r * 0.2, '#180929');
    circ(ctx, -r * 0.06, -r * 0.06, r * 0.07, '#fff');
  }
  ctx.restore();
}

export function drawStatIcon(ctx, kind, cx, cy, r, color) {
  ctx.save(); ctx.translate(cx, cy);
  if (kind === 'heart') {
    ctx.beginPath(); ctx.moveTo(0, r * 0.82);
    ctx.bezierCurveTo(-r * 1.15, r * 0.15, -r, -r * 0.85, 0, -r * 0.25);
    ctx.bezierCurveTo(r, -r * 0.85, r * 1.15, r * 0.15, 0, r * 0.82); ctx.closePath();
    ctx.fillStyle = color || '#ff5e6c'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1; ctx.stroke();
  } else if (kind === 'shield') {
    poly(ctx, [[0, -r * 0.9], [r * 0.78, -r * 0.52], [r * 0.68, r * 0.25], [0, r * 0.9], [-r * 0.68, r * 0.25], [-r * 0.78, -r * 0.52]], color || '#3bc8ff', '#dff8ff', 1.2);
  } else if (kind === 'aether') {
    poly(ctx, [[0, -r], [r * 0.78, 0], [0, r], [-r * 0.78, 0]], color || '#ffc94d', '#fff5cc', 1.1);
  }
  ctx.restore();
}
