/* ============================================
   Pleasure Manor — Main App
   Initialization, age gate, page setup
   ============================================ */

const PM_App = {
  init() {
    this.injectNav();
    this.injectFooter();
    this.setActiveNavLink();
    this.checkAgeGate();
    this.initPage();
    this.initScrollRestore();
  },

  /**
   * Inject nav into page
   */
  injectNav() {
    const navTarget = document.getElementById('nav');
    if (navTarget) {
      navTarget.outerHTML = PM_Components.renderNav();
    }
    this.initSearch();
    this.initUserDropdown();
  },

  /**
   * Search icon expand/collapse
   */
  initSearch() {
    const search = document.querySelector('.nav__search');
    const toggle = document.querySelector('.nav__search-toggle');
    const input = document.querySelector('.nav__search-input');
    if (!search || !toggle || !input) return;

    toggle.addEventListener('click', () => {
      search.classList.add('nav__search--open');
      input.focus();
    });

    // Close on Escape
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        search.classList.remove('nav__search--open');
        input.value = '';
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!search.contains(e.target)) {
        search.classList.remove('nav__search--open');
      }
    });
  },

  /**
   * User dropdown toggle
   */
  initUserDropdown() {
    const toggle = document.getElementById('user-toggle');
    const dropdown = document.getElementById('user-dropdown');
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('nav__dropdown--open');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('nav__dropdown--open');
      }
    });

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.nav__dropdown-item');
      if (item) dropdown.classList.remove('nav__dropdown--open');
    });

    // Logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        // Demo — just reload
        window.location.href = 'index.html';
      });
    }
  },

  /**
   * Inject footer into page
   */
  injectFooter() {
    const footerTarget = document.getElementById('footer');
    if (footerTarget) {
      footerTarget.outerHTML = PM_Components.renderFooter();
    }
  },

  /**
   * Highlight the active nav link based on current page
   */
  setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav__link');

    links.forEach(link => {
      link.classList.remove('nav__link--active');
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('nav__link--active');
      }
    });
  },

  /**
   * Age gate check — show modal if not confirmed
   */
  checkAgeGate() {
    if (localStorage.getItem('pm_age_verified') === 'true') return;

    const gate = document.createElement('div');
    gate.className = 'age-gate';
    gate.innerHTML = `
      <div class="age-gate__box">
        <h1 class="age-gate__title">Welcome to Pleasure Manor</h1>
        <p class="age-gate__text">
          This website contains age-restricted content.
          By entering, you confirm that you are at least 18 years old
          and that viewing adult content is legal in your jurisdiction.
        </p>
        <div class="age-gate__actions">
          <button class="btn btn--primary age-gate__enter" id="age-enter">
            I am 18 or older — Enter
          </button>
          <button class="btn btn--ghost age-gate__leave" id="age-leave">
            Leave
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(gate);
    document.body.style.overflow = 'hidden';

    document.getElementById('age-enter').addEventListener('click', () => {
      localStorage.setItem('pm_age_verified', 'true');
      gate.style.opacity = '0';
      gate.style.transition = 'opacity 0.4s ease';
      setTimeout(() => {
        gate.remove();
        document.body.style.overflow = '';
      }, 400);
    });

    document.getElementById('age-leave').addEventListener('click', () => {
      window.location.href = 'https://google.com';
    });
  },

  /**
   * Save scroll position when clicking a video card, restore on return
   */
  initScrollRestore() {
    const key = 'pm_scroll_' + location.pathname + location.search;

    // Save scroll position when clicking any video card link
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.video-card, .category-card');
      if (card) {
        sessionStorage.setItem(key, window.scrollY);
      }
    });

    // Restore scroll position if returning to this page
    const saved = sessionStorage.getItem(key);
    if (saved !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
      });
      sessionStorage.removeItem(key);
    }
  },

  /**
   * Page-specific initialization based on data attributes
   */
  initPage() {
    const page = document.body.dataset.page;

    switch (page) {
      case 'categories':
        this.initCategoriesPage();
        break;
      case 'category':
        this.initCategoryPage();
        break;
      case 'home':
        this.initHomePage();
        break;
      case 'video':
        this.initVideoPage();
        break;
      case 'profile':
        this.initProfilePage();
        break;
      case 'favorites':
        this.initFavoritesPage();
        break;
      case 'history':
        this.initHistoryPage();
        break;
      case 'settings':
        this.initSettingsPage();
        break;
      case 'legal':
        this.initLegalPage();
        break;
    }
  },

  /**
   * Categories page — render the grid, with straight/gay toggle
   */
  initCategoriesPage() {
    const categoryGrid = document.getElementById('category-grid');
    const gayVideoGrid = document.getElementById('gay-video-grid');
    const toggle = document.getElementById('section-toggle');
    if (!categoryGrid) return;

    // Restore saved section preference
    const saved = localStorage.getItem('pm_section') || 'straight';
    this._setCategoriesSection(saved, categoryGrid, gayVideoGrid, toggle);

    // Toggle click handler
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.section-toggle__btn');
        if (!btn || btn.classList.contains('section-toggle__btn--active')) return;

        const section = btn.dataset.section;
        localStorage.setItem('pm_section', section);
        this._setCategoriesSection(section, categoryGrid, gayVideoGrid, toggle);
      });
    }
  },

  /**
   * Switch categories page between straight (category cards) and gay (video grid)
   */
  _setCategoriesSection(section, categoryGrid, gayVideoGrid, toggle) {
    // Update toggle buttons
    if (toggle) {
      toggle.querySelectorAll('.section-toggle__btn').forEach(btn => {
        btn.classList.toggle('section-toggle__btn--active', btn.dataset.section === section);
      });
    }

    if (section === 'gay') {
      categoryGrid.style.display = 'none';
      if (gayVideoGrid) {
        gayVideoGrid.style.display = '';
        if (gayVideoGrid.children.length === 0) {
          const gayCategory = PM_DATA.getCategoryBySlug('gay');
          if (gayCategory) {
            PM_Components.renderVideoGrid(gayVideoGrid, gayCategory.id);
          }
        }
      }
      const subtitle = document.querySelector('.page-header__subtitle');
      if (subtitle) subtitle.textContent = 'Gay collection';
    } else {
      categoryGrid.style.display = '';
      if (gayVideoGrid) gayVideoGrid.style.display = 'none';
      if (categoryGrid.children.length === 0) {
        PM_Components.renderCategoryGrid(categoryGrid, 'straight');
      }
      const subtitle = document.querySelector('.page-header__subtitle');
      if (subtitle) subtitle.textContent = 'Explore our curated collection';
    }
  },

  /**
   * Category inner page — header, sort bar, video grid
   */
  initCategoryPage() {
    const slug = new URLSearchParams(window.location.search).get('cat');
    const category = PM_DATA.getCategoryBySlug(slug);

    if (!category) {
      document.getElementById('cat-content').innerHTML =
        '<p style="color: var(--color-text-muted); text-align: center; padding: 4rem 0;">Category not found.</p>';
      return;
    }

    // Update page title
    document.title = `${category.name} — Pleasure Manor`;

    // Render header
    const headerTarget = document.getElementById('cat-header');
    if (headerTarget) {
      headerTarget.outerHTML = PM_Components.renderCatHeader(category);
    }

    // Render sort bar
    const sortTarget = document.getElementById('sort-bar');
    if (sortTarget) {
      sortTarget.outerHTML = PM_Components.renderSortBar();
    }

    // Render video grid
    const grid = document.getElementById('video-grid');
    if (grid) {
      PM_Components.renderVideoGrid(grid, category.id);
    }

    // Init sort interactivity
    PM_Components.initSortBar();
  },

  /**
   * Home page — placeholder for now
   */
  initHomePage() {
    const container = document.getElementById('constellation');
    if (container && typeof PM_Constellation !== 'undefined') {
      PM_Constellation.init(container);
    }
  },

  /**
   * Video page — embed player, info, related videos
   */
  initVideoPage() {
    const videoId = new URLSearchParams(window.location.search).get('v');
    const video = PM_DATA.getVideoById(videoId);
    const content = document.getElementById('video-content');

    if (!video || !content) {
      if (content) {
        content.innerHTML =
          '<p style="color: var(--color-text-muted); text-align: center; padding: 4rem 0;">Video not found.</p>';
      }
      return;
    }

    document.title = `${video.title} — Pleasure Manor`;
    content.innerHTML = PM_Components.renderVideoPage(video);

    // Render related videos
    const relatedGrid = document.getElementById('related-grid');
    if (relatedGrid) {
      PM_Components.renderRelatedVideos(relatedGrid, video.id);
    }

    // More dropdown toggle
    const moreToggle = document.getElementById('more-toggle');
    const moreDrop = document.getElementById('more-dropdown');
    if (moreToggle && moreDrop) {
      moreToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDrop.classList.toggle('video-page__dropdown--open');
      });
      document.addEventListener('click', (e) => {
        if (!moreDrop.contains(e.target)) {
          moreDrop.classList.remove('video-page__dropdown--open');
        }
      });
      moreDrop.addEventListener('click', (e) => {
        if (e.target.closest('.video-page__dropdown-item')) {
          moreDrop.classList.remove('video-page__dropdown--open');
        }
      });
    }

    // Track history + init carousel
    this.trackVideoHistory(video.id);
    PM_Components.initHistoryCarousel(video.id);
  },

  /**
   * Track viewed video IDs in localStorage
   */
  trackVideoHistory(videoId) {
    const key = 'pm_history';
    let history = JSON.parse(localStorage.getItem(key) || '[]');
    history = history.filter(id => id !== videoId);
    history.unshift(videoId);
    if (history.length > 20) history.length = 20;
    localStorage.setItem(key, JSON.stringify(history));
  },

  /**
   * History page — videos from localStorage, with clear button
   */
  initHistoryPage() {
    const content = document.getElementById('history-content');
    if (!content) return;

    const historyIds = JSON.parse(localStorage.getItem('pm_history') || '[]');
    const videos = historyIds.map(id => PM_DATA.getVideoById(id)).filter(Boolean);

    content.innerHTML = PM_Components.renderHistoryPage(videos.length);

    const grid = document.getElementById('history-grid');
    const empty = document.getElementById('history-empty');

    const renderGrid = (vids) => {
      grid.innerHTML = '';
      if (vids.length === 0) {
        grid.style.display = 'none';
        empty.style.display = '';
      } else {
        grid.style.display = '';
        empty.style.display = 'none';
        const frag = document.createDocumentFragment();
        vids.forEach(v => frag.appendChild(PM_Components.createVideoCard(v)));
        grid.appendChild(frag);
      }
    };

    renderGrid(videos);

    // Clear history
    const clearBtn = document.getElementById('clear-history');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        localStorage.removeItem('pm_history');
        content.querySelector('.history__count').textContent = '0 videos';
        renderGrid([]);
      });
    }
  },

  /**
   * Favorites page — display "favorited" videos with sorting
   */
  initFavoritesPage() {
    const content = document.getElementById('favorites-content');
    if (!content) return;

    content.innerHTML = PM_Components.renderFavoritesPage();

    // Populate grid with dummy favorites (shuffled subset)
    const grid = document.getElementById('favorites-grid');
    if (grid) {
      const videos = [...PM_DATA.videos]
        .sort(() => Math.random() - 0.5)
        .slice(0, 24);

      const fragment = document.createDocumentFragment();
      videos.forEach(v => fragment.appendChild(PM_Components.createVideoCard(v)));
      grid.appendChild(fragment);

      // Sort bar interactivity
      const sortBar = content.querySelector('.sort-bar');
      if (sortBar) {
        sortBar.addEventListener('click', (e) => {
          const btn = e.target.closest('.sort-bar__btn');
          if (!btn) return;

          sortBar.querySelectorAll('.sort-bar__btn').forEach(b => b.classList.remove('sort-bar__btn--active'));
          btn.classList.add('sort-bar__btn--active');

          let sorted = [...videos];
          switch (btn.dataset.sort) {
            case 'popular': sorted.sort((a, b) => b.views - a.views); break;
            case 'newest': sorted.sort(() => Math.random() - 0.5); break;
            case 'top-rated': sorted.sort((a, b) => b.rating - a.rating); break;
            case 'longest':
              sorted.sort((a, b) => {
                const toSec = d => d.split(':').reduce((m, s) => m * 60 + +s, 0);
                return toSec(b.duration) - toSec(a.duration);
              });
              break;
          }

          grid.innerHTML = '';
          const frag = document.createDocumentFragment();
          sorted.forEach(v => frag.appendChild(PM_Components.createVideoCard(v)));
          grid.appendChild(frag);
        });
      }
    }
  },

  /**
   * Settings page — render form, wire up data actions
   */
  initSettingsPage() {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = PM_Components.renderSettingsPage();

    // Clear history button
    const clearBtn = document.getElementById('settings-clear-history');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        localStorage.removeItem('pm_history');
        clearBtn.textContent = 'Cleared';
        clearBtn.disabled = true;
      });
    }

    // Reset age verification
    const resetBtn = document.getElementById('settings-reset-age');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        localStorage.removeItem('pm_age_verified');
        resetBtn.textContent = 'Done';
        resetBtn.disabled = true;
      });
    }
  },

  /**
   * Legal page — render Terms, Privacy, 2257, or DMCA based on query param
   */
  initLegalPage() {
    const page = new URLSearchParams(window.location.search).get('page') || 'terms';
    const content = document.getElementById('legal-content');
    if (content) {
      content.innerHTML = PM_Components.renderLegalPage(page);
    }

    // Update page title
    const titles = { terms: 'Terms of Service', privacy: 'Privacy Policy', '2257': '18 U.S.C. § 2257', dmca: 'DMCA' };
    document.title = `${titles[page] || 'Legal'} — Pleasure Manor`;
  },

  /**
   * Profile page — user info, stats, recent videos
   */
  initProfilePage() {
    const content = document.getElementById('profile-content');
    if (!content) return;

    content.innerHTML = PM_Components.renderProfilePage();

    // Populate recently watched grid with real history or random videos
    const grid = document.getElementById('profile-recent');
    if (grid) {
      const history = JSON.parse(localStorage.getItem('pm_history') || '[]');
      let videos;

      if (history.length > 0) {
        videos = history
          .map(id => PM_DATA.getVideoById(id))
          .filter(Boolean)
          .slice(0, 4);
      } else {
        videos = PM_DATA.videos
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);
      }

      const fragment = document.createDocumentFragment();
      videos.forEach(v => fragment.appendChild(PM_Components.createVideoCard(v)));
      grid.appendChild(fragment);
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => PM_App.init());
