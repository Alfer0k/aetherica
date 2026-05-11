# Pleasure Manor — Project Document

## Overview

**Working Name:** Pleasure Manor
**Type:** 18+ content aggregation platform
**Status:** Demo (v0.1)
**Concept:** An elegant, curated adult content platform that prioritizes user experience, aesthetics, and engagement over the "quantity over quality" approach of mainstream tube sites. No trash, no clutter, no visual assault.

**Core differentiator:** RPG-style gamification system — XP, levels, achievements, and progression mechanics layered on top of premium-feeling UI. Nobody in the adult space is doing this.

---

## Demo Scope (v0.1)

### What we're building
- Landing / Home page — featured content, category grid, hero section
- Category browse page — grid of video cards within a category
- Video page — embedded player (Pornhub embed) + metadata + related content
- Age gate — 18+ confirmation on first visit (localStorage-based)
- RPG UI elements — XP bar, level indicator, achievement toasts (visual mockup, hardcoded data)
- User profile area (hardcoded guest/logged-in toggle, no real auth)
  - Profile overview — avatar, rank, level, XP progress
  - Favorites — saved videos grid
  - Collections — curated playlists (mockup)
  - RPG Stats — videos watched, liked, saved, rated, categories explored, streaks
  - Achievements — unlocked badges display
- Responsive design — mobile-first (the audience is primarily mobile)
- Dark, elegant theme — dark grey base, burgundy/deep red accent

### What we're NOT building (yet)
- Backend / database
- Real user authentication (demo uses hardcoded toggle)
- Upload pipeline
- Search functionality
- Payment / monetization
- Full RPG progression system (backend logic)
- Non-video content types

---

## Content Sections (Future)

The platform will eventually support multiple audience sections:
- **Straight** (default, building this first)
- **Gay**
- **For Women**
- **Hentai / Anime**

Each section has its own category taxonomy. For the demo, we focus on **Straight** only.

---

## Content Types (Future)

| Type | Priority | Status |
|------|----------|--------|
| Videos | High | Demo v0.1 |
| Images / Galleries | Medium | Planned |
| Shorts (vertical clips) | Medium | Planned |
| Hentai Manga (reader) | Low | Planned |
| Erotica / Books | Low | Planned |
| Audiobooks | Low | Planned |

---

## Category Taxonomy — Straight

### Cleaned & standardized names:

| Category | Thumbnail Folder | Status |
|----------|-------------------|--------|
| Anal | `Anal` | Ready |
| Asian | `Asian` | Ready |
| BBC | `BBC` | Ready |
| Big Tits | `Big Breasts` | Rename folder |
| Cosplay | `Cosplay` | Ready |
| Double Penetration | `Double Penetration` | Ready |
| Games | `Games` | Ready |
| Hardcore | `Hardcore` | Ready |
| Machine | `Machine` | Ready |
| Petting | `Petting` | Ready |
| Tattooed Women | `Tattoed Woman` | Rename folder |
| Toys | `Toys` | Ready |
| Teen (18+) | `Young` | Rename folder |

### Categories to add (no thumbnails yet):

- Amateur
- Cunnilingus
- Cumshot
- Female Orgasm
- Gangbang / Group
- Golden Shower
- Lesbian
- Massage
- Masturbation
- Public
- Smoking
- Small Tits
- Stockings / Bodystockings
- Strapon
- Striptease

### Categories for other sections (parked):

**Gay:** Solo, Duo, Oral, Muscle Men
**Hentai:** Tentacles, Group, Gangbang, Story, Boys

---

## RPG / Gamification System

### Concept
A progression system that gives users dopamine beyond content consumption. Every interaction earns XP. XP leads to levels. Levels unlock cosmetic rewards and status.

### XP Sources (planned)
| Action | XP |
|--------|----|
| Watch a video (50%+ duration) | 10 |
| Like a video | 5 |
| Add to favorites | 5 |
| Watch a featured/daily video | 25 |
| Daily login | 15 |
| Visit streak (consecutive days) | 5 per day (stacking) |
| Explore new category | 10 |
| Watch 10 videos in a session | 20 (bonus) |

### Rank Progression (thematic)
| Level | Rank Title |
|-------|------------|
| 1-5 | Visitor |
| 6-15 | Guest |
| 16-30 | Resident |
| 31-50 | Patron |
| 51-75 | Connoisseur |
| 76-100 | Lord / Lady of the Manor |

### Achievements (examples)
- "First Steps" — Watch your first video
- "Explorer" — Visit 10 different categories
- "Dedicated" — 7-day visit streak
- "Collector" — Add 50 videos to favorites
- "Night Owl" — Watch videos between 1am-4am
- "Marathon" — Watch 20 videos in one session

### Demo Implementation
- Static XP bar in header/nav
- Hardcoded level display (e.g., "Level 12 — Resident")
- Achievement toast notification (CSS animation, triggered on scroll or timer for demo purposes)
- No actual tracking — purely visual

---

## Tech Stack

### Demo (v0.1)
- **HTML5** — semantic markup
- **CSS3** — custom properties (variables), Grid, Flexbox, animations
- **Vanilla JavaScript** — no frameworks, no build tools
- **JSON** — hardcoded content data (categories, videos, metadata)
- **Pornhub Embed** — video playback via official embed codes
- **Hosting** — any static host (GitHub Pages, Netlify, local)

### Future (if going to production)
- To be decided based on demo feedback
- Likely: Node.js or PHP backend, PostgreSQL, CDN for assets
- RPG system will require backend + database

---

## Design Direction

