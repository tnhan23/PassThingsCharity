const express = require('express');
const router = express.Router();

const {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} = require('../controller/organization');
const { createStation } = require('../controller/station');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

router.use(checkBearerToken);

router.get(
  '/',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER']),
  listOrganizations
);

router.get(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER']),
  getOrganization
);

router.post(
  '/',
  checkRole(['ADMIN', 'ORG_MANAGER', 'USER']),
  createOrganization
);

router.patch(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER']),
  updateOrganization
);

router.delete(
  '/:id',
  checkRole(['ADMIN', 'STATION_MANAGER']),
  deleteOrganization
);

router.post(
  '/:organizationId/stations',
  checkRole(['ADMIN', 'STATION_MANAGER','ORG_MANAGER']),
  createStation
);

module.exports = router;