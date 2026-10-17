import {
  CHARSETS, DEFAULTS, imageToAscii, loadImage, toHTML, toSVG, toText, toCanvas, encodeArt, encodeAnimation,
  guessMediaKind, listPieces, getPiece, CATEGORIES,
} from '../src/index.js';

const CDN_SCRIPT = 'https://cdn.jsdelivr.net/gh/sankshitpandoh/asciiiii@main/dist/ascii-art.min.js';
const $ = (id) => document.getElementById(id);
const html = document.documentElement;

const ui = {
  dropzone: $('dropzone'), file: $('file'), selfie: $('selfie'), thumb: $('thumb'), url: $('url'), loadUrl: $('load-url'),
  cols: $('cols'), charset: $('charset'), customField: $('custom-field'), custom: $('custom'),
  color: $('color'), invert: $('invert'), dither: $('dither'),
  brightness: $('brightness'), contrast: $('contrast'), gamma: $('gamma'),
  fontSize: $('font-size'), fps: $('fps'), fg: $('fg'), bg: $('bg'), reset: $('reset'),
  preview: $('preview'), empty: $('empty'), stats: $('stats'), saveRow: $('save-row'), dlVideo: $('dl-video'),
  exportUI: $('export-ui'), exportEmpty: $('export-empty'),
  scriptSrc: $('script-src'), thumbVideo: $('thumb-video'),
  bake: $('bake'), bakeFrames: $('bake-frames'), bakeFps: $('bake-fps'), bakeRun: $('bake-run'), bakeInfo: $('bake-info'),
  looks: $('looks'), effects: $('effects'), effectNote: $('effect-note'),
};

const state = {
  source: null, sourceName: 'image', art: null, media: null, mediaLoaded: null, baked: null, baking: 0, effect: 'none',
};

// ───────────────────────── motion: one switch for the whole page ─────────────────────────
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION_KEY = 'asciiiii-motion';
let motionOff = reduceMotion;
try {
  const saved = localStorage.getItem(MOTION_KEY);
  if (saved) motionOff = saved === 'off';
} catch { /* storage blocked */ }

function setMotion(el) {
  // "off" freezes on the first frame; "always" is only set because the visitor pressed Play.
  if (motionOff) el.setAttribute('motion', 'off');
  else if (reduceMotion) el.setAttribute('motion', 'always');
  else el.removeAttribute('motion');
}
function applyMotion() {
  html.classList.toggle('motion-off', motionOff);
  const btn = $('motion-toggle');
  btn.setAttribute('aria-pressed', String(motionOff));
  btn.querySelector('.motion-icon').textContent = motionOff ? '▶' : '❚❚';
  btn.querySelector('.motion-label').textContent = motionOff ? 'Play motion' : 'Pause motion';
  document.querySelectorAll('ascii-art').forEach(setMotion);
}
$('motion-toggle').addEventListener('click', () => {
  motionOff = !motionOff;
  try { localStorage.setItem(MOTION_KEY, motionOff ? 'off' : 'on'); } catch { /* storage blocked */ }
  applyMotion();
  announce(motionOff ? 'Motion paused' : 'Motion playing');
});

// ───────────────────────── clock ─────────────────────────
function tickClock() {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 30_000);

// ───────────────────────── fitting a piece to its box ─────────────────────────
function sizeToPiece(el, piece) {
  el.style.setProperty('--cols', piece.cols);
  el.style.setProperty('--rows', piece.rows);
}

// ───────────────────────── hero: now playing ─────────────────────────
const FEATURED = ['synthwave', 'donut', 'earth', 'black-hole', 'plasma', 'jellyfish', 'doom-fire', 'galaxy', 'tunnel', 'aurora', 'matrix-rain', 'lava-lamp']
  .filter((name) => getPiece(name));
const ALT = {
  synthwave: 'Synthwave sunset over a scrolling grid',
  donut: 'A spinning 3-D donut',
  earth: 'The Earth turning in colour',
  'black-hole': 'A black hole bending light around it',
  plasma: 'Shifting colour plasma',
  jellyfish: 'A jellyfish pulsing through water',
  'doom-fire': 'Rising pixel fire',
  galaxy: 'A rotating spiral galaxy',
  tunnel: 'Flying down a colour tunnel',
  aurora: 'Northern lights over a dark horizon',
  'matrix-rain': 'Falling green code',
  'lava-lamp': 'A lava lamp with drifting blobs',
};
const altFor = (p) => `${ALT[p.name] || p.name.replace(/-/g, ' ')}, drawn in ASCII`;
let heroIndex = 0;
const heroArt = $('hero-art');
function showHero(i) {
  heroIndex = (i + FEATURED.length) % FEATURED.length;
  const p = getPiece(FEATURED[heroIndex]);
  sizeToPiece(heroArt, p);
  heroArt.setAttribute('alt', altFor(p));
  heroArt.setAttribute('piece', p.name);
  $('np-name').textContent = p.name;
}
$('np-prev').addEventListener('click', () => showHero(heroIndex - 1));
$('np-next').addEventListener('click', () => showHero(heroIndex + 1));
$('np-copy').addEventListener('click', (e) => copyText(pieceSnippet(FEATURED[heroIndex]), e.currentTarget));
showHero(0);