### Theme
- Dark, elegant, "luxury lounge" aesthetic
- Think: boutique hotel meets premium streaming service
- Clean typography, generous whitespace, smooth transitions
- NO: neon colors, cluttered layouts, aggressive popups, cheap ad aesthetics

### Color Palette (CSS Variables)
```css
:root {
  /* Base */
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #242424;
  --color-bg-tertiary: #2e2e2e;
  --color-bg-card: #2a2a2a;

  /* Text */
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a0a0a0;
  --color-text-muted: #666666;

  /* Accent — Deep Red / Burgundy */
  --color-accent-primary: #8b1a2b;
  --color-accent-hover: #a82240;
  --color-accent-light: #c2364d;
  --color-accent-subtle: rgba(139, 26, 43, 0.15);

  /* RPG / XP */
  --color-xp-bar: #8b1a2b;
  --color-xp-bar-bg: #2e2e2e;
  --color-level-badge: #d4af37; /* gold accent for level */

  /* Utility */
  --color-border: #3a3a3a;
  --color-overlay: rgba(0, 0, 0, 0.7);
  --color-success: #2ecc71;
  --color-warning: #f39c12;
  --color-error: #e74c3c;
}
```

### Typography
- Clean sans-serif — likely Inter, Outfit, or similar
- Large, readable body text
- Category/section headers with subtle weight contrast

### Layout
- CSS Grid for category/video grids
- Responsive breakpoints: mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- Mobile-first approach

---

## File Structure (Demo)

```
PLM/
├── index.html              # Home / Landing page
├── category.html           # Category browse page
├── video.html              # Video player page
├── profile.html            # User profile / RPG stats / favorites
├── css/
│   ├── variables.css       # CSS custom properties
│   ├── base.css            # Reset, typography, global styles
│   ├── components.css      # Cards, buttons, badges, modals
│   ├── layout.css          # Grid, nav, footer
│   ├── rpg.css             # XP bar, level badge, achievements
│   ├── profile.css         # User profile, stats, favorites
│   └── responsive.css      # Media queries
├── js/
│   ├── app.js              # Main initialization
│   ├── data.js             # Hardcoded JSON data (categories, videos)
│   ├── router.js           # Simple hash-based "routing" for SPA feel
│   ├── components.js       # UI component renderers
│   ├── agegate.js          # Age verification modal
│   └── rpg.js              # RPG UI mockup logic
├── img/
│   └── thumbs/
│       └── categories/     # Category preview thumbnails
│           ├── Anal/
│           ├── Asian/
│           ├── ...
├── data/
│   ├── categories.json     # Category definitions
│   └── videos.json         # Video entries with embed URLs
├── PROJECT.md              # This file
└── random_notes.txt        # Raw brainstorming notes
```

---

## Video Data Format

Each video entry in the JSON:
```json
{
  "id": "v001",
  "title": "Video Title",
  "categories": ["anal", "hardcore"],
  "tags": ["hd", "professional"],
  "thumbnail": "img/thumbs/videos/v001.jpg",
  "embedUrl": "https://www.pornhub.com/embed/viewkey_here",
  "duration": "12:34",
  "sourceUrl": "https://www.pornhub.com/view_video.php?viewkey=...",
  "featured": false
}
```

---

## Category Data Format

```json
{
  "id": "anal",
  "name": "Anal",
  "slug": "anal",
  "thumbnail": "img/thumbs/categories/Anal/thumb.jpg",
  "description": "Short description for SEO/meta",
  "videoCount": 24,
  "section": "straight"
}
```

---

## Next Steps

1. ~~Finalize category list and rename thumbnail folders~~ Done
2. Build base HTML structure + CSS variables + dark theme
3. Create age gate component
4. Build home page layout with category grid
5. Build category page with video card grid
6. Build video page with embed player
7. Add RPG UI mockup (XP bar, level badge)
8. Build user profile area (stats, favorites, collections, achievements)
9. Populate JSON data with real embed URLs from notes
10. Polish, transitions, responsive testing
11. Deploy demo to static host

---

## Ideas Backlog

Ideas worth exploring later. Not in demo scope — just captured so we don't lose them.

### Cosmetic Shop (XP Currency)
Users spend earned XP points on cosmetic customization:
- Custom background themes (subtle, semi-transparent decorative art behind content)
- Profile badges, frames, avatars
- Essentially the Fortnite model — free to use, earn currency through engagement, spend on vanity

### Decorative Background Art
Subtle, semi-transparent imagery as page backgrounds. Low opacity (10-15%) so it adds atmosphere without competing with content. Could be unlockable via the cosmetic shop.

### Collections / Playlists
Users curate and share themed video collections. Social feature:
- Public or private collections
- Share links
- "Follow" other users' collections
- Earns XP for creating/curating

### Leaderboard / Ranking
Competitive engagement system:
- Weekly/monthly/all-time leaderboards
- Ranking by XP earned, collections curated, likes given
- Anonymous by default (usernames, not real names)
- Seasonal resets to keep competition fresh

### Affiliate Merch / Toy Partnerships
Commission-based monetization through adult product affiliate links:
- Partnered product recommendations
- "Used in this video" style product tags
- No inventory, no shipping — pure affiliate commission

### Personalized categories / tags
Users can hide specific categories from viewing.
Same with tags - users can hide specific tags from viewing.

### Hide videos
Users can hide specific videos from viewing.

---

## Notes

- All video content is embedded via official Pornhub embed player — no content is hosted
- Thumbnails for categories are locally stored preview images
- The RPG system in demo is purely visual — no tracking, no persistence
- "Elegant" means: would you be embarrassed if someone saw your screen from across the room? The UI itself should look like a premium streaming service, not a porn site