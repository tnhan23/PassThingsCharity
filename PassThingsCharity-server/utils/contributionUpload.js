const crypto = require('node:crypto');
const multer = require('multer');
const { compressImage } = require('./compressImage');

const receiveImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 0, parts: 5 },
  fileFilter(req, file, cb) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(Object.assign(new Error('Only JPEG, PNG and WebP images are supported.'), { status: 400 }));
    }
    cb(null, true);
  },
}).array('images', 5);

function configuration(target = 'contributions') {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  const folder = target === 'personal'
    ? (process.env.CLOUDINARY_PERSONAL_FOLDER || 'PassThingsCharity/avatars')
    : process.env.CLOUDINARY_BE3_FOLDER;
  if (!cloud || !key || !secret || !folder || !/^[a-zA-Z0-9_-]+$/.test(cloud)) {
    throw Object.assign(new Error('Cloudinary BE3 upload is not configured. Set credentials and CLOUDINARY_BE3_FOLDER.'), { status: 503 });
  }
  return { cloud, key, secret, folder };
}

function imageType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function uploadImage(file, target = 'contributions') {
  const { cloud, key, secret, folder } = configuration(target);
  const compressed = await compressImage(file.buffer);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `${folder}/${crypto.randomUUID()}`;
  // Set both parameters to keep the same destination in fixed and dynamic folder modes.
  const params = { asset_folder: folder, overwrite: 'false', public_id: publicId, timestamp };
  const signature = crypto.createHash('sha1').update(
    Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret,
  ).digest('hex');
  const body = new FormData();
  for (const [name, value] of Object.entries({ ...params, api_key: key, signature })) body.append(name, value);
  body.append('file', new Blob([compressed.buffer], { type: compressed.mimetype }), 'image.jpg');
  let response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: 'POST', body, signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw Object.assign(new Error('Cloudinary upload could not be reached.'), { status: 502 });
  }
  const result = await response.json();
  if (!response.ok || !result.secure_url) {
    throw Object.assign(new Error('Cloudinary rejected the upload. Check server credentials and folder configuration.'), { status: 502 });
  }
  return {
    imageUrl: result.secure_url, publicId: result.public_id,
    originalBytes: compressed.originalBytes, bytes: result.bytes || compressed.bytes,
    width: compressed.width, height: compressed.height, format: 'jpeg',
  };
}

function createUploadHandler(target) {
 return async function handleUpload(req, res, next) {
  try { configuration(target); } catch (error) { return next(error); }
  receiveImages(req, res, async error => {
    if (error) return next(Object.assign(error, { status: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400 }));
    try {
      if (!req.files?.length) return res.status(400).json({ error: 'Attach 1–5 images using the images field.' });
      if (req.files.some(file => imageType(file.buffer) !== file.mimetype)) {
        return res.status(400).json({ error: 'Image contents do not match the declared JPEG, PNG or WebP type.' });
      }
      const images = [];
      for (const file of req.files) {
        try { images.push(await uploadImage(file, target)); }
        catch (uploadError) {
          // Return successful URLs so callers can retain uploads if a later image fails.
          return res.status(uploadError.status || 502).json({ error: uploadError.message, images, imageUrls: images.map(image => image.imageUrl) });
        }
      }
      return res.status(201).json({ images, imageUrls: images.map(image => image.imageUrl) });
    } catch (uploadError) { return next(uploadError); }
  });
 };
}

const uploadContributionImages = createUploadHandler('contributions');
const uploadPersonalImages = createUploadHandler('personal');
module.exports = { uploadContributionImages, uploadPersonalImages, imageType, uploadImage };
