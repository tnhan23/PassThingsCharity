const express = require('express');
const router = express.Router();
const {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
  addCampaignItem,
  removeCampaignItem,
  assignStationToCampaign,
  removeStationFromCampaign,
  findStationsForCampaign,
} = require('../controller/campaign');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Campaign CRUD
router.get('/', getAllCampaigns);
router.get('/:id', getCampaignById);
router.post(
  '/',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  createCampaign
);
router.patch(
  '/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  updateCampaign
);
router.patch(
  '/:id/status',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  updateCampaignStatus
);

// Campaign Items Configuration
router.post(
  '/:id/items',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  addCampaignItem
);
router.delete(
  '/:id/items/:itemId',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  removeCampaignItem
);

// Campaign Stations Assignment
router.post(
  '/:id/stations',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  assignStationToCampaign
);
router.delete(
  '/:id/stations/:stationId',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  removeStationFromCampaign
);
router.get('/:id/stations', findStationsForCampaign);

module.exports = router;
