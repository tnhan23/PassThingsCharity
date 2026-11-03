const express = require('express');
const router = express.Router();
const {
  registerVolunteer,
  getMyVolunteerRegistrations,
  getCampaignVolunteers,
  updateVolunteerStatus,
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  applyForTask,
  getMyTaskApplications,
  getTaskApplications,
  reviewTaskApplication,
  assignTask,
  checkInTask,
  checkOutTask,
  getMyAssignedTasks,
} = require('../controller/workforce');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// ==============================
// 1. VOLUNTEER REGISTRATIONS (CAMPAIGN LEVEL)
// ==============================

// TNV nộp đơn đăng ký tham gia chiến dịch
router.post('/volunteers/register', checkBearerToken, registerVolunteer);

// TNV xem các đơn đăng ký chiến dịch của chính mình
router.get('/volunteers/me', checkBearerToken, getMyVolunteerRegistrations);

// Quản trị/Staff xem danh sách đăng ký TNV của chiến dịch
router.get(
  '/volunteers/campaign/:campaignId',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  getCampaignVolunteers
);

// Duyệt hoặc từ chối đơn đăng ký TNV chiến dịch
router.patch(
  '/volunteers/:id/status',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  updateVolunteerStatus
);

// ==============================
// 2. TASK APPLICATIONS (TASK LEVEL RECRUITMENT)
// ==============================

// TNV xem các đơn ứng tuyển nhiệm vụ của bản thân
router.get('/tasks/applications/me', checkBearerToken, getMyTaskApplications);

// TNV nộp đơn ứng tuyển cho một nhiệm vụ cụ thể
router.post('/tasks/:taskId/apply', checkBearerToken, applyForTask);

// Quản trị/Staff xem danh sách ứng tuyển của một nhiệm vụ
router.get(
  '/tasks/:taskId/applications',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  getTaskApplications
);

// Quản trị/Staff duyệt hoặc từ chối đơn ứng tuyển nhiệm vụ
router.patch(
  '/tasks/applications/:id/review',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  reviewTaskApplication
);

// ==============================
// 3. TASKS & MANUAL ASSIGNMENTS
// ==============================

// Xem danh sách nhiệm vụ của bản thân đã được phân công
router.get('/tasks/me', checkBearerToken, getMyAssignedTasks);

// Tạo nhiệm vụ mới tại trạm
router.post(
  '/tasks',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  createTask
);

// Lấy danh sách nhiệm vụ
router.get('/tasks', checkBearerToken, getAllTasks);

// Lấy chi tiết một nhiệm vụ
router.get('/tasks/:id', checkBearerToken, getTaskById);

// Cập nhật thông tin hoặc trạng thái nhiệm vụ
router.patch(
  '/tasks/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  updateTask
);

// Phân công nhiệm vụ thủ công cho Staff hoặc TNV
router.post(
  '/tasks/assign',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  assignTask
);

// ==============================
// 4. ATTENDANCE & TIME TRACKING
// ==============================

// Điểm danh vào ca làm việc
router.post('/tasks/check-in', checkBearerToken, checkInTask);

// Điểm danh kết thúc ca, ghi nhận giờ làm và tự động cộng điểm thưởng
router.post('/tasks/check-out', checkBearerToken, checkOutTask);

module.exports = router;
