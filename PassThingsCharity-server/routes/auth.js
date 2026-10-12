const express = require('express');
const {
  login,
  register,
  changePassword,
  adminResetPassword,
} = require('../controller/auth');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

const router = express.Router();

router.post('/login', login);
router.post('/register',register)
router.patch('/change-password', checkBearerToken, changePassword);
router.patch(
  '/reset-password/:id',
  checkBearerToken,
  checkRole(['ADMIN']),
  adminResetPassword
);
module.exports = router;
