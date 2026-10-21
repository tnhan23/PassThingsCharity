const mongoose = require('mongoose');
const Organization = require('../models/organization');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');

function validateOrganization(body) {
  return (
    typeof body.name === 'string' &&
    body.name.trim() &&
    typeof body.code === 'string' &&
    body.code.trim() &&
    typeof body.address === 'string' &&
    body.address.trim()
  );
}

async function listOrganizations(req, res, next) {
  try {
    let filter = {};

    if (req.user.role.name === 'STATION_MANAGER') {
      filter.submittedBy = req.user._id;
    } else if (req.user.role.name !== 'ADMIN') {
      filter.isVerified = true;
    }

    const organizations = await Organization.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({ data: organizations });
  } catch (error) {
    return next(error);
  }
}

async function getOrganization(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Organization ID không hợp lệ.' });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức.' });
    }

    const isAdmin = req.user.role.name === 'ADMIN';
    const isOwner =
      String(organization.submittedBy) === String(req.user._id);

    if (!isAdmin && !isOwner && !organization.isVerified) {
      return res.status(403).json({ error: 'Tổ chức chưa được duyệt.' });
    }

    return res.status(200).json({ organization });
  } catch (error) {
    return next(error);
  }
}

async function createOrganization(req, res, next) {
  try {
    const body = req.body || {};

    if (!validateOrganization(body)) {
      return res.status(400).json({
        error: 'name, code và address là thông tin bắt buộc.',
      });
    }
    const existingPending = await Organization.findOne({
      submittedBy: req.user._id,
      status: 'PENDING',
    });

    if (existingPending) {
      return res.status(400).json({
        error: 'Bạn đã có một yêu cầu thành lập tổ chức đang chờ duyệt. Vui lòng chờ phản hồi từ Admin.',
      });
    }
    const isAdmin = req.user.role.name === 'ADMIN';
    const organization = await Organization.create({
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      address: body.address.trim(),
      phone: typeof body.phone === 'string' ? body.phone.trim() : undefined,
      email: typeof body.email === 'string' ? body.email.trim() : undefined,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      operatingArea: typeof body.operatingArea === 'string' ? body.operatingArea.trim() : '',
      idCardNumber: typeof body.idCardNumber === 'string' ? body.idCardNumber.trim() : '',
      submittedBy: req.user._id,
      status: isAdmin ? 'APPROVED' : 'PENDING',
      isVerified: isAdmin,
    });

    return res.status(201).json({
      message: isAdmin
        ? 'Đã tạo tổ chức.'
        : 'Đã gửi tổ chức, chờ Admin duyệt.',
      organization,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Mã tổ chức đã được sử dụng.',
      });
    }

    return next(error);
  }
}

async function updateOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Organization ID không hợp lệ.' });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức.' });
    }

    const isAdmin = req.user.role.name === 'ADMIN';
    const isOwner =
      String(organization.submittedBy) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: 'Bạn không có quyền sửa tổ chức này.',
      });
    }

    if (
      ('name' in body && (typeof body.name !== 'string' || !body.name.trim())) ||
      ('code' in body && (typeof body.code !== 'string' || !body.code.trim())) ||
      ('address' in body &&
        (typeof body.address !== 'string' || !body.address.trim()))
    ) {
      return res.status(400).json({
        error: 'name, code và address không được để trống.',
      });
    }

    if (typeof body.name === 'string') {
      organization.name = body.name.trim();
    }
    if (typeof body.code === 'string') {
      organization.code = body.code.trim().toUpperCase();
    }
    if (typeof body.address === 'string') {
      organization.address = body.address.trim();
    }
    if (typeof body.phone === 'string') {
      organization.phone = body.phone.trim();
    }
    if (typeof body.email === 'string') {
      organization.email = body.email.trim();
    }
    if (typeof body.logoUrl === 'string') {
      organization.logoUrl = body.logoUrl.trim();
    }

    if (!isAdmin) {
      organization.isVerified = false;

      const stations = await Station.find(
        { organizationId: organization._id },
        { _id: 1 }
      );
      const stationIds = stations.map((station) => station._id);

      await Station.updateMany(
        { _id: { $in: stationIds } },
        { $set: { isActive: false } }
      );
    }

    await organization.save();

    return res.status(200).json({
      message: isAdmin
        ? 'Đã cập nhật tổ chức.'
        : 'Đã cập nhật và gửi lại tổ chức chờ Admin duyệt.',
      organization,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Mã tổ chức đã được sử dụng.',
      });
    }

    return next(error);
  }
}

async function deleteOrganization(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Organization ID không hợp lệ.' });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Không tìm thấy tổ chức.' });
    }

    const isAdmin = req.user.role.name === 'ADMIN';
    const isOwner =
      String(organization.submittedBy) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: 'Bạn không có quyền xóa tổ chức này.',
      });
    }

    const stations = await Station.find(
      { organizationId: organization._id },
      { _id: 1 }
    );
    const stationIds = stations.map((station) => station._id);

    if (stationIds.length > 0 && !isAdmin) {
      return res.status(409).json({
        error: 'Chỉ Admin mới có thể xóa tổ chức đã có trạm.',
      });
    }

    if (stationIds.length > 0) {
      await StationStaff.deleteMany({ stationId: { $in: stationIds } });
      await Station.deleteMany({ _id: { $in: stationIds } });
    }

    await organization.deleteOne();

    return res.status(200).json({ message: 'Đã xóa tổ chức.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};