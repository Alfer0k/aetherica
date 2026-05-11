// GET /api/aetherica/images/:id?nsfw=off&tag=ns:name
// Returns the image (always, even if it'd be filtered out — direct URL access wins)
// plus prev_id / next_id confined to whatever filter is currently active.

function parseTagParam(tagParam) {
  if (!tagParam) return null;
  const colon = tagParam.indexOf(':');
  if (colon === -1) return { namespace: '', name: tagParam.toLowerCase() };
  return {
    namespace: tagParam.slice(0, colon).toLowerCase(),
    name:      tagParam.slice(colon + 1).toLowerCase(),
  };
}

export const onRequestGet = async ({ request, params, env }) => {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: 'Bad id.' }, { status: 400 });
  }

  const url = new URL(request.url);
  const sfwOnly = url.searchParams.get('nsfw') === 'off';
  const tag = parseTagParam(url.searchParams.get('tag'));

  const row = await env.DB.prepare(
    `SELECT
       id, r2_prefix, title, source_url, nsfw, featured, likes_count, width, height, created_at,
       (
         SELECT json_group_array(json_object('namespace', tags.namespace, 'name', tags.name))
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
  if (tag) {
    extraWhere.push(`id IN (
      SELECT image_id FROM image_tags
        WHERE tag_id = (SELECT id FROM tags WHERE namespace = ? AND name = ?)
    )`);
    extraArgs.push(tag.namespace, tag.name);
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
