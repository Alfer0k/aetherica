// Shared tag parsing for upload + edit endpoints.
// Input: free-text comma-separated, e.g. "blonde, mood:erotic, style:minimal".
// Only the reserved namespaces (medium/subject/mood/style) are recognized;
// anything else falls back to a general tag with empty-string namespace.
// Empty string (not NULL) so SQLite's UNIQUE(namespace, name) actually dedupes.

export const RESERVED_NAMESPACES = new Set(['medium', 'subject', 'mood', 'style']);

export function parseTags(raw) {
  if (!raw) return [];
  const seen = new Set();
  const out = [];
  for (const piece of String(raw).split(',')) {
    const trimmed = piece.trim().toLowerCase();
    if (!trimmed) continue;

    let namespace = '';
    let name = trimmed;
    const colon = trimmed.indexOf(':');
    if (colon !== -1) {
      const ns = trimmed.slice(0, colon).trim();
      const n  = trimmed.slice(colon + 1).trim();
      if (RESERVED_NAMESPACES.has(ns) && n) {
        namespace = ns;
        name = n;
      }
    }

    const key = `${namespace}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ namespace, name });
  }
  return out;
}

// Re-tag an image: replace its full tag set with the given list.
// Decrements counts on tags it had before, attaches new ones (upserting),
// then GCs tags whose count fell to zero.
export async function setImageTags(env, imageId, tagList) {
  await env.DB.prepare(
    `UPDATE tags SET count = count - 1
       WHERE id IN (SELECT tag_id FROM image_tags WHERE image_id = ?)`
  ).bind(imageId).run();

  await env.DB.prepare(
    `DELETE FROM image_tags WHERE image_id = ?`
  ).bind(imageId).run();

  for (const t of tagList) {
    await env.DB.prepare(
      `INSERT INTO tags (namespace, name, count) VALUES (?, ?, 1)
         ON CONFLICT(namespace, name) DO UPDATE SET count = count + 1`
    ).bind(t.namespace, t.name).run();

    const row = await env.DB.prepare(
      `SELECT id FROM tags WHERE namespace = ? AND name = ?`
    ).bind(t.namespace, t.name).first();

    if (row) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)`
      ).bind(imageId, row.id).run();
    }
  }

  await env.DB.prepare(`DELETE FROM tags WHERE count <= 0`).run();
}
