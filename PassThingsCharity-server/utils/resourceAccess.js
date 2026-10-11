const mongoose = require('mongoose');
const Organization = require('../models/organization');
const Station = require('../models/station');

async function getOrganizationAccess(organizationId, user) {
  if (!mongoose.isValidObjectId(organizationId)) {
    return { error: 'Organization ID không hợp lệ.', status: 400 };
  }

  const organization = await Organization.findById(organizationId);

  if (!organization) {
    return { error: 'Không tìm thấy tổ chức.', status: 404 };
  }

  if (
    user.role.name === 'ADMIN' ||
    String(organization.submittedBy) === String(user._id)
  ) {
    return { organization };
  }

  return { error: 'Bạn không có quyền truy cập tổ chức này.', status: 403 };
}

async function getStationAccess(stationId, user) {
  if (!mongoose.isValidObjectId(stationId)) {
    return { error: 'Station ID không hợp lệ.', status: 400 };
  }

  const station = await Station.findById(stationId);

  if (!station) {
    return { error: 'Không tìm thấy trạm.', status: 404 };
  }

  const organization = await Organization.findById(station.organizationId);

  if (!organization) {
    return { error: 'Không tìm thấy tổ chức của trạm.', status: 404 };
  }

  const isAdmin = user.role.name === 'ADMIN';
  const isOwner =
    String(organization.submittedBy) === String(user._id);
  const canView =
    organization.isVerified && station.isActive;

  if (isAdmin || isOwner || canView) {
    return { station, organization };
  }

  return { error: 'Bạn không có quyền truy cập trạm này.', status: 403 };
}

module.exports = {
  getOrganizationAccess,
  getStationAccess,
};