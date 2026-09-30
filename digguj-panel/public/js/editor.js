import { api } from './api.js';
import {
  $, fromLocalInput, hideBrokenImages, openModal, setupModals, toast, toLocalInput,
} from './ui.js';
import * as R from './render.js';
import { VideoPreview, canvasToBlob, downloadBlob, exportCarouselZip, exportVideoZip, safeFilename } from './export.js';

// Pola formularza zapisywane w posts.data (id elementu = klucz w danych = klucz w cfg renderera)
const FIELDS = Object.keys(R.DEFAULTS).filter((k) => k !== 'postMode' && k !== 'postFormat');
const MAX_SLIDES = 20;
const CAPTION_LIMIT = 2200;
const AUTOSAVE_MS = 1200;

const postId = Number(new URLSearchParams(location.search).get('id'));

const assets = { coverImg: null, logoImg: null, diggujImg: null };
let coverMediaId = null;
/** @type {{text: string, mediaId: string|null, panX: number, panY: number, imgObj: HTMLImageElement|null}[]} */
let slides = [];
let version = 0;
let lastSavedAt = null;
let modalIndex = -1;
const videoPreview = new VideoPreview($('previewCanvas'));

const save = { ready: false, dirty: false, inFlight: false, again: false, conflict: false, timer: null };

// ─────────────────────────────── Pomocnicze ───────────────────────────────
const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
const setRadio = (name, value) => {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
};
const mediaUrl = (id) => (id ? `/media/${id}` : null);
const emptySlide = () => ({ text: '', mediaId: null, panX: 0, panY: 0, imgObj: null });
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function readCfg() {
  const cfg = { postMode: getRadio('postMode'), postFormat: getRadio('postFormat') };
  for (const id of FIELDS) cfg[id] = $(id).value;
  return cfg;
}

function writeFields(values) {
  for (const id of FIELDS) {
    if (values[id] !== undefined && values[id] !== null) $(id).value = values[id];
  }
  updateRangeLabels();
}

function updateRangeLabels() {
  document.querySelectorAll('input[type=range][data-unit]').forEach((el) => {
    const out = $(`${el.id}Val`);
    if (out) out.textContent = el.value + el.dataset.unit;
  });
}

function deriveTitle(cfg) {
  if (cfg.postMode === 'album') {
    return [cfg.albumArtist.trim(), cfg.albumTitle.trim()].filter(Boolean).join(' – ') || 'Album bez tytułu';
  }
  if (cfg.postMode === 'calendar') return cfg.calDate.trim() ? `Kalendarium: ${cfg.calDate.trim()}` : 'Kalendarium';
  const first = slides.find((s) => s.text.trim());
  if (!first) return 'Post ogólny';
  const t = first.text.trim().replace(/\s+/g, ' ');
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

const currentTitle = () => $('postTitle').value.trim() || deriveTitle(readCfg());

function updateTitlePlaceholder() {
  $('postTitle').placeholder = `Automatycznie: ${deriveTitle(readCfg())}`;
}

function updateCaptionCounter() {
  const len = $('instaCaption').value.length;
  const el = $('captionCounter');
  el.textContent = `${len} / ${CAPTION_LIMIT}`;
  el.classList.toggle('over', len > CAPTION_LIMIT);
}

function updateCoverThumb() {
  const thumb = $('thumbCover');
  thumb.hidden = !assets.coverImg;
  if (assets.coverImg) thumb.src = assets.coverImg.src;
  $('removeCoverBtn').hidden = !assets.coverImg;
}

async function fontsReady() {
  const specs = ['500 40px "DM Sans"', '800 40px "DM Sans"', '500 40px "Montserrat"', '600 40px "Montserrat"',
    '800 40px "Montserrat"', '900 40px "Montserrat"'];
  const timeout = new Promise((r) => setTimeout(r, 4000));
  // Tekst próbny z polskimi znakami wymusza pobranie podzbioru latin-ext (inaczej "Ę", "Ś" itd. w 1. klatce rysują się fontem zastępczym)
  const sample = 'AaĄąĆćĘęŁłŃńÓóŚśŹźŻż';
  try { await Promise.race([Promise.all(specs.map((s) => document.fonts.load(s, sample))), timeout]); } catch { /* trudno */ }
}

// ─────────────────────────────── Podgląd ───────────────────────────────
let renderQueued = false;

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { if (renderQueued) renderNow(); });
}

