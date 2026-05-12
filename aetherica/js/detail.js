// Aetherica image detail page — loads /api/aetherica/images/:id and renders
// the big image, metadata, tags, like button, and prev/next links.
// Respects two filters:
//   - NSFW visibility from localStorage (default "on")
//   - Tag filter from ?tag= URL param (carried into prev/next URLs and API call)

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
const likeBtn       = document.getElementById('aeth-like-btn');
const likeCount     = document.getElementById('aeth-like-count');
const toggleBtn     = document.getElementById('aeth-nsfw-toggle');
const backLink      = document.getElementById('aeth-back');

const LIKED_KEY = 'aeth_liked_ids';
const NSFW_KEY  = 'aeth_show_nsfw';

function nsfwOn() {
  return (localStorage.getItem(NSFW_KEY) || 'on') === 'on';
}

function getActiveTag() {
  return new URLSearchParams(window.location.search).get('tag') || null;
}

function getLikedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));
  } catch { return new Set(); }
}

function markLikedLocally(id) {
  const set = getLikedIds();
  set.add(id);
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...set])); } catch {}
}

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

function renderToggle() {
  if (!toggleBtn) return;
  const on = nsfwOn();
  toggleBtn.dataset.state = on ? 'on' : 'off';
  toggleBtn.textContent = on ? 'NSFW' : 'SFW';
  toggleBtn.title = on ? 'Showing NSFW images — click to hide' : 'NSFW hidden — click to show';
}

function buildDetailHref(id) {
  const tag = getActiveTag();
  const params = new URLSearchParams();
  params.set('id', String(id));
  if (tag) params.set('tag', tag);
  return `/aetherica/image?${params.toString()}`;
}

function buildGalleryHref() {
  const tag = getActiveTag();
  return tag ? `/aetherica/?tag=${encodeURIComponent(tag)}` : '/aetherica/';
}

function renderTags(tags) {
  tagsEl.innerHTML = '';
  if (!tags || !tags.length) return;
  tags.forEach(name => {
    const a = document.createElement('a');
    a.className = 'aeth-detail__tag';
    a.textContent = name;
    a.href = `/aetherica/?tag=${encodeURIComponent(name)}`;
    tagsEl.appendChild(a);
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

  // Keep the back link in sync with whatever filter is active.
  if (backLink) backLink.href = buildGalleryHref();

  try {
    const params = new URLSearchParams();
    if (!nsfwOn()) params.set('nsfw', 'off');
    const tag = getActiveTag();
    if (tag) params.set('tag', tag);

    const url = `/api/aetherica/images/${id}${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
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
    if (img.featured) metaParts.push('★ Featured');
    metaEl.textContent = metaParts.join(' · ');

    // Likes UI — count from server, "liked" state hint from localStorage.
    likeCount.textContent = img.likes_count ?? 0;
    likeBtn.dataset.id = img.id;
    const alreadyLiked = getLikedIds().has(img.id);
    likeBtn.classList.toggle('aeth-like-btn--liked', alreadyLiked);
    likeBtn.disabled = alreadyLiked;

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
      prevLink.href = buildDetailHref(data.prev_id);
    } else {
      prevLink.hidden = true;
    }

    if (data.next_id) {
      nextLink.hidden = false;
      nextLink.href = buildDetailHref(data.next_id);
    } else {
      nextLink.hidden = true;
    }

    detail.dataset.prevId = data.prev_id || '';
    detail.dataset.nextId = data.next_id || '';

    setState('ready');
  } catch (err) {
    console.error('[aetherica/detail] load failed', err);
    setState('error');
  }
}

// Like button — POST to server, optimistic UI; 409 means "this IP already liked"
// so we sync the UI to the server's count regardless.
likeBtn.addEventListener('click', async () => {
  const id = parseInt(likeBtn.dataset.id, 10);
  if (!id || likeBtn.disabled) return;

  likeBtn.disabled = true;
  try {
    const res = await fetch(`/api/aetherica/images/${id}/like`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));

    if (res.ok || res.status === 409) {
      if (typeof data.likes_count === 'number') {
        likeCount.textContent = data.likes_count;
      }
      likeBtn.classList.add('aeth-like-btn--liked');
      markLikedLocally(id);
    } else {
      console.error('[aetherica] like failed', res.status, data);
      likeBtn.disabled = false;
    }
  } catch (err) {
    console.error('[aetherica] like network error', err);
    likeBtn.disabled = false;
  }
});

// NSFW toggle: flip state and reload so prev/next is recomputed under the new filter.
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    try {
      localStorage.setItem(NSFW_KEY, nsfwOn() ? 'off' : 'on');
    } catch { /* ignore */ }
    window.location.reload();
  });
}

// Keyboard navigation: ← prev, → next, Esc back to gallery (respecting filter).
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'ArrowLeft'  && detail.dataset.prevId) {
    window.location.href = buildDetailHref(detail.dataset.prevId);
  } else if (e.key === 'ArrowRight' && detail.dataset.nextId) {
    window.location.href = buildDetailHref(detail.dataset.nextId);
  } else if (e.key === 'Escape') {
    window.location.href = buildGalleryHref();
  }
});

renderToggle();
load();
