const express = require('express');
const router = express.Router();

const {
  listStations,
  getStation,
  updateStation,
  deleteStation,
  createStation,
  assignStaffToStation,
  removeStaffFromStation,
} = require('../controller/station');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

router.use(checkBearerToken);

router.get(
  '/',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER']),
  listStations
);

router.get(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER']),
  getStation
);

router.patch(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER']),
  updateStation
);

router.delete(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER']),
  deleteStation
);
router.post('/',checkRole(['ADMIN', 'STATION_MANAGER']),
createStation
);

router.post(
  '/:id/staff/:userId',
  checkRole(['ADMIN', 'STATION_MANAGER']),
  assignStaffToStation
);

router.delete(
  '/:id/staff/:userId',
  checkRole(['ADMIN', 'STATION_MANAGER']),
  removeStaffFromStation
);

module.exports = router;