function previewCanvases() {
  return [...$('canvasContainer').querySelectorAll('canvas')];
}

function renderNow() {
  renderQueued = false;
  const cfg = readCfg();
  updateRecommendedHint();
  const container = $('canvasContainer');
  const count = R.countCanvases(cfg.postMode, slides);
  const key = `${cfg.postMode}:${count}`;
  if (container.dataset.key !== key) {
    buildCanvases(container, cfg.postMode, count);
    container.dataset.key = key;
  }
  if (count > 0) R.renderPreview(previewCanvases(), cfg, assets, slides, 2);
}

function buildCanvases(container, mode, count) {
  container.innerHTML = '';
  if (count === 0) {
    container.innerHTML = '<p class="empty-preview">Uzupełnij chociaż jeden slajd (zdjęcie lub tekst), aby wygenerować podgląd.</p>';
    return;
  }
  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-wrapper';
    const label = document.createElement('div');
    label.className = 'canvas-label';
    label.textContent = mode === 'calendar' ? '1 / 1 (Kalendarium)' : `${i + 1} / ${count}`;
    const canvas = document.createElement('canvas');
    attachCanvasInteractions(canvas, i);
    wrapper.append(canvas, label);
    container.appendChild(wrapper);
  }
}

/** Przeciąganie zdjęcia (kadrowanie) + kliknięcie = powiększenie. */
function attachCanvasInteractions(canvas, canvasIndex) {
  let drag = null;
  let hasDragged = false;

  canvas.addEventListener('pointerdown', (e) => {
    hasDragged = false;
    const idx = R.slideIndexForCanvas(getRadio('postMode'), slides, canvasIndex);
    if (idx === -1 || !slides[idx].imgObj) return;
    drag = { slide: slides[idx], x: e.clientX, y: e.clientY, panX: slides[idx].panX || 0, panY: slides[idx].panY || 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!hasDragged && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
    hasDragged = true;
    canvas.classList.add('grabbing');
    const k = R.W / canvas.clientWidth;
    const lim = R.maxPan(drag.slide.imgObj);
    drag.slide.panX = clamp(drag.panX + dx * k, -lim.x, lim.x);
    drag.slide.panY = clamp(drag.panY + dy * k, -lim.y, lim.y);
    scheduleRender();
  });
  const end = () => {
    if (drag && hasDragged) markDirty();
    drag = null;
    canvas.classList.remove('grabbing');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('click', () => { if (!hasDragged) openSlideModal(canvasIndex); });
}

function updateRecommendedHint() {
  const rec = R.recommendedSlideSeconds(slides);
  const el = $('recommendedTimeHint');
  const tooLong = rec > 15;
  el.textContent = tooLong ? `⚠️ Rekomendowany czas: ${rec}s (Tekst może być za długi!)` : `💡 Rekomendowany czas: ${rec}s`;
  el.className = tooLong ? 'hint-warn' : 'hint-ok';
}

function openSlideModal(index) {
  const canvases = previewCanvases();
  if (index < 0 || index >= canvases.length) return;
  modalIndex = index;
  $('modalImg').src = canvases[index].toDataURL('image/jpeg', 0.92);
  openModal('slideModal');
}

// ─────────────────────────────── Tryb i format ───────────────────────────────
function applyModeUI() {
  const mode = getRadio('postMode');
  $('albumDataCard').hidden = mode !== 'album';
  $('calendarDataCard').hidden = mode !== 'calendar';
  $('slidesCard').hidden = mode === 'calendar';
  $('coverDurationContainer').hidden = mode !== 'album';
  $('calAccent').value = $('colSlideArtist').value;
  $('jsonText').placeholder = mode === 'calendar'
    ? '{\n  "mode": "calendar",\n  "calDate": "28 WRZEŚNIA",\n  "calEvents": [\n    "1991: Nirvana wydaje...",\n    "2003: Kolejne wydarzenie..."\n  ]\n}'
    : '{"mode": "album", "artist": "...", "title": "...", "year": "...", "label": "...", "caption": "...", "slides": [{"text": "Fakt 1..."}]}';
  applyFormatUI();
}

function applyFormatUI() {
  const mode = getRadio('postMode');
  const format = getRadio('postFormat');
  $('videoSettings').hidden = format !== 'video';
  let label = '⬇ POBIERZ KARUZELĘ (.ZIP)';
  if (format === 'video') label = '⬇ POBIERZ WIDEO (.ZIP)';
  else if (mode === 'calendar') label = '⬇ POBIERZ GRAFIKĘ (.JPG)';
  else if (format === 'reel') label = '⬇ POBIERZ SLAJDY 9:16 (.ZIP)';
  $('dlBtn').textContent = label;
}

// ─────────────────────────────── Slajdy ───────────────────────────────
function renderSlideInputs() {
  const list = $('slidesList');
  list.innerHTML = '';
  slides.forEach((slide, i) => {
    const box = document.createElement('div');
    box.className = 'slide-box';
    box.innerHTML = `
      <div class="slide-header">
        <span>SLAJD ${String(i + 1).padStart(2, '0')}</span>
        <div class="slide-actions">
          <button class="btn btn-secondary" type="button" data-action="up" data-index="${i}" title="Przesuń wyżej" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-secondary" type="button" data-action="down" data-index="${i}" title="Przesuń niżej" ${i === slides.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-danger" type="button" data-action="remove" data-index="${i}">🗑️ USUŃ</button>
        </div>
      </div>
      <div class="upload-zone slide-upload">
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-slide-file="${i}">
        <strong>Zdjęcie wsadowe (górne)</strong>
        <img class="thumb-img" alt="" hidden>
      </div>
      <button class="link-btn" type="button" data-action="clear-img" data-index="${i}" hidden>✕ usuń zdjęcie</button>
      <textarea data-slide-text="${i}" placeholder="Wpisz tekst dla tego slajdu..."></textarea>`;
    box.querySelector('textarea').value = slide.text;
    if (slide.imgObj) {
      const thumb = box.querySelector('.thumb-img');
      thumb.src = slide.imgObj.src;
      thumb.hidden = false;
      box.querySelector('[data-action="clear-img"]').hidden = false;
    }
    list.appendChild(box);
  });
  $('addSlideBtn').disabled = slides.length >= MAX_SLIDES;
}

function slidesChanged({ inputs = true } = {}) {
  if (inputs) renderSlideInputs();
  updateTitlePlaceholder();
  scheduleRender();
  markDirty();
}

async function uploadImage(file, zone) {
  zone?.classList.add('busy');
  try {
    const form = new FormData();
    form.append('file', file);
    const { media } = await api('/api/media', { method: 'POST', form });
    const img = await loadImage(media.url);
    if (!img) throw new Error('Nie udało się wczytać przesłanego obrazu.');
    return { id: media.id, img };
  } finally {
    zone?.classList.remove('busy');
  }
}

function bindSlideEvents() {
  const list = $('slidesList');
  list.addEventListener('input', (e) => {
    const i = e.target.dataset.slideText;
    if (i === undefined) return;
    slides[Number(i)].text = e.target.value;
    slidesChanged({ inputs: false });
  });
  list.addEventListener('change', async (e) => {
    const i = e.target.dataset.slideFile;
    if (i === undefined) return;
    const file = e.target.files[0];
    if (!file) return;
    const slide = slides[Number(i)];
    try {
      const { id, img } = await uploadImage(file, e.target.closest('.upload-zone'));
      Object.assign(slide, { mediaId: id, imgObj: img, panX: 0, panY: 0 });
      slidesChanged();
    } catch (err) {
      toast(err.message, 'error');
      e.target.value = '';
    }
  });
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const i = Number(btn.dataset.index);
    const action = btn.dataset.action;
    if (action === 'remove') {
      if (!confirm('Czy usunąć slajd?')) return;
      slides.splice(i, 1);
    } else if (action === 'up' && i > 0) {
      [slides[i - 1], slides[i]] = [slides[i], slides[i - 1]];
    } else if (action === 'down' && i < slides.length - 1) {
      [slides[i + 1], slides[i]] = [slides[i], slides[i + 1]];
    } else if (action === 'clear-img') {
      Object.assign(slides[i], { mediaId: null, imgObj: null, panX: 0, panY: 0 });
    } else return;
    slidesChanged();
  });
  $('addSlideBtn').addEventListener('click', () => {
    if (slides.length >= MAX_SLIDES) return alert(`Osiągnięto bezpieczny limit ${MAX_SLIDES} slajdów.`);
    slides.push(emptySlide());
    slidesChanged();
    $('slidesList').lastElementChild?.querySelector('textarea')?.focus();
  });
}

