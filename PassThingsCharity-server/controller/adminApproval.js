const mongoose = require('mongoose');
const Organization = require('../models/organization');
const Station = require('../models/station');

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
    await organization.save();

    return res.status(200).json({
      message: 'Đã duyệt tổ chức.',
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
};