// GET /api/aetherica/images?limit=50&offset=0&nsfw=off&tag=mood:erotic
// Returns the most recently added images, newest first.
//
// Filter params (both optional):
//   nsfw=off  → only SFW images (nsfw = 0). Anything else (including absent) shows everything.
//   tag=NS:N  → only images tagged with namespace=NS, name=N. NS:N or N (no colon) for general.

function parseTagParam(tagParam) {
  if (!tagParam) return null;
  const colon = tagParam.indexOf(':');
  if (colon === -1) return { namespace: '', name: tagParam.toLowerCase() };
  return {
    namespace: tagParam.slice(0, colon).toLowerCase(),
    name:      tagParam.slice(colon + 1).toLowerCase(),
  };
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit')  || '50', 10), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);
  const sfwOnly = url.searchParams.get('nsfw') === 'off';
  const tag = parseTagParam(url.searchParams.get('tag'));

  const where = [];
  const args  = [];
  if (sfwOnly) where.push('nsfw = 0');
  if (tag) {
    where.push(`id IN (
      SELECT image_id FROM image_tags
        WHERE tag_id = (SELECT id FROM tags WHERE namespace = ? AND name = ?)
    )`);
    args.push(tag.namespace, tag.name);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT id, r2_prefix, title, source_url, nsfw, featured, likes_count, width, height, created_at
       FROM images
       ${whereSql}
   ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  ).bind(...args, limit, offset).all();

  return Response.json({ images: results }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