// ─────────────────────────────── Zapis do bazy ───────────────────────────────
function setSaveStatus(state, detail = '') {
  const el = $('saveStatus');
  const time = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
  const texts = {
    saved: `✓ Zapisano${time ? ' ' + time : ''}`,
    saving: '⏳ Zapisywanie…',
    unsaved: '● Niezapisane zmiany',
    error: `⚠ Błąd zapisu${detail ? ': ' + detail : ''}`,
    conflict: '⚠ Konflikt wersji',
  };
  el.textContent = texts[state] ?? '';
  el.className = `save-status ${state}`;
}

function markDirty() {
  if (!save.ready) return;
  save.dirty = true;
  if (!save.conflict) setSaveStatus('unsaved');
  clearTimeout(save.timer);
  save.timer = setTimeout(saveNow, AUTOSAVE_MS);
}

function makeThumbnail(width = 400) {
  const src = previewCanvases()[0];
  if (!src || !src.width) return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round((src.height * width) / src.width);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

function buildPayload() {
  const cfg = readCfg();
  const data = {};
  for (const id of FIELDS) data[id] = cfg[id];
  data.customTitle = $('postTitle').value.trim();
  data.coverMediaId = coverMediaId;
  data.slides = slides.map((s) => ({
    text: s.text, mediaId: s.mediaId || null, panX: Math.round(s.panX || 0), panY: Math.round(s.panY || 0),
  }));
  return {
    version,
    title: data.customTitle || deriveTitle(cfg),
    mode: cfg.postMode,
    format: cfg.postFormat,
    status: $('postStatus').value,
    scheduledAt: fromLocalInput($('scheduledAt').value),
    caption: $('instaCaption').value,
    data,
  };
}

async function saveNow() {
  clearTimeout(save.timer);
  if (!save.ready || save.conflict) return;
  if (save.inFlight) { save.again = true; return; }
  if (!save.dirty) { setSaveStatus('saved'); return; }

  save.inFlight = true;
  save.dirty = false;
  setSaveStatus('saving');
  if (renderQueued) renderNow();
  try {
    const payload = buildPayload();
    payload.thumbnail = makeThumbnail();
    const { post } = await api(`/api/posts/${postId}`, { method: 'PUT', body: payload });
    version = post.version;
    lastSavedAt = post.updatedAt;
    setSaveStatus(save.dirty ? 'unsaved' : 'saved');
  } catch (err) {
    save.dirty = true;
    if (err.status === 409) {
      save.conflict = true;
      setSaveStatus('conflict');
      $('conflictBanner').hidden = false;
    } else {
      setSaveStatus('error', err.message);
      save.timer = setTimeout(saveNow, 15_000);
    }
  } finally {
    save.inFlight = false;
    if (save.again) { save.again = false; saveNow(); }
  }
}

function forceSave() {
  save.dirty = true;
  saveNow();
}

async function overwriteAfterConflict() {
  try {
    const { post } = await api(`/api/posts/${postId}`);
    version = post.version;
    save.conflict = false;
    $('conflictBanner').hidden = true;
    forceSave();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─────────────────────────────── Wczytanie posta ───────────────────────────────
async function loadPost() {
  const { post } = await api(`/api/posts/${postId}`);
  const data = post.data || {};
  version = post.version;
  lastSavedAt = post.updatedAt;

  setRadio('postMode', post.mode);
  setRadio('postFormat', post.format);
  writeFields({ ...R.DEFAULTS, ...data });
  $('postTitle').value = data.customTitle || '';
  $('postStatus').value = post.status;
  $('scheduledAt').value = toLocalInput(post.scheduledAt);
  $('instaCaption').value = post.caption || '';
  $('postTag').textContent = `POST #${post.id}`;
  document.title = `${post.title || 'Post'} • DIGGUJ FAKTY`;

  coverMediaId = data.coverMediaId || null;
  const savedSlides = Array.isArray(data.slides) ? data.slides : [];
  const [cover, ...images] = await Promise.all([
    loadImage(mediaUrl(coverMediaId)),
    ...savedSlides.map((s) => loadImage(mediaUrl(s.mediaId))),
  ]);
  assets.coverImg = cover;
  slides = savedSlides.map((s, i) => ({
    text: s.text || '', mediaId: s.mediaId || null, panX: Number(s.panX) || 0, panY: Number(s.panY) || 0, imgObj: images[i],
  }));
  if (!slides.length && post.mode !== 'calendar') slides.push(emptySlide());
  return post;
}

function loadLogos() {
  return Promise.all([
    loadImage('/assets/logo.png').then((img) => { assets.logoImg = img; }),
    loadImage('/assets/digguj-fakty.png').then((img) => { assets.diggujImg = img; }),
  ]);
}

// ─────────────────────────────── JSON / opis / czyszczenie ───────────────────────────────
function applyJson() {
  const txt = $('jsonText').value.trim();
  if (!txt) return;
  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    alert(`Błąd! Upewnij się, że wkleiłeś poprawny kod JSON.\nSzczegóły: ${e.message}`);
    return;
  }
  if (['album', 'general', 'calendar'].includes(data.mode)) {
    setRadio('postMode', data.mode);
    if (data.mode === 'calendar' && getRadio('postFormat') === 'carousel') setRadio('postFormat', 'reel');
  }
  const map = { artist: 'albumArtist', title: 'albumTitle', year: 'albumYear', label: 'albumLabel', calDate: 'calDate' };
  for (const [key, id] of Object.entries(map)) if (data[key] !== undefined) $(id).value = data[key];
  if (data.calEvents !== undefined) $('calEvents').value = Array.isArray(data.calEvents) ? data.calEvents.join('\n') : data.calEvents;
  if (typeof data.caption === 'string') { $('instaCaption').value = data.caption; updateCaptionCounter(); }
  if (Array.isArray(data.slides)) {
    slides = data.slides.slice(0, MAX_SLIDES).map((s) => ({ ...emptySlide(), text: typeof s === 'string' ? s : (s?.text || '') }));
    renderSlideInputs();
  }
  $('jsonText').value = '';
  $('jsonZone').hidden = true;
  applyModeUI();
  slidesChanged({ inputs: false });
}

function clearContent() {
  if (!confirm('🚨 Wyczyścić całą treść tego posta (teksty, zdjęcia, opis i ustawienia wyglądu)?\nStatus i data publikacji zostaną.')) return;
  writeFields(R.DEFAULTS);
  $('calAccent').value = $('colSlideArtist').value;
  $('postTitle').value = '';
  $('instaCaption').value = '';
  coverMediaId = null;
  assets.coverImg = null;
  slides = getRadio('postMode') === 'calendar' ? [] : [emptySlide()];
  updateCoverThumb();
  updateCaptionCounter();
  slidesChanged();
}

// ─────────────────────────────── Pobieranie ───────────────────────────────
async function handleDownload() {
  if (renderQueued) renderNow();
  const cfg = readCfg();
  const caption = $('instaCaption').value;
  const btn = $('dlBtn');

  if (cfg.postFormat === 'video') {
    const overlay = $('videoOverlay');
    overlay.hidden = false;
    btn.disabled = true;
    try {
      await exportVideoZip({
        cfg, assets, slides, caption,
        filename: `${safeFilename(currentTitle(), 'Trivia_Wideo')}_wideo.zip`,
        onProgress: (msg) => { $('videoProgressText').textContent = msg; },
      });
    } catch (err) {
      console.error(err);
      alert(`Wystąpił błąd podczas generowania wideo.\nSzczegóły: ${err.message}`);
    } finally {
      overlay.hidden = true;
      btn.disabled = false;
      $('videoProgressText').textContent = 'Generowanie wideo (0%)';
    }
    return;
  }

  const canvases = previewCanvases();
  if (!canvases.length) return alert('Najpierw uzupełnij treść, aby wygenerować slajdy.');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = cfg.postMode === 'calendar' ? '⏳ Zapisywanie…' : '⏳ Pakowanie do ZIP…';
  try {
    if (cfg.postMode === 'calendar') {
      downloadBlob(await canvasToBlob(canvases[0]), `Kalendarium_${safeFilename(cfg.calDate, 'grafika')}.jpg`);
    } else {
      await exportCarouselZip(canvases, caption, `${safeFilename(currentTitle(), 'Trivia_Carousel')}.zip`);
    }
  } catch (err) {
    alert(`Błąd pobierania: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ─────────────────────────────── Zdarzenia ───────────────────────────────
function bindEvents() {
  // Wszystkie pola formularza w panelu bocznym (poza slajdami, które mają własną obsługę)
  $('sidebar').addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'radio' || t.type === 'file' || t.id === 'jsonText' || t.closest('#slidesList')) return;
    // Kolor akcentu kalendarium to ten sam parametr co kolor wykonawcy na slajdach albumu
    if (t.id === 'calAccent') $('colSlideArtist').value = t.value;
    if (t.id === 'calAccent' || t.id === 'colSlideArtist') $('calAccent').value = $('colSlideArtist').value;
    if (t.type === 'range') updateRangeLabels();
    if (t.id === 'instaCaption') updateCaptionCounter();
    if (FIELDS.includes(t.id) || t.id === 'calAccent') scheduleRender();
    updateTitlePlaceholder();
    markDirty();
  });

  document.querySelectorAll('input[name="postMode"]').forEach((r) => r.addEventListener('change', () => {
    // Kalendarium jest zawsze pionowe (9:16)
    if (getRadio('postMode') === 'calendar' && getRadio('postFormat') === 'carousel') setRadio('postFormat', 'reel');
    applyModeUI();
    updateTitlePlaceholder();
    scheduleRender();
    markDirty();
  }));
  document.querySelectorAll('input[name="postFormat"]').forEach((r) => r.addEventListener('change', () => {
    applyFormatUI();
    scheduleRender();
    markDirty();
  }));

  $('coverInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { id, img } = await uploadImage(file, $('coverZone'));
      coverMediaId = id;
      assets.coverImg = img;
      updateCoverThumb();
      scheduleRender();
      markDirty();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });
  $('removeCoverBtn').addEventListener('click', () => {
    coverMediaId = null;
    assets.coverImg = null;
    updateCoverThumb();
    scheduleRender();
    markDirty();
  });

  bindSlideEvents();

  $('toggleJsonBtn').addEventListener('click', () => { $('jsonZone').hidden = !$('jsonZone').hidden; });
  $('applyJsonBtn').addEventListener('click', applyJson);
  $('copyCaptionBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('instaCaption').value);
      toast('Opis skopiowany do schowka.', 'ok');
    } catch {
      toast('Nie udało się skopiować – zaznacz tekst ręcznie.', 'error');
    }
  });
  $('refreshBtn').addEventListener('click', renderNow);
  $('clearBtn').addEventListener('click', clearContent);


  $('previewVideoBtn').addEventListener('click', () => {
    if (renderQueued) renderNow();
    try {
      videoPreview.start({ cfg: readCfg(), assets, slides });
      openModal('videoPreviewModal');
    } catch (err) {
      alert(err.message);
    }
  });

  $('dlBtn').addEventListener('click', handleDownload);
  $('saveBtn').addEventListener('click', forceSave);
  $('conflictReload').addEventListener('click', () => { save.dirty = false; location.reload(); });
  $('conflictOverwrite').addEventListener('click', overwriteAfterConflict);

  setupModals((id) => {
    if (id === 'videoPreviewModal') videoPreview.stop();
    if (id === 'slideModal') modalIndex = -1;
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      forceSave();
    }
    if ($('slideModal').classList.contains('open') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const next = modalIndex + (e.key === 'ArrowRight' ? 1 : -1);
      if (next >= 0 && next < previewCanvases().length) openSlideModal(next);
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (save.dirty || save.inFlight) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && save.dirty) saveNow();
  });
}

// ─────────────────────────────── Start ───────────────────────────────
async function init() {
  if (!Number.isInteger(postId) || postId <= 0) {
    location.replace('/');
    return;
  }
  hideBrokenImages();
  bindEvents();
  const logos = loadLogos();

  let post;
  try {
    [, post] = await Promise.all([fontsReady(), loadPost()]);
  } catch (err) {
    if (err.status === 404) {
      alert('Nie znaleziono posta – mógł zostać usunięty.');
      location.replace('/');
      return;
    }
    $('canvasContainer').textContent = `Nie udało się wczytać posta: ${err.message}`;
    return;
  }

  applyModeUI();
  renderSlideInputs();
  updateCoverThumb();
  updateCaptionCounter();
  updateTitlePlaceholder();
  renderNow();
  setSaveStatus('saved');
  save.ready = true;

  await logos;
  renderNow();
  // Post bez miniatury (np. świeżo utworzony) – zapisz od razu, żeby miniatura pojawiła się na liście postów
  if (!post.thumbUrl && previewCanvases().length) markDirty();
}

init();
