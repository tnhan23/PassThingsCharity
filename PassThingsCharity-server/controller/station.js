const mongoose = require('mongoose');
const Organization = require('../models/organization');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const User = require('../models/user');
const { getOrganizationAccess, getStationAccess } = require('../utils/resourceAccess');

function validateStation(body) {
  if (
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    typeof body.address !== 'string' ||
    !body.address.trim()
  ) {
    return false;
  }

  if (
    body.latitude !== undefined &&
    (typeof body.latitude !== 'number' ||
      body.latitude < -90 ||
      body.latitude > 90)
  ) {
    return false;
  }

  if (
    body.longitude !== undefined &&
    (typeof body.longitude !== 'number' ||
      body.longitude < -180 ||
      body.longitude > 180)
  ) {
    return false;
  }

  return true;
}

async function listStations(req, res, next) {
  try {
    let organizationFilter = {};

    if (req.user.role.name === 'STATION_MANAGER') {
      organizationFilter.submittedBy = req.user._id;
    } else if (req.user.role.name !== 'ADMIN') {
      organizationFilter.isVerified = true;
    }

    const organizations = await Organization.find(
      organizationFilter,
      { _id: 1 }
    );
    const organizationIds = organizations.map((organization) => organization._id);

    const stationFilter = {
      organizationId: { $in: organizationIds },
    };

    if (req.user.role.name !== 'ADMIN' &&
        req.user.role.name !== 'STATION_MANAGER') {
      stationFilter.isActive = true;
    }

    const stations = await Station.find(stationFilter).sort({ createdAt: -1 });

    return res.status(200).json({ data: stations });
  } catch (error) {
    return next(error);
  }
}

async function getStation(req, res, next) {
  try {
    const access = await getStationAccess(req.params.id, req.user);

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    return res.status(200).json({
      station: access.station,
      organization: access.organization,
    });
  } catch (error) {
    return next(error);
  }
}

async function createStation(req, res, next) {
  try {
    const { organizationId } = req.params;
    const body = req.body || {};

    if (!validateStation(body)) {
      return res.status(400).json({
        error: 'name và address là bắt buộc; tọa độ phải hợp lệ.',
      });
    }

    const access = await getOrganizationAccess(organizationId, req.user);

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const isAdmin = req.user.role.name === 'ADMIN';

    if (!isAdmin && !access.organization.isVerified) {
      return res.status(409).json({
        error: 'Tổ chức cần được Admin duyệt trước khi tạo trạm.',
      });
    }

    const station = await Station.create({
      organizationId: access.organization._id,
      name: body.name.trim(),
      address: body.address.trim(),
      latitude: body.latitude,
      longitude: body.longitude,
      openingTime: body.openingTime,
      closingTime: body.closingTime,
      isActive: false,
    });

    return res.status(201).json({
      message: 'Đã gửi trạm, chờ Admin duyệt.',
      station,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStation(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Station ID không hợp lệ.' });
    }

    if (!validateStation({
      name: body.name === undefined ? 'ok' : body.name,
      address: body.address === undefined ? 'ok' : body.address,
      latitude: body.latitude,
      longitude: body.longitude,
    })) {
      return res.status(400).json({
        error: 'Thông tin trạm hoặc tọa độ không hợp lệ.',
      });
    }

    const access = await getStationAccess(id, req.user);

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    if (typeof body.name === 'string') {
      access.station.name = body.name.trim();
    }
    if (typeof body.address === 'string') {
      access.station.address = body.address.trim();
    }
    if (body.latitude !== undefined) {
      access.station.latitude = body.latitude;
    }
    if (body.longitude !== undefined) {
      access.station.longitude = body.longitude;
    }
    if (typeof body.openingTime === 'string') {
      access.station.openingTime = body.openingTime;
    }
    if (typeof body.closingTime === 'string') {
      access.station.closingTime = body.closingTime;
    }

    if (req.user.role.name !== 'ADMIN') {
      access.station.isActive = false;
    }

    await access.station.save();

    return res.status(200).json({
      message:
        req.user.role.name === 'ADMIN'
          ? 'Đã cập nhật trạm.'
          : 'Đã cập nhật trạm và gửi lại chờ Admin duyệt.',
      station: access.station,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteStation(req, res, next) {
  try {
    const access = await getStationAccess(req.params.id, req.user);

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    await StationStaff.deleteMany({ stationId: access.station._id });
    await access.station.deleteOne();

    return res.status(200).json({ message: 'Đã xóa trạm.' });
  } catch (error) {
    return next(error);
  }
}

async function assignStaffToStation(req, res, next) {
  try {
    const { id: stationId, userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }

    const access = await getStationAccess(stationId, req.user);

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    if (!access.organization.isVerified || !access.station.isActive) {
      return res.status(409).json({
        error: 'Chỉ được gán Staff vào tổ chức và trạm đã được duyệt.',
      });
    }

    const staff = await User.findById(userId).populate('role', 'name');

    if (!staff) {
      return res.status(404).json({ error: 'Không tìm thấy user.' });
    }

    if (!staff.role || staff.role.name !== 'STAFF') {
      return res.status(409).json({
        error: 'Chỉ có thể gán user đang có role STAFF vào trạm.',
      });
    }

    const assignment = await StationStaff.create({
      stationId: access.station._id,
      userId: staff._id,
    });

    return res.status(201).json({
      message: 'Đã gán Staff vào trạm.',
      assignment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Staff đã được gán vào trạm.' });
    }

    return next(error);
  }
}

async function removeStaffFromStation(req, res, next) {
  try {
    const { id: stationId, userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }

    const access = await getStationAccess(stationId, req.user);

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    const result = await StationStaff.deleteOne({
      stationId: access.station._id,
      userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Staff chưa được gán vào trạm này.',
      });
    }

    return res.status(200).json({ message: 'Đã gỡ Staff khỏi trạm.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
  assignStaffToStation,
  removeStaffFromStation,
};