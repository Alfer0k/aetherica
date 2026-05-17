// Aetherica gallery — fetches recent images and renders a 3-column masonry.
// Respects two filters:
//   - NSFW visibility from localStorage (default "on")
//   - Tag filter from ?tags= URL param (multi-tag, comma-separated, "-" prefix = exclude)

const R2_PUBLIC_URL = 'https://pub-db6629ddb8a843f48242c0317002614e.r2.dev';
const PAGE_SIZE = 50;
const NSFW_KEY = 'aeth_show_nsfw';
const ORDER_KEY = 'aeth_order_mode'; // 'random' (default) | 'newest'
const MAX_FILTER_TAGS = 20;

const grid       = document.getElementById('aeth-grid');
const toggleBtn  = document.getElementById('aeth-nsfw-toggle');
const orderBtn   = document.getElementById('aeth-order-toggle');
const filterBox  = document.getElementById('aeth-filter');
const filterChips    = document.getElementById('aeth-filter-chips');
const filterClearAll = document.getElementById('aeth-filter-clear');
const loadMoreWrap = document.getElementById('aeth-loadmore');

const filterBtn       = document.getElementById('aeth-filter-btn');
const filterBtnCount  = document.getElementById('aeth-filter-btn-count');
const panel           = document.getElementById('aeth-filter-panel');
const backdrop        = document.getElementById('aeth-filter-backdrop');
const panelClose      = document.getElementById('aeth-filter-panel-close');
const panelList       = document.getElementById('aeth-filter-panel-list');
const panelSearch     = document.getElementById('aeth-filter-search');
const panelClear      = document.getElementById('aeth-filter-panel-clear');
const panelApply      = document.getElementById('aeth-filter-panel-apply');
const panelRating     = document.getElementById('aeth-filter-rating');

// ---------- helpers ----------

function nsfwOn() {
  return (localStorage.getItem(NSFW_KEY) || 'on') === 'on';
}

function orderMode() {
  return localStorage.getItem(ORDER_KEY) === 'newest' ? 'newest' : 'random';
}

function setState(state) {
  grid.dataset.state = state;
}

function thumbUrl(prefix) {
  return `${R2_PUBLIC_URL}/${prefix}/thumb.webp`;
}

// Parse the current URL's ?tags= into {includes, excludes}.
function getActiveFilter() {
  const raw = new URLSearchParams(window.location.search).get('tags') || '';
  const includes = [];
  const excludes = [];
  const seen = new Set();
  for (const piece of raw.split(',')) {
    if (includes.length + excludes.length >= MAX_FILTER_TAGS) break;
    let name = piece.trim().toLowerCase();
    if (!name) continue;
    const exclude = name.startsWith('-');
    if (exclude) name = name.slice(1).trim();
    if (!name) continue;
    const key = (exclude ? '-' : '+') + name;
    if (seen.has(key)) continue;
    seen.add(key);
    (exclude ? excludes : includes).push(name);
  }
  return { includes, excludes };
}

// Serialize a filter state back into the comma-separated URL form.
function serializeFilter({ includes, excludes }) {
  return [...includes, ...excludes.map(n => '-' + n)].join(',');
}

function getActiveRatingMin() {
  const raw = parseInt(new URLSearchParams(window.location.search).get('rating_min') || '', 10);
  return Number.isFinite(raw) && raw > 0 ? Math.min(10, raw) : 0;
}

function buildGalleryHref(filter, ratingMin) {
  const params = new URLSearchParams();
  const s = serializeFilter(filter);
  if (s) params.set('tags', s);
  if (ratingMin && ratingMin > 0) params.set('rating_min', String(ratingMin));
  const qs = params.toString();
  return qs ? `/aetherica/?${qs}` : '/aetherica/';
}

function buildDetailHref(id, filter, ratingMin) {
  const params = new URLSearchParams();
  params.set('id', String(id));
  const s = serializeFilter(filter);
  if (s) params.set('tags', s);
  if (ratingMin && ratingMin > 0) params.set('rating_min', String(ratingMin));
  return `/aetherica/image?${params.toString()}`;
}

function totalActiveFilterCount(filter, ratingMin) {
  return filter.includes.length + filter.excludes.length + (ratingMin > 0 ? 1 : 0);
}

// ---------- top NSFW toggle (unchanged behavior) ----------

function renderToggle() {
  if (!toggleBtn) return;
  const on = nsfwOn();
  toggleBtn.dataset.state = on ? 'on' : 'off';
  toggleBtn.textContent = on ? 'NSFW' : 'SFW';
  toggleBtn.title = on ? 'Showing NSFW images — click to hide' : 'NSFW hidden — click to show';
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    try { localStorage.setItem(NSFW_KEY, nsfwOn() ? 'off' : 'on'); } catch {}
    window.location.reload();
  });
}

