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
const handover = require('../controller/transferHandover');

router.get('/shipments/me', checkBearerToken, handover.myShipments);
router.patch('/:id/approval', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER']), handover.approveTransfer);
router.patch('/:id/responsibilities', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER']), handover.assignResponsibilities);
router.post('/:id/shipments', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), handover.allocateShipment);
router.delete('/:id/shipments/:shipmentId', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), handover.removeShipment);
router.post('/:id/shipments/:shipmentId/evidence/:stage', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']), handover.uploadEvidence);
router.post('/:id/shipments/:shipmentId/dispatch', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), handover.dispatchShipment);
router.post('/:id/shipments/:shipmentId/report', checkBearerToken, checkRole(['USER', 'VOLUNTEER', 'STAFF', 'STATION_MANAGER', 'ADMIN']), handover.reportShipment);
router.post('/:id/shipments/:shipmentId/receive', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), handover.receiveShipment);
const qrAndProximity = require('../services/qrAndProximity');
router.get('/:id/shipments/:shipmentId/qr', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']), qrAndProximity.getShipmentQr);
router.post('/:id/shipments/:shipmentId/qr-verify', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']), qrAndProximity.verifyShipmentQrAndProximityEndpoint);

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
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']),
  getAllTransfers
);

// Chi tiết phiếu điều phối
router.get(
  '/:id',
  checkBearerToken,
  checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER', 'VOLUNTEER']),
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
