const express = require('express');
const router = express.Router();

const {
  approveOrganization,
  approveStation,
} = require('../controller/adminApproval');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

router.use(checkBearerToken, checkRole(['ADMIN']));

router.patch('/organizations/:id/approve', approveOrganization);
router.patch('/stations/:id/approve', approveStation);

module.exports = router;