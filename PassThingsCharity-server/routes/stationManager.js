const express = require('express');
const router = express.Router();
const {
  createStaff,
  getStaff,
  deleteStaff
} = require('../controller/stationManager');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');
router.post(
  '/:stationId/staff',
  checkBearerToken,
  checkRole(['STATION_MANAGER']),
  createStaff
);
router.get(
  '/:stationId/staff',
  checkBearerToken,
  checkRole(['STATION_MANAGER']),
  getStaff
);
router.delete(
  '/:stationId/staff/:staffId',
  checkBearerToken,
  checkRole(['STATION_MANAGER']),
  deleteStaff
);
module.exports = router;