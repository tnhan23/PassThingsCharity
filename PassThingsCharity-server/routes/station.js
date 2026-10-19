const express = require('express');
const router = express.Router();

const {
  listStations,
  getStation,
  updateStation,
  deleteStation,
  assignStaffToStation,
  removeStaffFromStation,
  createAndAssignStationManager, 
  assignExistingUserAsManager,  
  removeStationManager, 
} = require('../controller/station');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

router.use(checkBearerToken);

router.get(
  '/',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER', 'ORG_MANAGER']),
  listStations
);

router.get(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER', 'ORG_MANAGER']),
  getStation
);

router.patch(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER']),
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

module.exports = router;