function renderOrderToggle() {
  if (!orderBtn) return;
  const mode = orderMode();
  orderBtn.dataset.state = mode;
  orderBtn.textContent = mode === 'random' ? 'RANDOM' : 'NEWEST';
  orderBtn.title = mode === 'random'
    ? 'Random order — click for newest first'
    : 'Newest first — click for random';
}

if (orderBtn) {
  orderBtn.addEventListener('click', () => {
    try { localStorage.setItem(ORDER_KEY, orderMode() === 'random' ? 'newest' : 'random'); } catch {}
    window.location.reload();
  });
}

// ---------- filter banner (multi-chip) ----------

function renderBanner() {
  const filter = getActiveFilter();
  const ratingMin = getActiveRatingMin();
  const total = totalActiveFilterCount(filter, ratingMin);
  if (total === 0) {
    filterBox.hidden = true;
    filterBtnCount.hidden = true;
    filterBtn.classList.remove('aeth-filter-btn--active');
    return;
  }

  filterBox.hidden = false;
  filterBtnCount.hidden = false;
  filterBtnCount.textContent = String(total);
  filterBtn.classList.add('aeth-filter-btn--active');

  filterChips.innerHTML = '';
  const append = (label, kind, onRemove) => {
    const chip = document.createElement('span');
    chip.className = `aeth-filter__chip aeth-filter__chip--${kind}`;
    chip.innerHTML = `<span class="aeth-filter__chip-name">${kind === 'exclude' ? '−' : ''}${escapeHtml(label)}</span>`;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'aeth-filter__chip-x';
    x.setAttribute('aria-label', `Remove filter ${label}`);
    x.textContent = '×';
    x.addEventListener('click', onRemove);
    chip.appendChild(x);
    filterChips.appendChild(chip);
  };
  filter.includes.forEach(n => append(n, 'include', () => removeChip(n, 'include')));
  filter.excludes.forEach(n => append(n, 'exclude', () => removeChip(n, 'exclude')));
  if (ratingMin > 0) {
    append(`★ ${ratingMin}+`, 'include', () => {
      window.location.href = buildGalleryHref(filter, 0);
    });
  }
}

function removeChip(name, kind) {
  const filter = getActiveFilter();
  const ratingMin = getActiveRatingMin();
  if (kind === 'include') filter.includes = filter.includes.filter(n => n !== name);
  else filter.excludes = filter.excludes.filter(n => n !== name);
  window.location.href = buildGalleryHref(filter, ratingMin);
}

