// GET /api/aetherica/images/:id (public, gallery-shaped)
// Returns the image + its tags + prev_id / next_id for in-gallery navigation.
// prev/next are chronological (newest = next, oldest = prev), tie-broken by id
// so two images with the same created_at don't loop.

export const onRequestGet = async ({ params, env }) => {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: 'Bad id.' }, { status: 400 });
  }

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

  // "next" = newer than current (browsing toward present). "prev" = older.
  // Compound (created_at, id) tie-break so ordering is total even on same timestamp.
  const next = await env.DB.prepare(
    `SELECT id FROM images
      WHERE (created_at > ?) OR (created_at = ? AND id > ?)
      ORDER BY created_at ASC, id ASC
      LIMIT 1`
  ).bind(row.created_at, row.created_at, row.id).first();

  const prev = await env.DB.prepare(
    `SELECT id FROM images
      WHERE (created_at < ?) OR (created_at = ? AND id < ?)
      ORDER BY created_at DESC, id DESC
      LIMIT 1`
  ).bind(row.created_at, row.created_at, row.id).first();

  const { tags_json, ...rest } = row;
  return Response.json({
    image: { ...rest, tags: tags_json ? JSON.parse(tags_json) : [] },
    prev_id: prev?.id ?? null,
    next_id: next?.id ?? null,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
