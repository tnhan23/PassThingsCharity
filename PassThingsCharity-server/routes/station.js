const express = require('express');
const router = express.Router();

const {
  listStations,
  getStation,
  getNearbyStations,
  updateStation,
  deleteStation,
  assignStaffToStation,
  removeStaffFromStation,
  createAndAssignStationManager, 
  assignExistingUserAsManager,  
  removeStationManager, 
} = require('../controller/station');
const checkBearerToken = require('../middleware/checkBearerToken');
const optionalBearerToken = require('../middleware/optionalBearerToken');
const checkRole = require('../middleware/checkRole');

// Public / Optional authentication route (Must be defined before checkBearerToken middleware)
router.get('/nearby', optionalBearerToken, getNearbyStations);

router.use(checkBearerToken);

router.get(
  '/',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER', 'ORG_MANAGER']),
  listStations
);

router.get(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER', 'ORG_MANAGER']),
  getStation
);

router.patch(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  updateStation
);

router.delete(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER']),
  deleteStation
);
router.post(
  '/:id/staff/:userId',
  checkRole(['ADMIN', 'STATION_MANAGER', 'ORG_MANAGER']),
  assignStaffToStation
);

router.delete(
  '/:id/staff/:userId',
  checkRole(['ADMIN', 'STATION_MANAGER', 'ORG_MANAGER']),
  removeStaffFromStation
);

router.post(
  '/:id/manager',
  checkRole(['ADMIN', 'ORG_MANAGER']),
  createAndAssignStationManager
);

router.patch(
  '/:id/manager',
  checkRole(['ADMIN', 'ORG_MANAGER']),
  assignExistingUserAsManager
);

router.delete(
  '/:id/manager',
  checkRole(['ADMIN','ORG_MANAGER']),
  removeStationManager
);

const qrAndProximity = require('../services/qrAndProximity');
router.get(
  '/:id/qr',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER', 'ORG_MANAGER']),
  qrAndProximity.getStationQr
);
router.post(
  '/:id/verify-proximity',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER', 'ORG_MANAGER']),
  qrAndProximity.checkStationProximityEndpoint
);

module.exports = router;