// ───────────────────────── ticker ─────────────────────────
{
  const names = listPieces().map((p) => p.name);
  const track = $('ticker');
  for (let pass = 0; pass < 2; pass++) {
    for (const n of names) {
      const s = document.createElement('span');
      s.textContent = `${n}.art`;
      track.appendChild(s);
    }
  }
}

// ───────────────────────── options ─────────────────────────
function readOptions() {
  const charset = ui.charset.value === 'custom' ? ui.custom.value || ' .oO@' : ui.charset.value;
  return {
    ...DEFAULTS,
    cols: Number(ui.cols.value),
    charset,
    color: ui.color.checked,
    invert: ui.invert.checked,
    dither: ui.dither.checked,
    brightness: Number(ui.brightness.value),
    contrast: Number(ui.contrast.value),
    gamma: Number(ui.gamma.value),
  };
}

function readLook() {
  return {
    fontSize: Number(ui.fontSize.value),
    animate: state.effect,
    fps: Number(ui.fps.value),
    fg: ui.fg.value,
    bg: ui.bg.value,
  };
}

const trimNum = (v, d = 2) => Number(v).toFixed(d).replace(/\.?0+$/, '') || '0';
function syncOutputs() {
  $('cols-out').value = ui.cols.value;
  $('brightness-out').value = trimNum(ui.brightness.value);
  $('contrast-out').value = trimNum(ui.contrast.value);
  $('gamma-out').value = trimNum(ui.gamma.value);
  $('font-size-out').value = ui.fontSize.value;
  $('fps-out').value = ui.fps.value;
  ui.customField.hidden = ui.charset.value !== 'custom';
}

// ───────────────────────── looks: named presets ─────────────────────────
const LOOKS = [
  { id: 'neon', name: 'Neon blocks', charset: 'blocks', color: true, fg: '#f2e9ff', bg: '#0b0618' },
  { id: 'full', name: 'Full colour', charset: 'detailed', color: true, fg: '#f2e9ff', bg: '#0b0618' },
  { id: 'vapor', name: 'Vapor', charset: 'detailed', fg: '#ff71ce', bg: '#1a0b2e' },
  { id: 'cyan', name: 'Cyan CRT', charset: 'slashes', fg: '#01cdfe', bg: '#04121a' },
  { id: 'matrix', name: 'Matrix', charset: 'binary', fg: '#3dff8b', bg: '#020b05' },
  { id: 'dots', name: 'Dot matrix', charset: 'dots', color: true, dither: true, fg: '#f2e9ff', bg: '#0b0618' },
  { id: 'classic', name: 'Classic', charset: 'standard', fg: '#f2e9ff', bg: '#0b0618' },
  { id: 'paper', name: 'Newsprint', charset: 'standard', invert: true, fg: '#1a0b2e', bg: '#fff4fb' },
];

function buildLooks() {
  for (const look of LOOKS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'look';
    b.dataset.look = look.id;
    b.setAttribute('aria-pressed', 'false');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.setAttribute('aria-hidden', 'true');
    const ramp = [...CHARSETS[look.charset]].filter((c) => c !== ' ');
    const step = Math.max(1, Math.floor(ramp.length / 8));
    const line = Array.from({ length: 16 }, (_, k) => ramp[(k * step) % ramp.length]).join('');
    sw.style.background = look.bg;
    sw.style.color = look.fg;
    look.glyphs = () => {
      const glyphs = document.createElement('span');
      glyphs.textContent = `${line}\n${[...line].reverse().join('')}\n${line}`;
      if (look.color) glyphs.className = 'rainbow';
      sw.replaceChildren(glyphs);
    };
    look.swatch = sw;
    look.glyphs();
    const label = document.createElement('span');
    label.textContent = look.name;
    b.append(sw, label);
    b.addEventListener('click', () => useLook(look));
    ui.looks.appendChild(b);
  }
}

// Each look tile shows the current photo in that look; clips fall back to glyph samples.
let lookToken = 0;
async function previewLooks(source) {
  const token = ++lookToken;
  if (!source) {
    LOOKS.forEach((look) => look.glyphs());
    return;
  }
  for (const look of LOOKS) {
    const art = await imageToAscii(source, {
      ...DEFAULTS, cols: 30, charset: look.charset, color: !!look.color, invert: !!look.invert, dither: !!look.dither,
    });
    if (token !== lookToken) return;
    const el = document.createElement('ascii-art');
    el.setAttribute('fg', look.fg);
    el.setAttribute('bg', look.bg);
    look.swatch.replaceChildren(el);
    el.setArt(art);
  }
}

function markLook(id) {
  ui.looks.querySelectorAll('.look').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === id)));
}

function useLook(look) {
  ui.charset.value = look.charset;
  ui.color.checked = !!look.color;
  ui.invert.checked = !!look.invert;
  ui.dither.checked = !!look.dither;
  ui.fg.value = look.fg;
  ui.bg.value = look.bg;
  markLook(look.id);
  convert();
}

