const User=require('../models/user');
const Role=require('../models/role');
const mongoose  = require('mongoose');
const bcrypt = require('bcryptjs');
async function updateMyProfile(req, res, next) {
  try {
    const { email, username, fullName, phone } = req.body || {};

    if (
      email === undefined &&
      username === undefined &&
      fullName === undefined &&
      phone === undefined
    ) {
      return res.status(400).json({
        error: 'Cần gửi ít nhất một thông tin hồ sơ cần cập nhật.',
      });
    }

    if (email !== undefined &&
        (typeof email !== 'string' || !email.trim())) {
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    }

    if (username !== undefined &&
        (typeof username !== 'string' || !username.trim())) {
      return res.status(400).json({ error: 'Username không hợp lệ.' });
    }

    if (fullName !== undefined &&
        (typeof fullName !== 'string' || !fullName.trim())) {
      return res.status(400).json({ error: 'Họ tên không hợp lệ.' });
    }

    if (phone !== undefined &&
        (typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim()))) {
      return res.status(400).json({
        error: 'Phone phải gồm đúng 10 chữ số.',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    if (email !== undefined) {
      user.email = email.trim().toLowerCase();
    }
    if (username !== undefined) {
      user.username = username.trim();
    }
    if (fullName !== undefined) {
      user.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    await user.save();
    await user.populate('role', 'name');

    return res.status(200).json({
      message: 'Đã cập nhật hồ sơ.',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role?.name,
        status: user.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email hoặc username đã được sử dụng.',
      });
    }
    return next(error);
  }
}
async function deleteMyAccount(req, res, next) {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }

    if (String(req.user._id) !== id) {
      return res.status(403).json({
        error: 'Bạn chỉ có thể xóa tài khoản của chính mình.',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        error: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.',
      });
    }

    const user = await User.findById(id).select('+password');

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
    }

    await user.deleteOne();

    return res.status(200).json({
      message: 'Tài khoản của bạn đã được xóa vĩnh viễn.',
    });
  } catch (error) {
    return next(error);
  }
}
module.exports={
  updateMyProfile,
  deleteMyAccount
 
};