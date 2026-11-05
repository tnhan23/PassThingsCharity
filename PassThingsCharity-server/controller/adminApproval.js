const mongoose = require('mongoose');
const Organization = require('../models/organization');
const Station = require('../models/station');
const User = require('../models/user');
const Role = require('../models/role');
async function approveOrganization(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Organization ID không hợp lệ.' });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức.' });
    }

    organization.isVerified = true;
    organization.status = 'APPROVED';
    await organization.save();
   const orgManagerRole = await Role.findOne({ name: 'ORG_MANAGER' });
    if (orgManagerRole) {
      await User.findByIdAndUpdate(organization.submittedBy, {
        role: orgManagerRole._id,
      });
    }
    return res.status(200).json({
      message: 'Đã duyệt tổ chức và cấp quyền Quản lý tổ chức cho người đại diện.',
      organization,
    });
  } catch (error) {
    return next(error);
  }
}
async function rejectOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Organization ID không hợp lệ.' });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức.' });
    }

    if (organization.status === 'APPROVED') {
      return res.status(400).json({ error: 'Không thể từ chối tổ chức đã được duyệt trước đó.' });
    }

    organization.status = 'REJECTED';
    organization.isVerified = false;
    organization.rejectionReason = typeof rejectionReason === 'string' && rejectionReason.trim()
      ? rejectionReason.trim()
      : 'Hồ sơ không đáp ứng tiêu chí xét duyệt.';
    await organization.save();

    return res.status(200).json({
      message: 'Đã từ chối tổ chức.',
      organization,
    });
  } catch (error) {
    return next(error);
  }
}


async function approveStation(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Station ID không hợp lệ.' });
    }

    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({ error: 'Không tìm thấy trạm.' });
    }

    const organization = await Organization.findById(station.organizationId);

    if (!organization || !organization.isVerified) {
      return res.status(409).json({
        error: 'Cần duyệt tổ chức trước khi duyệt trạm.',
      });
    }

    station.isActive = true;
    await station.save();

    return res.status(200).json({
      message: 'Đã duyệt và kích hoạt trạm.',
      station,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  approveOrganization,
  approveStation,
  rejectOrganization,
};