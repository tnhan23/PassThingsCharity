const Admin=require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Role = require('../models/role');
async function loginAdmin(req, res, next) {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Vui lòng nhập username và password.',
      });
    }

    const admin = await Admin.findOne({ username }).select('+password');
     
    if (!admin) {
      return res.status(401).json({ error: 'Username không tồn tại.' });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
    }

    const token = jwt.sign(
      { userId: admin._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: admin._id,
        username: admin.username,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}
async function registerAdmin(req, res, next) {
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
    const role = await Role.findOne({ name: 'ADMIN' });
    if (!role) {
      return res.status(500).json({
        error: 'Chưa cấu hình role ADMIN trong hệ thống.',
      });
    }
    const admin = await Admin.create({
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
        id: admin._id,
        email: admin.email,
        username: admin.username,
        fullname: admin.fullName,
        phone: admin.phone,
        role: 'ADMIN'
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

    const adminId = (req.user && req.user._id) || (req.admin && req.admin._id);
    const admin = await Admin.findById(adminId).select('+password');

    if (!admin) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, admin.password);

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    const samePassword = await bcrypt.compare(newPassword, admin.password);

    if (samePassword) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      });
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    return res.status(200).json({ message: 'Đã đổi mật khẩu.' });
  } catch (error) {
    return next(error);
  }
}
module.exports={loginAdmin,registerAdmin,changePassword}