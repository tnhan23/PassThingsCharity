const User=require('../models/user');
const Role=require('../models/role');
const mongoose  = require('mongoose');
const bcrypt = require('bcryptjs');
const resourceImageFields = require('../utils/resourceImageFields');
const PointTransaction = require('../models/pointTransaction');
const UserAchievement = require('../models/userAchievement');
const Certificate = require('../models/certificate');
async function getMyProfile(req, res, next) {
  // checkBearerToken has already loaded this account and populated its role.
  // Explicitly list public profile fields instead of serializing the account.
  try {
    const user = req.user;
    const [transactions, achievements, certificates] = await Promise.all([
      PointTransaction.find({ userId: user._id }).sort({ createdAt: -1 }),
      UserAchievement.find({ userId: user._id }).populate('achievementId').sort({ unlockedAt: -1 }),
      Certificate.find({ userId: user._id }).populate('campaignId', 'title').sort({ issueDate: -1 }),
    ]);

    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        role: user.role?.name,
        status: user.status || null,
      },
      gamification: {
        totalPoints: transactions.reduce((total, transaction) => total + transaction.points, 0),
        pointTransactions: transactions,
        unlockedAchievements: achievements,
        certificates: certificates.map((certificate) => ({
          ...certificate.toObject(),
          ...(certificate.certificateType === 'MILESTONE'
            ? { pdfDownloadUrl: `/gamification/certificates/${certificate._id}/pdf` }
            : {}),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const { email, username, fullName, phone, avatarUrl } = req.body || {};
    const imageFields = resourceImageFields(req.body || {}, 'avatarUrl');

    if (
      email === undefined &&
      username === undefined &&
      fullName === undefined &&
      phone === undefined &&
      avatarUrl === undefined
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
    if (avatarUrl !== undefined) {
      user.avatarUrl = imageFields.avatarUrl;
      // A URL supplied with the form has no verified Cloudinary public ID.
      if (user.isModified('avatarUrl')) user.imagePublicId = null;
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
        avatarUrl: user.avatarUrl,
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
async function listUsers(req, res, next) {
  try {
    const users = await User.find()
      .populate('role', 'name')
      .sort({ createdAt: -1 });
    return res.status(200).json({
      data: users.map((user) => ({
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        status: user.status,
        role: user.role && user.role.name ? user.role.name : '',
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function setUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }
    if (status !== 'active' && status !== 'banned') {
      return res.status(400).json({ error: 'Trạng thái chỉ được là active hoặc banned.' });
    }
    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ error: 'Không khóa tài khoản đang đăng nhập.' });
    }
    const user = await User.findById(id).populate('role', 'name');
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }
    if (user.role && user.role.name === 'ADMIN') {
      return res.status(400).json({ error: 'Không khóa tài khoản quản trị.' });
    }
    user.status = status;
    await user.save();
    return res.status(200).json({
      message: status === 'banned' ? 'Đã khóa tài khoản.' : 'Đã mở lại tài khoản.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports={
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  listUsers,
  setUserStatus,
};
