const express = require('express');
const {
  login,
  register,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controller/auth');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

router.post('/login', login);
router.post('/register', register)
router.patch('/change-password', checkBearerToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
module.exports = router;
