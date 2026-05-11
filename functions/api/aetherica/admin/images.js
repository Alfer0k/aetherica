// GET /api/aetherica/admin/images?limit=100
// Admin list view: every image with its tags embedded (via SQLite json_group_array).
// Distinct from the public /api/aetherica/images endpoint which is gallery-shaped.

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10), 1), 500);

  const { results } = await env.DB.prepare(
    `SELECT
       images.id,
       images.r2_prefix,
       images.title,
       images.source_url,
       images.nsfw,
       images.featured,
       images.likes_count,
       images.width,
       images.height,
       images.created_at,
       (
         SELECT json_group_array(json_object('namespace', tags.namespace, 'name', tags.name))
           FROM image_tags
           JOIN tags ON tags.id = image_tags.tag_id
          WHERE image_tags.image_id = images.id
       ) AS tags_json
     FROM images
     ORDER BY images.created_at DESC
     LIMIT ?`
  ).bind(limit).all();

  const images = results.map(({ tags_json, ...rest }) => ({
    ...rest,
    tags: tags_json ? JSON.parse(tags_json) : [],
  }));

  return Response.json({ images }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
