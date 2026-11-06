const mongoose = require('mongoose');

/**
 * Notification Schema
 * Lưu trữ thông báo của hệ thống (Do Admin phát đi hoặc gửi đích danh cho User)
 */
const notificationSchema = new mongoose.Schema(
  {
    // Người nhận cụ thể (nếu là null thì là thông báo Broadcast gửi theo role hoặc toàn bộ hệ thống)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Đối tượng nhận thông báo theo vai trò (ALL = Tất cả người dùng)
    targetRole: {
      type: String,
      enum: ['ALL', 'ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER'],
      default: 'ALL',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề thông báo là bắt buộc.'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Nội dung thông báo là bắt buộc.'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['SYSTEM', 'CAMPAIGN', 'STATION', 'ALERT'],
      default: 'SYSTEM',
    },
    // Trạng thái đã đọc (áp dụng cho thông báo cá nhân)
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Danh sách các User đã đọc (dùng cho thông báo Broadcast targetRole/ALL)
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Dữ liệu đính kèm tùy chọn (ví dụ: campaignId, stationId để app điều hướng khi nhấn vào thông báo)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');

