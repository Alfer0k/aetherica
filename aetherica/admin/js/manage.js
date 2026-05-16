// Admin manage page — list, edit (via redirect to upload form in ?edit mode), delete.

(function () {

  const R2_PUBLIC_URL = 'https://pub-db6629ddb8a843f48242c0317002614e.r2.dev';

  const list      = document.getElementById('adm-list');
  const countSpan = document.getElementById('adm-list-count');
  if (!list) return;

  function setState(state) {
    list.dataset.state = state;
  }

  function thumbUrl(prefix) {
    return `${R2_PUBLIC_URL}/${prefix}/thumb.webp`;
  }

  function formatDate(unix) {
    const d = new Date(unix * 1000);
    return d.toISOString().slice(0, 10);
  }

  function formatBytes(n) {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  // Colour-tier the size badge so heavy images jump out at scan.
  function sizeTier(bytes) {
    if (!bytes) return '';
    if (bytes >= 5 * 1024 * 1024) return 'high';     // > 5 MB total
    if (bytes >= 2 * 1024 * 1024) return 'mid';      // > 2 MB total
    return 'low';
  }

  function formatTags(tags) {
    if (!tags || tags.length === 0) return '<span class="adm-row__tags-empty">— no tags —</span>';
    return tags.map(name => `<span class="adm-tag">${escapeHtml(name)}</span>`).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function renderRow(img) {
    const row = document.createElement('div');
    row.className = 'adm-row';
    row.dataset.id = img.id;

    const title = img.title ? escapeHtml(img.title) : '<span class="adm-row__title-empty">Untitled</span>';

    const badges = [];
    if (typeof img.curator_rating === 'number') {
      badges.push(`<span class="adm-badge adm-badge--rating">★ ${img.curator_rating}/10</span>`);
    }
    if (img.nsfw)     badges.push('<span class="adm-badge adm-badge--nsfw">NSFW</span>');
    if (img.featured) badges.push('<span class="adm-badge adm-badge--featured">★ Featured</span>');
    if (img.total_bytes) {
      badges.push(`<span class="adm-badge adm-badge--size adm-badge--size-${sizeTier(img.total_bytes)}">${formatBytes(img.total_bytes)}</span>`);
    }

    row.innerHTML = `
      <a class="adm-row__thumb" href="/aetherica/admin/?edit=${img.id}" aria-label="Edit image ${img.id}">
        <img src="${thumbUrl(img.r2_prefix)}" alt="" loading="lazy" draggable="false">
      </a>
      <div class="adm-row__body">
        <div class="adm-row__title-row">
          <span class="adm-row__title">${title}</span>
          ${badges.join('')}
        </div>
        <div class="adm-row__tags">${formatTags(img.tags)}</div>
        <div class="adm-row__meta">
          <span>#${img.id}</span>
          <span>·</span>
          <span>${formatDate(img.created_at)}</span>
          <span>·</span>
          <span>${img.likes_count} like${img.likes_count === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div class="adm-row__actions">
        <a class="adm-row__edit"   href="/aetherica/admin/?edit=${img.id}">Edit</a>
        <button type="button" class="adm-row__delete" data-id="${img.id}">Delete</button>
      </div>
    `;

    const deleteBtn = row.querySelector('.adm-row__delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const label = img.title || `image #${img.id}`;
      if (!confirm(`Delete "${label}"? This removes the image from R2 and the database. Cannot be undone.`)) {
        return;
      }
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting…';
      try {
        const res = await fetch(`/api/aetherica/admin/images/${img.id}`, { method: 'DELETE' });
        if (!res.ok) {
          let msg = `Delete failed (${res.status}).`;
          try { const data = await res.json(); if (data?.error) msg = data.error; } catch {}
          alert(msg);
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete';
          return;
        }
        row.remove();
        updateCount(-1);
        // If list is now empty, swap to empty state.
        if (!list.querySelector('.adm-row')) {
          setState('empty');
        }
      } catch (err) {
        alert('Network error during delete.');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
      }
    });

    return row;
  }

  let currentCount = 0;
  function updateCount(delta) {
    currentCount += delta;
    countSpan.textContent = currentCount > 0 ? `${currentCount} image${currentCount === 1 ? '' : 's'}` : '';
  }

  async function load() {
    setState('loading');
    try {
      const res = await fetch('/api/aetherica/admin/images?limit=500');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const images = data.images || [];

      // Wipe any previous rows but keep state divs.
      list.querySelectorAll('.adm-row').forEach(el => el.remove());

      if (images.length === 0) {
        currentCount = 0;
        countSpan.textContent = '';
        setState('empty');
        return;
      }

      const frag = document.createDocumentFragment();
      images.forEach(img => frag.appendChild(renderRow(img)));
      list.appendChild(frag);

      currentCount = images.length;
      countSpan.textContent = `${currentCount} image${currentCount === 1 ? '' : 's'}`;
      setState('ready');
    } catch (err) {
      console.error('[manage] load failed', err);
      setState('error');
    }
  }

  load();

})();
