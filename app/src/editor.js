// Wires the editor: photo loading, layout and grade pickers, per-panel drag/zoom,
// lettering inputs, undo/redo and PNG export. Also runs the ?shot= scenes.
import { LAYOUTS, GRADES, EXPORT_SIZES, freshState, panelsFor, snapshotState, restoreState } from './state.js';
import { drawCover, renderExport } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const $ = (id) => document.getElementById(id);
const state = freshState();
state.panels = panelsFor(state.layout);

let photos = []; // HTMLImageElement per slot, in load order
let photoNames = [];
let undoStack = [];
let redoStack = [];
let drag = null; // { panel, startX, startY, dx, dy } while a panel is dragged

function redraw() {
  // The selection outline is an editor affordance: cover-only shots show the
  // bare cover, exactly as an export looks.
  const coverOnly = document.body.classList.contains('shot-cover');
  drawCover(canvas, state, photos, { highlightPanel: coverOnly ? null : state.selectedPanel });
}

function pushHistory() {
  undoStack.push(snapshotState(state));
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function applySnapshot(snap) {
  restoreState(state, snap);
  syncControls();
  redraw();
}

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('ribbon-text').value = state.ribbonText;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('ribbon').checked = state.ribbon;
  $('fill-all').checked = state.fillAll;
  syncPanelControls();
  document.querySelectorAll('#layouts .chip').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll('#grades .swatch').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
  });
}

/** Rebuilds the per-panel photo dropdown and the zoom slider for the selection. */
function syncPanelControls() {
  const select = $('panel-photo');
  const place = state.panels[state.selectedPanel];
  select.innerHTML = '';
  if (photos.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No photos yet — add one or use a sample';
    select.append(opt);
  } else {
    photos.forEach((_, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = photoNames[i] || `Photo ${i + 1}`;
      select.append(opt);
    });
    select.value = String(place ? place.photo : 0);
  }
  select.disabled = state.fillAll || photos.length === 0;
  const zoom = $('zoom');
  zoom.value = String(Math.round((place ? place.zoom : 1) * 100));
  $('zoom-val').textContent = `${zoom.value}%`;
}

/** Loads an image from a URL; resolves once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  photos.push(img);
  photoNames.push(name);
  // A new photo becomes the lead photo when "one photo across all panels" is on.
  if (state.fillAll && state.panels[0]) state.panels[0].photo = photos.length - 1;
  syncPanelControls();
  redraw();
}

function downloadPng(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function exportSize(size) {
  const out = renderExport(state, photos, size.w, size.h);
  const name = `vice-cover-${size.key}-${size.w}x${size.h}.png`;
  out.toBlob((blob) => {
    if (!blob) return;
    downloadPng(blob, name);
    $('status').textContent = `Saved ${name}`;
  }, 'image/png');
}

/** Picks the panel whose rect contains the point (preview pixels), or -1. */
function panelAt(px, py) {
  const rect = canvas.getBoundingClientRect();
  const fx = (px - rect.left) / rect.width;
  const fy = (py - rect.top) / rect.height;
  const panels = LAYOUTS[state.layout].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return -1;
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
}

// ---- layout + grade pickers ----
const layoutBox = $('layouts');
Object.entries(LAYOUTS).forEach(([key, def]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.dataset.layout = key;
  b.textContent = def.label;
  b.setAttribute('aria-pressed', String(key === state.layout));
  b.addEventListener('click', () => {
    pushHistory();
    state.layout = key;
    state.panels = panelsFor(key);
    state.selectedPanel = key === 'key-art' ? 4 : 0;
    syncControls();
    redraw();
  });
  layoutBox.append(b);
});

const gradeBox = $('grades');
Object.entries(GRADES).forEach(([key, def]) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.dataset.grade = key;
  b.setAttribute('aria-pressed', String(key === state.grade));
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = `linear-gradient(135deg, ${def.stops[1]}, ${def.stops[2]} 55%, ${def.stops[3]})`;
  b.append(dot, document.createTextNode(def.label));
  b.addEventListener('click', () => {
    pushHistory();
    state.grade = key;
    syncControls();
    redraw();
  });
  gradeBox.append(b);
});

// ---- photo inputs ----
$('photos').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  pushHistory();
  for (const file of files) await addPhoto(URL.createObjectURL(file), file.name);
  $('status').textContent = `${files.length} photo${files.length > 1 ? 's' : ''} loaded`;
  e.target.value = '';
});
$('use-boulevard').addEventListener('click', () => {
  pushHistory();
  addPhoto('samples/boulevard.jpg', 'Boulevard sample');
});
$('use-pier').addEventListener('click', () => {
  pushHistory();
  addPhoto('samples/pier.jpg', 'Pier sample');
});

