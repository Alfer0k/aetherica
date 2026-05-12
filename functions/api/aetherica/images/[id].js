// GET /api/aetherica/images/:id?nsfw=off&tags=a,b,-c
// Returns the image (always, even if it'd be filtered out — direct URL access wins)
// plus prev_id / next_id confined to whatever filter is currently active.

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

export const onRequestGet = async ({ request, params, env }) => {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: 'Bad id.' }, { status: 400 });
  }

  const url = new URL(request.url);
  const sfwOnly = url.searchParams.get('nsfw') === 'off';
  const { includes, excludes } = parseTagsParam(url.searchParams.get('tags'));

  const row = await env.DB.prepare(
    `SELECT
       id, r2_prefix, title, source_url, nsfw, featured, likes_count, width, height, full_format, created_at,
       (
         SELECT json_group_array(tags.name)
           FROM image_tags
           JOIN tags ON tags.id = image_tags.tag_id
          WHERE image_tags.image_id = images.id
       ) AS tags_json
     FROM images
     WHERE id = ?`
  ).bind(id).first();

  if (!row) return Response.json({ error: 'Not found.' }, { status: 404 });

  // Build a shared filter fragment for the prev/next queries.
  // Gallery sorts newest-first → next-in-reading-order = older = lower created_at.
  const extraWhere = [];
  const extraArgs  = [];
  if (sfwOnly) extraWhere.push('nsfw = 0');
  for (const name of includes) {
    extraWhere.push(`id IN (
      SELECT image_id FROM image_tags
        WHERE tag_id = (SELECT id FROM tags WHERE name = ?)
    )`);
    extraArgs.push(name);
  }
  if (excludes.length) {
    const placeholders = excludes.map(() => '?').join(',');
    extraWhere.push(`id NOT IN (
      SELECT image_id FROM image_tags
        WHERE tag_id IN (SELECT id FROM tags WHERE name IN (${placeholders}))
    )`);
    extraArgs.push(...excludes);
  }
  const extraSql = extraWhere.length ? ` AND ${extraWhere.join(' AND ')}` : '';

  const next = await env.DB.prepare(
    `SELECT id FROM images
      WHERE ((created_at < ?) OR (created_at = ? AND id < ?))${extraSql}
      ORDER BY created_at DESC, id DESC
      LIMIT 1`
  ).bind(row.created_at, row.created_at, row.id, ...extraArgs).first();

  const prev = await env.DB.prepare(
    `SELECT id FROM images
      WHERE ((created_at > ?) OR (created_at = ? AND id > ?))${extraSql}
      ORDER BY created_at ASC, id ASC
      LIMIT 1`
  ).bind(row.created_at, row.created_at, row.id, ...extraArgs).first();

  const { tags_json, ...rest } = row;
  return Response.json({
    image: { ...rest, tags: tags_json ? JSON.parse(tags_json) : [] },
    prev_id: prev?.id ?? null,
    next_id: next?.id ?? null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
