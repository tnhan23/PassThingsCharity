const express = require('express');
const router = express.Router();
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Require đúng tên file shiftTemplate
const { createShiftTemplate, getShiftTemplatesByStation, getSharedShiftTemplates } = require('../controller/shiftTemplate');
router.get('/shift-templates', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'ORG_MANAGER', 'STAFF']), getSharedShiftTemplates);
const {
  createSchedule,
  createScheduleBatch,
  getStationSchedules,
  checkInShift,
  checkOutShift,
} = require('../controller/shiftSchedules');
// Tạo ca mẫu mới cho trạm
router.post(
  '/:stationId/shift-templates',
  checkBearerToken,
  checkRole(['STATION_MANAGER', 'ORG_MANAGER']),
  createShiftTemplate
);

// Lấy danh sách các ca mẫu của trạm
router.get(
  '/:stationId/shift-templates',
  checkBearerToken,
  checkRole(['STATION_MANAGER', 'ORG_MANAGER', 'STAFF']),
  getShiftTemplatesByStation
);
// Trưởng trạm phân ca
router.post('/:stationId/schedules', checkBearerToken, checkRole(['STATION_MANAGER', 'ORG_MANAGER']), createSchedule);
router.post('/:stationId/schedules/batch', checkBearerToken, checkRole(['STATION_MANAGER', 'ORG_MANAGER']), createScheduleBatch);
// Xem lịch phân ca của trạm
router.get('/:stationId/schedules', checkBearerToken, checkRole(['STATION_MANAGER', 'ORG_MANAGER', 'STAFF']), getStationSchedules);
// Staff điểm danh vào ca & tan ca
router.post('/schedules/:id/check-in', checkBearerToken, checkRole(['STAFF']), checkInShift);
router.post('/schedules/:id/check-out', checkBearerToken, checkRole(['STAFF']), checkOutShift);

module.exports = router;
