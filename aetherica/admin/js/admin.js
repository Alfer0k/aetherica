// Admin login + logout + upload glue. Both pages load this file;
// each branch runs only if the matching DOM is present.

(function () {

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
  // Upload page
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

  const MAX_INPUT_BYTES = 30 * 1024 * 1024;
  const THUMB_DIM = 400;
  const MED_DIM   = 1200;
  const WEBP_QUALITY = 0.85;

  let selectedFile = null;
  let loadedImage = null;
  let previewUrl = null;

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
    submitBtn.disabled = !selectedFile;
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
    clearStatus();
    if (!file || !file.type.startsWith('image/')) {
      setStatus('That doesn\'t look like an image file.', 'error');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setStatus(`File is ${formatBytes(file.size)} — max 30 MB.`, 'error');
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

  function resizeToWebp(img, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
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

  // Drag-drop
  ['dragenter', 'dragover'].forEach(evt => {
    drop.addEventListener(evt, (e) => {
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
    const file = e.dataTransfer?.files?.[0];
    if (file) selectFile(file);
  });

  // Click to pick (but not when clicking the X button)
  drop.addEventListener('click', (e) => {
    if (e.target === clearBtn || clearBtn.contains(e.target)) return;
    if (!selectedFile) fileInput.click();
  });
  drop.addEventListener('keydown', (e) => {
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
    resetSelection();
    clearStatus();
  });

  // Submit
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile || !loadedImage) return;

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;

    try {
      setStatus('Resizing…', 'info');
      const [thumb, med, full] = await Promise.all([
        resizeToWebp(loadedImage, THUMB_DIM, WEBP_QUALITY),
        resizeToWebp(loadedImage, MED_DIM,   WEBP_QUALITY),
        resizeToWebp(loadedImage, Infinity,  WEBP_QUALITY),
      ]);

      setStatus(`Uploading… (thumb ${formatBytes(thumb.size)}, med ${formatBytes(med.size)}, full ${formatBytes(full.size)})`, 'info');
      submitBtn.textContent = 'Uploading…';

      const form = new FormData();
      form.append('thumb', thumb, 'thumb.webp');
      form.append('med',   med,   'med.webp');
      form.append('full',  full,  'full.webp');
      form.append('title',      titleInput.value.trim());
      form.append('source_url', sourceInput.value.trim());
      form.append('tags',       tagsInput.value);
      form.append('nsfw',       nsfwInput.checked     ? '1' : '0');
      form.append('featured',   featuredInput.checked ? '1' : '0');

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

      // Reset for next upload, but keep last-used tags for quick repeat.
      resetSelection();
      titleInput.value = '';
      sourceInput.value = '';
      featuredInput.checked = false;
      // nsfw stays as-is — usually the curator runs in batches of similar NSFW state.
      // tags stay as-is for same reason.

    } catch (err) {
      setStatus(err.message || 'Something went wrong.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      setSubmitEnabled();
    }
  });

})();
