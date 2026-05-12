// POST /api/aetherica/admin/upload
// Multipart form: thumb (webp), full (webp or gif), optional med (webp), metadata.
// Writes R2 objects under {prefix}/* and inserts the images row.
//
// `full_format` ('webp' | 'gif') controls the extension of the full-size key.
// For animated GIFs, the client sends the original file as full.gif and omits med —
// the detail page uses full.gif directly so animation plays.

import { parseTags, setImageTags } from '../../../_lib/tags.js';

const ALLOWED_FORMATS = new Set(['webp', 'gif']);

function randomPrefix() {
  // 16 hex chars from random bytes → 64 bits of entropy; plenty for collision-free R2 keys.
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function contentTypeFor(format) {
  return format === 'gif' ? 'image/gif' : 'image/webp';
}

async function putR2(env, key, file, contentType) {
  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType },
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
  const med   = form.get('med');   // optional — absent for GIFs
  const full  = form.get('full');

  const isFile = v => v && typeof v !== 'string';
  if (!isFile(thumb) || !isFile(full)) {
    return Response.json({ error: 'Missing required image sizes (thumb, full).' }, { status: 400 });
  }
  // `med` is allowed to be absent; if present, must be a File.
  if (med != null && !isFile(med)) {
    return Response.json({ error: 'Invalid `med` payload.' }, { status: 400 });
  }

  const fullFormatRaw = (form.get('full_format') || 'webp').toString().toLowerCase();
  const fullFormat    = ALLOWED_FORMATS.has(fullFormatRaw) ? fullFormatRaw : 'webp';

  const title      = (form.get('title')      || '').toString().trim() || null;
  const sourceUrl  = (form.get('source_url') || '').toString().trim() || null;
  const nsfw       = form.get('nsfw')     === '1' ? 1 : 0;
  const featured   = form.get('featured') === '1' ? 1 : 0;
  const tagsRaw    = (form.get('tags')       || '').toString();
  const tagList    = parseTags(tagsRaw);
  const width      = parseInt(form.get('width')  || '0', 10) || null;
  const height     = parseInt(form.get('height') || '0', 10) || null;

  const prefix = randomPrefix();
  const now    = Math.floor(Date.now() / 1000);
  const fullKey = `${prefix}/full.${fullFormat}`;

  try {
    await putR2(env, `${prefix}/thumb.webp`, thumb, 'image/webp');
    if (isFile(med)) {
      await putR2(env, `${prefix}/med.webp`, med, 'image/webp');
    }
    await putR2(env, fullKey, full, contentTypeFor(fullFormat));
  } catch (err) {
    return Response.json({ error: 'R2 upload failed.', detail: String(err) }, { status: 500 });
  }

  let imageId;
  try {
    const res = await env.DB.prepare(
      `INSERT INTO images (r2_prefix, title, source_url, nsfw, featured, likes_count, width, height, full_format, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    ).bind(prefix, title, sourceUrl, nsfw, featured, width, height, fullFormat, now).run();
    imageId = res.meta.last_row_id;
  } catch (err) {
    // Try to clean up R2 objects we just wrote so we don't leave orphans.
    await Promise.all([
      env.IMAGES.delete(`${prefix}/thumb.webp`),
      env.IMAGES.delete(`${prefix}/med.webp`),
      env.IMAGES.delete(fullKey),
    ]).catch(() => {});
    return Response.json({ error: 'D1 insert failed.', detail: String(err) }, { status: 500 });
  }

  await setImageTags(env, imageId, tagList);

  return Response.json({ ok: true, id: imageId, r2_prefix: prefix, full_format: fullFormat, tags: tagList.length });
};
