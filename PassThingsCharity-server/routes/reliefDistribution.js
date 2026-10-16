const express = require('express');
const router = express.Router();
const {
  createDistribution,
  getAllDistributions,
  getDistributionById,
  updateDistributionStatus,
  getCampaignReliefSummary,
} = require('../controller/reliefDistribution');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Ghi nhận bàn giao hàng cứu trợ cho Đại diện tiếp nhận (có thể đóng campaign)
router.post(
  '/',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  createDistribution
);

// Danh sách các đợt bàn giao cứu trợ
router.get('/', checkBearerToken, getAllDistributions);

// Báo cáo tổng hợp số lượng nhận vs phân phối của chiến dịch
router.get('/summary/:campaignId', checkBearerToken, getCampaignReliefSummary);

// Chi tiết đợt bàn giao cứu trợ
router.get('/:id', checkBearerToken, getDistributionById);

// Cập nhật trạng thái đợt bàn giao cứu trợ (PLANNED -> IN_PROGRESS -> COMPLETED)
router.patch(
  '/:id/status',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  updateDistributionStatus
);

module.exports = router;