// ───────────────────────── effects ─────────────────────────
function setEffect(effect) {
  state.effect = effect;
  ui.effects.querySelectorAll('.chip').forEach((c) => {
    const on = c.dataset.effect === effect;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-pressed', String(on));
  });
  applyLook();
}
ui.effects.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-effect]');
  if (chip && !chip.disabled) setEffect(chip.dataset.effect);
});
function syncEffectAvailability() {
  const isMedia = !!state.media;
  ui.effects.querySelectorAll('.chip').forEach((c) => (c.disabled = isMedia && c.dataset.effect !== 'none'));
  ui.effectNote.textContent = isMedia ? 'photos only; clips already move' : 'for photos';
  if (isMedia && state.effect !== 'none') setEffect('none');
}

// ───────────────────────── conversion ─────────────────────────
let pending = 0;
async function convert() {
  syncOutputs();
  applyLook();
  if (!state.source && !state.media) return;
  const token = ++pending;
  try {
    const opts = readOptions();
    if (state.media) {
      // Video / GIF: the element converts frames live from attributes, so only (re)open the
      // media when it actually changed; option tweaks just need a re-bake.
      applyOptionsToPreview(opts);
      if (state.mediaLoaded !== state.media || ui.preview.mode !== 'media') {
        await ui.preview.setMedia(state.media);
        if (token !== pending) return;
        state.mediaLoaded = state.media;
      }
      state.art = ui.preview.art;
      ui.preview.setAttribute('font-size', `${fitPreviewFont()}px`);
      showResult();
      updateStats(state.art);
      await bake();
      return;
    }
    const art = await imageToAscii(state.source, opts);
    if (token !== pending) return;
    state.art = art;
    state.baked = null;
    ui.preview.setArt(art);
    ui.preview.setAttribute('font-size', `${fitPreviewFont()}px`);
    showResult();
    updateStats(art);
    updateExports();
  } catch (err) {
    toast(err.message || String(err), true);
  }
}

function showResult() {
  ui.empty.hidden = true;
  ui.stats.hidden = false;
  ui.saveRow.hidden = false;
  ui.exportUI.hidden = false;
  ui.exportEmpty.hidden = true;
  ui.dlVideo.hidden = !state.media;
}

function applyOptionsToPreview(opts) {
  const set = (name, on, value = '') => (on ? ui.preview.setAttribute(name, value) : ui.preview.removeAttribute(name));
  ui.preview.setAttribute('cols', String(opts.cols));
  set('charset', opts.charset !== 'standard', opts.charset);
  set('color', opts.color);
  set('invert', opts.invert);
  set('dither', opts.dither);
  set('brightness', opts.brightness !== 0, String(opts.brightness));
  set('contrast', opts.contrast !== 0, String(opts.contrast));
  set('gamma', opts.gamma !== 1, String(opts.gamma));
  ui.preview.setAttribute('fps', ui.bakeFps.value);
}

async function bake() {
  if (!state.media) return;
  const token = ++state.baking;
  ui.bakeInfo.textContent = 'capturing frames…';
  ui.dlVideo.disabled = true;
  try {
    const { frames, fps } = await ui.preview.bake({ fps: Number(ui.bakeFps.value), maxFrames: Number(ui.bakeFrames.value), maxSeconds: 30 });
    if (token !== state.baking) return;
    state.baked = { frames, fps };
    const bytes = new Blob([JSON.stringify(encodeAnimation(frames, { fps }))]).size;
    ui.bakeInfo.textContent = `${frames.length} frames at ${fps} a second, ${(bytes / 1024).toFixed(0)} kB`;
    updateExports();
  } catch (err) {
    if (token === state.baking) {
      ui.bakeInfo.textContent = '';
      toast(err.message || 'Could not capture frames from that clip', true);
    }
  } finally {
    if (token === state.baking) ui.dlVideo.disabled = false;
  }
}

function applyLook() {
  const look = readLook();
  ui.preview.setAttribute('animate', state.media ? 'none' : look.animate);
  ui.preview.setAttribute('fps', String(look.fps));
  ui.preview.setAttribute('font-size', `${fitPreviewFont()}px`);
  ui.preview.setAttribute('fg', look.fg);
  ui.preview.setAttribute('bg', look.bg);
  $('preview-wrap').style.background = look.bg;
  if (state.art) updateExports();
}

// The preview scales to fill its screen; "Text size" only sets the exported size.
function fitPreviewFont() {
  const art = state.art;
  const wrap = $('preview-wrap');
  if (!art) return readLook().fontSize;
  const w = wrap.clientWidth - 36;
  const h = wrap.clientHeight - 36;
  // the element pads 1em on each side, so count two extra cells each way
  const fs = Math.min(w / (art.cols * 0.62 + 2), h / (art.rows + 2));
  return Math.max(3, Math.min(24, Math.floor(fs * 10) / 10));
}
new ResizeObserver(() => state.art && ui.preview.setAttribute('font-size', `${fitPreviewFont()}px`)).observe($('preview-wrap'));

