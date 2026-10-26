const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { compressImage, MAX_BYTES } = require('../utils/compressImage');

test('compresses detailed large input to the byte and dimension limits', async () => {
  const source = await sharp(crypto.randomBytes(2000 * 2000 * 3), {
    raw: { width: 2000, height: 2000, channels: 3 },
  }).png().toBuffer();
  const result = await compressImage(source);
  assert.ok(result.bytes <= MAX_BYTES);
  assert.ok(result.bytes < source.length);
  assert.ok(result.width <= 1600 && result.height <= 1600);
  assert.equal((await sharp(result.buffer).metadata()).format, 'jpeg');
});

test('auto-orients, strips EXIF and does not enlarge small images', async () => {
  const source = await sharp({ create: { width: 120, height: 80, channels: 3, background: 'red' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await compressImage(source);
  assert.equal(result.width, 80);
  assert.equal(result.height, 120);
  assert.equal((await sharp(result.buffer).metadata()).exif, undefined);
});

test('rejects corrupt image bytes', async () => {
  await assert.rejects(compressImage(Buffer.from('not an image')), { status: 400 });
});

test('Cloudinary receives the compressed file and correct personal folder', async () => {
  const originalFetch = global.fetch;
  const saved = { ...process.env };
  Object.assign(process.env, {
    CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_API_KEY: 'test', CLOUDINARY_API_SECRET: 'test',
    CLOUDINARY_PERSONAL_FOLDER: 'test/avatars',
  });
  try {
    global.fetch = async (url, options) => {
      assert.equal(options.body.get('asset_folder'), 'test/avatars');
      assert.ok(options.body.get('public_id').startsWith('test/avatars/'));
      const file = options.body.get('file');
      assert.equal(file.type, 'image/jpeg');
      assert.ok(file.size <= MAX_BYTES);
      return { ok: true, json: async () => ({ secure_url: 'https://example.com/photo.jpg', public_id: 'test/id', bytes: file.size }) };
    };
    const source = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: 'blue' } }).png().toBuffer();
    const result = await require('../utils/contributionUpload').uploadImage({ buffer: source }, 'personal');
    assert.equal(result.width, 1600);
    assert.equal(result.format, 'jpeg');
    assert.equal(result.originalBytes, source.length);
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
