// Admin login + logout glue. Both pages load this script; each branch
// runs only if the matching DOM is present.

(function () {

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
      } catch (err) {
        showError('Network error. Try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        passwordInput.focus();
        passwordInput.select();
      }
    });
  }

  const logoutBtn = document.getElementById('adm-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        await fetch('/api/aetherica/admin/logout', { method: 'POST' });
      } catch { /* ignore — we redirect either way */ }
      window.location.href = '/aetherica/admin/login.html';
    });
  }

})();
