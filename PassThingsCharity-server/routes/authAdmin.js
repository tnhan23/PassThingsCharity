const express = require('express');
const {
  loginAdmin,
  registerAdmin,
  changePassword,
} = require('../controller/authAdmin');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');
const router = express.Router();

router.post('/login', loginAdmin);
router.post('/register',registerAdmin)
router.patch('/change-password', checkBearerToken, changePassword);
module.exports = router;