// ---- per-panel controls ----
$('fill-all').addEventListener('change', (e) => {
  pushHistory();
  state.fillAll = e.target.checked;
  syncPanelControls();
  redraw();
});
$('panel-photo').addEventListener('change', (e) => {
  pushHistory();
  const place = state.panels[state.selectedPanel];
  if (place) place.photo = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  const place = state.panels[state.selectedPanel];
  if (!place) return;
  place.zoom = Number(e.target.value) / 100;
  $('zoom-val').textContent = `${e.target.value}%`;
  redraw();
});
$('zoom').addEventListener('focus', () => pushHistory());

// ---- toggles + lettering ----
for (const [id, key] of [['grain', 'grain'], ['vignette', 'vignette'], ['ribbon', 'ribbon']]) {
  $(id).addEventListener('change', (e) => {
    pushHistory();
    state[key] = e.target.checked;
    redraw();
  });
}
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('ribbon-text').addEventListener('input', (e) => { state.ribbonText = e.target.value; redraw(); });
for (const id of ['title', 'subtitle', 'ribbon-text']) {
  $(id).addEventListener('focus', () => pushHistory());
}

// ---- export + undo/redo ----
$('export-square').addEventListener('click', () => exportSize(EXPORT_SIZES[0]));
$('export-portrait').addEventListener('click', () => exportSize(EXPORT_SIZES[1]));
$('export-wide').addEventListener('click', () => exportSize(EXPORT_SIZES[2]));
$('export-all').addEventListener('click', () => {
  EXPORT_SIZES.forEach((s, i) => setTimeout(() => exportSize(s), i * 350));
  $('status').textContent = 'Exporting all three sizes…';
});
$('undo').addEventListener('click', () => {
  const snap = undoStack.pop();
  if (!snap) return;
  redoStack.push(snapshotState(state));
  applySnapshot(snap);
});
$('redo').addEventListener('click', () => {
  const snap = redoStack.pop();
  if (!snap) return;
  undoStack.push(snapshotState(state));
  applySnapshot(snap);
});

// ---- drag a panel to reposition its photo ----
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  pushHistory();
  state.selectedPanel = i;
  syncPanelControls();
  const place = state.panels[i];
  drag = { panel: i, startX: p.x, startY: p.y, dx: place.dx, dy: place.dy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const place = state.panels[drag.panel];
  const panel = LAYOUTS[state.layout].panels[drag.panel];
  place.dx = Math.max(-0.6, Math.min(0.6, drag.dx + (p.x - drag.startX) / p.w / panel.w));
  place.dy = Math.max(-0.6, Math.min(0.6, drag.dy + (p.y - drag.startY) / p.h / panel.h));
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag = null; });

// ---- boot: fonts first so the lettering draws in Anton/Bebas, then the scene ----
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('64px Anton'),
      document.fonts.load('32px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to the system stack */ }
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query, {
      loadSample: async (sample, caption) => {
        await addPhoto(`samples/${sample}.jpg`, `${sample} sample`);
        state.title = caption;
        $('title').value = caption;
      },
      applyScene: () => {
        const layout = query.get('layout');
        if (layout && LAYOUTS[layout]) {
          state.layout = layout;
          state.panels = panelsFor(layout);
          state.selectedPanel = layout === 'key-art' ? 4 : 0;
        }
        const grade = query.get('grade');
        if (grade && GRADES[grade]) state.grade = grade;
        // Cover shots frame the same photo differently in each panel, the way
        // a real multi-panel poster does: deterministic offsets, no randomness.
        if (query.get('shot') === 'cover') {
          state.panels.forEach((place, i) => {
            place.dx = (((i * 37) % 5) - 2) * 0.08;
            place.dy = (((i * 53) % 5) - 2) * 0.08;
            place.zoom = 1 + ((i * 29) % 3) * 0.12;
          });
          // The hero panel of hero-three is wide: nudge the photo down so the
          // subject's face, at the top of the sample, stays in frame.
          if (state.layout === 'hero-three') state.panels[0].dy = 0.2;
        }
        const w = Number(query.get('w'));
        const h = Number(query.get('h'));
        if (w > 0 && h > 0) { canvas.width = w; canvas.height = h; }
        syncControls();
        redraw();
      },
    });
  } else {
    // Default first paint: both samples loaded, boulevard leading the panels.
    await addPhoto('samples/boulevard.jpg', 'Boulevard sample');
    await addPhoto('samples/pier.jpg', 'Pier sample');
    syncControls();
    redraw();
  }
}

boot();
