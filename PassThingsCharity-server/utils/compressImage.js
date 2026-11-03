const sharp = require('sharp');

const MAX_BYTES = 500 * 1024;

async function compressImage(buffer) {
  try {
    const source = sharp(buffer, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await source.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
      throw new Error('Unsupported image');
    }
    for (const size of [1600, 1280, 1024, 800, 640]) {
      for (const quality of [80, 65, 50]) {
        const result = await source.clone().rotate()
          .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer({ resolveWithObject: true });
        if (result.data.length <= MAX_BYTES) {
          return {
            buffer: result.data, mimetype: 'image/jpeg',
            originalBytes: buffer.length, bytes: result.data.length,
            width: result.info.width, height: result.info.height,
          };
        }
      }
    }
    throw Object.assign(new Error('Image cannot be compressed below 500 KB.'), { status: 422 });
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('Invalid, damaged, animated or oversized image. Use a static JPEG, PNG or WebP up to 40 megapixels.'), { status: 400 });
  }
}

module.exports = { compressImage, MAX_BYTES };