if (filterClearAll) {
  filterClearAll.addEventListener('click', () => {
    window.location.href = '/aetherica/';
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- card rendering ----------

function renderCard(img, filter, ratingMin) {
  const a = document.createElement('a');
  a.className = 'aeth-card';
  a.href = buildDetailHref(img.id, filter, ratingMin);
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

// State for the random-order + in-memory pagination model.
// We fetch the full matching set once, shuffle, and reveal in PAGE_SIZE slices.
let shuffledImages = [];
let renderedCount = 0;
let activeFilter = { includes: [], excludes: [] };
let activeRatingMin = 0;

function setLoadMoreVisible(visible) {
  loadMoreWrap.hidden = !visible;
}

// Fisher-Yates in place. Math.random reseeds per page load, so every visit
// to the gallery sees a fresh order.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function load() {
  setState('loading');
  setLoadMoreVisible(false);
  shuffledImages = [];
  renderedCount = 0;
  activeFilter = getActiveFilter();
  activeRatingMin = getActiveRatingMin();

  try {
    const params = new URLSearchParams();
    params.set('limit', '500');
    if (!nsfwOn()) params.set('nsfw', 'off');
    const s = serializeFilter(activeFilter);
    if (s) params.set('tags', s);
    if (activeRatingMin > 0) params.set('rating_min', String(activeRatingMin));

    const res = await fetch(`/api/aetherica/images?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const fetched = data.images || [];
    // Server already returns newest-first; only shuffle in random mode.
    shuffledImages = orderMode() === 'newest' ? fetched : shuffleInPlace(fetched);

    grid.querySelectorAll('.aeth-card').forEach(el => el.remove());

    if (shuffledImages.length === 0) {
      setState('empty');
      return;
    }

    renderSlice();
    setState('ready');
  } catch (err) {
    console.error('[aetherica] failed to load images', err);
    setState('error');
  }
}

// Append the next PAGE_SIZE shuffled images to the grid and toggle the button.
function renderSlice() {
  const next = shuffledImages.slice(renderedCount, renderedCount + PAGE_SIZE);
  if (next.length === 0) {
    setLoadMoreVisible(false);
    return;
  }
  const frag = document.createDocumentFragment();
  next.forEach(img => frag.appendChild(renderCard(img, activeFilter, activeRatingMin)));
  grid.appendChild(frag);
  renderedCount += next.length;
  setLoadMoreVisible(renderedCount < shuffledImages.length);
}

let isLoadingMore = false;
function loadMore() {
  if (isLoadingMore) return;
  if (renderedCount >= shuffledImages.length) return;
  isLoadingMore = true;
  try {
    // No network — slice from the already-shuffled in-memory array.
    renderSlice();
  } finally {
    isLoadingMore = false;
  }
}

// Invisible sentinel at the bottom of the grid — when it scrolls into view
// (with a 400px pre-trigger margin) we reveal the next slice. loadMore()
// itself guards against firing past the end, so no extra checks needed here.
if ('IntersectionObserver' in window && loadMoreWrap) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        loadMore();
      }
    }
  }, { rootMargin: '400px 0px' });
  io.observe(loadMoreWrap);
}

// ---------- filter panel ----------

let allTags = [];        // [{name, count}, ...] from /api/aetherica/tags
let panelState = {};     // {tagName: 'include' | 'exclude'}, derived from URL on open
let panelRatingMin = 0;  // 0 = "Any" (no filter)

function openPanel() {
  panel.hidden = false;
  backdrop.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  // Seed local state from URL each open so the panel always reflects the live filter.
  panelState = {};
  const filter = getActiveFilter();
  filter.includes.forEach(n => { panelState[n] = 'include'; });
  filter.excludes.forEach(n => { panelState[n] = 'exclude'; });
  panelRatingMin = getActiveRatingMin();
  renderPanelList();
  renderPanelRating();
  setTimeout(() => panelSearch?.focus(), 50);
}

function renderPanelRating() {
  if (!panelRating) return;
  panelRating.querySelectorAll('.aeth-filter-panel__rating-pill').forEach(btn => {
    const v = parseInt(btn.dataset.val, 10);
    btn.classList.toggle('aeth-filter-panel__rating-pill--selected', v === panelRatingMin);
  });
}

if (panelRating) {
  panelRating.addEventListener('click', (e) => {
    const btn = e.target.closest('.aeth-filter-panel__rating-pill');
    if (!btn) return;
    const v = parseInt(btn.dataset.val, 10);
    panelRatingMin = (panelRatingMin === v && v !== 0) ? 0 : v;
    renderPanelRating();
  });
}

function closePanel() {
  panel.hidden = true;
  backdrop.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
}

function togglePanel() {
  if (panel.hidden) openPanel();
  else closePanel();
}

filterBtn.addEventListener('click', togglePanel);
panelClose.addEventListener('click', closePanel);
backdrop.addEventListener('click', closePanel);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !panel.hidden) closePanel();
});

// Load all tags once so the panel can show the full set.
async function fetchAllTags() {
  try {
    const res = await fetch('/api/aetherica/tags?limit=500');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allTags = data.tags || [];
  } catch (err) {
    console.error('[aetherica] failed to load tags', err);
    allTags = [];
  }
}

function selectedCountInPanel() {
  return Object.keys(panelState).length;
}

function renderPanelList() {
  panelList.innerHTML = '';
  const query = (panelSearch?.value || '').trim().toLowerCase();

  let visible = allTags;
  if (query) visible = visible.filter(t => t.name.includes(query));

  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'aeth-filter-panel__empty';
    empty.textContent = allTags.length === 0 ? 'No tags yet.' : 'No matches.';
    panelList.appendChild(empty);
    return;
  }

  visible.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aeth-filter-tag';
    const state = panelState[tag.name];
    if (state) btn.dataset.state = state;
    btn.innerHTML = `
      <span class="aeth-filter-tag__name">${escapeHtml(tag.name)}</span>
      <span class="aeth-filter-tag__count">${tag.count}</span>
    `;
    btn.addEventListener('click', () => cycleTagInPanel(tag.name));
    panelList.appendChild(btn);
  });
}

function cycleTagInPanel(name) {
  const current = panelState[name];
  let next;
  if (current === 'include') next = 'exclude';
  else if (current === 'exclude') next = null;
  else next = 'include';

  if (next === null) {
    delete panelState[name];
  } else {
    // Enforce 20-tag cap when adding (cycling off is always allowed).
    if (!current && selectedCountInPanel() >= MAX_FILTER_TAGS) {
      console.warn(`Filter cap reached: ${MAX_FILTER_TAGS} tags`);
      return;
    }
    panelState[name] = next;
  }
  renderPanelList();
}

panelSearch.addEventListener('input', renderPanelList);

panelClear.addEventListener('click', () => {
  panelState = {};
  panelRatingMin = 0;
  renderPanelList();
  renderPanelRating();
});

panelApply.addEventListener('click', () => {
  const includes = [];
  const excludes = [];
  for (const [name, state] of Object.entries(panelState)) {
    if (state === 'include') includes.push(name);
    else if (state === 'exclude') excludes.push(name);
  }
  window.location.href = buildGalleryHref({ includes, excludes }, panelRatingMin);
});

// ---------- init ----------

renderToggle();
renderOrderToggle();
renderBanner();
fetchAllTags(); // fire-and-forget, panel uses it when opened
load();
