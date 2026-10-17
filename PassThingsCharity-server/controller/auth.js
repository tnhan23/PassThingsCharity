const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');
const Role = require('../models/role');
const Admin=require('../models/admin');
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Vui lòng nhập username và password.',
      });
    }

    const user = await User.findOne({ username }).select('+password');
     
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Username không tồn tại.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}
async function register(req, res, next) {
  try {
    const body = req.body || {};
    const { email, username, password, fullname, phone } = body;
    if (typeof email !== 'string' || !email.trim() ||
      typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password ||
      typeof fullname !== 'string' || !fullname.trim() ||
      typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())
    ) {
      return res.status(400).json({
        error: 'Vui lòng nhập email, username, password và fullname.',
      });
    }
    const role = await Role.findOne({ name: 'USER' });
    if (!role) {
      return res.status(500).json({
        error: 'Chưa cấu hình role USER trong hệ thống.',
      });
    }
    const user = await User.create({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: await bcrypt.hash(password, 12),
      fullName: fullname.trim(),
      phone: phone.trim(),
      role: role._id
    });
    return res.status(201).json({
      message: 'Đăng ký thành công.',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullname: user.fullname,
        phone: user.phone,
        role: 'USER'
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email hoặc username đã được sử dụng.',
      });
    }
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (
      typeof currentPassword !== 'string' ||
      !currentPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        error: 'Nhập mật khẩu hiện tại và mật khẩu mới tối thiểu 8 ký tự.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({ message: 'Đã đổi mật khẩu.' });
  } catch (error) {
    return next(error);
  }
}

async function adminResetPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải có ít nhất 8 ký tự.',
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({
      message: 'Đã đặt lại mật khẩu sau khi xác minh người dùng.',
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, register, changePassword, adminResetPassword };
