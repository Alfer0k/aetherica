// Aetherica gallery — fetches recent images and renders a 3-column masonry.
// Respects two filters:
//   - NSFW visibility from localStorage (default "on")
//   - Tag filter from ?tag= URL param

const R2_PUBLIC_URL = 'https://pub-db6629ddb8a843f48242c0317002614e.r2.dev';
const PAGE_SIZE = 50;
const NSFW_KEY = 'aeth_show_nsfw';

const grid       = document.getElementById('aeth-grid');
const toggleBtn  = document.getElementById('aeth-nsfw-toggle');
const filterBox  = document.getElementById('aeth-filter');
const filterName = document.getElementById('aeth-filter-name');

function nsfwOn() {
  return (localStorage.getItem(NSFW_KEY) || 'on') === 'on';
}

function setState(state) {
  grid.dataset.state = state;
}

function thumbUrl(prefix) {
  return `${R2_PUBLIC_URL}/${prefix}/thumb.webp`;
}

function getActiveTag() {
  return new URLSearchParams(window.location.search).get('tag') || null;
}

function renderToggle() {
  if (!toggleBtn) return;
  const on = nsfwOn();
  toggleBtn.dataset.state = on ? 'on' : 'off';
  toggleBtn.textContent = on ? 'NSFW' : 'SFW';
  toggleBtn.title = on ? 'Showing NSFW images — click to hide' : 'NSFW hidden — click to show';
}

function renderFilterBanner() {
  const tag = getActiveTag();
  if (!tag) {
    filterBox.hidden = true;
    return;
  }
  filterBox.hidden = false;
  filterName.textContent = tag;
}

function buildDetailHref(id) {
  // Carry the current tag filter into the detail page so prev/next stays in-filter.
  const tag = getActiveTag();
  const params = new URLSearchParams();
  params.set('id', String(id));
  if (tag) params.set('tag', tag);
  return `/aetherica/image?${params.toString()}`;
}

function renderCard(img) {
  const a = document.createElement('a');
  a.className = 'aeth-card';
  a.href = buildDetailHref(img.id);
  a.setAttribute('data-id', img.id);
  if (img.featured) a.classList.add('aeth-card--featured');

  const thumb = document.createElement('img');
  thumb.className = 'aeth-card__thumb';
  thumb.src = thumbUrl(img.r2_prefix);
  thumb.alt = img.title || '';
  thumb.loading = 'lazy';
  thumb.draggable = false;
  if (img.width && img.height) {
    thumb.width  = img.width;
    thumb.height = img.height;
  }
  a.appendChild(thumb);

  if (img.likes_count > 0) {
    const likes = document.createElement('span');
    likes.className = 'aeth-card__likes';
    likes.textContent = img.likes_count;
    a.appendChild(likes);
  }

  if (img.title) {
    const overlay = document.createElement('span');
    overlay.className = 'aeth-card__title';
    overlay.textContent = img.title;
    a.appendChild(overlay);
  }

  return a;
}

async function load() {
  setState('loading');
  try {
    const params = new URLSearchParams();
    params.set('limit',  String(PAGE_SIZE));
    params.set('offset', '0');
    if (!nsfwOn()) params.set('nsfw', 'off');
    const tag = getActiveTag();
    if (tag) params.set('tag', tag);

    const res = await fetch(`/api/aetherica/images?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const images = data.images || [];

    grid.querySelectorAll('.aeth-card').forEach(el => el.remove());

    if (images.length === 0) {
      setState('empty');
      return;
    }

    const frag = document.createDocumentFragment();
    images.forEach(img => frag.appendChild(renderCard(img)));
    grid.appendChild(frag);
    setState('ready');
  } catch (err) {
    console.error('[aetherica] failed to load images', err);
    setState('error');
  }
}

// NSFW toggle: flip state and reload so the API call picks up the new filter.
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    try {
      localStorage.setItem(NSFW_KEY, nsfwOn() ? 'off' : 'on');
    } catch { /* ignore */ }
    window.location.reload();
  });
}

renderToggle();
renderFilterBanner();
load();
