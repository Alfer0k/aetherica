// POST /api/aetherica/admin/upload
// Multipart form: thumb, med, full (all image/webp blobs) + metadata.
// Writes 3 R2 objects under {prefix}/{size}.webp, inserts image row, processes tags.

const RESERVED_NAMESPACES = new Set(['medium', 'subject', 'mood', 'style']);

function parseTags(raw) {
  if (!raw) return [];
  const seen = new Set();
  const out = [];
  for (const piece of raw.split(',')) {
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
      // unknown namespace → fall through, treat whole string as a general tag name
    }

    const key = `${namespace}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ namespace, name });
  }
  return out;
}

function randomPrefix() {
  // 16 hex chars from random bytes → 64 bits of entropy; plenty for collision-free R2 keys.
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function putR2(env, key, file) {
  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: 'image/webp' },
  });
}

export const onRequestPost = async ({ request, env }) => {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart body.' }, { status: 400 });
  }

  const thumb = form.get('thumb');
  const med   = form.get('med');
  const full  = form.get('full');
  if (!thumb || !med || !full || typeof thumb === 'string' || typeof med === 'string' || typeof full === 'string') {
    return Response.json({ error: 'Missing one or more image sizes (thumb/med/full).' }, { status: 400 });
  }

  const title      = (form.get('title')      || '').toString().trim() || null;
  const sourceUrl  = (form.get('source_url') || '').toString().trim() || null;
  const nsfw       = form.get('nsfw')     === '1' ? 1 : 0;
  const featured   = form.get('featured') === '1' ? 1 : 0;
  const tagsRaw    = (form.get('tags')       || '').toString();
  const tagList    = parseTags(tagsRaw);

  const prefix = randomPrefix();
  const now    = Math.floor(Date.now() / 1000);

  try {
    await putR2(env, `${prefix}/thumb.webp`, thumb);
    await putR2(env, `${prefix}/med.webp`,   med);
    await putR2(env, `${prefix}/full.webp`,  full);
  } catch (err) {
    return Response.json({ error: 'R2 upload failed.', detail: String(err) }, { status: 500 });
  }

  let imageId;
  try {
    const res = await env.DB.prepare(
      `INSERT INTO images (r2_prefix, title, source_url, nsfw, featured, likes_count, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).bind(prefix, title, sourceUrl, nsfw, featured, now).run();
    imageId = res.meta.last_row_id;
  } catch (err) {
    // Try to clean up R2 objects we just wrote so we don't leave orphans.
    await Promise.all([
      env.IMAGES.delete(`${prefix}/thumb.webp`),
      env.IMAGES.delete(`${prefix}/med.webp`),
      env.IMAGES.delete(`${prefix}/full.webp`),
    ]).catch(() => {});
    return Response.json({ error: 'D1 insert failed.', detail: String(err) }, { status: 500 });
  }

  // Tag upserts + image_tag links. Sequential is fine — curator uploads ~tens/day.
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

  return Response.json({ ok: true, id: imageId, r2_prefix: prefix, tags: tagList.length });
};
