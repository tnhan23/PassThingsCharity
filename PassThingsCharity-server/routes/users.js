const express = require('express');
const router = express.Router();
const {
  getUser,
  createUser,
  setUserStatus,
  updateMyProfile,
  deleteMyAccount,
}=require("../controller/user");
const {assignStationManager}=require('../controller/adminUser')
const checkRole=require('../middleware/checkRole')
const checkBearerToken=require('../middleware/checkBearerToken')
router.get('/',checkBearerToken,checkRole(['ADMIN']),getUser)
router.delete('/:id',checkBearerToken,deleteMyAccount)
router.patch('/:id/status',checkBearerToken,checkRole(['ADMIN']),setUserStatus)
router.post('/',checkBearerToken,createUser)
router.patch('/me/profile', checkBearerToken, updateMyProfile);
router.patch('/:id/station-manager',checkBearerToken,checkRole(['ADMIN']),assignStationManager)

module.exports = router;
