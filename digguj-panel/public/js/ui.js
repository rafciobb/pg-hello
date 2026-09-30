// Drobne, współdzielone elementy interfejsu.

export const MODE_LABELS = { album: '💿 Album', general: '🎸 Ogólny', calendar: '📅 Kalendarium' };
export const FORMAT_LABELS = { carousel: 'Karuzela 4:5', reel: 'Rolka 9:16', video: 'Wideo' };
export const STATUS_LABELS = { draft: 'Szkic', ready: 'Gotowy', scheduled: 'Zaplanowany', published: 'Opublikowany' };

export const $ = (id) => document.getElementById(id);

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatDate(value, withTime = true) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** ISO → wartość dla <input type="datetime-local"> w lokalnej strefie czasowej. */
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

let toastBox;
export function toast(message, type = '') {
  if (!toastBox) {
    toastBox = document.createElement('div');
    toastBox.className = 'toasts';
    document.body.appendChild(toastBox);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastBox.appendChild(el);
  setTimeout(() => el.remove(), type === 'error' ? 6000 : 3000);
}

/** Ukrywa obrazki, których nie udało się wczytać (np. brak pliku z logo). */
export function hideBrokenImages(root = document) {
  root.querySelectorAll('img[data-hide-on-error]').forEach((img) => {
    const hide = () => { img.style.display = 'none'; };
    if (img.complete && img.naturalWidth === 0) hide();
    else img.addEventListener('error', hide, { once: true });
  });
}

export function openModal(id) { $(id).classList.add('open'); }
export function closeModal(id) { $(id).classList.remove('open'); }

/** Zamykanie modali: przycisk [data-close-modal], kliknięcie w tło, klawisz Esc. */
export function setupModals(onClose = () => {}) {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close-modal]')) {
        modal.classList.remove('open');
        onClose(modal.id);
      }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.open').forEach((modal) => {
      modal.classList.remove('open');
      onClose(modal.id);
    });
  });
}

/**
 * Rysuje siatkę feeda. items: [{ num, src, title?, isCurrent? }] – sortowane malejąco po numerze.
 */
export function renderFeedGrid(container, items) {
  container.innerHTML = '';
  const sorted = [...items].sort((a, b) => b.num - a.num);
  if (!sorted.length) {
    container.innerHTML = '<div class="feed-empty" style="grid-column: 1 / -1; aspect-ratio: auto; padding: 30px;">Brak postów z numerem w feedzie.</div>';
    return;
  }
  for (const item of sorted) {
    const wrapper = document.createElement('div');
    wrapper.className = 'feed-item';
    if (item.src) {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.title || `Post ${item.num}`;
      img.loading = 'lazy';
      wrapper.appendChild(img);
    } else {
      const empty = document.createElement('div');
      empty.className = 'feed-empty';
      empty.textContent = item.title || 'Brak miniatury';
      wrapper.appendChild(empty);
    }
    const num = document.createElement('div');
    num.className = 'feed-num';
    num.textContent = `#${item.num}`;
    wrapper.appendChild(num);
    if (item.isCurrent) {
      const badge = document.createElement('div');
      badge.className = 'feed-badge';
      badge.textContent = 'OBECNA OKŁADKA';
      wrapper.appendChild(badge);
    }
    container.appendChild(wrapper);
  }
}
