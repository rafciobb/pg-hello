import { api, logout } from './api.js';
import {
  $, FORMAT_LABELS, MODE_LABELS, STATUS_LABELS, closeModal, esc, formatDate, hideBrokenImages, openModal,
  setupModals, toast,
} from './ui.js';

let posts = [];
let searchTimer = null;

function currentFilters() {
  const params = new URLSearchParams();
  const q = $('search').value.trim();
  if (q) params.set('q', q);
  if ($('filterStatus').value) params.set('status', $('filterStatus').value);
  if ($('filterMode').value) params.set('mode', $('filterMode').value);
  params.set('sort', $('sort').value);
  return params;
}

async function loadPosts() {
  const params = currentFilters();
  // Filtry trzymamy w adresie – odświeżenie strony / powrót z edytora ich nie gubi
  history.replaceState(null, '', params.toString() === 'sort=updated' ? '/' : `/?${params}`);
  try {
    posts = (await api(`/api/posts?${params}`)).posts;
    renderPosts();
  } catch (err) {
    $('posts').innerHTML = `<p class="empty">Nie udało się wczytać postów: ${esc(err.message)}</p>`;
  }
}

async function loadStats() {
  try {
    const all = (await api('/api/posts')).posts;
    const counts = { all: all.length, draft: 0, ready: 0, scheduled: 0, published: 0 };
    all.forEach((p) => { counts[p.status] += 1; });
    const active = $('filterStatus').value;
    $('stats').innerHTML = [['', 'Wszystkie', counts.all], ...Object.entries(STATUS_LABELS).map(([k, v]) => [k, v, counts[k]])]
      .map(([key, label, n]) => `<button class="stat ${active === key ? 'active' : ''}" type="button" data-status="${key}">
        <div class="num">${n}</div><div class="lbl">${esc(label)}</div></button>`)
      .join('');
  } catch { /* statystyki są tylko dodatkiem */ }
}

function renderPosts() {
  const box = $('posts');
  if (!posts.length) {
    const filtered = currentFilters().toString() !== 'sort=updated';
    box.innerHTML = `<p class="empty">${filtered ? 'Brak postów pasujących do filtrów.' : 'Nie masz jeszcze żadnych postów – utwórz pierwszy przyciskiem powyżej.'}</p>`;
    return;
  }
  box.innerHTML = posts.map((p) => `
    <article class="post-card" data-id="${p.id}">
      <a class="post-thumb" href="/editor?id=${p.id}">
        ${p.thumbUrl ? `<img src="${esc(p.thumbUrl)}" alt="" loading="lazy">` : '<span class="no-thumb">Brak podglądu</span>'}
      </a>
      <div class="post-body">
        <a class="post-title" href="/editor?id=${p.id}">${esc(p.title || 'Bez tytułu')}</a>
        <div class="post-meta">
          <span class="badge badge-${p.status}">${esc(STATUS_LABELS[p.status])}</span>
          <span class="badge">${esc(MODE_LABELS[p.mode])}</span>
          <span class="badge">${esc(FORMAT_LABELS[p.format])}</span>
        </div>
        <div class="post-dates">
          ${p.scheduledAt ? `<strong>📅 ${esc(formatDate(p.scheduledAt))}</strong><br>` : ''}
          Edytowano ${esc(formatDate(p.updatedAt))}${p.updatedBy ? ` • ${esc(p.updatedBy)}` : ''}
        </div>
        <div class="post-actions">
          <select data-action="status" aria-label="Zmień status">
            ${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select>
          <button class="btn btn-secondary" type="button" data-action="duplicate" title="Duplikuj">⧉</button>
          <button class="btn btn-danger" type="button" data-action="delete" title="Usuń">🗑️</button>
        </div>
      </div>
    </article>`).join('');
}

async function createPost(mode) {
  try {
    const { post } = await api('/api/posts', { method: 'POST', body: { mode } });
    location.href = `/editor?id=${post.id}`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function onPostAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const card = el.closest('.post-card');
  const post = posts.find((p) => p.id === Number(card.dataset.id));
  if (!post) return;
  const action = el.dataset.action;

  try {
    if (action === 'status' && e.type === 'change') {
      const { post: updated } = await api(`/api/posts/${post.id}`, { method: 'PUT', body: { version: post.version, status: el.value } });
      Object.assign(post, updated);
      toast(`Status: ${STATUS_LABELS[updated.status]}`, 'ok');
      renderPosts();
      loadStats();
    } else if (action === 'duplicate' && e.type === 'click') {
      await api(`/api/posts/${post.id}/duplicate`, { method: 'POST' });
      toast('Utworzono kopię posta.', 'ok');
      await Promise.all([loadPosts(), loadStats()]);
    } else if (action === 'delete' && e.type === 'click') {
      if (!confirm(`Usunąć post „${post.title || 'Bez tytułu'}”? Tej operacji nie można cofnąć.`)) return;
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
      toast('Post usunięty.', 'ok');
      await Promise.all([loadPosts(), loadStats()]);
    }
  } catch (err) {
    toast(err.status === 409 ? 'Post zmienił się w międzyczasie – odświeżono listę.' : err.message, 'error');
    loadPosts();
  }
}

async function changePassword(e) {
  e.preventDefault();
  const err = $('passwordError');
  err.textContent = '';
  if ($('newPassword').value !== $('newPassword2').value) {
    err.textContent = 'Nowe hasła się różnią.';
    return;
  }
  try {
    await api('/api/auth/password', {
      method: 'POST',
      body: { currentPassword: $('currentPassword').value, newPassword: $('newPassword').value },
    });
    $('passwordForm').reset();
    closeModal('passwordModal');
    toast('Hasło zmienione. Inne sesje zostały wylogowane.', 'ok');
  } catch (ex) {
    err.textContent = ex.message;
  }
}

function restoreFiltersFromUrl() {
  const params = new URLSearchParams(location.search);
  $('search').value = params.get('q') || '';
  $('filterStatus').value = params.get('status') || '';
  $('filterMode').value = params.get('mode') || '';
  $('sort').value = params.get('sort') || 'updated';
}

async function init() {
  hideBrokenImages();
  setupModals();
  restoreFiltersFromUrl();

  document.querySelectorAll('[data-new-mode]').forEach((btn) => btn.addEventListener('click', () => createPost(btn.dataset.newMode)));
  $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadPosts, 250); });
  ['filterMode', 'sort'].forEach((id) => $(id).addEventListener('change', loadPosts));
  $('filterStatus').addEventListener('change', () => { loadPosts(); loadStats(); });
  $('stats').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    $('filterStatus').value = btn.dataset.status;
    loadPosts();
    loadStats();
  });
  $('posts').addEventListener('click', onPostAction);
  $('posts').addEventListener('change', onPostAction);
  $('logoutBtn').addEventListener('click', logout);
  $('passwordBtn').addEventListener('click', () => { openModal('passwordModal'); $('currentPassword').focus(); });
  $('passwordForm').addEventListener('submit', changePassword);

  // Po powrocie z edytora przyciskiem "wstecz" przeglądarka może pokazać starą wersję strony z cache
  window.addEventListener('pageshow', (e) => { if (e.persisted) { loadPosts(); loadStats(); } });

  api('/api/auth/me').then(({ user }) => { $('userName').textContent = `👤 ${user.username}`; }).catch(() => {});
  await Promise.all([loadPosts(), loadStats()]);
}

init();
