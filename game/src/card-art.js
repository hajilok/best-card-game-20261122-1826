// Procedural Canvas 2D card artwork, suit emblems, ornate backs, and 3D flip transforms for Sunstone Gambit.
import { CARD, PALETTE, SUITS } from './config.js';

const SHAPE_TO_SUIT = Object.freeze({
  solar: 'solar', sun: 'solar', tide: 'tide', wave: 'tide',
  verdant: 'verdant', leaf: 'verdant', eclipse: 'eclipse', star: 'eclipse',
});

const resolveSuit = (id) => SUITS[SHAPE_TO_SUIT[id] || 'solar'] || SUITS.solar;

function roundedRect(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function diamond(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
}

function star(ctx, cx, cy, pts, rOut, rIn, rot = -Math.PI / 2) {
  ctx.beginPath();
  const step = Math.PI / pts;
  for (let i = 0; i < pts * 2; i += 1) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = rot + i * step;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function linGrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function radGrad(ctx, x0, y0, r0, x1, y1, r1, stops) {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function fillStroke(ctx, fill, stroke, lw = 1.5) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function outlinedText(ctx, text, x, y, font, fill, stroke = '#05070a', lw = 3.2) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// --- Geometric Suit Emblems (distinct color + silhouette shape) ---

function drawSolarEmblem(ctx, cx, cy, r, suit, stroke, lw) {
  ctx.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const rad = i % 4 === 0 ? r * 1.06 : i % 2 === 0 ? r * 0.78 : r * 0.42;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    else ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  fillStroke(ctx, radGrad(ctx, cx - r * 0.16, cy - r * 0.18, r * 0.08, cx, cy, r * 1.08, [
    [0, '#fff7cc'], [0.38, suit.bright], [0.78, suit.color], [1, suit.mid],
  ]), stroke, lw);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2);
  fillStroke(ctx, '#fff5c4', suit.mid, Math.max(0.8, lw * 0.6));
  ctx.beginPath();
  ctx.arc(cx - r * 0.1, cy - r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawTideEmblem(ctx, cx, cy, r, suit, stroke, lw) {
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.88, cy + r * 0.32);
  ctx.bezierCurveTo(cx + r * 0.62, cy + r * 0.96, cx - r * 0.56, cy + r * 0.98, cx - r * 0.86, cy + r * 0.24);
  ctx.bezierCurveTo(cx - r * 1.04, cy - r * 0.34, cx - r * 0.5, cy - r * 0.96, cx + r * 0.14, cy - r * 0.92);
  ctx.bezierCurveTo(cx + r * 0.66, cy - r * 0.88, cx + r * 0.92, cy - r * 0.34, cx + r * 0.54, cy - r * 0.04);
  ctx.bezierCurveTo(cx + r * 0.34, cy + r * 0.1, cx + r * 0.14, cy - r * 0.02, cx + r * 0.22, cy - r * 0.24);
  ctx.bezierCurveTo(cx + r * 0.28, cy - r * 0.42, cx + r * 0.02, cy - r * 0.54, cx - r * 0.2, cy - r * 0.32);
  ctx.bezierCurveTo(cx - r * 0.44, cy - r * 0.08, cx - r * 0.28, cy + r * 0.4, cx + r * 0.18, cy + r * 0.44);
  ctx.bezierCurveTo(cx + r * 0.5, cy + r * 0.46, cx + r * 0.72, cy + r * 0.38, cx + r * 0.88, cy + r * 0.32);
  ctx.closePath();
  fillStroke(ctx, linGrad(ctx, cx - r * 0.8, cy - r * 0.9, cx + r * 0.7, cy + r * 0.9, [
    [0, '#dcf8ff'], [0.32, suit.bright], [0.72, suit.color], [1, suit.mid],
  ]), stroke, lw);
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.56, cy - r * 0.18);
  ctx.quadraticCurveTo(cx - r * 0.28, cy - r * 0.76, cx + r * 0.34, cy - r * 0.62);
  ctx.strokeStyle = '#eefdff';
  ctx.lineWidth = Math.max(1.2, r * 0.14);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + r * 0.66, cy - r * 0.46, r * 0.14, 0, Math.PI * 2);
  fillStroke(ctx, '#e8fbff', stroke, Math.max(0.8, lw * 0.55));
}

function drawVerdantEmblem(ctx, cx, cy, r, suit, stroke, lw) {
  const leafGrad = linGrad(ctx, cx, cy - r, cx, cy + r, [
    [0, '#c8ffe4'], [0.35, suit.bright], [0.75, suit.color], [1, suit.mid],
  ]);
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.56);
    ctx.bezierCurveTo(cx + d * r * 0.22, cy + r * 0.52, cx + d * r * 0.98, cy + r * 0.26, cx + d * r * 0.88, cy - r * 0.34);
    ctx.bezierCurveTo(cx + d * r * 0.46, cy - r * 0.36, cx + d * r * 0.12, cy - r * 0.04, cx, cy + r * 0.42);
    ctx.closePath();
    fillStroke(ctx, leafGrad, stroke, lw);
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.02);
  ctx.bezierCurveTo(cx + r * 0.52, cy - r * 0.48, cx + r * 0.48, cy + r * 0.26, cx, cy + r * 0.66);
  ctx.bezierCurveTo(cx - r * 0.48, cy + r * 0.26, cx - r * 0.52, cy - r * 0.48, cx, cy - r * 1.02);
  ctx.closePath();
  fillStroke(ctx, leafGrad, stroke, lw);
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.68); ctx.lineTo(cx, cy + r * 0.92);
  ctx.moveTo(cx, cy + r * 0.26); ctx.lineTo(cx - r * 0.52, cy - r * 0.12);
  ctx.moveTo(cx, cy + r * 0.26); ctx.lineTo(cx + r * 0.52, cy - r * 0.12);
  ctx.strokeStyle = '#e8fff3';
  ctx.lineWidth = Math.max(1.1, r * 0.12);
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawEclipseEmblem(ctx, cx, cy, r, suit, stroke, lw) {
  ctx.beginPath();
  ctx.arc(cx - r * 0.08, cy, r * 0.88, Math.PI * 0.22, Math.PI * 1.78, false);
  ctx.arc(cx + r * 0.26, cy - r * 0.04, r * 0.7, Math.PI * 1.66, Math.PI * 0.34, true);
  ctx.closePath();
  fillStroke(ctx, linGrad(ctx, cx - r, cy - r, cx + r * 0.5, cy + r, [
    [0, '#fff0bd'], [0.45, PALETTE.gold], [1, suit.color],
  ]), stroke, lw);
  const sx = cx + r * 0.28;
  const sy = cy - r * 0.04;
  star(ctx, sx, sy, 4, r * 0.72, r * 0.23);
  fillStroke(ctx, radGrad(ctx, sx, sy, r * 0.05, sx, sy, r * 0.72, [
    [0, '#ffffff'], [0.38, suit.bright], [0.8, suit.color], [1, suit.mid],
  ]), stroke, lw);
  ctx.beginPath();
  ctx.arc(sx, sy, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

export function drawSuitEmblem(ctx, suitId, cx, cy, radius, options = {}) {
  const suit = resolveSuit(suitId);
  const stroke = options.stroke || '#090b10';
  const lw = options.strokeWidth ?? Math.max(1.2, radius * 0.14);
  ctx.save();
  ctx.globalAlpha *= options.alpha ?? 1;
  if (options.glow) {
    ctx.shadowColor = options.glowColor || suit.color;
    ctx.shadowBlur = Math.max(6, radius * 0.85);
  }
  if (suit.id === 'solar') drawSolarEmblem(ctx, cx, cy, radius, suit, stroke, lw);
  else if (suit.id === 'tide') drawTideEmblem(ctx, cx, cy, radius, suit, stroke, lw);
  else if (suit.id === 'verdant') drawVerdantEmblem(ctx, cx, cy, radius, suit, stroke, lw);
  else drawEclipseEmblem(ctx, cx, cy, radius, suit, stroke, lw);
  ctx.restore();
}

// --- Ornate Astrolabe Card Back ---

export function drawCardBack(ctx, w = CARD.width, h = CARD.height, accent = PALETTE.gold) {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(CARD.radius, w * 0.1);
  ctx.save();
  roundedRect(ctx, -hw, -hh, w, h, r);
  ctx.fillStyle = radGrad(ctx, 0, -h * 0.1, w * 0.08, 0, 0, h * 0.72, [
    [0, '#1e1d3d'], [0.52, '#101026'], [1, '#060711'],
  ]);
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(230, 190, 108, 0.08)';
  ctx.lineWidth = 1;
  const step = Math.max(12, Math.round(w / 9));
  for (let x = -w; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, -hh); ctx.lineTo(x + h, hh);
    ctx.moveTo(x, hh); ctx.lineTo(x + h, -hh);
    ctx.stroke();
  }
  ctx.fillStyle = radGrad(ctx, 0, 0, 2, 0, 0, w * 0.44, [
    [0, 'rgba(255,232,165,0.24)'], [0.5, 'rgba(134,105,220,0.12)'], [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(-hw, -hh, w, h);

  const outerR = Math.min(w, h) * 0.34;
  const midR = outerR * 0.72;
  const innerR = outerR * 0.42;
  ctx.strokeStyle = 'rgba(230, 190, 108, 0.34)';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI) / 8;
    const r0 = i % 2 === 0 ? innerR * 0.55 : midR * 0.82;
    const r1 = i % 2 === 0 ? outerR * 1.12 : outerR * 0.96;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
  }

  const ringGrad = linGrad(ctx, -outerR, -outerR, outerR, outerR, [
    [0, PALETTE.goldBright], [0.5, accent], [1, PALETTE.goldDim],
  ]);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, midR, 0, Math.PI * 2); ctx.stroke();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 240, 189, 0.45)';
  ctx.lineWidth = 1;
  for (const ang of [Math.PI / 6, -Math.PI / 6]) {
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, outerR * 1.05, outerR * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  star(ctx, 0, 0, 8, midR * 0.96, innerR * 0.62);
  fillStroke(ctx, radGrad(ctx, 0, 0, 2, 0, 0, midR, [
    [0, '#fff7d6'], [0.45, accent], [1, '#7a5926'],
  ]), '#141224', 1.1);
  diamond(ctx, 0, 0, innerR * 0.42, innerR * 0.42);
  fillStroke(ctx, '#fff9df', accent, 1.1);

  for (const sy of [-1, 1]) {
    const py = sy * (hh - 20);
    diamond(ctx, 0, py, 5, 7);
    ctx.fillStyle = accent; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, sy * (outerR + 5)); ctx.lineTo(0, py - sy * 8);
    ctx.strokeStyle = 'rgba(230, 190, 108, 0.52)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.restore();

  roundedRect(ctx, -hw + 1.5, -hh + 1.5, w - 3, h - 3, r - 1);
  ctx.strokeStyle = linGrad(ctx, -hw, -hh, hw, hh, [
    [0, PALETTE.goldBright], [0.35, accent], [0.7, PALETTE.goldDim], [1, PALETTE.goldBright],
  ]);
  ctx.lineWidth = 2.6; ctx.stroke();
  roundedRect(ctx, -hw + 7, -hh + 7, w - 14, h - 14, Math.max(4, r - 5));
  ctx.strokeStyle = 'rgba(230, 190, 108, 0.72)'; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.restore();
}

// --- Bespoke Per-Card Procedural Vector Illustrations ---

function drawArtBackdrop(ctx, x, y, w, h, suit, artKey) {
  ctx.fillStyle = linGrad(ctx, x, y, x, y + h, [[0, suit.panel], [0.55, suit.dark], [1, '#090c12']]);
  ctx.fillRect(x, y, w, h);
  const cx = x + w * 0.5;
  const cy = y + h * 0.48;
  ctx.fillStyle = radGrad(ctx, cx, cy, 4, cx, cy, w * 0.62, [
    [0, `${suit.bright}55`], [0.45, `${suit.color}2e`], [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = `${suit.bright}30`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.38, 0, Math.PI * 2); ctx.stroke();

  let seed = 0;
  for (let i = 0; i < artKey.length; i += 1) seed = (seed * 31 + artKey.charCodeAt(i)) | 0;
  ctx.fillStyle = `${suit.bright}88`;
  for (let i = 0; i < 6; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const mx = x + 10 + ((seed % 1000) / 1000) * (w - 20);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const my = y + 8 + ((seed % 1000) / 1000) * (h - 22);
    ctx.beginPath(); ctx.arc(mx, my, 1.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCardArtwork(ctx, artKey, cx, cy, rx, ry, suit) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = Math.min(rx, ry);

  switch (artKey) {
    case 'spark': {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.74, ry * 0.58);
      ctx.quadraticCurveTo(-rx * 0.08, ry * 0.02, rx * 0.42, -ry * 0.58);
      ctx.quadraticCurveTo(rx * 0.14, ry * 0.24, -rx * 0.74, ry * 0.58);
      ctx.fillStyle = linGrad(ctx, -rx * 0.72, ry * 0.56, rx * 0.5, -ry * 0.54, [
        [0, 'rgba(255,93,56,0)'], [0.5, suit.color], [1, '#fff5c4'],
      ]);
      ctx.fill();
      star(ctx, rx * 0.22, -ry * 0.26, 6, s * 0.46, s * 0.18, 0.2);
      fillStroke(ctx, '#fff5bd', suit.color, 1.6);
      for (const [dx, dy, r] of [[-0.4, 0.12, 3.2], [0.46, 0.14, 2.6], [-0.14, -0.46, 2.5]]) {
        diamond(ctx, rx * dx, ry * dy, r, r * 1.4); ctx.fillStyle = '#ffd485'; ctx.fill();
      }
      break;
    }
    case 'lance': {
      ctx.rotate(-Math.PI * 0.22);
      ctx.strokeStyle = 'rgba(255,196,108,0.55)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(-s * 0.16, 0, s * 0.24, s * 0.52, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, -2.4); ctx.lineTo(s * 0.34, -3.5); ctx.lineTo(s * 0.28, -s * 0.26);
      ctx.lineTo(s * 0.98, 0); ctx.lineTo(s * 0.28, s * 0.26); ctx.lineTo(s * 0.34, 3.5); ctx.lineTo(-s * 0.95, 2.4);
      ctx.closePath();
      fillStroke(ctx, linGrad(ctx, -s * 0.95, 0, s * 0.95, 0, [[0, suit.mid], [0.55, suit.bright], [1, '#fff']]), '#3b1109', 1.5);
      break;
    }
    case 'brazier': {
      ctx.beginPath();
      ctx.moveTo(0, -ry * 0.72);
      ctx.bezierCurveTo(rx * 0.52, -ry * 0.28, rx * 0.48, ry * 0.26, 0, ry * 0.34);
      ctx.bezierCurveTo(-rx * 0.48, ry * 0.26, -rx * 0.52, -ry * 0.28, 0, -ry * 0.72);
      fillStroke(ctx, linGrad(ctx, 0, -ry * 0.72, 0, ry * 0.34, [[0, '#fff7cc'], [0.45, suit.bright], [1, suit.color]]), '#3b1109', 1.4);
      ctx.beginPath();
      ctx.moveTo(-rx * 0.5, ry * 0.18); ctx.lineTo(rx * 0.5, ry * 0.18);
      ctx.lineTo(rx * 0.32, ry * 0.54); ctx.lineTo(-rx * 0.32, ry * 0.54); ctx.closePath();
      fillStroke(ctx, PALETTE.gold, '#240b06', 1.6);
      break;
    }
    case 'nova': {
      ctx.strokeStyle = 'rgba(255,182,108,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -ry * 0.04, s * 0.74, 0, Math.PI * 2); ctx.stroke();
      star(ctx, 0, -ry * 0.04, 12, s * 0.88, s * 0.34, 0);
      fillStroke(ctx, radGrad(ctx, 0, -ry * 0.04, 3, 0, -ry * 0.04, s * 0.88, [
        [0, '#fff'], [0.3, '#fff2b0'], [0.65, suit.color], [1, suit.mid],
      ]), '#3b1109', 1.2);
      ctx.beginPath(); ctx.arc(0, -ry * 0.04, s * 0.26, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'crown': {
      for (let i = -3; i <= 3; i += 1) {
        const a = -Math.PI / 2 + i * 0.26;
        ctx.beginPath(); ctx.moveTo(0, -ry * 0.2); ctx.lineTo(Math.cos(a) * s * 0.92, -ry * 0.2 + Math.sin(a) * s * 0.92);
        ctx.strokeStyle = 'rgba(255,222,138,0.45)'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, -ry * 0.46, s * 0.2, 0, Math.PI * 2); fillStroke(ctx, '#fff5bd', suit.color, 1.8);
      ctx.beginPath();
      ctx.moveTo(-rx * 0.56, ry * 0.46); ctx.lineTo(-rx * 0.66, -ry * 0.14); ctx.lineTo(-rx * 0.34, ry * 0.08);
      ctx.lineTo(-rx * 0.22, -ry * 0.28); ctx.lineTo(0, ry * 0.02); ctx.lineTo(rx * 0.22, -ry * 0.28);
      ctx.lineTo(rx * 0.34, ry * 0.08); ctx.lineTo(rx * 0.66, -ry * 0.14); ctx.lineTo(rx * 0.56, ry * 0.46);
      ctx.closePath();
      fillStroke(ctx, linGrad(ctx, 0, -ry * 0.3, 0, ry * 0.5, [[0, '#fff4bf'], [0.55, PALETTE.gold], [1, '#9c6822']]), '#2e1307', 1.8);
      diamond(ctx, 0, ry * 0.25, 5.5, 7); fillStroke(ctx, suit.color, '#fff5cc', 1);
      break;
    }
    case 'mist': {
      for (let i = 0; i < 3; i += 1) {
        const yo = (i - 1) * ry * 0.3;
        ctx.beginPath(); ctx.moveTo(-rx * 0.72, yo + ry * 0.14);
        ctx.bezierCurveTo(-rx * 0.26, yo - ry * 0.3, rx * 0.22, yo + ry * 0.36, rx * 0.7, yo - ry * 0.14);
        ctx.strokeStyle = i === 1 ? '#dff9ff' : suit.bright; ctx.lineWidth = i === 1 ? 5 : 3.2; ctx.lineCap = 'round'; ctx.stroke();
      }
      for (const [dx, dy, r] of [[-0.28, -0.34, 5], [0.3, 0.26, 4.2], [0.04, -0.04, 6]]) {
        ctx.beginPath(); ctx.arc(rx * dx, ry * dy, r, 0, Math.PI * 2); fillStroke(ctx, '#e8fbff', suit.mid, 1.4);
      }
      break;
    }
    case 'mirror': {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        if (i === 0) ctx.moveTo(Math.cos(a) * s * 0.56, Math.sin(a) * s * 0.68);
        else ctx.lineTo(Math.cos(a) * s * 0.56, Math.sin(a) * s * 0.68);
      }
      ctx.closePath();
      fillStroke(ctx, linGrad(ctx, -s * 0.5, -s * 0.6, s * 0.5, s * 0.6, [[0, '#dcf8ff'], [0.5, suit.color], [1, suit.dark]]), PALETTE.goldBright, 2.4);
      ctx.beginPath(); ctx.moveTo(-rx * 0.78, -ry * 0.44); ctx.lineTo(0, 0); ctx.lineTo(rx * 0.78, -ry * 0.52);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'breaker': {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.82, ry * 0.58);
      ctx.bezierCurveTo(-rx * 0.76, -ry * 0.42, -rx * 0.08, -ry * 0.8, rx * 0.46, -ry * 0.48);
      ctx.bezierCurveTo(rx * 0.76, -ry * 0.3, rx * 0.76, ry * 0.05, rx * 0.36, ry * 0.04);
      ctx.bezierCurveTo(rx * 0.12, 0, rx * 0.2, -ry * 0.3, -rx * 0.18, ry * 0.22);
      ctx.bezierCurveTo(-rx * 0.1, ry * 0.44, rx * 0.4, ry * 0.48, rx * 0.82, ry * 0.42);
      ctx.lineTo(rx * 0.82, ry * 0.62); ctx.lineTo(-rx * 0.82, ry * 0.62); ctx.closePath();
      fillStroke(ctx, linGrad(ctx, 0, -ry * 0.7, 0, ry * 0.62, [[0, '#e3fbff'], [0.38, suit.bright], [0.8, suit.color], [1, suit.mid]]), '#061a2b', 1.6);
      break;
    }
    case 'bastion': {
      ctx.beginPath();
      ctx.moveTo(0, -ry * 0.74); ctx.lineTo(rx * 0.62, -ry * 0.46); ctx.lineTo(rx * 0.54, ry * 0.22);
      ctx.lineTo(0, ry * 0.7); ctx.lineTo(-rx * 0.54, ry * 0.22); ctx.lineTo(-rx * 0.62, -ry * 0.46);
      ctx.closePath();
      fillStroke(ctx, linGrad(ctx, -rx * 0.6, -ry * 0.7, rx * 0.6, ry * 0.7, [[0, '#ccf6ff'], [0.45, suit.color], [1, suit.dark]]), '#e5fbff', 2.2);
      diamond(ctx, 0, -ry * 0.08, 7, 10); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'maelstrom': {
      for (let arm = 0; arm < 4; arm += 1) {
        ctx.save(); ctx.rotate((arm * Math.PI) / 2); ctx.beginPath();
        for (let t = 0; t <= 16; t += 1) {
          const f = t / 16; const a = f * Math.PI * 1.45; const rad = s * (0.14 + f * 0.78);
          if (t === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.strokeStyle = arm % 2 === 0 ? '#d8f9ff' : suit.color; ctx.lineWidth = arm % 2 === 0 ? 3.2 : 2.2; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2); fillStroke(ctx, '#061a2b', '#e3fbff', 2);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'dew': {
      for (const d of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, ry * 0.58);
        ctx.quadraticCurveTo(d * rx * 0.42, ry * 0.54, d * rx * 0.68, ry * 0.14);
        ctx.quadraticCurveTo(d * rx * 0.28, ry * 0.14, 0, ry * 0.44); ctx.closePath();
        fillStroke(ctx, suit.color, '#062115', 1.4);
      }
      ctx.beginPath(); ctx.moveTo(0, -ry * 0.7);
      ctx.bezierCurveTo(rx * 0.44, -ry * 0.08, rx * 0.4, ry * 0.36, 0, ry * 0.36);
      ctx.bezierCurveTo(-rx * 0.4, ry * 0.36, -rx * 0.44, -ry * 0.08, 0, -ry * 0.7);
      fillStroke(ctx, radGrad(ctx, -rx * 0.08, -ry * 0.06, 2, 0, 0, ry * 0.56, [
        [0, '#fff'], [0.36, '#ffe58c'], [0.75, suit.bright], [1, suit.color],
      ]), '#0a3320', 1.6);
      break;
    }
    case 'thorn': {
      ctx.beginPath(); ctx.moveTo(-rx * 0.72, ry * 0.52);
      ctx.bezierCurveTo(-rx * 0.56, -ry * 0.64, rx * 0.34, -ry * 0.68, rx * 0.66, ry * 0.1);
      ctx.bezierCurveTo(rx * 0.42, ry * 0.42, -rx * 0.1, ry * 0.26, -rx * 0.02, -ry * 0.12);
      ctx.strokeStyle = suit.bright; ctx.lineWidth = 4.6; ctx.lineCap = 'round'; ctx.stroke();
      for (const [bx, by, tx, ty] of [[-0.5, -0.1, -0.74, -0.34], [-0.14, -0.44, -0.22, -0.74], [0.34, -0.38, 0.58, -0.62], [0.54, 0.06, 0.8, 0.02]]) {
        ctx.beginPath(); ctx.moveTo(rx * bx - 4, ry * by); ctx.lineTo(rx * tx, ry * ty); ctx.lineTo(rx * bx + 4, ry * by + 3); ctx.closePath();
        fillStroke(ctx, '#d4ffea', '#062115', 1.1);
      }
      break;
    }
    case 'canopy': {
      ctx.beginPath(); ctx.arc(0, -ry * 0.06, s * 0.66, Math.PI, 0, false);
      ctx.lineTo(s * 0.66, ry * 0.14); ctx.quadraticCurveTo(0, ry * 0.34, -s * 0.66, ry * 0.14); ctx.closePath();
      fillStroke(ctx, radGrad(ctx, 0, -ry * 0.22, 4, 0, -ry * 0.06, s * 0.72, [[0, '#c8ffe4'], [0.5, suit.color], [1, suit.mid]]), '#062115', 1.6);
      ctx.beginPath();
      ctx.moveTo(-rx * 0.14, ry * 0.64); ctx.lineTo(-rx * 0.16, -ry * 0.08); ctx.lineTo(0, -ry * 0.26);
      ctx.lineTo(rx * 0.16, -ry * 0.08); ctx.lineTo(rx * 0.14, ry * 0.64); ctx.closePath();
      fillStroke(ctx, PALETTE.gold, '#24140a', 1.4);
      break;
    }
    case 'bloom': {
      for (let i = 0; i < 6; i += 1) {
        ctx.save(); ctx.rotate((i * Math.PI) / 3);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.34, -s * 0.26, s * 0.32, -s * 0.74, 0, -s * 0.86);
        ctx.bezierCurveTo(-s * 0.32, -s * 0.74, -s * 0.34, -s * 0.26, 0, 0);
        fillStroke(ctx, i % 2 === 0 ? suit.bright : suit.color, '#062115', 1.3);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2); fillStroke(ctx, '#fff5bd', PALETTE.gold, 2);
      break;
    }
    case 'glint': {
      ctx.beginPath();
      ctx.moveTo(-rx * 0.76, 0); ctx.quadraticCurveTo(0, -ry * 0.62, rx * 0.76, 0);
      ctx.quadraticCurveTo(0, ry * 0.62, -rx * 0.76, 0); ctx.closePath();
      fillStroke(ctx, radGrad(ctx, 0, 0, 3, 0, 0, rx * 0.74, [[0, '#fff'], [0.42, suit.bright], [1, suit.dark]]), PALETTE.goldBright, 2);
      diamond(ctx, 0, 0, s * 0.18, s * 0.38); fillStroke(ctx, '#140824', suit.color, 1.4);
      ctx.beginPath(); ctx.arc(-s * 0.05, -s * 0.08, s * 0.07, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'needle': {
      ctx.strokeStyle = 'rgba(53,198,255,0.75)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.56, -Math.PI * 0.7, Math.PI * 0.18); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.56, Math.PI * 0.38, Math.PI * 1.15); ctx.stroke();
      ctx.rotate(-Math.PI * 0.25);
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, 0); ctx.lineTo(-s * 0.22, -s * 0.28); ctx.lineTo(s * 0.92, 0);
      ctx.lineTo(-s * 0.22, s * 0.28); ctx.closePath();
      fillStroke(ctx, linGrad(ctx, -s * 0.85, 0, s * 0.92, 0, [[0, PALETTE.gold], [0.4, suit.color], [1, '#fff']]), '#140824', 1.5);
      break;
    }
    case 'crescent': {
      for (const d of [-1, 1]) {
        ctx.save(); ctx.scale(d, 1); ctx.beginPath();
        ctx.arc(-s * 0.1, 0, s * 0.7, Math.PI * 0.62, Math.PI * 1.38, false);
        ctx.arc(s * 0.22, 0, s * 0.54, Math.PI * 1.28, Math.PI * 0.72, true); ctx.closePath();
        fillStroke(ctx, d < 0 ? suit.bright : PALETTE.goldBright, '#140824', 1.5);
        ctx.restore();
      }
      star(ctx, 0, 0, 4, s * 0.34, s * 0.11); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'zenith': {
      ctx.beginPath(); ctx.arc(0, -ry * 0.04, s * 0.46, 0, Math.PI * 2); fillStroke(ctx, '#0e061a', PALETTE.goldBright, 2.6);
      for (const [x0, y0, x1, y1, sz] of [[-0.44, -0.44, 0.26, 0.26, 9], [0.12, -0.56, 0.62, -0.02, 7.5], [-0.58, 0.04, -0.1, 0.52, 7.5]]) {
        ctx.beginPath(); ctx.moveTo(rx * x0, ry * y0); ctx.lineTo(rx * x1, ry * y1);
        ctx.strokeStyle = linGrad(ctx, rx * x0, ry * y0, rx * x1, ry * y1, [[0, 'rgba(235,200,255,0)'], [1, '#fff']]);
        ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
        star(ctx, rx * x1, ry * y1, 4, sz, sz * 0.34); fillStroke(ctx, '#fff', suit.color, 1);
      }
      break;
    }
    default:
      drawSuitEmblem(ctx, suit.id, 0, 0, s * 0.58, { glow: true });
  }
  ctx.restore();
}

// --- Cost Gem, Value Medallion, Action Plaque, and Full Card Face ---

function drawCostGem(ctx, cx, cy, cost, playable) {
  ctx.save();
  ctx.shadowColor = playable ? (cost === 0 ? 'rgba(53,198,255,0.7)' : 'rgba(255,201,77,0.65)') : 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = playable ? 10 : 4;
  diamond(ctx, cx, cy, 18, 20);
  const stops = !playable
    ? [[0, '#6a7482'], [0.55, '#3b434f'], [1, '#1f242c']]
    : cost === 0
      ? [[0, '#e3fbff'], [0.45, '#35c6ff'], [1, '#11639c']]
      : [[0, '#fff7cc'], [0.45, '#ffc94d'], [1, '#b56e12']];
  ctx.fillStyle = linGrad(ctx, cx - 18, cy - 20, cx + 18, cy + 20, stops);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = playable ? '#fff7dc' : '#7b8494';
  ctx.lineWidth = 2; ctx.stroke();
  outlinedText(ctx, String(cost), cx, cy + 1.5, '900 24px "Trebuchet MS", sans-serif', playable ? '#ffffff' : '#b7c0ce', '#090c12', 4.2);
  ctx.restore();
}

function drawValueMedallion(ctx, cx, cy, value, boosted) {
  ctx.save();
  ctx.shadowColor = boosted ? 'rgba(59,232,152,0.9)' : 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = boosted ? 12 : 6;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = radGrad(ctx, cx - 4, cy - 5, 2, cx, cy, 18, boosted ? [[0, '#174f38'], [1, '#071c14']] : [[0, '#222a38'], [1, '#080b10']]);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = boosted ? PALETTE.emerald : PALETTE.goldBright;
  ctx.lineWidth = 2.4; ctx.stroke();
  outlinedText(ctx, String(value), cx, cy + 1.5, '900 24px "Trebuchet MS", sans-serif', boosted ? '#9effcc' : '#ffffff', '#05070a', 4);
  ctx.restore();
}

function segmentColor(text) {
  const u = text.toUpperCase();
  if (u.includes('AETHER') || u.includes('CARD') || u.includes('REVEAL')) return PALETTE.goldBright;
  if (u.includes('HP')) return '#8effc6';
  if (u.includes('WARD')) return '#8ceaff';
  if (u.includes('PIERCE')) return '#ebc8ff';
  return '#ffffff';
}

function drawActionPlaque(ctx, card, suit, x, y, w, h) {
  ctx.save();
  roundedRect(ctx, x, y, w, h, 7);
  fillStroke(ctx, 'rgba(8, 12, 16, 0.92)', `${suit.bright}66`, 1.2);
  drawSuitEmblem(ctx, suit.id, x + 13, y + h * 0.5, 6.2, { strokeWidth: 1.1 });

  const areaW = w - 27;
  const cx = x + 23 + areaW * 0.5;
  const raw = (card.shortText || '').trim();
  const parts = raw.split('·').map((p) => p.trim()).filter(Boolean);
  ctx.font = '800 14px "Trebuchet MS", sans-serif';

  const drawFitted = (txt, cy, base) => {
    ctx.font = `800 ${base}px "Trebuchet MS", sans-serif`;
    const mw = ctx.measureText(txt).width;
    const sz = mw > areaW ? Math.max(11, Math.floor((base * areaW) / mw)) : base;
    outlinedText(ctx, txt, cx, cy, `800 ${sz}px "Trebuchet MS", sans-serif`, segmentColor(txt), '#030508', 2.8);
  };

  if (parts.length <= 1 || ctx.measureText(raw).width <= areaW) {
    drawFitted(raw, y + h * 0.5 + 0.5, 14);
  } else {
    drawFitted(parts[0], y + h * 0.3, 13.5);
    drawFitted(parts.slice(1).join(' · '), y + h * 0.72, 13.5);
  }
  ctx.restore();
}

function drawCounterPill(ctx, hh, counterHint, time) {
  const label = (typeof counterHint === 'string' && counterHint) ? counterHint.slice(0, 18) : 'COUNTER!';
  const pulse = 0.5 + 0.5 * Math.sin(time * 7);
  const pillW = Math.min(144, Math.max(84, label.length * 7.6 + 20));
  const py = -hh - 26;
  ctx.save();
  ctx.shadowColor = `rgba(255, 206, 84, ${0.55 + pulse * 0.35})`;
  ctx.shadowBlur = 12;
  roundedRect(ctx, -pillW * 0.5, py, pillW, 21, 10.5);
  ctx.fillStyle = linGrad(ctx, 0, py, 0, py + 21, [[0, '#332208'], [1, '#140c03']]);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = PALETTE.goldBright;
  ctx.lineWidth = 1.8; ctx.stroke();
  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.goldBright;
  ctx.fillText(label, 0, py + 11);
  ctx.restore();
}

export function drawCardFace(ctx, card, w = CARD.width, h = CARD.height, opts = {}) {
  const { playable = true, hovered = false, selected = false, foil = false, boostedValue = null, counterHint = null, time = 0 } = opts;
  const suit = resolveSuit(card.suit);
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(CARD.radius, w * 0.1);
  const isGold = Boolean(card.rare || selected || hovered);

  ctx.save();
  roundedRect(ctx, -hw, -hh, w, h, r);
  ctx.fillStyle = linGrad(ctx, -hw * 0.4, -hh, hw * 0.5, hh, [
    [0, suit.dark], [0.42, '#14171f'], [0.78, suit.panel], [1, '#090b10'],
  ]);
  ctx.fill();

  ctx.save();
  ctx.clip();

  const artX = -hw + 9;
  const artY = -hh + 13;
  const artW = w - 18;
  const artH = Math.round(h * 0.51);
  ctx.save();
  roundedRect(ctx, artX, artY, artW, artH, 8);
  ctx.clip();
  drawArtBackdrop(ctx, artX, artY, artW, artH, suit, card.art || card.id || 'spark');
  drawCardArtwork(ctx, card.art, 0, artY + artH * 0.48, artW * 0.46, artH * 0.46, suit);
  ctx.restore();

  roundedRect(ctx, artX, artY, artW, artH, 8);
  ctx.strokeStyle = isGold ? 'rgba(255,240,189,0.85)' : `${suit.bright}88`;
  ctx.lineWidth = 1.6; ctx.stroke();

  const emblemCy = artY + artH - 1;
  ctx.beginPath(); ctx.arc(0, emblemCy, 13.5, 0, Math.PI * 2);
  fillStroke(ctx, '#090d14', isGold ? PALETTE.goldBright : suit.bright, 1.8);
  drawSuitEmblem(ctx, suit.id, 0, emblemCy, 9.6, { glow: true, strokeWidth: 1.2 });

  const titleY = artY + artH + 21;
  ctx.font = '800 13.5px "Trebuchet MS", sans-serif';
  const tw = ctx.measureText(card.name || '').width;
  const tsz = tw > w - 18 ? Math.max(10.5, Math.floor((13.5 * (w - 18)) / tw)) : 13.5;
  outlinedText(ctx, card.name || '', 0, titleY, `800 ${tsz}px "Trebuchet MS", sans-serif`, card.rare ? PALETTE.goldBright : PALETTE.ivory);

  const plaqueY = titleY + 11;
  drawActionPlaque(ctx, card, suit, -hw + 8, plaqueY, w - 16, Math.max(32, hh - plaqueY - 8));

  if (foil || card.rare || hovered) {
    const sweepX = -w + ((((time * 0.45) % 1.8) - 0.4) * w * 2.2);
    ctx.fillStyle = linGrad(ctx, sweepX - 34, -hh, sweepX + 34, hh, [
      [0, 'rgba(255,255,255,0)'],
      [0.5, hovered ? 'rgba(255,250,225,0.24)' : 'rgba(255,245,200,0.16)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    ctx.fillRect(-hw, -hh, w, h);
  }
  if (!playable) {
    ctx.fillStyle = 'rgba(10, 16, 24, 0.44)';
    ctx.fillRect(-hw, -hh, w, h);
  }
  ctx.restore();

  roundedRect(ctx, -hw + 1.5, -hh + 1.5, w - 3, h - 3, r - 1);
  ctx.strokeStyle = linGrad(ctx, -hw, -hh, hw, hh, isGold
    ? [[0, '#fff7d4'], [0.45, PALETTE.gold], [1, '#fff0bd']]
    : [[0, suit.bright], [0.5, suit.color], [1, PALETTE.goldDim]]);
  ctx.lineWidth = isGold ? 3 : 2.3; ctx.stroke();

  drawCostGem(ctx, -hw + 20, -hh + 22, card.cost, playable);
  drawValueMedallion(ctx, hw - 20, -hh + 22, boostedValue ?? card.value, boostedValue !== null);
  if (counterHint && playable) drawCounterPill(ctx, hh, counterHint, time);
  ctx.restore();
}

export function renderCardTransform(ctx, card, anim, opts = {}) {
  const w = CARD.width;
  const h = CARD.height;
  const flip = Math.max(0, Math.min(1, anim.flip ?? 1));
  const flipScaleX = Math.max(0.03, Math.abs(Math.cos((1 - flip) * Math.PI)));
  const flipLift = Math.sin(flip * Math.PI) * 18;
  const scale = (anim.scale ?? 1) * (1 + (anim.settlePulse ?? 0) * 0.08);
  const tiltX = (anim.tiltX ?? 0) * (opts.hovered ? 0.08 : 0);
  const tiltY = (anim.tiltY ?? 0) * (opts.hovered ? 0.06 : 0);

  ctx.save();
  ctx.translate(anim.x, anim.y - flipLift);
  ctx.rotate((anim.rot ?? 0) + tiltX * 0.25);
  ctx.scale(scale * flipScaleX, scale);
  if (tiltX !== 0 || tiltY !== 0) ctx.transform(1, tiltY * 0.14, tiltX * 0.14, 1, 0, 0);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.56)';
  ctx.shadowBlur = opts.hovered ? 26 : 14;
  ctx.shadowOffsetY = opts.hovered ? 18 : 9;
  roundedRect(ctx, -w * 0.5, -h * 0.5, w, h, CARD.radius);
  ctx.fillStyle = '#05080b'; ctx.fill();
  ctx.restore();

  const glow = anim.glow ?? 0;
  if (glow > 0.05) {
    const suit = resolveSuit(card.suit);
    ctx.save();
    ctx.shadowColor = opts.selected || opts.hovered ? PALETTE.goldBright : suit.bright;
    ctx.shadowBlur = 14 + glow * 10;
    roundedRect(ctx, -w * 0.5 - 1, -h * 0.5 - 1, w + 2, h + 2, CARD.radius + 1);
    ctx.strokeStyle = opts.selected || opts.hovered ? 'rgba(255,240,189,0.72)' : `${suit.bright}88`;
    ctx.lineWidth = 2.4; ctx.stroke();
    ctx.restore();
  }

  if (flip < 0.5) drawCardBack(ctx, w, h, PALETTE.gold);
  else drawCardFace(ctx, card, w, h, opts);
  ctx.restore();
}
