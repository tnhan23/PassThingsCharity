const User = require('../models/user');
const Role = require('../models/role');
const mongoose = require('mongoose');
async function assignStationManager(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }
    const user = await User.findById(id).populate('role', 'name');
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user.' });
    }

    if (!user.role || user.role.name !== 'USER') {
      return res.status(409).json({
        error: 'Chỉ có thể nâng tài khoản đang có role USER.',
      });
    }
    const managerRole = await Role.findOne({ name: 'STATION_MANAGER' });
    if (!managerRole) {
      return res.status(500).json({
        error: 'Chưa có role STATION_MANAGER trong collection roles.',
      });
    }

    user.role = managerRole._id;
    await user.save();
    return res.status(200).json({
      message: 'Đã cấp role STATION_MANAGER và gán trạm',
      user: {
        id: user._id,
        username: user.username,
        role: 'STATION_MANAGER',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'User đã được gán vào trạm này.',
      });
    }
    return next(error);
  }
}
module.exports = { assignStationManager }