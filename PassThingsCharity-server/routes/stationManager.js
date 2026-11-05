const express = require('express');
const router = express.Router();
const {
  createStaff,
  getStaff,
  updateStaff,
  deleteStaff,
} = require('../controller/stationManager');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

router.post(
  '/:stationId/staff',
  checkBearerToken,
  checkRole(['STATION_MANAGER', 'ORG_MANAGER']),
  createStaff
);

router.get(
  '/:stationId/staff',
  checkBearerToken,
  checkRole(['STATION_MANAGER', 'ORG_MANAGER']),
  getStaff
);

router.patch(
  '/:stationId/staff/:staffId',
  checkBearerToken,
  checkRole(['STATION_MANAGER', 'ORG_MANAGER']),
  updateStaff
);

router.delete(
  '/:stationId/staff/:staffId',
  checkBearerToken,
  checkRole(['STATION_MANAGER', 'ORG_MANAGER']),
  deleteStaff
);

module.exports = router;