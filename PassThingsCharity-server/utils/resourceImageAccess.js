const Organization = require('../models/organization');

async function canEdit(resource, document, user) {
  if (user.role?.name === 'ADMIN') return true;
  const same = value => value != null && String(value) === String(user._id);
  if (resource === 'users') return same(document._id);
  if (resource === 'organizations') return same(document.submittedBy);
  if (['campaigns', 'item-categories', 'item-types', 'achievements'].includes(resource)) return same(document.createdBy);
  if (resource === 'stations') {
    if (same(document.managerId)) return true;
    const organization = await Organization.findById(document.organizationId);
    return !!organization && same(organization.submittedBy);
  }
  return false;
}

async function applyImageFromForm(document, body, resource, user) {
  const field = resource === 'organizations' ? 'logoUrl' : resource === 'achievements' ? 'badgeIconUrl' : 'imageUrl';
  if (body[field] === undefined) return;
  if (!await canEdit(resource, document, user)) {
    throw Object.assign(new Error('Bạn không có quyền đổi ảnh của bản ghi này.'), { status: 403 });
  }
  const fields = require('./resourceImageFields')(body, field);
  if (document[field] !== fields[field]) {
    document[field] = fields[field];
    document.imagePublicId = null;
  }
}

module.exports = { canEdit, applyImageFromForm };
