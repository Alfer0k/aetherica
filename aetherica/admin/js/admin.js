// Admin login + logout + upload + edit glue. All pages load this file;
// each branch runs only if the matching DOM is present.

/* global Tagify */

(function () {

  const R2_PUBLIC_URL = 'https://pub-db6629ddb8a843f48242c0317002614e.r2.dev';

  // ============================================================
  // Login page
  // ============================================================

  const loginForm = document.getElementById('adm-login-form');
  if (loginForm) {
    const passwordInput = document.getElementById('adm-login-password');
    const submitBtn = document.getElementById('adm-login-submit');
    const errorBox = document.getElementById('adm-login-error');

    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }
    function clearError() {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const password = passwordInput.value;
      if (!password) {
        showError('Enter the password.');
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Signing in…';

      try {
        const res = await fetch('/api/aetherica/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          window.location.href = '/aetherica/admin/';
          return;
        }

        let msg = 'Sign in failed.';
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch { /* ignore */ }
        showError(msg);
      } catch {
        showError('Network error. Try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        passwordInput.focus();
        passwordInput.select();
      }
    });
  }

  // ============================================================
  // Logout button (shared by all post-login pages)
  // ============================================================

  const logoutBtn = document.getElementById('adm-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        await fetch('/api/aetherica/admin/logout', { method: 'POST' });
      } catch { /* redirect anyway */ }
      window.location.href = '/aetherica/admin/login';
    });
  }

  // ============================================================
  // Upload / edit page (same form, mode driven by ?edit=ID)
  // ============================================================

  const uploadForm = document.getElementById('adm-upload-form');
  if (!uploadForm) return;

  const drop          = document.getElementById('adm-drop');
  const fileInput     = document.getElementById('adm-file');
  const emptyState    = document.getElementById('adm-drop-empty');
  const previewBox    = document.getElementById('adm-drop-preview');
  const previewImg    = document.getElementById('adm-preview-img');
  const previewMeta   = document.getElementById('adm-drop-meta');
  const clearBtn      = document.getElementById('adm-drop-clear');
  const titleInput    = document.getElementById('adm-title');
  const sourceInput   = document.getElementById('adm-source');
  const tagsInput     = document.getElementById('adm-tags');
  const nsfwInput     = document.getElementById('adm-nsfw');
  const featuredInput = document.getElementById('adm-featured');
  const statusBox     = document.getElementById('adm-upload-status');
  const submitBtn     = document.getElementById('adm-upload-submit');
  const pageTitle     = document.getElementById('adm-page-title');
  const cancelLink    = document.getElementById('adm-edit-cancel');
  const overlay       = document.getElementById('adm-overlay');
  const overlayLabel  = document.getElementById('adm-overlay-label');

  function showOverlay(label) {
    if (!overlay) return;
    if (label && overlayLabel) overlayLabel.textContent = label;
    overlay.hidden = false;
  }
  function hideOverlay() {
    if (!overlay) return;
    overlay.hidden = true;
  }

  const MAX_INPUT_BYTES = 10 * 1024 * 1024;
  const IMAGE_EXT_RE = /\.(jpe?g|jfif|png|webp|gif|bmp|avif)$/i;

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    // Some browsers (esp. Windows + .jfif) report an empty `type`. Fall back
    // to the filename extension so the curator isn't blocked on plausible
    // image files just because the OS didn't tag them with a MIME type.
    return IMAGE_EXT_RE.test(file.name || '');
  }
  // Thumb: width-based — the gallery is a 3-col masonry where the column
  // width (not the longest side) is what determines display size. 800px wide
  // covers 440px CSS columns at 2x retina with headroom.
  const THUMB_WIDTH = 800;
  // Med: longest-side — the detail page constrains both width and height
  // (max-width: 100%, max-height: calc(100vh - 220px)), so longest-side
  // resize is the right shape. 2000 covers 2x retina at typical viewports.
  const MED_DIM     = 2000;
  const WEBP_QUALITY = 0.85;
  const MAX_TAGS_PER_IMAGE = 30; // matches server-side cap in _lib/tags.js

  // Tagify on the tag input — autocomplete from existing tags, chip-style entry.
  // Output stays as comma-separated string in tagsInput.value so FormData picks
  // it up and the server's parseTags works unchanged.
  const tagify = new Tagify(tagsInput, {
    delimiters: ',',
    maxTags: MAX_TAGS_PER_IMAGE,
    whitelist: [],
    dropdown: {
      enabled: 1,
      closeOnSelect: false,
      maxItems: 10,
      fuzzySearch: true,
      classname: 'aeth-tagify-dropdown',
    },
    originalInputValueFormat: arr => arr.map(t => t.value).join(','),
    transformTag: data => { data.value = data.value.trim().toLowerCase(); },
  });

  // Load existing tags once for autocomplete. Single fetch — for our scale
  // (<200 tags realistic), it's faster than per-keystroke queries.
  fetch('/api/aetherica/tags?limit=500')
    .then(r => r.ok ? r.json() : { tags: [] })
    .then(data => {
      tagify.whitelist = (data.tags || []).map(t => t.name);
    })
    .catch(() => { /* dropdown just won't autocomplete; manual entry still works */ });

  let selectedFile = null;
  let loadedImage = null;
  let previewUrl = null;
  // Hard guard against double-submission. The disabled-button check isn't
  // reliable across all paths (Enter key, queued clicks, drag during upload).
  // This flag is set synchronously at the top of the submit handler and
  // cleared only in `finally`, so a second submit can never overlap.
  let isUploading = false;

  // Edit mode state — set by initEditMode() if ?edit=ID present.
  const editId = (() => {
    const id = new URLSearchParams(window.location.search).get('edit');
    const n = id ? parseInt(id, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const isEditMode = editId !== null;

  function setStatus(msg, kind) {
    statusBox.hidden = false;
    statusBox.dataset.kind = kind || '';
    statusBox.textContent = msg;
  }
  function clearStatus() {
    statusBox.hidden = true;
    statusBox.dataset.kind = '';
    statusBox.textContent = '';
  }

  function setSubmitEnabled() {
    if (isEditMode) {
      // In edit mode the image is fixed; submit just needs at least one field present.
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = !selectedFile;
    }
  }

  function resetSelection() {
    selectedFile = null;
    loadedImage = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    previewImg.src = '';
    previewMeta.textContent = '';
    emptyState.hidden = false;
    previewBox.hidden = true;
    fileInput.value = '';
    setSubmitEnabled();
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => resolve({ img, url });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not decode image.'));
      };
      img.src = url;
    });
  }

  async function selectFile(file) {
    if (isEditMode) return; // image is locked in edit mode
    if (isUploading) return; // don't allow swapping the staged file mid-upload
    clearStatus();
    if (!isImageFile(file)) {
      setStatus('That doesn\'t look like an image file.', 'error');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setStatus(`File is ${formatBytes(file.size)} — max 10 MB.`, 'error');
      return;
    }

    try {
      const { img, url } = await loadImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      selectedFile = file;
      loadedImage = img;
      previewUrl = url;
      previewImg.src = url;
      previewMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight} · ${formatBytes(file.size)}`;
      emptyState.hidden = true;
      previewBox.hidden = false;
      setSubmitEnabled();
    } catch (err) {
      setStatus(err.message || 'Could not load the image.', 'error');
    }
  }

  // Width-based resize: constrain the WIDTH to target, height scales proportionally,
  // never upscale beyond the source. Use this for thumbs in the masonry layout.
  function resizeByWidth(img, targetWidth, quality) {
    const ratio = Math.min(targetWidth / img.naturalWidth, 1);
    return encodeAtRatio(img, ratio, quality);
  }

  // Longest-side resize: constrain so neither dimension exceeds maxDim, never
  // upscale. Use this for med (detail page) and full (no shrink, just transcode).
  function resizeByMaxDim(img, maxDim, quality) {
    const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
    return encodeAtRatio(img, ratio, quality);
  }

  function encodeAtRatio(img, ratio, quality) {
    return new Promise((resolve, reject) => {
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) reject(new Error('Browser failed to encode WebP.'));
        else resolve(blob);
      }, 'image/webp', quality);
    });
  }

  // Drag-drop wiring (no-ops in edit mode)
  ['dragenter', 'dragover'].forEach(evt => {
    drop.addEventListener(evt, (e) => {
      if (isEditMode) return;
      e.preventDefault();
      drop.classList.add('adm-drop--over');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    drop.addEventListener(evt, (e) => {
      e.preventDefault();
      drop.classList.remove('adm-drop--over');
    });
  });
  drop.addEventListener('drop', (e) => {
    if (isEditMode) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) selectFile(file);
  });

  drop.addEventListener('click', (e) => {
    if (isEditMode) return;
    if (e.target === clearBtn || clearBtn.contains(e.target)) return;
    if (!selectedFile) fileInput.click();
  });
  drop.addEventListener('keydown', (e) => {
    if (isEditMode) return;
    if ((e.key === 'Enter' || e.key === ' ') && !selectedFile) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isEditMode) return; // clear is hidden in edit mode anyway
    resetSelection();
    clearStatus();
  });

  // ----- Submit -----

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isEditMode) {
      return submitEdit();
    }
    return submitCreate();
  });

  async function submitCreate() {
    if (isUploading) return;
    if (!selectedFile || !loadedImage) return;

    isUploading = true;
    submitBtn.disabled = true;
    showOverlay('Preparing…');
    const originalText = submitBtn.textContent;

    // Snapshot the staged file refs at submit time so a stray selectFile()
    // call mid-upload can't poison the metadata fields below.
    const fileForUpload = selectedFile;
    const imageForUpload = loadedImage;

    try {
      // GIFs keep their original bytes for the `full` size so animation survives.
      // Static images go through the canvas WebP pipeline for all three sizes.
      const isGif = (fileForUpload.type === 'image/gif') ||
                    /\.gif$/i.test(fileForUpload.name || '');

      setStatus('Resizing…', 'info');
      showOverlay('Resizing…');

      const thumb = await resizeByWidth(imageForUpload, THUMB_WIDTH, WEBP_QUALITY);
      let med  = null;
      let full;
      let fullFormat;
      if (isGif) {
        // Skip med entirely — detail page will use full.gif so the animation plays.
        full = fileForUpload;
        fullFormat = 'gif';
      } else {
        [med, full] = await Promise.all([
          resizeByMaxDim(imageForUpload, MED_DIM,    WEBP_QUALITY),
          resizeByMaxDim(imageForUpload, Infinity,   WEBP_QUALITY),
        ]);
        fullFormat = 'webp';
      }

      const sizeLine = isGif
        ? `Uploading… (thumb ${formatBytes(thumb.size)}, full GIF ${formatBytes(full.size)})`
        : `Uploading… (thumb ${formatBytes(thumb.size)}, med ${formatBytes(med.size)}, full ${formatBytes(full.size)})`;
      setStatus(sizeLine, 'info');
      showOverlay('Uploading…');
      submitBtn.textContent = 'Uploading…';

      const form = new FormData();
      form.append('thumb', thumb, 'thumb.webp');
      if (med) form.append('med', med, 'med.webp');
      form.append('full',  full,  isGif ? 'full.gif' : 'full.webp');
      form.append('full_format', fullFormat);
      form.append('title',      titleInput.value.trim());
      form.append('source_url', sourceInput.value.trim());
      form.append('tags',       tagsInput.value);
      form.append('nsfw',       nsfwInput.checked     ? '1' : '0');
      form.append('featured',   featuredInput.checked ? '1' : '0');
      form.append('width',      String(imageForUpload.naturalWidth));
      form.append('height',     String(imageForUpload.naturalHeight));

      const res = await fetch('/api/aetherica/admin/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        let msg = `Upload failed (${res.status}).`;
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch {}
        setStatus(msg, 'error');
        return;
      }

      const data = await res.json();
      setStatus(`Added image #${data.id}. Tags: ${data.tags}.`, 'success');

      // Only reset if the staged file is still the one we just uploaded
      // (i.e. nothing else got staged in the meantime — selectFile is gated
      // by isUploading so this should always hold, but it's cheap to verify).
      if (selectedFile === fileForUpload) {
        resetSelection();
        titleInput.value = '';
        sourceInput.value = '';
        featuredInput.checked = false;
        // nsfw + tags stay as-is for fast batch repeats
      }

    } catch (err) {
      setStatus(err.message || 'Something went wrong.', 'error');
    } finally {
      isUploading = false;
      hideOverlay();
      submitBtn.textContent = originalText;
      setSubmitEnabled();
    }
  }

  async function submitEdit() {
    if (isUploading) return;
    isUploading = true;
    submitBtn.disabled = true;
    showOverlay('Saving…');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving…';
    setStatus('Saving…', 'info');

    try {
      const body = {
        title:      titleInput.value.trim(),
        source_url: sourceInput.value.trim(),
        tags:       tagsInput.value,
        nsfw:       nsfwInput.checked,
        featured:   featuredInput.checked,
      };

      const res = await fetch(`/api/aetherica/admin/images/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = `Save failed (${res.status}).`;
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch {}
        setStatus(msg, 'error');
        return;
      }

      setStatus('Saved. Returning to list…', 'success');
      window.location.href = '/aetherica/admin/manage';

    } catch (err) {
      setStatus(err.message || 'Something went wrong.', 'error');
    } finally {
      isUploading = false;
      hideOverlay();
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // ----- Edit-mode init -----

  async function initEditMode() {
    if (!isEditMode) return;

    uploadForm.dataset.mode = 'edit';
    pageTitle.textContent = `Edit image #${editId}`;
    submitBtn.textContent = 'Save changes';
    cancelLink.hidden = false;
    clearBtn.hidden = true; // can't change the image in edit mode

    setStatus('Loading…', 'info');

    try {
      const res = await fetch(`/api/aetherica/admin/images/${editId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setStatus('Image not found. Returning to list…', 'error');
          setTimeout(() => { window.location.href = '/aetherica/admin/manage'; }, 1500);
        } else {
          setStatus(`Couldn't load image (${res.status}).`, 'error');
        }
        return;
      }
      const data = await res.json();
      const img = data.image;

      titleInput.value      = img.title      || '';
      sourceInput.value     = img.source_url || '';
      nsfwInput.checked     = !!img.nsfw;
      featuredInput.checked = !!img.featured;

      // Tagify owns the tag input — push tags through its API, not the raw element.
      tagify.removeAllTags();
      if (img.tags && img.tags.length) tagify.addTags(img.tags);

      // Show existing image in the drop zone (med size, no need to load full).
      previewImg.src = `${R2_PUBLIC_URL}/${img.r2_prefix}/med.webp`;
      previewMeta.textContent = img.title ? `#${img.id} · ${img.title}` : `#${img.id}`;
      emptyState.hidden = true;
      previewBox.hidden = false;

      clearStatus();
      setSubmitEnabled();

    } catch (err) {
      setStatus('Network error loading image.', 'error');
    }
  }

  initEditMode();

})();
