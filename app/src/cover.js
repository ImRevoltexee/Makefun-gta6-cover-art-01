// Draws the cover onto a canvas: panels of photos, a gradient-map colour grade,
// grain and vignette, then the big condensed title, the neon subtitle and the
// corner ribbon. Pure canvas 2D, no network, no libraries.
import { LAYOUTS, GRADES } from './state.js';

let noiseCanvas = null;

/** A small tile of random grey noise, reused for the grain pass. */
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 140;
  noiseCanvas.height = 140;
  const ctx = noiseCanvas.getContext('2d');
  const img = ctx.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return noiseCanvas;
}

/** Builds a 256-step gradient-map lookup from a grade's colour stops. */
export function buildGradeLut(gradeKey) {
  const stops = GRADES[gradeKey].stops.map(hexToRgb);
  const lut = { r: new Uint8Array(256), g: new Uint8Array(256), b: new Uint8Array(256) };
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const local = t * (stops.length - 1) - seg;
    const a = stops[seg];
    const b = stops[seg + 1];
    lut.r[i] = Math.round(a[0] + (b[0] - a[0]) * local);
    lut.g[i] = Math.round(a[1] + (b[1] - a[1]) * local);
    lut.b[i] = Math.round(a[2] + (b[2] - a[2]) * local);
  }
  return lut;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Runs the gradient map over the whole canvas, blended so photos still read. */
function applyGrade(ctx, w, h, gradeKey, strength) {
  const lut = buildGradeLut(gradeKey);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    d[i] = d[i] + (lut.r[lum] - d[i]) * strength;
    d[i + 1] = d[i + 1] + (lut.g[lum] - d[i + 1]) * strength;
    d[i + 2] = d[i + 2] + (lut.b[lum] - d[i + 2]) * strength;
  }
  ctx.putImageData(img, 0, 0);
}

/** Cover-fits an image into a panel rect, honouring pan (dx, dy) and zoom.
 * Pan is clamped to what the photo actually covers, so no panel ever shows
 * its dark background at an edge. */
function drawPhotoInto(ctx, img, rect, place) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * place.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxDx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxDy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const dx = Math.max(-maxDx, Math.min(maxDx, place.dx));
  const dy = Math.max(-maxDy, Math.min(maxDy, place.dy));
  const cx = rect.x + rect.w / 2 + dx * rect.w;
  const cy = rect.y + rect.h / 2 + dy * rect.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

/** A designed stand-in for a panel with no photo yet: sunset gradient + sun. */
function drawPlaceholder(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#3b1560');
  g.addColorStop(0.55, '#c2337f');
  g.addColorStop(1, '#ff9a3d');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.42, rect.w * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 6, 32, 0.55)';
  ctx.fillRect(rect.x, rect.y + rect.h * 0.72, rect.w, rect.h * 0.28);
}

