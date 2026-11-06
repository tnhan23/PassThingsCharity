const mongoose = require('mongoose');
const Organization = require('../models/organization');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const Role = require('../models/role');
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

  if (body.latitude !== undefined) {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return false;
    }
  }

  if (body.longitude !== undefined) {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return false;
    }
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
    const organizationId = req.params.organizationId || (req.body && req.body.organizationId);
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
// 1. Tạo tài khoản mới trực tiếp và gán làm Trưởng trạm
async function createAndAssignStationManager(req, res, next) {
  try {
    const { id } = req.params; // Station ID
    const { email, username, password, fullName, phone } = req.body || {};

    if (
      !email?.trim() || !username?.trim() || !password ||
      !fullName?.trim() || !phone || !/^\d{10}$/.test(phone.trim())
    ) {
      return res.status(400).json({ error: 'Thông tin không hợp lệ; phone phải gồm đúng 10 chữ số.' });
    }

    const station = await Station.findById(id);
    if (!station) return res.status(404).json({ error: 'Không tìm thấy trạm.' });

    const organization = await Organization.findById(station.organizationId);
    if (!organization) return res.status(404).json({ error: 'Không tìm thấy tổ chức của trạm.' });

    // Kiểm tra quyền: Phải là Admin hoặc Chủ của tổ chức đó
    const isAdmin = req.user.role.name === 'ADMIN';
    const isOrgOwner = String(organization.submittedBy) === String(req.user._id);
    if (!isAdmin && !isOrgOwner) {
      return res.status(403).json({ error: 'Bạn không có quyền quản lý trạm thuộc tổ chức này.' });
    }

    const managerRole = await Role.findOne({ name: 'STATION_MANAGER' });
    if (!managerRole) {
      return res.status(500).json({ error: 'Chưa cấu hình role STATION_MANAGER trong hệ thống.' });
    }

    // Tạo tài khoản mới
    const newManager = await User.create({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: await bcrypt.hash(password, 12),
      fullName: fullName.trim(),
      phone: phone.trim(),
      role: managerRole._id,
    });

    // Gán vào trạm
    station.managerId = newManager._id;
    await station.save();

    return res.status(201).json({
      message: 'Đã tạo tài khoản và gán làm Trưởng trạm thành công.',
      manager: {
        id: newManager._id,
        username: newManager.username,
        fullName: newManager.fullName,
        role: 'STATION_MANAGER',
      },
      stationId: station._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email hoặc username đã được sử dụng.' });
    }
    return next(error);
  }
}

// 2. Bổ nhiệm một User đã có sẵn trên app làm Trưởng trạm (qua email hoặc SĐT)
async function assignExistingUserAsManager(req, res, next) {
  try {
    const { id } = req.params; // Station ID
    const { identifier } = req.body || {}; // Email hoặc SĐT

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ error: 'Vui lòng cung cấp email hoặc số điện thoại của người dùng.' });
    }

    const station = await Station.findById(id);
    if (!station) return res.status(404).json({ error: 'Không tìm thấy trạm.' });

    const organization = await Organization.findById(station.organizationId);
    if (!organization) return res.status(404).json({ error: 'Không tìm thấy tổ chức của trạm.' });

    const isAdmin = req.user.role.name === 'ADMIN';
    const isOrgOwner = String(organization.submittedBy) === String(req.user._id);
    if (!isAdmin && !isOrgOwner) {
      return res.status(403).json({ error: 'Bạn không có quyền quản lý trạm thuộc tổ chức này.' });
    }

    const cleanId = identifier.trim();
    const user = await User.findOne({
      $or: [{ email: cleanId.toLowerCase() }, { phone: cleanId }]
    }).populate('role');

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng với email hoặc số điện thoại này.' });
    }

    // Nâng role lên STATION_MANAGER nếu đang là USER/STAFF
    const managerRole = await Role.findOne({ name: 'STATION_MANAGER' });
    if (user.role?.name !== 'STATION_MANAGER' && user.role?.name !== 'ADMIN' && user.role?.name !== 'ORG_MANAGER') {
      user.role = managerRole._id;
      await user.save();
    }

    station.managerId = user._id;
    await station.save();

    return res.status(200).json({
      message: `Đã bổ nhiệm ${user.fullName} làm Trưởng trạm thành công.`,
      manager: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: 'STATION_MANAGER',
      },
      stationId: station._id,
    });
  } catch (error) {
    return next(error);
  }
}

// 3. Gỡ quyền Trưởng trạm
async function removeStationManager(req, res, next) {
  try {
    const { id } = req.params;
    const station = await Station.findById(id);
    if (!station) return res.status(404).json({ error: 'Không tìm thấy trạm.' });

    const organization = await Organization.findById(station.organizationId);
    if (!organization) return res.status(404).json({ error: 'Không tìm thấy tổ chức của trạm.' });

    const isAdmin = req.user.role.name === 'ADMIN';
    const isOrgOwner = String(organization.submittedBy) === String(req.user._id);
    if (!isAdmin && !isOrgOwner) {
      return res.status(403).json({ error: 'Bạn không có quyền quản lý trạm thuộc tổ chức này.' });
    }

    station.managerId = null;
    await station.save();

    return res.status(200).json({
      message: 'Đã gỡ Trưởng trạm khỏi trạm này.',
      stationId: station._id,
    });
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
  createAndAssignStationManager, 
  assignExistingUserAsManager,  
  removeStationManager, 
};