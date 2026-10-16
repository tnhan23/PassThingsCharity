const express = require('express');
const router = express.Router();
const {
  createTransfer,
  getAllTransfers,
  getTransferById,
  updateTransferStatus,
} = require('../controller/campaignTransfer');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

// Tạo phiếu điều phối giữa các trạm
router.post(
  '/',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  createTransfer
);

// Danh sách các phiếu điều phối
router.get(
  '/',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  getAllTransfers
);

// Chi tiết phiếu điều phối
router.get(
  '/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  getTransferById
);

// Cập nhật trạng thái phiếu điều phối (PENDING -> PREPARING -> IN_TRANSIT -> RECEIVED -> COMPLETED)
router.patch(
  '/:id/status',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']),
  updateTransferStatus
);

module.exports = router;
