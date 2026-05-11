// Aetherica gallery — fetches recent images and renders a uniform grid.

const R2_PUBLIC_URL = 'https://pub-db6629ddb8a843f48242c0317002614e.r2.dev';
const PAGE_SIZE = 50;

const grid = document.getElementById('aeth-grid');

function setState(state) {
  grid.dataset.state = state;
}

function thumbUrl(prefix) {
  return `${R2_PUBLIC_URL}/${prefix}/thumb.webp`;
}

function fullUrl(prefix) {
  return `${R2_PUBLIC_URL}/${prefix}/full.webp`;
}

function renderCard(img) {
  const a = document.createElement('a');
  a.className = 'aeth-card';
  a.href = fullUrl(img.r2_prefix);
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('data-id', img.id);
  if (img.featured) a.classList.add('aeth-card--featured');

  const thumb = document.createElement('img');
  thumb.className = 'aeth-card__thumb';
  thumb.src = thumbUrl(img.r2_prefix);
  thumb.alt = img.title || '';
  thumb.loading = 'lazy';
  thumb.draggable = false;
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
    const res = await fetch(`/api/aetherica/images?limit=${PAGE_SIZE}&offset=0`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const images = data.images || [];

    // Clear previous cards but keep the state divs.
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

load();
