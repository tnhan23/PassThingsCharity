const mongoose = require('mongoose');
const Notification = require('../models/notification');
const User = require('../models/user');
const Role = require('../models/role');

/**
 * 1. Admin gửi thông báo
 * - Có thể gửi cho 1 cá nhân (userId)
 * - Hoặc phát thông báo cho 1 nhóm vai trò (targetRole: 'USER', 'VOLUNTEER', 'STAFF'...)
 * - Hoặc phát thông báo toàn hệ thống (targetRole: 'ALL')
 */
async function sendNotification(req, res, next) {
  try {
    const { title, content, userId, targetRole = 'ALL', type = 'SYSTEM', metadata } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Tiêu đề thông báo (title) là bắt buộc.' });
    }
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Nội dung thông báo (content) là bắt buộc.' });
    }

    let targetUserId = null;
    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ.' });
      }
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng nhận thông báo.' });
      }
      targetUserId = existingUser._id;
    }

    const validRoles = ['ALL', 'ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER'];
    const formattedTargetRole = String(targetRole).toUpperCase();
    if (!validRoles.includes(formattedTargetRole)) {
      return res.status(400).json({ error: `targetRole không hợp lệ. Cho phép: ${validRoles.join(', ')}` });
    }

    const notification = await Notification.create({
      title: title.trim(),
      content: content.trim(),
      userId: targetUserId,
      targetRole: targetUserId ? null : formattedTargetRole,
      type: ['SYSTEM', 'CAMPAIGN', 'STATION', 'ALERT'].includes(type) ? type : 'SYSTEM',
      metadata: metadata || {},
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: 'Gửi thông báo thành công.',
      data: notification,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * 2. User/Staff/Admin lấy danh sách thông báo của chính mình
 * Lấy các thông báo:
 * - Gửi trực tiếp cho user (userId == req.user._id)
 * - Hoặc gửi cho role của user (targetRole == user.role.name)
 * - Hoặc gửi toàn hệ thống (targetRole == 'ALL')
 */
async function getMyNotifications(req, res, next) {
  try {
    const currentUserId = req.user._id;
    let userRoleName = '';

    if (req.user.role) {
      if (typeof req.user.role === 'object' && req.user.role.name) {
        userRoleName = req.user.role.name;
      } else {
        const roleDoc = await Role.findById(req.user.role);
        if (roleDoc) userRoleName = roleDoc.name;
      }
    }

    const query = {
      $or: [
        { userId: currentUserId },
        { targetRole: 'ALL' },
        ...(userRoleName ? [{ targetRole: userRoleName }] : []),
      ],
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'username fullName');

    // Tính toán trạng thái đã đọc cho từng thông báo đối với user hiện tại
    const data = notifications.map((n) => {
      const isReadForMe = n.userId
        ? n.isRead
        : Array.isArray(n.readBy) && n.readBy.some((id) => String(id) === String(currentUserId));

      return {
        _id: n._id,
        title: n.title,
        content: n.content,
        type: n.type,
        targetRole: n.targetRole,
        metadata: n.metadata,
        isRead: Boolean(isReadForMe),
        createdAt: n.createdAt,
        createdBy: n.createdBy,
      };
    });

    const unreadCount = data.filter((item) => !item.isRead).length;

    return res.status(200).json({
      unreadCount,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * 3. Đánh dấu một thông báo là đã đọc
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID thông báo không hợp lệ.' });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo.' });
    }

    // Nếu là thông báo đích danh
    if (notification.userId) {
      if (String(notification.userId) !== String(currentUserId)) {
        return res.status(403).json({ error: 'Bạn không có quyền thao tác trên thông báo này.' });
      }
      notification.isRead = true;
    } else {
      // Thông báo broadcast: thêm userId vào mảng readBy nếu chưa có
      if (!Array.isArray(notification.readBy)) {
        notification.readBy = [];
      }
      if (!notification.readBy.some((uid) => String(uid) === String(currentUserId))) {
        notification.readBy.push(currentUserId);
      }
    }

    await notification.save();

    return res.status(200).json({
      message: 'Đã đánh dấu thông báo là đã đọc.',
      notificationId: id,
      isRead: true,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * 4. Đánh dấu tất cả thông báo là đã đọc
 */
async function markAllAsRead(req, res, next) {
  try {
    const currentUserId = req.user._id;
    let userRoleName = '';

    if (req.user.role) {
      if (typeof req.user.role === 'object' && req.user.role.name) {
        userRoleName = req.user.role.name;
      } else {
        const roleDoc = await Role.findById(req.user.role);
        if (roleDoc) userRoleName = roleDoc.name;
      }
    }

    // 1. Cập nhật thông báo cá nhân
    await Notification.updateMany(
      { userId: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Cập nhật thông báo Broadcast
    const broadcastFilter = {
      userId: null,
      $or: [
        { targetRole: 'ALL' },
        ...(userRoleName ? [{ targetRole: userRoleName }] : []),
      ],
      readBy: { $ne: currentUserId },
    };

    await Notification.updateMany(broadcastFilter, {
      $addToSet: { readBy: currentUserId },
    });

    return res.status(200).json({
      message: 'Đã đánh dấu tất cả thông báo là đã đọc.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};

