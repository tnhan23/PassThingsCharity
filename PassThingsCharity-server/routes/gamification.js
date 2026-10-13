const express = require('express');
const router = express.Router();
const {
  awardPoints,
  getUserPoints,
  createAchievement,
  getAllAchievements,
  getUserAchievements,
  issueCertificate,
  getUserCertificates,
} = require('../controller/gamification');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Points
router.get('/points/me', checkBearerToken, getUserPoints);
router.get('/points/user/:userId', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), getUserPoints);
router.post(
  '/points/award',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  awardPoints
);

// Achievements
router.get('/achievements', getAllAchievements);
router.post(
  '/achievements',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  createAchievement
);
router.get('/achievements/me', checkBearerToken, getUserAchievements);
router.get(
  '/achievements/user/:userId',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  getUserAchievements
);

// Certificates
router.get('/certificates/me', checkBearerToken, getUserCertificates);
router.get(
  '/certificates/user/:userId',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  getUserCertificates
);
router.post(
  '/certificates',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER']),
  issueCertificate
);

module.exports = router;
