// GET /api/aetherica/images?limit=50&offset=0&nsfw=off&tags=a,b,-c
// Returns the most recently added images, newest first.
//
// Filter params (both optional):
//   nsfw=off       → only SFW images (nsfw = 0). Anything else (including absent) shows all.
//   tags=NAME,...  → comma-separated tag names. "-" prefix = exclude.
//                    "blonde,erotic,-tattoo" → has both blonde and erotic, has no tattoo.
//
// Tag selection is capped at MAX_FILTER_TAGS total (includes + excludes combined)
// so the URL and the SQL stay bounded.

const MAX_FILTER_TAGS = 20;

function parseTagsParam(raw) {
  if (!raw) return { includes: [], excludes: [] };
  const includes = [];
  const excludes = [];
  const seen = new Set();
  let count = 0;
  for (const piece of String(raw).split(',')) {
    if (count >= MAX_FILTER_TAGS) break;
    let name = piece.trim().toLowerCase();
    if (!name) continue;
    const exclude = name.startsWith('-');
    if (exclude) name = name.slice(1).trim();
    if (!name) continue;
    const key = (exclude ? '-' : '+') + name;
    if (seen.has(key)) continue;
    seen.add(key);
    (exclude ? excludes : includes).push(name);
    count++;
  }
  return { includes, excludes };
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit')  || '50', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);
  const sfwOnly = url.searchParams.get('nsfw') === 'off';
  const { includes, excludes } = parseTagsParam(url.searchParams.get('tags'));
  const ratingMinRaw = parseInt(url.searchParams.get('rating_min') || '', 10);
  const ratingMin = Number.isFinite(ratingMinRaw) ? Math.min(10, Math.max(0, ratingMinRaw)) : null;

  const where = [];
  const args  = [];
  if (sfwOnly) where.push('nsfw = 0');
  if (ratingMin !== null && ratingMin > 0) {
    where.push('curator_rating >= ?');
    args.push(ratingMin);
  }

  // Each include is its own subquery: image must be tagged with this specific name.
  // AND-ing them means the image must satisfy every included tag.
  for (const name of includes) {
    where.push(`id IN (
      SELECT image_id FROM image_tags
        WHERE tag_id = (SELECT id FROM tags WHERE name = ?)
    )`);
    args.push(name);
  }

  // Excludes: image must NOT be tagged with any of these.
  if (excludes.length) {
    const placeholders = excludes.map(() => '?').join(',');
    where.push(`id NOT IN (
      SELECT image_id FROM image_tags
        WHERE tag_id IN (SELECT id FROM tags WHERE name IN (${placeholders}))
    )`);
    args.push(...excludes);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT id, r2_prefix, title, source_url, nsfw, featured, likes_count, width, height, full_format, curator_rating, created_at
       FROM images
       ${whereSql}
   ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  ).bind(...args, limit, offset).all();

  return Response.json({ images: results }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