function updateStats(art) {
  $('stat-size').textContent = `${art.cols}×${art.rows}`;
  $('stat-chars').textContent = `${(art.cols * art.rows).toLocaleString()} chars`;
  const bytes = new Blob([embedJSON(art)]).size;
  $('stat-bytes').textContent = (bytes > 1024 ? `${(bytes / 1024).toFixed(1)} kB` : `${bytes} B`) + (state.media ? ' a frame' : '');
}

// ───────────────────────── exports ─────────────────────────
function embedJSON(art) {
  // "<" is escaped so a stray "</script>" inside the art can't close the tag.
  return JSON.stringify(encodeArt(art)).replace(/</g, '\\u003c');
}

function scriptURL() {
  if (ui.scriptSrc.value === 'site') return new URL('dist/ascii-art.min.js', document.baseURI).href;
  return CDN_SCRIPT;
}
const scriptTag = () => `<script type="module" src="${scriptURL()}"></script>`;

function lookAttrs(look, { includeAnimation = true } = {}) {
  const attrs = [`font-size="${look.fontSize}px"`, `fg="${look.fg}"`, `bg="${look.bg}"`];
  if (includeAnimation && look.animate !== 'none') {
    attrs.push(`animate="${look.animate}"`, `fps="${look.fps}"`);
  }
  return attrs.join(' ');
}

function optionAttrs(opts) {
  const attrs = [`cols="${opts.cols}"`];
  if (opts.charset !== 'standard') attrs.push(`charset="${opts.charset.replace(/"/g, '&quot;')}"`);
  if (opts.color) attrs.push('color');
  if (opts.invert) attrs.push('invert');
  if (opts.dither) attrs.push('dither');
  if (opts.brightness) attrs.push(`brightness="${opts.brightness}"`);
  if (opts.contrast) attrs.push(`contrast="${opts.contrast}"`);
  if (opts.gamma !== 1) attrs.push(`gamma="${opts.gamma}"`);
  return attrs.join(' ');
}

function updateExports() {
  const art = state.art;
  if (!art) return;
  const look = readLook();
  const opts = readOptions();
  const script = scriptTag();
  ui.bake.hidden = !state.media;

  const payload = state.media && state.baked
    ? JSON.stringify(encodeAnimation(state.baked.frames, { fps: state.baked.fps })).replace(/</g, '\\u003c')
    : embedJSON(art);
  $('code-embed').value =
    `${script}\n<ascii-art ${lookAttrs(look, { includeAnimation: !state.media })} alt="ASCII art">\n` +
    `  <script type="application/json">${payload}</script>\n</ascii-art>`;

  $('code-html').value = toHTML(art, { fontSize: look.fontSize, fg: look.fg, bg: look.bg });

  const ext = state.media ? (guessMediaKind(state.media) === 'gif' ? 'gif' : 'mp4') : 'jpg';
  const fpsAttr = state.media ? ` fps="${ui.bakeFps.value}"` : '';
  $('code-url').value =
    `${script}\n<ascii-art src="https://example.com/your-${state.media ? 'clip' : 'image'}.${ext}" ${optionAttrs(opts)}${fpsAttr} ${lookAttrs(look, { includeAnimation: !state.media })}></ascii-art>`;

  $('code-svg').value = toSVG(art, { fontSize: look.fontSize, fg: look.fg, bg: look.bg });
  $('code-text').value = toText(art);
}

// ───────────────────────── sources ─────────────────────────
async function setSource(source, name = 'image') {
  try {
    state.sourceName = name.replace(/\.[^.]+$/, '') || 'image';
    if (guessMediaKind(source) !== 'image') {
      state.media = source;
      state.source = null;
      state.baked = null;
      syncEffectAvailability();
      showMediaThumb(source);
      previewLooks(null);
      await convert();
      return;
    }
    state.media = null;
    state.mediaLoaded = null;
    state.baked = null;
    syncEffectAvailability();
    ui.thumbVideo.hidden = true;
    ui.thumbVideo.removeAttribute('src');
    const img = await loadImage(source);
    state.source = img;
    showThumb(img);
    await convert();
    previewLooks(img);
  } catch (err) {
    toast(err.message || 'Could not load that image', true);
  }
}

function markLoaded(label) {
  ui.dropzone.classList.add('has-image');
  ui.dropzone.setAttribute('aria-label', `${label} loaded. Choose another photo, GIF or video`);
}

function showMediaThumb(source) {
  ui.thumb.hidden = true;
  if (guessMediaKind(source) === 'gif') {
    ui.thumb.src = source instanceof Blob ? URL.createObjectURL(source) : source;
    ui.thumb.hidden = false;
    ui.thumbVideo.hidden = true;
  } else {
    ui.thumbVideo.src = source instanceof Blob ? URL.createObjectURL(source) : source;
    ui.thumbVideo.hidden = false;
    ui.thumbVideo.play().catch(() => {});
  }
  markLoaded(state.sourceName);
}

function showThumb(img) {
  const c = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, 320 / Math.max(w, h));
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  ui.thumb.src = c.toDataURL('image/png');
  ui.thumb.hidden = false;
  markLoaded(state.sourceName);
}

