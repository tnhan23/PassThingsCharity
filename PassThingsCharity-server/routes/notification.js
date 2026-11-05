const express = require('express');
const router = express.Router();
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');
const {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controller/notification');

// 1. Admin gửi thông báo (Broadcast hoặc đích danh User)
router.post(
  '/',
  checkBearerToken,
  checkRole(['ADMIN']),
  sendNotification
);

// 2. Mọi người dùng đã đăng nhập lấy danh sách thông báo và số lượng chưa đọc (cho chuông thông báo)
router.get(
  '/me',
  checkBearerToken,
  getMyNotifications
);

// 3. Đánh dấu tất cả thông báo là đã đọc
router.patch(
  '/me/read-all',
  checkBearerToken,
  markAllAsRead
);

// 4. Đánh dấu 1 thông báo cụ thể là đã đọc
router.patch(
  '/:id/read',
  checkBearerToken,
  markAsRead
);

module.exports = router;

