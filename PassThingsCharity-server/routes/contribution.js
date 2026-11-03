const express = require('express');
const router = express.Router();
const {
  lookupDonor,
  createContribution,
  getAllContributions,
  getContributionById,
  updateContributionStatus,
  addContributionImages,
} = require('../controller/contribution');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Tra cứu donor (Staff / Station Manager / Admin)
router.get('/lookup', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), lookupDonor);

// Tạo phiếu tiếp nhận quyên góp (Inbound)
router.post('/', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), createContribution);

// Danh sách phiếu tiếp nhận
router.get('/', checkBearerToken, getAllContributions);

// Chi tiết phiếu tiếp nhận
router.get('/:id', checkBearerToken, getContributionById);

// Cập nhật trạng thái phiếu tiếp nhận
router.patch('/:id/status', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER']), updateContributionStatus);

// Bổ sung hình ảnh xác minh cho phiếu tiếp nhận
router.post('/:id/images', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), addContributionImages);

module.exports = router;
