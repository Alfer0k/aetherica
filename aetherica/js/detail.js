// Aetherica image detail page — loads /api/aetherica/images/:id and renders
// the big image, metadata, tags, and prev/next links.

const R2_PUBLIC_URL = 'https://pub-db6629ddb8a843f48242c0317002614e.r2.dev';

const detail        = document.getElementById('aeth-detail');
const content       = document.getElementById('aeth-detail-content');
const imageEl       = document.getElementById('aeth-image');
const imageLink     = document.getElementById('aeth-image-link');
const titleEl       = document.getElementById('aeth-title');
const metaEl        = document.getElementById('aeth-meta');
const tagsEl        = document.getElementById('aeth-tags');
const sourceWrap    = document.getElementById('aeth-source');
const sourceLink    = document.getElementById('aeth-source-link');
const prevLink      = document.getElementById('aeth-prev');
const nextLink      = document.getElementById('aeth-next');

function setState(state) {
  detail.dataset.state = state;
  content.hidden = (state !== 'ready');
}

function medUrl(prefix)  { return `${R2_PUBLIC_URL}/${prefix}/med.webp`; }
function fullUrl(prefix) { return `${R2_PUBLIC_URL}/${prefix}/full.webp`; }

function formatDate(unix) {
  const d = new Date(unix * 1000);
  return d.toISOString().slice(0, 10);
}

function renderTags(tags) {
  tagsEl.innerHTML = '';
  if (!tags || !tags.length) return;
  tags.forEach(t => {
    const chip = document.createElement('span');
    const label = t.namespace ? `${t.namespace}:${t.name}` : t.name;
    chip.className = t.namespace
      ? `aeth-detail__tag aeth-detail__tag--ns-${t.namespace}`
      : 'aeth-detail__tag';
    chip.textContent = label;
    tagsEl.appendChild(chip);
  });
}

function getIdFromUrl() {
  const id = new URLSearchParams(window.location.search).get('id');
  const n = id ? parseInt(id, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function load() {
  const id = getIdFromUrl();
  if (!id) {
    setState('notfound');
    return;
  }

  setState('loading');

  try {
    const res = await fetch(`/api/aetherica/images/${id}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.status === 404) { setState('notfound'); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const img = data.image;
    document.title = img.title ? `${img.title} — Aetherica` : `Aetherica — image #${img.id}`;

    imageEl.src = medUrl(img.r2_prefix);
    imageEl.alt = img.title || '';
    if (img.width && img.height) {
      imageEl.width  = img.width;
      imageEl.height = img.height;
    }
    imageLink.href = fullUrl(img.r2_prefix);

    titleEl.textContent = img.title || '';
    titleEl.hidden = !img.title;

    const metaParts = [`#${img.id}`, formatDate(img.created_at)];
    if (img.likes_count > 0) {
      metaParts.push(`${img.likes_count} like${img.likes_count === 1 ? '' : 's'}`);
    }
    if (img.featured) metaParts.push('★ Featured');
    metaEl.textContent = metaParts.join(' · ');

    renderTags(img.tags);

    if (img.source_url) {
      sourceWrap.hidden = false;
      sourceLink.href = img.source_url;
      sourceLink.textContent = `Source ↗`;
    } else {
      sourceWrap.hidden = true;
    }

    if (data.prev_id) {
      prevLink.hidden = false;
      prevLink.href = `/aetherica/image?id=${data.prev_id}`;
    } else {
      prevLink.hidden = true;
    }

    if (data.next_id) {
      nextLink.hidden = false;
      nextLink.href = `/aetherica/image?id=${data.next_id}`;
    } else {
      nextLink.hidden = true;
    }

    // Stash for keyboard nav
    detail.dataset.prevId = data.prev_id || '';
    detail.dataset.nextId = data.next_id || '';

    setState('ready');
  } catch (err) {
    console.error('[aetherica/detail] load failed', err);
    setState('error');
  }
}

// Keyboard navigation: ← prev, → next, Esc back to gallery.
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'ArrowLeft'  && detail.dataset.prevId) {
    window.location.href = `/aetherica/image?id=${detail.dataset.prevId}`;
  } else if (e.key === 'ArrowRight' && detail.dataset.nextId) {
    window.location.href = `/aetherica/image?id=${detail.dataset.nextId}`;
  } else if (e.key === 'Escape') {
    window.location.href = '/aetherica/';
  }
});

load();
