const express = require('express');
const router = express.Router();
const {
  awardPoints,
  getUserPoints,
  createAchievement,
  updateAchievement,
  getAllAchievements,
  getUserAchievements,
  issueCertificate,
  getUserCertificates,
  downloadCertificatePdf,
} = require('../controller/gamification');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Points
router.get('/points/me', checkBearerToken, getUserPoints);
router.get(
  '/points/user/:userId',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF']),
  getUserPoints
);
router.post(
  '/points/award',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF']),
  awardPoints
);

// Achievements
router.patch('/achievements/:id', checkBearerToken, checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']), updateAchievement);
router.get('/achievements', getAllAchievements);
router.post(
  '/achievements',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  createAchievement
);
router.get('/achievements/me', checkBearerToken, getUserAchievements);
router.get(
  '/achievements/user/:userId',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF']),
  getUserAchievements
);

// Certificates
router.get('/certificates/me', checkBearerToken, getUserCertificates);
router.get('/certificates/:id/pdf', checkBearerToken, downloadCertificatePdf);
router.get(
  '/certificates/user/:userId',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF']),
  getUserCertificates
);
router.post(
  '/certificates',
  checkBearerToken,
  checkRole(['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER']),
  issueCertificate
);

module.exports = router;
