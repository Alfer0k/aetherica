/* ============================================
   Pleasure Manor — UI Components
   Rendering functions for cards, grids, nav
   ============================================ */

const PM_Components = {

  /**
   * Render a single category card with thumbnail cycling on hover
   */
  createCategoryCard(category) {
    const card = document.createElement('a');
    card.className = 'category-card';
    card.href = `category.html?cat=${category.slug}`;
    card.setAttribute('data-category', category.id);

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'category-card__thumb-wrap';

    if (category.thumbs.length > 0) {
      // Random starting thumbnail
      const startIndex = Math.floor(Math.random() * category.thumbs.length);

      // Create all thumbnail images (stacked, random one visible)
      category.thumbs.forEach((thumb, i) => {
        const img = document.createElement('img');
        img.className = 'category-card__thumb' + (i === startIndex ? ' category-card__thumb--active' : '');
        img.src = PM_DATA.getThumbUrl(category.folder, thumb);
        img.alt = category.name;
        img.loading = 'lazy';
        img.draggable = false;
        thumbWrap.appendChild(img);
      });

      // Progress dots
      if (category.thumbs.length > 1) {
        const dots = document.createElement('div');
        dots.className = 'category-card__dots';
        category.thumbs.forEach((_, i) => {
          const dot = document.createElement('span');
          dot.className = 'category-card__dot' + (i === startIndex ? ' category-card__dot--active' : '');
          dots.appendChild(dot);
        });
        thumbWrap.appendChild(dots);
      }

      // Store starting index on the element for cycling logic
      card._thumbIndex = startIndex;
    } else {
      // Placeholder for categories without thumbnails
      const placeholder = document.createElement('div');
      placeholder.className = 'category-card__placeholder';
      placeholder.textContent = category.name;
      thumbWrap.appendChild(placeholder);
    }

    // Gradient overlay
    const overlay = document.createElement('div');
    overlay.className = 'category-card__overlay';
    thumbWrap.appendChild(overlay);

    // Info bar
    const info = document.createElement('div');
    info.className = 'category-card__info';

    const name = document.createElement('span');
    name.className = 'category-card__name';
    name.textContent = category.name;

    const count = document.createElement('span');
    count.className = 'category-card__count';
    count.textContent = `${category.videoCount} videos`;

    info.appendChild(name);
    info.appendChild(count);
    thumbWrap.appendChild(info);

    card.appendChild(thumbWrap);

    // Hover thumbnail cycling
    if (category.thumbs.length > 1) {
      this._attachThumbCycling(card, category.thumbs.length);
    }

    return card;
  },

  /**
   * Attach thumbnail cycling to a card:
   * - Ambient: slow, random interval (4-8s), runs always
   * - Hover: fast (1.2s), overrides ambient while hovering
   */
  _attachThumbCycling(card, thumbCount) {
    let currentIndex = card._thumbIndex || 0;
    let ambientTimeout = null;
    let hoverInterval = null;
    let isHovering = false;

    const setActive = (index) => {
      const thumbs = card.querySelectorAll('.category-card__thumb');
      const dots = card.querySelectorAll('.category-card__dot');

      thumbs[currentIndex]?.classList.remove('category-card__thumb--active');
      dots[currentIndex]?.classList.remove('category-card__dot--active');

      currentIndex = index;

      thumbs[currentIndex]?.classList.add('category-card__thumb--active');
      dots[currentIndex]?.classList.add('category-card__dot--active');
    };

    const nextThumb = () => {
      setActive((currentIndex + 1) % thumbCount);
    };

    // Ambient cycling — random delay so cards don't swap in sync
    const scheduleAmbient = () => {
      const delay = 1000 + Math.random() * 10000; // 1-13 seconds
      ambientTimeout = setTimeout(() => {
        if (!isHovering) {
          nextThumb();
        }
        scheduleAmbient();
      }, delay);
    };

    // Start ambient with a staggered initial delay (0-6s)
    setTimeout(scheduleAmbient, Math.random() * 2000);

    // Hover — fast cycling
    card.addEventListener('mouseenter', () => {
      isHovering = true;
      hoverInterval = setInterval(nextThumb, 1200);
    });

    card.addEventListener('mouseleave', () => {
      isHovering = false;
      clearInterval(hoverInterval);
      hoverInterval = null;
    });

    // Cleanup reference
    card._cleanupCycling = () => {
      clearTimeout(ambientTimeout);
      clearInterval(hoverInterval);
    };
  },

  /**
   * Render the full category grid into a container
   */
  renderCategoryGrid(container, section = 'straight') {
    // Cleanup any existing cycling intervals
    container.querySelectorAll('.category-card').forEach(card => {
      if (card._cleanupCycling) card._cleanupCycling();
    });

    const categories = PM_DATA.getCategoriesBySection(section);
    const fragment = document.createDocumentFragment();

    categories.forEach(cat => {
      fragment.appendChild(this.createCategoryCard(cat));
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  },

  /**
   * Create a single video card
   */
  createVideoCard(video) {
    const card = document.createElement('a');
    card.className = 'video-card';
    card.href = `video.html?v=${video.id}`;
    card.setAttribute('data-video', video.id);

    // Thumbnail wrap
    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'video-card__thumb-wrap';

    const img = document.createElement('img');
    img.className = 'video-card__thumb';
    img.src = PM_DATA.getVideoThumbUrl(video);
    img.alt = video.title;
    img.loading = 'lazy';
    img.draggable = false;
    thumbWrap.appendChild(img);

    // Duration badge
    const duration = document.createElement('span');
    duration.className = 'video-card__duration';
    duration.textContent = video.duration;
    thumbWrap.appendChild(duration);

    // Quality badge
    if (video.quality) {
      const quality = document.createElement('span');
      const qClass = video.quality === '4K' ? '4k' : video.quality === 'FHD' ? 'fhd' : 'hd';
      quality.className = `video-card__quality video-card__quality--${qClass}`;
      quality.textContent = video.quality;
      thumbWrap.appendChild(quality);
    }

    card.appendChild(thumbWrap);

    // Body
    const body = document.createElement('div');
    body.className = 'video-card__body';

    const title = document.createElement('h3');
    title.className = 'video-card__title';
    title.textContent = video.title;
    body.appendChild(title);

    // Meta row
    const meta = document.createElement('div');
    meta.className = 'video-card__meta';

    const views = document.createElement('span');
    views.className = 'video-card__views';
    views.textContent = PM_DATA.formatViews(video.views) + ' views';
    meta.appendChild(views);

    // Rating bar
    const ratingWrap = document.createElement('span');
    ratingWrap.className = 'video-card__rating';

    const ratingBar = document.createElement('span');
    ratingBar.className = 'video-card__rating-bar';

    const ratingFill = document.createElement('span');
    const ratingLevel = video.rating >= 90 ? 'high' : video.rating >= 70 ? 'mid' : 'low';
    ratingFill.className = `video-card__rating-fill video-card__rating-fill--${ratingLevel}`;
    ratingFill.style.width = video.rating + '%';

    ratingBar.appendChild(ratingFill);
    ratingWrap.appendChild(ratingBar);

    const ratingText = document.createElement('span');
    ratingText.textContent = video.rating + '%';
    ratingWrap.appendChild(ratingText);

    meta.appendChild(ratingWrap);
    body.appendChild(meta);

    card.appendChild(body);
    return card;
  },

  /**
   * Render category inner page header
   */
  renderCatHeader(category) {
    return `
      <div class="cat-header">
        <div class="cat-header__top">
          <a href="categories.html" class="cat-header__back" aria-label="Back to categories">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <h1 class="cat-header__title">${category.name} <span class="cat-header__count">(${category.videoCount})</span></h1>
        </div>
      </div>
    `;
  },

  /**
   * Render sort bar
   */
  renderSortBar() {
    return `
      <div class="sort-bar">
        <button class="sort-bar__btn sort-bar__btn--active" data-sort="popular">Most Viewed</button>
        <button class="sort-bar__btn" data-sort="newest">Newest</button>
        <button class="sort-bar__btn" data-sort="top-rated">Top Rated</button>
        <button class="sort-bar__btn" data-sort="longest">Longest</button>
      </div>
    `;
  },

  /**
   * Render video grid for a category
   */
  renderVideoGrid(container, categoryId) {
    const videos = PM_DATA.getVideosByCategory(categoryId);
    const fragment = document.createDocumentFragment();

    videos.forEach(video => {
      fragment.appendChild(this.createVideoCard(video));
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  },

  /**
   * Initialize sort bar interactivity
   */
  initSortBar() {
    const sortBar = document.querySelector('.sort-bar');
    if (!sortBar) return;

    sortBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.sort-bar__btn');
      if (!btn) return;

      sortBar.querySelectorAll('.sort-bar__btn').forEach(b => b.classList.remove('sort-bar__btn--active'));
      btn.classList.add('sort-bar__btn--active');

      // Sort logic (demo — re-renders with sorted data)
      const grid = document.getElementById('video-grid');
      const slug = new URLSearchParams(window.location.search).get('cat');
      const category = PM_DATA.getCategoryBySlug(slug);
      if (!grid || !category) return;

      let videos = PM_DATA.getVideosByCategory(category.id);
      const sort = btn.dataset.sort;

      switch (sort) {
        case 'popular': videos.sort((a, b) => b.views - a.views); break;
        case 'newest': videos.sort(() => Math.random() - 0.5); break; // Demo: random shuffle
        case 'top-rated': videos.sort((a, b) => b.rating - a.rating); break;
        case 'longest':
          videos.sort((a, b) => {
            const toSec = d => d.split(':').reduce((m, s) => m * 60 + +s, 0);
            return toSec(b.duration) - toSec(a.duration);
          });
          break;
      }

      const fragment = document.createDocumentFragment();
      videos.forEach(v => fragment.appendChild(this.createVideoCard(v)));
      grid.innerHTML = '';
      grid.appendChild(fragment);
    });
  },

  /**
   * Render the full video page content
   */
  renderVideoPage(video) {
    // Get primary category for back link
    const catId = video.categories[0];
    const category = PM_DATA.getCategoryBySlug(catId) || PM_DATA.categories.find(c => c.id === catId);

    // Player — iframe or placeholder
    const player = video.embedUrl
      ? `<iframe src="${video.embedUrl}" frameborder="0" allowfullscreen></iframe>`
      : `<div class="video-player__placeholder">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
           <span>Embed not available</span>
         </div>`;

    // Showcase tags
    const showcaseTags = ['amateur', 'blowjob', 'cumshot', 'deepthroat', 'facial', 'milf', 'orgasm', 'pov', 'rough', 'squirt'];
    const tags = showcaseTags.map(t =>
      `<a href="#" class="video-page__tag">${t}</a>`
    ).join('');

    // Fake "added" date
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const addedText = daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;

    // Back link — gay videos go back to categories page (toggle view), not category inner page
    const isGay = category && category.section === 'gay';
    const backHref = isGay ? 'categories.html' : (category ? `category.html?cat=${category.slug}` : 'categories.html');
    const backLabel = isGay ? 'Categories' : (category ? category.name : 'Categories');

    return `
      <div class="video-page">
        <div class="video-page__nav-row">
          <a href="${backHref}" class="video-page__back">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </a>
          <a href="${backHref}" class="video-page__category-label">${backLabel}</a>
        </div>

        <div class="video-player">
          ${player}
        </div>

        <div class="video-page__info">
          <div class="video-page__title-row">
            <h1 class="video-page__title">${video.title}</h1>
            <div class="video-page__actions">
              <button class="video-page__action" type="button" title="Like">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
              </button>
              <button class="video-page__action" type="button" title="Favorite">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
              <div class="video-page__more-wrap">
                <button class="video-page__action" type="button" title="More" id="more-toggle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
                <div class="video-page__dropdown" id="more-dropdown">
                  <a href="#" class="video-page__dropdown-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    Share
                  </a>
                  <a href="#" class="video-page__dropdown-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </a>
                  <a href="#" class="video-page__dropdown-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Add to Playlist
                  </a>
                  <div class="video-page__dropdown-divider"></div>
                  <a href="#" class="video-page__dropdown-item video-page__dropdown-item--danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Report
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div class="video-page__meta">
            <span class="video-page__views">${PM_DATA.formatViews(video.views)} views</span>
            <span class="video-page__separator">|</span>
            <span class="video-page__date">${addedText}</span>
          </div>

          <div class="video-page__tags">${tags}</div>
        </div>

        <div class="video-page__related">
          <h2 class="video-page__related-title">More Videos</h2>
          <div id="related-grid" class="video-grid"></div>
        </div>

        <div class="video-page__history" id="history-section" style="display:none">
          <h2 class="video-page__history-title">Recently Viewed</h2>
          <div class="splide" id="history-carousel">
            <div class="splide__track">
              <ul class="splide__list" id="history-slides"></ul>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render related videos grid (all videos, shuffled, exclude current)
   */
  renderRelatedVideos(container, currentVideoId) {
    const videos = PM_DATA.videos
      .filter(v => v.id !== currentVideoId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    const fragment = document.createDocumentFragment();
    videos.forEach(v => fragment.appendChild(this.createVideoCard(v)));
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  /**
   * Populate and init the Recently Viewed carousel
   */
  initHistoryCarousel(currentVideoId) {
    const history = JSON.parse(localStorage.getItem('pm_history') || '[]');
    const historyVideos = history
      .filter(id => id !== currentVideoId)
      .map(id => PM_DATA.getVideoById(id))
      .filter(Boolean);

    // Pad with random videos if history is thin
    const usedIds = new Set(historyVideos.map(v => v.id));
    usedIds.add(currentVideoId);
    const filler = PM_DATA.videos
      .filter(v => !usedIds.has(v.id))
      .sort(() => Math.random() - 0.5);

    const videos = [...historyVideos, ...filler].slice(0, 15);
    if (videos.length < 2) return;

    const section = document.getElementById('history-section');
    const list = document.getElementById('history-slides');
    if (!section || !list) return;

    section.style.display = '';

    videos.forEach(video => {
      const li = document.createElement('li');
      li.className = 'splide__slide';
      li.appendChild(this.createVideoCard(video));
      list.appendChild(li);
    });

    new Splide('#history-carousel', {
      type: 'slide',
      perPage: 5,
      gap: '1rem',
      pagination: false,
      arrows: false,
      drag: 'free',
      breakpoints: {
        1400: { perPage: 4 },
        1024: { perPage: 3 },
        768: { perPage: 2 },
      }
    }).mount();
  },

  /**
   * Render the navigation bar — single row:
   * [logo] [links] ... [search icon] [user icon]
   * Search expands left on click.
   */
  renderNav() {
    return `
      <nav class="nav">
        <div class="nav__inner">
          <a href="index.html" class="nav__brand">
            <div class="nav__logo-placeholder">P</div>
            <span class="nav__title">Pleasure Manor</span>
          </a>

          <div class="nav__links">
            <a href="index.html" class="nav__link">Home</a>
            <a href="categories.html" class="nav__link">Categories</a>
            <a href="aetherica/" class="nav__link">Aetherica</a>
          </div>

          <div class="nav__actions">
            <div class="nav__search">
              <button class="nav__search-toggle" type="button" aria-label="Search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <div class="nav__search-panel">
                <input type="text" class="nav__search-input" placeholder="Search videos, categories...">
              </div>
            </div>
            <div class="nav__user">
              <button class="nav__profile" type="button" title="DarkVoyager" id="user-toggle">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=DarkVoyager&backgroundColor=8b1a2b" alt="DarkVoyager" class="nav__avatar-img">
              </button>
              <div class="nav__dropdown" id="user-dropdown">
                <div class="nav__dropdown-header">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=DarkVoyager&backgroundColor=8b1a2b" alt="" class="nav__dropdown-avatar">
                  <div>
                    <div class="nav__dropdown-name">DarkVoyager</div>
                    <div class="nav__dropdown-email">Member since Dec 2025</div>
                  </div>
                </div>
                <div class="nav__dropdown-divider"></div>
                <a href="profile.html" class="nav__dropdown-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile
                </a>
                <a href="favorites.html" class="nav__dropdown-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Favorites
                </a>
                <a href="history.html" class="nav__dropdown-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  History
                </a>
                <a href="settings.html" class="nav__dropdown-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  Settings
                </a>
                <div class="nav__dropdown-divider"></div>
                <button class="nav__dropdown-item nav__dropdown-item--danger" type="button" id="logout-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    `;
  },

  /**
   * Render profile page — user info, stats, recent activity
   */
  renderProfilePage() {
    const history = JSON.parse(localStorage.getItem('pm_history') || '[]');
    const watchedCount = history.length;

    return `
      <div class="profile">
        <div class="profile__header">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=DarkVoyager&backgroundColor=8b1a2b" alt="DarkVoyager" class="profile__avatar">
          <div class="profile__info">
            <h1 class="profile__name">DarkVoyager</h1>
            <p class="profile__joined">Member since December 2025</p>
            <p class="profile__bio">Just exploring the manor. Night owl. Prefers quality over quantity.</p>
          </div>
          <a href="settings.html" class="btn btn--ghost profile__edit-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Settings
          </a>
        </div>

        <div class="profile__stats">
          <div class="profile__stat">
            <span class="profile__stat-value">${watchedCount}</span>
            <span class="profile__stat-label">Watched</span>
          </div>
          <div class="profile__stat">
            <span class="profile__stat-value">24</span>
            <span class="profile__stat-label">Favorites</span>
          </div>
          <div class="profile__stat">
            <span class="profile__stat-value">47h</span>
            <span class="profile__stat-label">Watch Time</span>
          </div>
        </div>

        <div class="profile__section">
          <div class="profile__section-header">
            <h2 class="profile__section-title">Recently Watched</h2>
            <a href="history.html" class="profile__section-link">View All</a>
          </div>
          <div id="profile-recent" class="video-grid"></div>
        </div>

        <div class="profile__section">
          <div class="profile__section-header">
            <h2 class="profile__section-title">Favorite Categories</h2>
          </div>
          <div class="profile__categories">
            <a href="category.html?cat=milf" class="profile__cat-tag">MILF</a>
            <a href="category.html?cat=pov" class="profile__cat-tag">POV</a>
            <a href="category.html?cat=amateur" class="profile__cat-tag">Amateur</a>
            <a href="category.html?cat=big-ass" class="profile__cat-tag">Big Ass</a>
            <a href="category.html?cat=blowjob" class="profile__cat-tag">Blowjob</a>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render favorites page — header, sort bar, video grid
   */
  renderFavoritesPage() {
    return `
      <div class="favorites">
        <div class="favorites__header">
          <div>
            <h1 class="favorites__title">Favorites</h1>
            <p class="favorites__count">24 videos</p>
          </div>
          <div class="favorites__actions">
            <button class="btn btn--ghost favorites__sort-btn" data-sort="newest" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              Newest First
            </button>
          </div>
        </div>
        <div class="sort-bar">
          <button class="sort-bar__btn sort-bar__btn--active" data-sort="newest">Newest</button>
          <button class="sort-bar__btn" data-sort="popular">Most Viewed</button>
          <button class="sort-bar__btn" data-sort="top-rated">Top Rated</button>
          <button class="sort-bar__btn" data-sort="longest">Longest</button>
        </div>
        <div id="favorites-grid" class="video-grid"></div>
      </div>
    `;
  },

  /**
   * Render history page — header with clear button, video grid
   */
  renderHistoryPage(count) {
    return `
      <div class="history">
        <div class="history__header">
          <div>
            <h1 class="history__title">History</h1>
            <p class="history__count">${count} video${count !== 1 ? 's' : ''}</p>
          </div>
          <button class="btn btn--ghost history__clear-btn" type="button" id="clear-history">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Clear History
          </button>
        </div>
        <div id="history-grid" class="video-grid"></div>
        <div id="history-empty" class="history__empty" style="display:none">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p>No viewing history yet.</p>
          <a href="categories.html" class="btn btn--primary">Browse Categories</a>
        </div>
      </div>
    `;
  },

  /**
   * Render settings page — form sections with toggles and inputs
   */
  renderSettingsPage() {
    return `
      <div class="settings">
        <h1 class="settings__page-title">Settings</h1>

        <div class="settings__section">
          <h2 class="settings__section-title">Account</h2>
          <div class="settings__group">
            <label class="settings__label">
              <span class="settings__label-text">Username</span>
              <input type="text" class="settings__input" value="DarkVoyager" disabled>
            </label>
            <label class="settings__label">
              <span class="settings__label-text">Email</span>
              <input type="email" class="settings__input" value="dark.voyager@email.com" disabled>
            </label>
            <label class="settings__label">
              <span class="settings__label-text">Bio</span>
              <textarea class="settings__textarea" rows="3" disabled>Just exploring the manor. Night owl. Prefers quality over quantity.</textarea>
            </label>
          </div>
        </div>

        <div class="settings__section">
          <h2 class="settings__section-title">Display</h2>
          <div class="settings__group">
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Video Quality</span>
                <span class="settings__row-desc">Preferred playback quality when available</span>
              </div>
              <select class="settings__select">
                <option>Auto</option>
                <option>1080p</option>
                <option selected>720p</option>
                <option>480p</option>
              </select>
            </div>
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Thumbnails</span>
                <span class="settings__row-desc">Animate thumbnails on hover</span>
              </div>
              <label class="settings__toggle">
                <input type="checkbox" checked>
                <span class="settings__toggle-track"></span>
              </label>
            </div>
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Autoplay</span>
                <span class="settings__row-desc">Automatically play next video</span>
              </div>
              <label class="settings__toggle">
                <input type="checkbox">
                <span class="settings__toggle-track"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="settings__section">
          <h2 class="settings__section-title">Privacy</h2>
          <div class="settings__group">
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Watch History</span>
                <span class="settings__row-desc">Save videos you watch to your history</span>
              </div>
              <label class="settings__toggle">
                <input type="checkbox" checked>
                <span class="settings__toggle-track"></span>
              </label>
            </div>
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Public Profile</span>
                <span class="settings__row-desc">Allow others to see your profile</span>
              </div>
              <label class="settings__toggle">
                <input type="checkbox">
                <span class="settings__toggle-track"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="settings__section">
          <h2 class="settings__section-title">Data</h2>
          <div class="settings__group">
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Clear Watch History</span>
                <span class="settings__row-desc">Remove all videos from your history</span>
              </div>
              <button class="btn btn--ghost" type="button" id="settings-clear-history">Clear</button>
            </div>
            <div class="settings__row">
              <div class="settings__row-info">
                <span class="settings__row-label">Reset Age Verification</span>
                <span class="settings__row-desc">Show the age gate on next visit</span>
              </div>
              <button class="btn btn--ghost" type="button" id="settings-reset-age">Reset</button>
            </div>
            <div class="settings__row settings__row--danger">
              <div class="settings__row-info">
                <span class="settings__row-label">Delete Account</span>
                <span class="settings__row-desc">Permanently delete your account and all data</span>
              </div>
              <button class="btn btn--ghost settings__btn--danger" type="button">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render legal page — tabs + content for Terms, Privacy, 2257, DMCA
   */
  renderLegalPage(activePage) {
    const pages = {
      terms: { label: 'Terms of Service', render: this._legalTerms },
      privacy: { label: 'Privacy Policy', render: this._legalPrivacy },
      '2257': { label: '18 U.S.C. § 2257', render: this._legal2257 },
      dmca: { label: 'DMCA', render: this._legalDMCA }
    };

    if (!pages[activePage]) activePage = 'terms';

    const tabs = Object.entries(pages).map(([key, val]) =>
      `<a href="legal.html?page=${key}" class="legal__tab${key === activePage ? ' legal__tab--active' : ''}">${val.label}</a>`
    ).join('');

    return `
      <div class="legal">
        <div class="legal__tabs">${tabs}</div>
        <div class="legal__body">
          <h1 class="legal__title">${pages[activePage].label}</h1>
          <div class="legal__content">${pages[activePage].render()}</div>
        </div>
      </div>
    `;
  },

  _legalTerms() {
    return `
      <p class="legal__updated">Last updated: January 1, 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using Pleasure Manor ("the Site"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Site. You must be at least 18 years old (or the age of majority in your jurisdiction) to access the Site.</p>

      <h2>2. Description of Service</h2>
      <p>Pleasure Manor is an aggregation platform that embeds adult video content hosted on third-party websites. We do not host, upload, or store any video files on our servers. All embedded content is sourced from external providers and remains under their control.</p>

      <h2>3. User Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Site for any unlawful purpose or in violation of any applicable laws</li>
        <li>Attempt to gain unauthorized access to any portion of the Site or its systems</li>
        <li>Use automated tools, bots, or scrapers to access the Site without prior written permission</li>
        <li>Interfere with or disrupt the integrity or performance of the Site</li>
        <li>Reproduce, distribute, or create derivative works from Site content without authorization</li>
      </ul>

      <h2>4. Intellectual Property</h2>
      <p>The Site's design, layout, branding, and original content are the property of Pleasure Manor. Embedded video content belongs to their respective owners and hosting platforms. We make no claim of ownership over third-party content.</p>

      <h2>5. Disclaimer of Warranties</h2>
      <p>The Site is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Site will be uninterrupted, error-free, or free of harmful components. We are not responsible for the content, accuracy, or practices of third-party sites linked or embedded on our platform.</p>

      <h2>6. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Pleasure Manor shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site, including but not limited to loss of data, revenue, or profits.</p>

      <h2>7. Third-Party Links and Embeds</h2>
      <p>The Site contains embedded content from and links to third-party websites. We have no control over and assume no responsibility for the content, privacy policies, or practices of these external sites. Accessing third-party content is at your own risk.</p>

      <h2>8. Modifications</h2>
      <p>We reserve the right to modify these Terms at any time. Changes become effective upon posting to the Site. Continued use of the Site after changes constitutes acceptance of the updated Terms.</p>

      <h2>9. Termination</h2>
      <p>We may restrict or terminate your access to the Site at any time, without notice, for any reason, including violation of these Terms.</p>

      <h2>10. Governing Law</h2>
      <p>These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Site shall be resolved in the appropriate courts of the governing jurisdiction.</p>

      <h2>11. Contact</h2>
      <p>For questions about these Terms, contact us at <a href="mailto:legal@pleasuremanor.com">legal@pleasuremanor.com</a>.</p>
    `;
  },

  _legalPrivacy() {
    return `
      <p class="legal__updated">Last updated: January 1, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We collect minimal information to provide our service:</p>
      <ul>
        <li><strong>Usage Data:</strong> Pages visited, time spent, referring URLs, and browser/device type collected automatically through standard web analytics</li>
        <li><strong>Local Storage:</strong> Preferences such as age verification status and viewing history are stored locally on your device and are not transmitted to our servers</li>
        <li><strong>Cookies:</strong> We use essential cookies for Site functionality and may use analytics cookies to understand usage patterns</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>Information collected is used to:</p>
      <ul>
        <li>Operate and maintain the Site</li>
        <li>Improve user experience and Site performance</li>
        <li>Analyze usage trends and patterns</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p>We do not sell, trade, or rent your personal information. We may share data with:</p>
      <ul>
        <li>Service providers who assist in Site operations (hosting, analytics), bound by confidentiality agreements</li>
        <li>Law enforcement when required by law or to protect our rights</li>
      </ul>

      <h2>4. Third-Party Embeds</h2>
      <p>Embedded video players from third-party platforms may set their own cookies and collect data according to their own privacy policies. We have no control over these practices and encourage you to review the privacy policies of embedded content providers.</p>

      <h2>5. Data Security</h2>
      <p>We implement reasonable technical and organizational measures to protect information. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>

      <h2>6. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li>Access, correct, or delete your personal data</li>
        <li>Opt out of analytics tracking</li>
        <li>Clear locally stored data through your browser settings</li>
      </ul>

      <h2>7. Children's Privacy</h2>
      <p>The Site is strictly for adults (18+). We do not knowingly collect information from anyone under 18. If we become aware of such collection, we will take steps to delete it immediately.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this Privacy Policy periodically. Changes will be posted on this page with an updated revision date.</p>

      <h2>9. Contact</h2>
      <p>For privacy-related inquiries, contact us at <a href="mailto:privacy@pleasuremanor.com">privacy@pleasuremanor.com</a>.</p>
    `;
  },

  _legal2257() {
    return `
      <p class="legal__updated">Last updated: January 1, 2026</p>

      <h2>Compliance Statement</h2>
      <p>Pleasure Manor is not a producer of any visual content displayed on the Site. All video content is embedded from third-party hosting platforms. As such, Pleasure Manor is exempt from 18 U.S.C. § 2257 record-keeping requirements.</p>

      <h2>Third-Party Content</h2>
      <p>All visual depictions of actual or simulated sexually explicit conduct appearing on the Site are provided by and hosted on third-party platforms. These platforms are responsible for maintaining compliance with 18 U.S.C. § 2257 and its associated regulations (28 C.F.R. Part 75).</p>

      <p>Each third-party content provider is solely responsible for:</p>
      <ul>
        <li>Verifying that all performers depicted are of legal age (18 years or older)</li>
        <li>Maintaining records as required under 18 U.S.C. § 2257</li>
        <li>Designating a custodian of records in accordance with regulatory requirements</li>
      </ul>

      <h2>Reporting</h2>
      <p>If you believe any content embedded on the Site involves individuals under the age of 18, please contact us immediately at <a href="mailto:legal@pleasuremanor.com">legal@pleasuremanor.com</a>. We will take immediate action to remove the embedded content and report the matter to the appropriate authorities, including the <a href="https://www.missingkids.org/gethelpnow/cybertipline" target="_blank" rel="noopener">National Center for Missing & Exploited Children (NCMEC)</a>.</p>
    `;
  },

  _legalDMCA() {
    return `
      <p class="legal__updated">Last updated: January 1, 2026</p>

      <h2>Notice and Takedown</h2>
      <p>Pleasure Manor respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA). Since we embed content from third-party platforms and do not host any video files, our DMCA process involves removing the embedded link from our Site.</p>

      <h2>Filing a DMCA Takedown Notice</h2>
      <p>If you believe content embedded on our Site infringes your copyright, please send a written notice to our designated DMCA agent containing:</p>
      <ol>
        <li>Your physical or electronic signature</li>
        <li>Identification of the copyrighted work you believe is infringed</li>
        <li>The URL(s) on our Site where the infringing content appears</li>
        <li>Your contact information (name, address, phone number, email)</li>
        <li>A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law</li>
        <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner</li>
      </ol>

      <h2>Designated Agent</h2>
      <p>Send DMCA notices to:</p>
      <p class="legal__contact">
        DMCA Agent<br>
        Pleasure Manor<br>
        Email: <a href="mailto:dmca@pleasuremanor.com">dmca@pleasuremanor.com</a>
      </p>

      <h2>Counter-Notification</h2>
      <p>If you believe content was removed in error, you may submit a counter-notification containing:</p>
      <ol>
        <li>Your physical or electronic signature</li>
        <li>Identification of the content that was removed and its former location</li>
        <li>A statement under penalty of perjury that you believe the content was removed by mistake or misidentification</li>
        <li>Your name, address, phone number, and a statement consenting to jurisdiction of the federal court in your district</li>
      </ol>

      <h2>Repeat Infringers</h2>
      <p>We maintain a policy of terminating access for users who are repeat copyright infringers, in appropriate circumstances.</p>

      <h2>Important Note</h2>
      <p>Since we embed content rather than host it, we strongly recommend also filing a DMCA notice directly with the hosting platform where the video file resides, as they have the ability to remove the actual content.</p>
    `;
  },

  /**
   * Render the footer
   */
  renderFooter() {
    return `
      <footer class="footer">
        <div class="footer__inner">
          <span class="footer__text">&copy; 2026 Pleasure Manor. All content is embedded from external sources.</span>
          <div class="footer__links">
            <a href="legal.html?page=terms" class="footer__link">Terms</a>
            <a href="legal.html?page=privacy" class="footer__link">Privacy</a>
            <a href="legal.html?page=2257" class="footer__link">2257</a>
            <a href="legal.html?page=dmca" class="footer__link">DMCA</a>
          </div>
        </div>
      </footer>
    `;
  }
};
