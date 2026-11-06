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
  checkRole(['ADMIN', 'ORG_MANAGER', 'USER']),
  createUploadHandler('organization-evidence')
);

router.get(
  '/',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'USER']),
  listOrganizations
);

router.get(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'USER']),
  getOrganization
);

router.post(
  '/',
  checkRole(['ADMIN', 'ORG_MANAGER', 'USER']),
  createOrganization
);

router.patch(
  '/:id',
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'USER']),
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
