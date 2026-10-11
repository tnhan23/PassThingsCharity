const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/user');
const Role = require('../models/role');
const Organization = require('../models/organization');
const Station=require('../models/station')
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

  if (String(organization.submittedBy) !== String(userId)) {
    return { error: 'Bạn không quản lý trạm này.' };
  }

  return { station };
}
async function createStaff(req,res,next){
    try{
        const {stationId}=req.params;
        const {email,username,password,fullName,phone}=req.body || {};
      if(
        !mongoose.isValidObjectId(stationId) ||
      typeof email !== 'string' || !email.trim() ||
      typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password ||
      typeof fullName !== 'string' || !fullName.trim() ||
      typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())
      )
      {
        return res.status(400).json({
        error: 'Thông tin không hợp lệ; phone phải gồm đúng 10 chữ số.',
        })
    }
     const access = await managerCanUseStation(req.user._id, stationId);
    if (access.error) {
      return res.status(403).json({ error: access.error });
    }

    const staffRole = await Role.findOne({ name: 'STAFF' });
    if (!staffRole) {
      return res.status(500).json({
        error: 'Chưa có role STAFF trong collection roles.',
      });
    }
    const staff=await User.create({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: await bcrypt.hash(password, 12),
      fullName: fullName.trim(),
      phone: phone.trim(),
      role: staffRole._id,
    });
    await StationStaff.create({
          stationId: access.station._id,
           userId: staff._id,
    });
 return res.status(201).json({
      message: 'Đã tạo tài khoản STAFF.',
      user: {
        id: staff._id,
        username: staff.username,
        fullName: staff.fullName,
        role: 'STAFF',
        stationId: access.station._id,
      },
    });
}catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email hoặc username đã được sử dụng.',
      });
    }
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

module.exports = {
  createStaff,getStaff,deleteStaff
};
