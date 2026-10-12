const express = require('express');
const router = express.Router();
const {getUser,createUser,deleteUser,updateUser}=require("../controller/user");
const {assignStationManager}=require('../controller/adminUser')
const checkRole=require('../middleware/checkRole')
const checkBearerToken=require('../middleware/checkBearerToken')
router.get('/',checkBearerToken,checkRole(['ADMIN']),getUser)
router.delete('/:id',checkBearerToken,deleteUser)
router.post('/',checkBearerToken,createUser)
router.patch('/:id', checkBearerToken,updateUser);
router.patch('/:id/station-manager',checkBearerToken,checkRole(['ADMIN']),assignStationManager)

module.exports = router;
