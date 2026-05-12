// /api/aetherica/admin/images/:id
//   GET    — fetch one image (with tags) for the edit form prefill
//   PATCH  — update title/source_url/nsfw/featured/tags (partial body OK)
//   DELETE — wipe R2 objects + DB row; CASCADE removes image_tags + like_log

import { parseTags, setImageTags } from '../../../../_lib/tags.js';

async function fetchOne(env, id) {
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

  if (!row) return null;
  const { tags_json, ...rest } = row;
  return { ...rest, tags: tags_json ? JSON.parse(tags_json) : [] };
}

function parseId(params) {
  const n = parseInt(params.id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const onRequestGet = async ({ params, env }) => {
  const id = parseId(params);
  if (!id) return Response.json({ error: 'Bad id.' }, { status: 400 });

  const image = await fetchOne(env, id);
  if (!image) return Response.json({ error: 'Not found.' }, { status: 404 });

  return Response.json({ image }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestPatch = async ({ request, params, env }) => {
  const id = parseId(params);
  if (!id) return Response.json({ error: 'Bad id.' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  // Make sure the image exists before we start updating sub-tables.
  const existing = await env.DB.prepare(`SELECT id FROM images WHERE id = ?`).bind(id).first();
  if (!existing) return Response.json({ error: 'Not found.' }, { status: 404 });

  // 1. Update the images row (only fields the client actually sent).
  const updates = [];
  const values = [];
  if ('title'      in body) { updates.push('title = ?');      values.push(body.title?.toString().trim() || null); }
  if ('source_url' in body) { updates.push('source_url = ?'); values.push(body.source_url?.toString().trim() || null); }
  if ('nsfw'       in body) { updates.push('nsfw = ?');       values.push(body.nsfw     ? 1 : 0); }
  if ('featured'   in body) { updates.push('featured = ?');   values.push(body.featured ? 1 : 0); }

  if (updates.length) {
    values.push(id);
    await env.DB.prepare(
      `UPDATE images SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  // 2. Replace tags only if `tags` was actually sent.
  if ('tags' in body) {
    await setImageTags(env, id, parseTags(body.tags));
  }

  const updated = await fetchOne(env, id);
  return Response.json({ image: updated }, { headers: { 'Cache-Control': 'no-store' } });
};

export const onRequestDelete = async ({ params, env }) => {
  const id = parseId(params);
  if (!id) return Response.json({ error: 'Bad id.' }, { status: 400 });

  const image = await env.DB.prepare(
    `SELECT r2_prefix, full_format FROM images WHERE id = ?`
  ).bind(id).first();
  if (!image) return Response.json({ error: 'Not found.' }, { status: 404 });

  // Decrement counts on this image's tags before the DELETE wipes image_tags via CASCADE.
  await env.DB.prepare(
    `UPDATE tags SET count = count - 1
       WHERE id IN (SELECT tag_id FROM image_tags WHERE image_id = ?)`
  ).bind(id).run();

  await env.DB.prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();

  // GC tags whose count fell to zero from this delete.
  await env.DB.prepare(`DELETE FROM tags WHERE count <= 0`).run();

  // R2 cleanup. Best-effort — if R2 errors here, we already lost the DB row,
  // so leaving orphan objects is the lesser evil than refusing the delete.
  // For animated GIFs, med.webp was never written; the delete on that key is
  // a harmless no-op (R2 returns ok even when the object doesn't exist).
  const fullExt = image.full_format === 'gif' ? 'gif' : 'webp';
  await Promise.all([
    env.IMAGES.delete(`${image.r2_prefix}/thumb.webp`),
    env.IMAGES.delete(`${image.r2_prefix}/med.webp`),
    env.IMAGES.delete(`${image.r2_prefix}/full.${fullExt}`),
  ]).catch(() => {});

  return Response.json({ ok: true });
};
