const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');
const Role = require('../models/role');
const Admin=require('../models/admin');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Vui lòng nhập username và password.',
      });
    }

    // 1. Tìm trong bảng User trước, nếu không có mới tìm sang bảng Admin
    let account = await User.findOne({ username }).select('+password');
    let isAdmin = false;

    if (!account) {
      account = await Admin.findOne({ username }).select('+password');
      isAdmin = true;
    }

    // 2. Kiểm tra sự tồn tại và trạng thái (chỉ áp dụng check status cho User nếu Admin không có trường status)
    if (!account || (!isAdmin && account.status !== 'active')) {
      return res.status(401).json({ error: 'Username không tồn tại hoặc đã bị khóa.' });
    }

    // 3. So sánh mật khẩu với biến account chung
    const passwordMatches = await bcrypt.compare(password, account.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
    }

    if (!isAdmin && account.role) {
      await account.populate('role');
    }
    const role = isAdmin ? 'ADMIN' : (account.role && account.role.name) || 'USER';

    // 4. Tạo token (nên đính kèm role vào payload để phân quyền ở các middleware sau)
    const token = jwt.sign(
      { userId: account._id.toString(), role: role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Trả về JSON
    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: account._id,
        username: account.username,
        phone: account.phone || null, // Phòng trường hợp model Admin không có sđt
        email: account.email || null,
        fullName: account.fullName || null,
        avatarUrl: account.avatarUrl || null,
        role: role,
      },
    });
  } catch (error) {
    next(error);
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

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    const message = 'Nếu email tồn tại, mã xác nhận đã được gửi.';

    if (!email || typeof email !== 'string') {
      return res.status(200).json({ message });
    }
    
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(200).json({ message });


    const otp = crypto.randomInt(100000, 1000000).toString(); // 6 chữ số
    user.resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    await user.save();

    await sendMail(
      user.email,
      'Mã đặt lại mật khẩu - PassThingsCharity',
      `<p>Chào bạn,</p>
       <p>Mã OTP đặt lại mật khẩu của bạn là: <b style="font-size: 18px; color: #2563eb;">${otp}</b></p>
       <p>Mã này có hiệu lực trong vòng <b>10 phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>`
    );

    return res.status(200).json({ message });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body || {};

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Vui lòng cung cấp email và mã OTP hợp lệ.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const hashed = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Mã OTP không đúng hoặc đã hết hạn.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Đặt lại mật khẩu thành công.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, register, changePassword, forgotPassword, resetPassword };