ui.dropzone.setAttribute('aria-label', 'Choose a photo, GIF or video');
ui.dropzone.addEventListener('click', () => ui.file.click());
ui.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    ui.file.click();
  }
});
for (const input of [ui.file, ui.selfie]) {
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (f) setSource(f, f.name);
    input.value = '';
  });
}
for (const evt of ['dragenter', 'dragover']) {
  ui.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    ui.dropzone.classList.add('is-over');
  });
}
for (const evt of ['dragleave', 'drop']) {
  ui.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    ui.dropzone.classList.remove('is-over');
  });
}
ui.dropzone.addEventListener('drop', (e) => {
  const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/') || x.type.startsWith('video/'));
  if (f) setSource(f, f.name);
  else {
    const url = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
    if (url) setSource(url.trim(), 'image');
  }
});
document.addEventListener('paste', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const item = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/'));
  if (item) setSource(item.getAsFile(), 'pasted');
});
ui.loadUrl.addEventListener('click', () => ui.url.value && setSource(ui.url.value.trim(), 'image'));
ui.url.addEventListener('keydown', (e) => e.key === 'Enter' && ui.loadUrl.click());

// ───────────────────────── samples (drawn procedurally, no assets) ─────────────────────────
const samples = {
  portrait(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b2a4a');
    g.addColorStop(1, '#070a12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // head
    const face = ctx.createRadialGradient(w * 0.42, h * 0.4, 10, w * 0.5, h * 0.45, w * 0.32);
    face.addColorStop(0, '#f6d7b0');
    face.addColorStop(1, '#a86f45');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.45, w * 0.22, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // hair
    ctx.fillStyle = '#2b1a12';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.27, w * 0.25, h * 0.17, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#1a1a1a';
    for (const x of [0.42, 0.58]) {
      ctx.beginPath();
      ctx.ellipse(w * x, h * 0.43, w * 0.025, h * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // mouth
    ctx.strokeStyle = '#7a3b2e';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.55, w * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // shoulders
    ctx.fillStyle = '#3a5a8a';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 1.05, w * 0.45, h * 0.35, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  },
  planet(ctx, w, h) {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.9})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    const r = Math.min(w, h) * 0.26;
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.strokeStyle = 'rgba(220,200,160,0.7)';
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.9, r * 0.45, -0.35, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
    const g = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(0.6, '#c97b3a');
    g.addColorStop(1, '#2a1208');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,200,160,0.9)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.9, r * 0.45, -0.35, -0.05 * Math.PI, Math.PI * 0.95);
    ctx.stroke();
  },
  waves(ctx, w, h) {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v =
          Math.sin(x / 28 + Math.sin(y / 40) * 2) * 0.5 + Math.cos(y / 22 + x / 90) * 0.5;
        const t = (v + 1) / 2;
        const i = (y * w + x) * 4;
        img.data[i] = 20 + t * 60;
        img.data[i + 1] = 60 + t * 160;
        img.data[i + 2] = 120 + t * 135;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  },
  logo(ctx, w, h) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(h * 0.42)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ASCII', w / 2, h / 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = h * 0.03;
    ctx.strokeRect(w * 0.08, h * 0.15, w * 0.84, h * 0.7);
  },
};

function recorderMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || null;
}

async function recordMotionSample() {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 240;
  const x = c.getContext('2d');
  const stream = c.captureStream(20);
  const mime = recorderMime();
  if (!mime) throw new Error('This browser cannot record video; upload a clip instead.');
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start(100);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      x.fillStyle = '#000'; x.fillRect(0, 0, 320, 240);
      for (let k = 0; k < 3; k++) {
        const g = x.createRadialGradient(0, 0, 5, 0, 0, 60);
        g.addColorStop(0, ['#ffd27a', '#ff71ce', '#01cdfe'][k]); g.addColorStop(1, 'transparent');
        x.save(); x.translate(160 + Math.cos(t * 1.5 + k * 2.1) * 90, 120 + Math.sin(t * 2.2 + k * 2.1) * 60); x.fillStyle = g; x.fillRect(-60, -60, 120, 120); x.restore();
      }
      x.fillStyle = '#fff'; x.font = 'bold 48px sans-serif'; x.textAlign = 'center'; x.fillText('ASCII', 160, 135 + Math.sin(t * 3) * 10);
      if (t < 3) requestAnimationFrame(draw); else resolve();
    };
    draw();
  });
  rec.stop();
  await done;
  return new File(chunks, 'motion.webm', { type: mime.split(';')[0] });
}

for (const btn of document.querySelectorAll('[data-sample]')) {
  btn.addEventListener('click', async () => {
    if (btn.dataset.sample === 'motion') {
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Recording…';
      try { ui.color.checked = true; await setSource(await recordMotionSample(), 'motion'); } catch (err) { toast(err.message, true); }
      btn.disabled = false; btn.textContent = label;
      return;
    }
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    samples[btn.dataset.sample](c.getContext('2d'), c.width, c.height);
    setSource(c, btn.dataset.sample);
  });
}

