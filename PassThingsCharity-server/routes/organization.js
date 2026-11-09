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
const { createUploadHandler } = require('../utils/contributionUpload');

router.use(checkBearerToken);

router.post(
  '/upload-evidence',
  checkRole(['ADMIN', 'ORG_MANAGER', 'USER', 'VOLUNTEER']),
  createUploadHandler('organization-evidence')
);

router.get(
  '/',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']),
  listOrganizations
);

router.get(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']),
  getOrganization
);

router.post(
  '/',
  checkRole(['ADMIN', 'ORG_MANAGER', 'USER', 'VOLUNTEER']),
  createOrganization
);

router.patch(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'USER', 'VOLUNTEER']),
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
