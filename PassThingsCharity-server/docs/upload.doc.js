const evidenceUpload = require('./operations.doc')['/contributions/upload-images'].post;

module.exports = {
  '/uploads/images': {
    post: {
      ...evidenceUpload,
      tags: ['Image uploads'],
      summary: 'Upload compressed personal images (any authenticated user)',
      description: 'Send 1–5 images in multipart field images, each up to 5 MB. Static JPEG, PNG and WebP only, maximum 40 megapixels. Server auto-orients, strips metadata, flattens transparency to white and compresses to JPEG up to 500 KB within 1600px. Returns images with imageUrl, publicId, originalBytes, bytes, width, height and format, plus imageUrls. Files go to the configured personal folder. This endpoint uploads files only; it does not update the user profile. On partial failure, retain the successful URLs returned in the error response.',
      responses: {
        ...evidenceUpload.responses,
        422: { description: 'Cannot meet compressed size limit' },
      },
    },
  },
};
