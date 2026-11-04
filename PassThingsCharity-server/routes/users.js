const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  listUsers,
  setUserStatus,
} = require("../controller/user");
const { assignStationManager } = require('../controller/adminUser')
const checkRole = require('../middleware/checkRole')
const checkBearerToken = require('../middleware/checkBearerToken')
router.get('/', checkBearerToken, checkRole(['ADMIN']), listUsers);
router.patch('/:id/status', checkBearerToken, checkRole(['ADMIN']), setUserStatus);
router.delete('/:id', checkBearerToken, deleteMyAccount)
router.get('/me/profile', checkBearerToken, getMyProfile);
router.patch('/me/profile', checkBearerToken, updateMyProfile);
router.patch('/:id/station-manager', checkBearerToken, checkRole(['ADMIN']), assignStationManager)
module.exports = router;
