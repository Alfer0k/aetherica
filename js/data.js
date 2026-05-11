/* ============================================
   Pleasure Manor — Data Layer (glue)
   Consumes PM_CATEGORIES + PM_VIDEOS globals
   ============================================ */

const PM_DATA = {
  categories: PM_CATEGORIES,
  videos: PM_VIDEOS,

  // Base path for category thumbnails
  thumbBasePath: 'img/thumbs/categories',

  // Base path for homepage constellation thumbnails
  homeThumbBasePath: 'img/thumbs/homepage',
  homeThumbs: ['1.jpg', '2.jpg', '3.jpg', '4.jpg'],

  // Helper: get homepage thumb URL
  getHomeThumbUrl(folder, filename) {
    return `${this.homeThumbBasePath}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
  },

  // Helper: get thumbnail URL
  getThumbUrl(folder, filename) {
    return `${this.thumbBasePath}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
  },

  // Helper: get video thumbnail URL
  getVideoThumbUrl(video) {
    return this.getThumbUrl(video.thumb.folder, video.thumb.file);
  },

  // Helper: get categories by section
  getCategoriesBySection(section) {
    return this.categories.filter(c => c.section === section);
  },

  // Helper: get category by slug
  getCategoryBySlug(slug) {
    return this.categories.find(c => c.slug === slug);
  },

  // Helper: get videos by category id
  getVideosByCategory(categoryId) {
    return this.videos.filter(v => v.categories.includes(categoryId));
  },

  // Helper: get video by id
  getVideoById(id) {
    return this.videos.find(v => v.id === id);
  },

  // Helper: format view count
  formatViews(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  }
};
