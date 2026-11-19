// The cover's data: which layout, which grade, what words, and where each panel's
// photo sits. Layouts are panel rectangles in fractions of the cover (x, y, w, h),
// plus an optional rotation for the tilted collage. Grades are shadow/mid/high
// colours for the gradient-map LUT the renderer builds from them.

export const LAYOUTS = {
  'key-art': {
    label: 'Key Art 3×3',
    panels: [
      { x: 0.015, y: 0.015, w: 0.31, h: 0.27 },
      { x: 0.345, y: 0.015, w: 0.31, h: 0.27 },
      { x: 0.675, y: 0.015, w: 0.31, h: 0.27 },
      { x: 0.015, y: 0.305, w: 0.31, h: 0.30 },
      { x: 0.345, y: 0.305, w: 0.31, h: 0.30 },
      { x: 0.675, y: 0.305, w: 0.31, h: 0.30 },
      { x: 0.015, y: 0.625, w: 0.31, h: 0.27 },
      { x: 0.345, y: 0.625, w: 0.31, h: 0.27 },
      { x: 0.675, y: 0.625, w: 0.31, h: 0.27 },
    ],
  },
  'hero-three': {
    label: 'Hero + Three',
    panels: [
      { x: 0.015, y: 0.015, w: 0.97, h: 0.56 },
      { x: 0.015, y: 0.59, w: 0.31, h: 0.305 },
      { x: 0.345, y: 0.59, w: 0.31, h: 0.305 },
      { x: 0.675, y: 0.59, w: 0.31, h: 0.305 },
    ],
  },
  'full-bleed': {
    label: 'Full Bleed',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  collage: {
    label: 'Tilted Collage',
    panels: [
      { x: 0.04, y: 0.05, w: 0.44, h: 0.44, rot: -4 },
      { x: 0.52, y: 0.03, w: 0.44, h: 0.40, rot: 3 },
      { x: 0.07, y: 0.51, w: 0.40, h: 0.42, rot: 3 },
      { x: 0.50, y: 0.49, w: 0.46, h: 0.44, rot: -3 },
    ],
  },
};

// shadow, midtone, highlight colours: the gradient map runs dark -> light through them.
export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset',
    stops: ['#1b0f3a', '#7a1e6e', '#ff5e3a', '#ffc46b'],
  },
  'neon-night': {
    label: 'Neon Night',
    stops: ['#050514', '#3b0f6e', '#c026d3', '#22d3ee'],
  },
  'palm-dusk': {
    label: 'Palm Dusk',
    stops: ['#12041f', '#5b1a4e', '#e2543e', '#ffb347'],
  },
  'hot-pink': {
    label: 'Hot Pink Heat',
    stops: ['#1c0418', '#8b0f5c', '#ff2e88', '#ffd166'],
  },
  'teal-noir': {
    label: 'Teal Noir',
    stops: ['#02141a', '#0f3a44', '#14b8a6', '#fde68a'],
  },
  'gold-hour': {
    label: 'Gold Hour',
    stops: ['#241204', '#7c3a10', '#f59e0b', '#fef3c7'],
  },
};

export const EXPORT_SIZES = [
  { key: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { key: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { key: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

/** A fresh cover state: defaults the editor and the shot scenes start from. */
export function freshState() {
  return {
    layout: 'key-art',
    grade: 'vice-sunset',
    title: 'VICE SUNSET',
    subtitle: 'one last ride down the coast',
    ribbonText: 'SUNSET EDITION',
    grain: true,
    vignette: true,
    ribbon: true,
    fillAll: true,
    // per-panel photo placement: photo index, pan offsets (fractions of panel), zoom.
    panels: [],
    selectedPanel: 4,
  };
}

/** Panels for a layout, each with its own placement (defaults: photo centred, 100%). */
export function panelsFor(layoutKey) {
  return LAYOUTS[layoutKey].panels.map(() => ({ photo: 0, dx: 0, dy: 0, zoom: 1 }));
}

/** Deep-clone just the serialisable part of a state (for undo history). */
export function snapshotState(state) {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    ribbonText: state.ribbonText,
    grain: state.grain,
    vignette: state.vignette,
    ribbon: state.ribbon,
    fillAll: state.fillAll,
    panels: state.panels,
    selectedPanel: state.selectedPanel,
  }));
}

export function restoreState(state, snap) {
  Object.assign(state, JSON.parse(JSON.stringify(snap)));
}
