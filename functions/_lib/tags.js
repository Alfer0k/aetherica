// Shared tag helpers. Flat tag model — everything is just a name, no namespaces.
// The `tags` table still has a `namespace` column (for historical schema reasons);
// we always write '' and never read it. Don't drop it — DROP COLUMN is messy in D1
// and the column being empty costs nothing.

const MAX_TAG_LEN = 64;
const MAX_TAGS_PER_IMAGE = 30;

export function parseTags(raw) {
  if (!raw) return [];
  const seen = new Set();
  const out = [];
  for (const piece of String(raw).split(',')) {
    const name = piece.trim().toLowerCase();
    if (!name || name.length > MAX_TAG_LEN) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= MAX_TAGS_PER_IMAGE) break;
  }
  return out;
}

// Re-tag an image: replace its full tag set with the given list. Decrements
// counts on tags it had before, upserts new ones, GCs zero-count tags.
// `tagNames` is an array of strings (already trimmed/lowercased).
export async function setImageTags(env, imageId, tagNames) {
  await env.DB.prepare(
    `UPDATE tags SET count = count - 1
       WHERE id IN (SELECT tag_id FROM image_tags WHERE image_id = ?)`
  ).bind(imageId).run();

  await env.DB.prepare(
    `DELETE FROM image_tags WHERE image_id = ?`
  ).bind(imageId).run();

  for (const name of tagNames) {
    await env.DB.prepare(
      `INSERT INTO tags (namespace, name, count) VALUES ('', ?, 1)
         ON CONFLICT(namespace, name) DO UPDATE SET count = count + 1`
    ).bind(name).run();

    const row = await env.DB.prepare(
      `SELECT id FROM tags WHERE namespace = '' AND name = ?`
    ).bind(name).first();

    if (row) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)`
      ).bind(imageId, row.id).run();
    }
  }

  await env.DB.prepare(`DELETE FROM tags WHERE count <= 0`).run();
}