// ───────────────────────── frames → video file ─────────────────────────
async function framesToVideo(frames, fps, look, onProgress = () => {}) {
  const mime = recorderMime();
  if (!mime) throw new Error('This browser cannot save video. Try Chrome, Edge, Firefox or Safari 14.1+.');
  const opts = { fontSize: Math.max(8, look.fontSize), fg: look.fg, bg: look.bg, scale: 2 };
  const scratch = document.createElement('canvas');
  toCanvas(frames[0], opts, scratch);
  const out = document.createElement('canvas');
  out.width = scratch.width + (scratch.width % 2);
  out.height = scratch.height + (scratch.height % 2);
  const ctx = out.getContext('2d');
  ctx.fillStyle = look.bg;
  ctx.fillRect(0, 0, out.width, out.height);
  const rec = new MediaRecorder(out.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  // Two passes so short loops are still worth sharing.
  const total = frames.length * (frames.length < 48 ? 2 : 1);
  for (let i = 0; i < total; i++) {
    if (document.hidden) {
      rec.stop();
      throw new Error('Keep this tab open while the video records.');
    }
    toCanvas(frames[i % frames.length], opts, scratch);
    ctx.drawImage(scratch, 0, 0);
    onProgress(i + 1, total);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  rec.stop();
  await done;
  return new Blob(chunks, { type: mime.split(';')[0] });
}
const videoExt = (blob) => (blob.type.includes('mp4') ? 'mp4' : 'webm');

async function saveVideo(btn, getFrames, name, look) {
  const label = btn.textContent;
  btn.disabled = true;
  try {
    const { frames, fps } = await getFrames();
    if (!frames.length) throw new Error('Nothing to record yet.');
    const blob = await framesToVideo(frames, fps, look, (i, n) => (btn.textContent = `Recording ${Math.round((i / n) * 100)}%`));
    download(`${name}.ascii.${videoExt(blob)}`, blob);
    announce('Video saved');
  } catch (err) {
    toast(err.message || String(err), true);
  }
  btn.textContent = label;
  btn.disabled = false;
}

// ───────────────────────── controls ─────────────────────────
let debounce = 0;
const schedule = () => {
  clearTimeout(debounce);
  debounce = setTimeout(convert, 40);
};
for (const el of [ui.cols, ui.charset, ui.custom, ui.color, ui.invert, ui.dither, ui.brightness, ui.contrast, ui.gamma]) {
  el.addEventListener('input', schedule);
  el.addEventListener('change', schedule);
}
// Hand-tuning the look means it is no longer one of the named presets.
for (const el of [ui.charset, ui.custom, ui.color, ui.invert, ui.dither, ui.fg, ui.bg]) {
  el.addEventListener('input', () => markLook(null));
}
for (const el of [ui.fontSize, ui.fps, ui.fg, ui.bg]) {
  el.addEventListener('input', () => {
    syncOutputs();
    applyLook();
  });
}
ui.scriptSrc.addEventListener('change', updateExports);
ui.bakeRun.addEventListener('click', () => { ui.preview.setAttribute('fps', ui.bakeFps.value); bake(); });
ui.bakeFps.addEventListener('change', () => { ui.preview.setAttribute('fps', ui.bakeFps.value); bake(); });
ui.bakeFrames.addEventListener('change', bake);
ui.reset.addEventListener('click', () => {
  ui.cols.value = 80; ui.custom.value = ' .oO@';
  ui.brightness.value = 0; ui.contrast.value = 0; ui.gamma.value = 1;
  ui.fontSize.value = 10; ui.fps.value = 12;
  setEffect('none');
  useLook(LOOKS[0]);
});
const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.5;
};
ui.invert.addEventListener('change', () => {
  // Swap the palette so a light-background rendition reads correctly in the preview.
  if (ui.invert.checked && !isLight(ui.bg.value)) {
    ui.bg.value = '#fff4fb';
    ui.fg.value = '#1a0b2e';
  } else if (!ui.invert.checked && isLight(ui.bg.value)) {
    ui.bg.value = '#0b0618';
    ui.fg.value = '#f2e9ff';
  }
  applyLook();
});

// ───────────────────────── tabs (ARIA tabs pattern) ─────────────────────────
{
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], true);
    });
  });
}

// ───────────────────────── copy & download ─────────────────────────
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  announce('Copied to your clipboard');
  toast('Copied to your clipboard.');
  if (btn) {
    const label = btn.textContent;
    btn.textContent = 'Copied ✓';
    btn.classList.add('is-done');
    setTimeout(() => {
      btn.textContent = label;
      btn.classList.remove('is-done');
    }, 1400);
  }
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy], [data-copy-value], [data-copy-code]');
  if (!btn) return;
  if (btn.dataset.copy) copyText($(btn.dataset.copy).value, btn);
  else if (btn.dataset.copyValue) copyText($(btn.dataset.copyValue).value, btn);
  else copyText($(btn.dataset.copyCode).textContent, btn);
});

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('dl-svg').addEventListener('click', () =>
  download(`${state.sourceName}.ascii.svg`, new Blob([$('code-svg').value], { type: 'image/svg+xml' }))
);
$('dl-txt').addEventListener('click', () =>
  download(`${state.sourceName}.ascii.txt`, new Blob([$('code-text').value], { type: 'text/plain' }))
);
$('dl-png').addEventListener('click', () => {
  if (!state.art) return;
  const look = readLook();
  const canvas = toCanvas(state.art, { fontSize: look.fontSize, fg: look.fg, bg: look.bg, scale: 2 });
  canvas.toBlob((blob) => blob && download(`${state.sourceName}.ascii.png`, blob), 'image/png');
});
ui.dlVideo.addEventListener('click', () =>
  saveVideo(ui.dlVideo, async () => state.baked || { frames: [], fps: 12 }, state.sourceName, readLook())
);