/** One panel: photo (or placeholder), clipped to its rect, with a poster border. */
function drawPanel(ctx, rect, img, place, layoutKey, scale) {
  ctx.save();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.translate(cx, cy);
  if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) drawPhotoInto(ctx, img, rect, place);
  else drawPlaceholder(ctx, rect);
  ctx.restore();
  // Poster frame around the panel.
  ctx.save();
  ctx.translate(cx, cy);
  if (rect.rot) ctx.rotate((rect.rot * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.lineWidth = (layoutKey === 'collage' ? 10 : 2.5) * scale;
  ctx.strokeStyle = layoutKey === 'collage' ? '#fdf6ec' : 'rgba(255, 244, 230, 0.9)';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Fits a one-line title to the width, returning the font size to use. */
function fitTitleSize(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** The big condensed title with a sunset gradient fill, dark outline and shadow. */
function drawTitle(ctx, w, h, title, subtitle) {
  const text = title.trim().toUpperCase();
  if (!text) return;
  const bandH = h * 0.16;
  const bandY = h - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
  scrim.addColorStop(0.5, 'rgba(10, 4, 18, 0.62)');
  scrim.addColorStop(1, 'rgba(10, 4, 18, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.06, w, bandH + h * 0.06);

  const size = fitTitleSize(ctx, text, w * 0.92, h * 0.115, 'Anton, "Arial Narrow", sans-serif');
  const titleY = h - h * 0.055 - (subtitle.trim() ? h * 0.028 : 0);
  const grad = ctx.createLinearGradient(0, titleY - size, 0, titleY + size * 0.12);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.5, '#ffb35c');
  grad.addColorStop(1, '#ff2e88');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.04;
  ctx.strokeStyle = 'rgba(20, 4, 28, 0.9)';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(text, w / 2, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(text, w / 2, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const sub = subtitle.trim();
  if (sub) {
    const subSize = Math.max(16, h * 0.026);
    ctx.font = `${subSize}px "Bebas Neue", "Arial Narrow", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * 0.9;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub.toUpperCase(), w / 2, h - h * 0.018);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/** Diagonal ribbon across the top-right corner with the ribbon text. */
function drawRibbon(ctx, w, h, text) {
  const label = text.trim().toUpperCase();
  if (!label) return;
  const bandH = Math.max(22, h * 0.038);
  const bandLen = w * 0.45;
  ctx.save();
  // Centre the band a little inside the corner, tilted +45° so its long axis
  // runs from the top edge down to the right edge: both ends are cut by the
  // canvas edges, like a real corner ribbon.
  const d = w * 0.10;
  ctx.translate(w - d, d);
  ctx.rotate(Math.PI / 4);
  const grad = ctx.createLinearGradient(-bandLen / 2, 0, bandLen / 2, 0);
  grad.addColorStop(0, '#ff7a18');
  grad.addColorStop(1, '#ff2e88');
  ctx.fillStyle = grad;
  ctx.fillRect(-bandLen / 2, -bandH / 2, bandLen, bandH);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-bandLen / 2, bandH / 2 - 2, bandLen, 2);
  ctx.font = `${Math.round(bandH * 0.52)}px "Bebas Neue", "Arial Narrow", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(bandH * 0.12)}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(label, 0, 1);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (at its own pixel size).
 * `photos` is an array of images (or nulls). `opts.highlightPanel` draws the
 * editor's selection outline around one panel; export passes nothing.
 */
export function drawCover(canvas, state, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const scale = Math.min(w, h) / 1080;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#160b1f';
  ctx.fillRect(0, 0, w, h);

  const layout = LAYOUTS[state.layout];
  const rects = layout.panels.map((p) => ({
    x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h, rot: p.rot || 0,
  }));
  const leadPhoto = state.fillAll ? (state.panels[0] ? state.panels[0].photo : 0) : null;
  rects.forEach((rect, i) => {
    const place = state.panels[i] || { photo: 0, dx: 0, dy: 0, zoom: 1 };
    const photoIndex = state.fillAll ? leadPhoto : place.photo;
    drawPanel(ctx, rect, photos[photoIndex] || null, place, state.layout, scale);
  });

  applyGrade(ctx, w, h, state.grade, 0.55);

  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(10, 4, 18, 0)');
    vg.addColorStop(1, 'rgba(10, 4, 18, 0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    const pattern = ctx.createPattern(grainTile(), 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  drawTitle(ctx, w, h, state.title, state.subtitle);
  if (state.ribbon) drawRibbon(ctx, w, h, state.ribbonText);

  if (opts.highlightPanel != null && rects[opts.highlightPanel]) {
    const r = rects[opts.highlightPanel];
    ctx.save();
    ctx.setLineDash([10 * scale, 8 * scale]);
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = '#8dff9a';
    ctx.strokeRect(r.x - 3 * scale, r.y - 3 * scale, r.w + 6 * scale, r.h + 6 * scale);
    ctx.restore();
  }
}

/** Renders the cover at an export size onto a fresh canvas, for PNG download. */
export function renderExport(state, photos, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, photos);
  return canvas;
}
