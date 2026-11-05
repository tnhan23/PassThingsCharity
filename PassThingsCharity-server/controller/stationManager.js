const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/user');
const Role = require('../models/role');
const Organization = require('../models/organization');
const Station = require('../models/station')
const StationStaff = require('../models/stationstaff');
async function managerCanUseStation(userId, stationId) {
  const station = await Station.findById(stationId);

  if (!station) {
    return { error: 'Không tìm thấy trạm.' };
  }

  if (!station.isActive) {
    return { error: 'Trạm chưa được Admin duyệt.' };
  }

  const organization = await Organization.findById(station.organizationId);

  if (!organization) {
    return { error: 'Không tìm thấy tổ chức của trạm.' };
  }

  if (!organization.isVerified) {
    return { error: 'Tổ chức chưa được Admin duyệt.' };
  }

  const isStationManager = station.managerId && String(station.managerId) === String(userId);
  const isOrgOwner = String(organization.submittedBy) === String(userId);
  if (!isStationManager && !isOrgOwner) {
    return { error: 'Bạn không quản lý trạm này.' };
  }

  return { station };
}
async function createStaff(req, res, next) {
  try {
    const { stationId } = req.params;
    const body = req.body || {};
    const fields = ['userId', 'email', 'phone', 'identifier'];
    const supplied = fields.filter(field => body[field] !== undefined);
    if (!mongoose.isValidObjectId(stationId) || supplied.length !== 1 || Object.keys(body).some(field => !fields.includes(field))) {
      return res.status(400).json({ error: 'ID trạm phải hợp lệ và chỉ gửi một trong các trường userId, email, phone hoặc identifier. Không gửi thông tin tạo tài khoản.' });
    }
    const field = supplied[0];
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return res.status(400).json({ error: 'ID người dùng, email hoặc số điện thoại phải là chuỗi không để trống.' });
    }
    const value = body[field].trim();
    let filter;
    if (field === 'userId' || (field === 'identifier' && mongoose.isValidObjectId(value))) {
      if (!mongoose.isValidObjectId(value)) return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
      filter = { _id: value };
    } else if (field === 'email' || (field === 'identifier' && value.includes('@'))) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return res.status(400).json({ error: 'Email không hợp lệ.' });
      filter = { email: value.toLowerCase() };
    } else {
      if (!/^\d{10}$/.test(value)) return res.status(400).json({ error: 'Số điện thoại phải gồm đúng 10 chữ số.' });
      filter = { phone: value };
    }
    const access = await managerCanUseStation(req.user._id, stationId);
    if (access.error) return res.status(403).json({ error: access.error });
    let response;
    await mongoose.connection.transaction(async session => {
      const accounts = await User.find(filter).limit(2).session(session).populate('role', 'name');
      if (!accounts.length) throw Object.assign(new Error('Không tìm thấy tài khoản. Người dùng cần đăng ký tài khoản trước.'), { status: 404 });
      if (accounts.length > 1) throw Object.assign(new Error('Có nhiều tài khoản dùng số điện thoại này. Vui lòng tìm bằng ID người dùng hoặc email.'), { status: 409 });
      const staff = accounts[0];
      if (staff.status !== 'active') throw Object.assign(new Error('Chỉ có thể thêm tài khoản đang hoạt động vào trạm.'), { status: 409 });
      if (!['USER', 'STAFF'].includes(staff.role?.name)) throw Object.assign(new Error('Chỉ có thể thêm tài khoản có role USER hoặc STAFF. Không thể đổi role tài khoản quản lý bằng API này.'), { status: 409 });
      const existing = await StationStaff.findOne({ stationId: access.station._id, userId: staff._id }).session(session);
      if (existing) throw Object.assign(new Error('Nhân viên này đã thuộc trạm.'), { status: 409 });
      const staffRole = await Role.findOne({ name: 'STAFF' }).session(session);
      if (!staffRole) throw Object.assign(new Error('Chưa cấu hình role STAFF trong hệ thống.'), { status: 500 });
      if (staff.role.name === 'USER') {
        staff.role = staffRole._id;
        await staff.save({ session });
      }
      await StationStaff.create([{ stationId: access.station._id, userId: staff._id }], { session });
      response = { message: 'Đã thêm vào trạm thành công.', user: {
        id: staff._id, username: staff.username, fullName: staff.fullName, email: staff.email,
        phone: staff.phone, role: 'STAFF', stationId: access.station._id,
      } };
    });
    return res.status(201).json(response);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Nhân viên này đã thuộc trạm.' });
    return next(error);
  }
}
async function getStaff(req, res, next) {
  try {
    const { stationId } = req.params;

    if (!mongoose.isValidObjectId(stationId)) {
      return res.status(400).json({ error: 'Station ID không hợp lệ.' });
    }

    const access = await managerCanUseStation(req.user._id, stationId);

    if (access.error) {
      return res.status(403).json({ error: access.error });
    }

    const staffRole = await Role.findOne({ name: 'STAFF' });

    if (!staffRole) {
      return res.status(500).json({
        error: 'Chưa có role STAFF trong hệ thống.',
      });
    }

    const assignments = await StationStaff.find({
      stationId: access.station._id,
    }).populate({
      path: 'userId',
      match: { role: staffRole._id },
      select: 'username fullName email phone status',
    });

    const staff = assignments
      .filter((assignment) => assignment.userId)
      .map((assignment) => ({
        ...assignment.userId.toObject(),
        assignedAt: assignment.assignedAt,
      }));

    return res.status(200).json({ data: staff });
  } catch (error) {
    return next(error);
  }
}
async function deleteStaff(req, res, next) {
  try {
    const { stationId, staffId } = req.params;

    if (
      !mongoose.isValidObjectId(stationId) ||
      !mongoose.isValidObjectId(staffId)
    ) {
      return res.status(400).json({
        error: 'Station ID hoặc Staff ID không hợp lệ.',
      });
    }

    const access = await managerCanUseStation(req.user._id, stationId);

    if (access.error) {
      return res.status(403).json({ error: access.error });
    }

    const staffRole = await Role.findOne({ name: 'STAFF' });

    if (!staffRole) {
      return res.status(500).json({
        error: 'Chưa có role STAFF trong hệ thống.',
      });
    }

    const staff = await User.findOne({
      _id: staffId,
      role: staffRole._id,
    });

    if (!staff) {
      return res.status(404).json({
        error: 'Không tìm thấy tài khoản STAFF.',
      });
    }

    const result = await StationStaff.deleteOne({
      stationId: access.station._id,
      userId: staff._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Staff này chưa được gán vào trạm.',
      });
    }

    return res.status(200).json({
      message: 'Đã gỡ Staff khỏi trạm. Tài khoản vẫn được giữ lại.',
      user: {
        id: staff._id,
        username: staff.username,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStaff(req, res, next) {
  try {
    const { stationId, staffId } = req.params;
    const { fullName, phone, email, password, status } = req.body || {};

    if (
      !mongoose.isValidObjectId(stationId) ||
      !mongoose.isValidObjectId(staffId)
    ) {
      return res.status(400).json({
        error: 'Station ID hoặc Staff ID không hợp lệ.',
      });
    }

    const access = await managerCanUseStation(req.user._id, stationId);
    if (access.error) {
      return res.status(403).json({ error: access.error });
    }

    const assignment = await StationStaff.findOne({
      stationId: access.station._id,
      userId: staffId,
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'Nhân viên này không thuộc trạm của bạn.',
      });
    }

    const staffRole = await Role.findOne({ name: 'STAFF' });
    const staff = await User.findOne({
      _id: staffId,
      role: staffRole ? staffRole._id : undefined,
    });

    if (!staff) {
      return res.status(404).json({
        error: 'Không tìm thấy tài khoản nhân viên.',
      });
    }

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({ error: 'Họ tên không hợp lệ.' });
      }
      staff.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())) {
        return res.status(400).json({ error: 'Số điện thoại phải gồm đúng 10 chữ số.' });
      }
      staff.phone = phone.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'Email không hợp lệ.' });
      }
      staff.email = email.trim().toLowerCase();
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      }
      staff.password = await bcrypt.hash(password, 12);
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Trạng thái chỉ có thể là active hoặc inactive.' });
      }
      staff.status = status;
    }

    await staff.save();

    return res.status(200).json({
      message: 'Đã cập nhật thông tin nhân viên thành công.',
      user: {
        id: staff._id,
        username: staff.username,
        fullName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        status: staff.status,
        role: 'STAFF',
        stationId: access.station._id,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email đã được sử dụng bởi tài khoản khác.',
      });
    }
    return next(error);
  }
}

module.exports = {
  createStaff,
  getStaff,
  updateStaff,
  deleteStaff,
};