// ───────────────────────── announcements & the toast dialog ─────────────────────────
function announce(msg) {
  const live = $('live');
  live.textContent = '';
  setTimeout(() => (live.textContent = msg), 60);
}
let toastTimer = 0;
function toast(msg, isError = false) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast window' + (isError ? ' is-error' : '');
  if (isError) el.setAttribute('role', 'alert');
  else el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="titlebar"><span class="titlebar-text">${isError ? 'ERROR.EXE' : 'COPIED.EXE'}</span></div>
    <div class="window-body"><span class="toast-icon" aria-hidden="true">${isError ? '⚠' : '✓'}</span><span class="toast-msg"></span>
    <button class="btn btn-sm" type="button" style="margin-left:auto">OK</button></div>`;
  el.querySelector('.toast-msg').textContent = msg;
  el.querySelector('button').addEventListener('click', () => el.remove());
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), isError ? 6000 : 2500);
}

// ───────────────────────── C:\PIECES\ — gallery ─────────────────────────
const pieceSnippet = (name, extra = '') => `${scriptTag()}\n<ascii-art piece="${name}"${extra}></ascii-art>`;
const PAGE = 24;
const gallery = { cat: null, query: '', shown: PAGE, cards: [] };

function buildGallery() {
  const grid = $('gallery-grid');
  const filters = $('gallery-filters');
  const all = listPieces();
  $('piece-count').textContent = all.length;

  const mount = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target.closest('.card');
      mount.unobserve(entry.target);
      const p = getPiece(card.dataset.name);
      const el = document.createElement('ascii-art');
      sizeToPiece(el, p);
      el.setAttribute('alt', altFor(p));
      setMotion(el);
      el.setAttribute('piece', p.name);
      entry.target.querySelector('.fit').appendChild(el);
    }
  }, { rootMargin: '200px 0px' });

  const mk = (label, cat) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(cat === null));
    b.addEventListener('click', () => {
      filters.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      gallery.cat = cat;
      gallery.shown = PAGE;
      $('address-cat').textContent = cat ? `${cat.toUpperCase()}\\` : '';
      renderGallery();
    });
    return b;
  };
  filters.append(mk('All', null), ...CATEGORIES.map((c) => mk(c, c)));

  for (const p of all) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.name = p.name;
    card.dataset.category = p.category;
    card.hidden = true;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'card-open';
    open.setAttribute('aria-label', `Open ${p.name}`);
    open.innerHTML = '<div class="crt"><div class="fit"></div></div>';
    open.addEventListener('click', () => openViewer(p));
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const name = document.createElement('span');
    name.className = 'card-name';
    name.innerHTML = `${p.name}<small>${p.category}</small>`;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn';
    copy.textContent = 'Copy tag';
    copy.setAttribute('aria-label', `Copy tag for ${p.name}`);
    copy.addEventListener('click', () => copyText(pieceSnippet(p.name), copy));
    meta.append(name, copy);
    card.append(open, meta);
    grid.appendChild(card);
    gallery.cards.push(card);
    mount.observe(open);
  }

  let t = 0;
  $('piece-search').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      gallery.query = e.target.value.trim().toLowerCase();
      gallery.shown = PAGE;
      renderGallery();
    }, 80);
  });
  $('gallery-more').addEventListener('click', () => {
    const firstNew = gallery.shown;
    gallery.shown += PAGE;
    renderGallery();
    gallery.cards.filter((c) => !c.hidden)[firstNew]?.querySelector('.card-open')?.focus();
  });
  renderGallery();
}

function renderGallery() {
  const q = gallery.query;
  const matches = gallery.cards.filter((c) =>
    (!gallery.cat || c.dataset.category === gallery.cat) &&
    (!q || c.dataset.name.includes(q) || c.dataset.category.includes(q)));
  gallery.cards.forEach((c) => (c.hidden = true));
  matches.slice(0, gallery.shown).forEach((c) => (c.hidden = false));
  const more = $('gallery-more');
  more.hidden = matches.length <= gallery.shown;
  more.textContent = `Show more (${matches.length - Math.min(gallery.shown, matches.length)} left)`;
  $('gallery-status').textContent = matches.length
    ? `Showing ${Math.min(gallery.shown, matches.length)} of ${matches.length} pieces`
    : 'No pieces match that search';
}

// ───────────────────────── the piece viewer ─────────────────────────
const viewer = { el: $('viewer'), piece: null, art: null, bg: '#0b0618', fg: '#f2e9ff' };
function viewerCode() {
  const p = viewer.piece;
  const mono = $('viewer-mono').checked;
  let extra = mono ? ' mono' : '';
  if (mono || !p.color) extra += ` fg="${viewer.fg}"`;
  extra += ` bg="${viewer.bg}"`;
  $('viewer-code').value = pieceSnippet(p.name, extra);
}
function paintViewer() {
  const stage = $('viewer-stage');
  stage.style.background = viewer.bg;
  stage.classList.toggle('is-light', isLight(viewer.bg));
  viewer.art.setAttribute('fg', viewer.fg);
  viewer.art.toggleAttribute('mono', $('viewer-mono').checked);
  viewerCode();
}
function openViewer(p) {
  viewer.piece = p;
  $('viewer-title').textContent = `${p.name}.art`;
  const fit = $('viewer-fit');
  fit.textContent = '';
  const el = document.createElement('ascii-art');
  sizeToPiece(el, p);
  el.setAttribute('alt', altFor(p));
  setMotion(el);
  el.setAttribute('piece', p.name);
  fit.appendChild(el);
  viewer.art = el;
  paintViewer();
  viewer.el.showModal();
}
$('viewer-bgs').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-bg]');
  if (!chip) return;
  $('viewer-bgs').querySelectorAll('.chip').forEach((c) => {
    const on = c === chip;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-pressed', String(on));
  });
  viewer.bg = chip.dataset.bg;
  viewer.fg = chip.dataset.fg;
  paintViewer();
});
$('viewer-mono').addEventListener('change', paintViewer);
$('viewer-close').addEventListener('click', () => viewer.el.close());
viewer.el.addEventListener('click', (e) => e.target === viewer.el && viewer.el.close());
viewer.el.addEventListener('close', () => {
  $('viewer-fit').textContent = '';
  viewer.art = null;
});
$('viewer-video').addEventListener('click', (e) => {
  const p = viewer.piece;
  saveVideo(e.currentTarget, () => viewer.art.bake({ fps: p.fps, maxFrames: Math.min(p.fps * 4, 96) }), p.name,
    { fontSize: 12, fg: viewer.fg, bg: viewer.bg });
});

// ───────────────────────── windows: minimize into the taskbar ─────────────────────────
function setMinimized(win, min) {
  win.classList.toggle('is-min', min);
  const btn = win.querySelector('.tb-min');
  btn.setAttribute('aria-expanded', String(!min));
  btn.setAttribute('aria-label', `${min ? 'Restore' : 'Minimize'} ${win.querySelector('h2').firstChild.textContent}`);
  btn.textContent = min ? '□' : '_';
}
for (const btn of document.querySelectorAll('.tb-min')) {
  const win = btn.closest('.window');
  setMinimized(win, false);
  btn.addEventListener('click', () => setMinimized(win, !win.classList.contains('is-min')));
}
for (const link of document.querySelectorAll('[data-task]')) {
  link.addEventListener('click', () => {
    const win = $(link.dataset.task);
    if (win.classList.contains('is-min')) setMinimized(win, false);
  });
}

// ───────────────────────── taskbar: which window you're in ─────────────────────────
{
  const links = new Map([...document.querySelectorAll('[data-task]')].map((a) => [a.dataset.task, a]));
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((a, id) => {
        a.classList.toggle('is-current', id === entry.target.id);
        if (id === entry.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => io.observe($(id)));
}

// ───────────────────────── SCREENSAVER.SCR ─────────────────────────
// After a minute idle, a random piece takes the whole screen. Any input wakes the page.
// Never runs while motion is paused or reduced, while a dialog is open, or in a hidden tab.
{
  const saver = $('screensaver');
  const IDLE_MS = 60_000;
  let idle = 0;
  const wake = () => {
    if (!saver.hidden) {
      saver.hidden = true;
      $('screensaver-fit').textContent = '';
    }
    clearTimeout(idle);
    idle = setTimeout(sleep, IDLE_MS);
  };
  const sleep = () => {
    if (motionOff || document.hidden || viewer.el.open || document.activeElement?.matches('input, textarea, select')) return wake();
    const all = listPieces().filter((p) => p.cols >= 40);
    const p = all[Math.floor(Math.random() * all.length)];
    const el = document.createElement('ascii-art');
    sizeToPiece(el, p);
    el.setAttribute('alt', '');
    setMotion(el);
    el.setAttribute('piece', p.name);
    $('screensaver-fit').replaceChildren(el);
    $('screensaver-name').textContent = `${p.name}.art`;
    saver.hidden = false;
  };
  for (const evt of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
    addEventListener(evt, wake, { passive: true, capture: true });
  }
  wake();
}

// ───────────────────────── start ─────────────────────────
ui.custom.placeholder = CHARSETS.standard;
buildLooks();
buildGallery();
applyMotion();
syncOutputs();
useLook(LOOKS[0]);
// Start with a colourful sample so the converter never looks empty.
document.querySelector('[data-sample="planet"]').click();
