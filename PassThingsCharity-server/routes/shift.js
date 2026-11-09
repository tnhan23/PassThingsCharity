const express = require('express');
const router = express.Router();
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Require đúng tên file shiftTemplate
const { getSharedShiftTemplates } = require('../controller/shiftTemplate');
router.get('/shift-templates', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'ORG_MANAGER', 'STAFF']), getSharedShiftTemplates);
const {
  createSchedule,
  createScheduleBatch,
  getStationSchedules,
  checkInShift,
  checkOutShift,
} = require('../controller/shiftSchedules');
router.post('/:stationId/schedules', checkBearerToken, checkRole(['STATION_MANAGER', 'ORG_MANAGER']), createSchedule);
router.post('/:stationId/schedules/batch', checkBearerToken, checkRole(['STATION_MANAGER', 'ORG_MANAGER']), createScheduleBatch);
// Xem lịch phân ca của trạm
router.get('/:stationId/schedules', checkBearerToken, checkRole(['STATION_MANAGER', 'ORG_MANAGER', 'STAFF']), getStationSchedules);
// Staff điểm danh vào ca & tan ca
router.post('/schedules/:id/check-in', checkBearerToken, checkRole(['STAFF']), checkInShift);
router.post('/schedules/:id/check-out', checkBearerToken, checkRole(['STAFF']), checkOutShift);

// QR & GPS proximity cho ca trực
const qrAndProximity = require('../services/qrAndProximity');
router.get('/:stationId/qr', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'ORG_MANAGER', 'STAFF']), qrAndProximity.getStationQr);
router.get('/schedules/:id/qr', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'ORG_MANAGER', 'STAFF']), qrAndProximity.getShiftScheduleQr);

module.exports = router;
