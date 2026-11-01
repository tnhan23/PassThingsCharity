const mongoose = require('mongoose');
const multer = require('multer');
const { imageType, uploadImage, configuration } = require('../utils/contributionUpload');
const Organization = require('../models/organization');
const { canEdit } = require('../utils/resourceImageAccess');

const resources = {
  users: { model: require('../models/user'), field: 'avatarUrl', folder: 'personal' },
  organizations: { model: Organization, field: 'logoUrl' },
  stations: { model: require('../models/station'), field: 'imageUrl' },
  campaigns: { model: require('../models/campaign'), field: 'imageUrl' },
  'item-categories': { model: require('../models/itemCategory'), field: 'imageUrl' },
  'item-types': { model: require('../models/itemType'), field: 'imageUrl' },
  achievements: { model: require('../models/achievement'), field: 'badgeIconUrl' },
};

const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter(req, file, cb) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(Object.assign(new Error('Only JPEG, PNG and WebP images are supported.'), { status: 400 }));
    }
    cb(null, true);
  },
}).single('image');

async function uploadResourceImage(req, res, next) {
  try {
    const { resource, id } = req.params;
    const config = Object.hasOwn(resources, resource) && resources[resource];
    if (!config) return res.status(400).json({ error: 'Unsupported image resource.' });
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid resource ID.' });
    const document = await config.model.findById(id);
    if (!document) return res.status(404).json({ error: 'Resource not found.' });
    if (!await canEdit(resource, document, req.user)) return res.status(403).json({ error: 'You cannot update this resource image.' });
    const target = config.folder || resource;
    configuration(target);
    receiveImage(req, res, async error => {
      if (error) return next(Object.assign(error, { status: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400 }));
      try {
        if (!req.file) return res.status(400).json({ error: 'Attach one image using the image field.' });
        if (imageType(req.file.buffer) !== req.file.mimetype) return res.status(400).json({ error: 'Image contents do not match the declared type.' });
        const image = await uploadImage(req.file, target);
        // Upload can take time: recheck ownership before updating the record.
        const current = await config.model.findById(id);
        if (!current) return res.status(404).json({ error: 'Resource was deleted during upload.' });
        if (!await canEdit(resource, current, req.user)) {
          return res.status(403).json({ error: 'You no longer have permission to update this resource image.' });
        }
        const filter = { _id: id };
        if (req.user.role?.name !== 'ADMIN') {
          const fields = resource === 'stations' ? ['managerId', 'organizationId']
            : resource === 'organizations' ? ['submittedBy']
            : resource === 'users' ? [] : ['createdBy'];
          for (const field of fields) filter[field] = current[field] ?? null;
        }
        // Update only image fields, preserving concurrent changes to other fields.
        const updated = await config.model.findOneAndUpdate(filter, {
          $set: { [config.field]: image.imageUrl, imagePublicId: image.publicId },
        }, { new: true, runValidators: true });
        if (!updated) return res.status(409).json({ error: 'Resource ownership changed or resource was deleted during upload.' });
        return res.status(200).json({ id, resource, field: config.field, [config.field]: image.imageUrl, image });
      } catch (uploadError) { return next(uploadError); }
    });
  } catch (error) { return next(error); }
}

// Upload before creating an entity: no ID is needed and no database row is changed.
async function uploadNewResourceImage(req, res, next) {
  try {
    const { resource } = req.params;
    const config = Object.hasOwn(resources, resource) && resources[resource];
    if (!config) return res.status(400).json({ error: 'Unsupported image resource.' });
    const target = config.folder || resource;
    configuration(target);
    receiveImage(req, res, async error => {
      if (error) return next(Object.assign(error, { status: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400 }));
      try {
        if (!req.file) return res.status(400).json({ error: 'Attach one image using the image field.' });
        if (imageType(req.file.buffer) !== req.file.mimetype) {
          return res.status(400).json({ error: 'Image contents do not match the declared type.' });
        }
        const image = await uploadImage(req.file, target);
        return res.status(201).json({ [config.field]: image.imageUrl });
      } catch (uploadError) { return next(uploadError); }
    });
  } catch (error) { return next(error); }
}

module.exports = { uploadResourceImage, uploadNewResourceImage, canEdit };
