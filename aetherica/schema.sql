-- ============================================
-- Aetherica — D1 schema
-- Paste into Cloudflare D1 console for the
-- `aetherica` database to initialize.
-- ============================================

-- Images: one row per curated image.
-- r2_prefix is the R2 key prefix; the three rendered sizes live at:
--   {r2_prefix}/thumb.webp   (~400px)
--   {r2_prefix}/med.webp     (~1200px)
--   {r2_prefix}/full.webp    (original-resolution WebP)
CREATE TABLE IF NOT EXISTS images (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_prefix    TEXT    NOT NULL UNIQUE,
  title        TEXT,
  source_url   TEXT,
  nsfw         INTEGER NOT NULL DEFAULT 0,   -- 0 = SFW, 1 = NSFW
  featured     INTEGER NOT NULL DEFAULT 0,   -- 0 / 1, curator editorial highlight
  likes_count  INTEGER NOT NULL DEFAULT 0,   -- denormalized; updated by like endpoint
  created_at   INTEGER NOT NULL              -- unix epoch seconds
);

CREATE INDEX IF NOT EXISTS idx_images_created  ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_featured ON images(featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_nsfw     ON images(nsfw);
CREATE INDEX IF NOT EXISTS idx_images_likes    ON images(likes_count DESC);

-- Tags: namespace is one of 'medium','subject','mood','style', or NULL for general.
-- (namespace, name) is unique so 'mood:erotic' and 'style:erotic' can coexist
-- without colliding with a general 'erotic'.
CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace  TEXT,
  name       TEXT    NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,    -- denormalized usage count for autocomplete
  UNIQUE(namespace, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_count ON tags(count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_name  ON tags(name);

-- Tag aliases: maps a written alias to a canonical tag.
-- Resolved at write time in the admin so the canonical id ends up in image_tags.
CREATE TABLE IF NOT EXISTS tag_aliases (
  alias   TEXT    PRIMARY KEY,
  tag_id  INTEGER NOT NULL,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Junction table: image ↔ tag.
CREATE TABLE IF NOT EXISTS image_tags (
  image_id  INTEGER NOT NULL,
  tag_id    INTEGER NOT NULL,
  PRIMARY KEY (image_id, tag_id),
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)   REFERENCES tags(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_image_tags_tag ON image_tags(tag_id);

-- Like log: one row per (image, ip_hash). Inserting is the rate-limit.
-- ip_hash is SHA-256(client_ip + server_salt) so we never store raw IPs.
-- PK enforces "one like per IP per image, ever" — simpler than a sliding window.
CREATE TABLE IF NOT EXISTS like_log (
  image_id    INTEGER NOT NULL,
  ip_hash     TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (image_id, ip_hash),
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);
