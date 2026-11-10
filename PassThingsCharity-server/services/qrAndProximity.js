const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Station = require('../models/station');
const ShiftSchedule = require('../models/shiftSchedule');
const ShiftTemplate = require('../models/shiftTemplate');
const Task = require('../models/task');
const TaskAssignment = require('../models/taskAssignment');
const Transfer = require('../models/campaignTransfer');
const Shipment = require('../models/transferShipment');
const { getHaversineDistanceKm } = require('../utils/geoDistance');

const DEFAULT_RADIUS_KM = 0.5; // 500m default radius around station
const QR_PREFIX = 'PTQR:';

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function getAllowedRadiusKm() {
  const envVal = Number(process.env.STATION_PROXIMITY_RADIUS_KM);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : DEFAULT_RADIUS_KM;
}

function getQrSecret() {
  return process.env.QR_SECRET || process.env.JWT_SECRET || 'passthingscharity-qr-secret';
}

/**
 * Generate a signed QR payload + scannable code string
 */
function createQrToken(payload, expiresIn = '24h') {
  const token = jwt.sign({ ...payload, qrType: payload.type }, getQrSecret(), { expiresIn });
  return `${QR_PREFIX}${token}`;
}

/**
 * Parse and verify a QR code string (supports signed PTQR token or structured code)
 */
function parseAndVerifyQrCode(rawQr) {
  if (typeof rawQr !== 'string' || !rawQr.trim()) {
    fail(400, 'Mã QR không hợp lệ hoặc bị trống.');
  }
  const code = rawQr.trim();

  if (code.startsWith(QR_PREFIX)) {
    const token = code.slice(QR_PREFIX.length);
    try {
      return jwt.verify(token, getQrSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        fail(400, 'Mã QR đã hết hạn. Vui lòng tạo lại mã QR mới tại trạm.');
      }
      fail(400, 'Mã QR không hợp lệ hoặc đã bị thay đổi.');
    }
  }

  // Support plain structured QR formats:
  // STATION:<stationId>
  // SHIFT:<scheduleId>:<stationId>
  // TASK:<taskId>:<stationId>
  // SHIPMENT:<transferId>:<shipmentId>:<stage>:<stationId>
  const parts = code.split(':');
  const prefix = parts[0]?.toUpperCase();
  if (prefix === 'STATION' && mongoose.isValidObjectId(parts[1])) {
    return { type: 'STATION', stationId: parts[1] };
  }
  if (prefix === 'SHIFT' && mongoose.isValidObjectId(parts[1])) {
    return { type: 'SHIFT', scheduleId: parts[1], stationId: parts[2] || null };
  }
  if (prefix === 'TASK' && mongoose.isValidObjectId(parts[1])) {
    return { type: 'TASK', taskId: parts[1], stationId: parts[2] || null };
  }
  if (prefix === 'ASSIGNMENT' && mongoose.isValidObjectId(parts[1])) {
    return { type: 'ASSIGNMENT', assignmentId: parts[1], stationId: parts[2] || null };
  }
  if (prefix === 'SHIPMENT' && mongoose.isValidObjectId(parts[1]) && mongoose.isValidObjectId(parts[2])) {
    return {
      type: 'SHIPMENT',
      transferId: parts[1],
      shipmentId: parts[2],
      stage: parts[3]?.toUpperCase() || null,
      stationId: parts[4] || null,
    };
  }

  fail(400, 'Định dạng mã QR không hợp lệ.');
}

/**
 * Verify that the user's GPS coordinates are within the allowed radius of the target station.
 * - Always validates if latitude/longitude (or lat/lng) is provided in body, or if requireGps=true / STATION_PROXIMITY_ENFORCE=true.
 */
async function verifyStationProximity(stationId, body = {}, requireGps = process.env.STATION_PROXIMITY_ENFORCE === 'true') {
  const rawLat = body?.latitude ?? body?.lat;
  const rawLng = body?.longitude ?? body?.lng;
  const hasCoords = rawLat !== undefined && rawLat !== null && rawLat !== ''
    && rawLng !== undefined && rawLng !== null && rawLng !== '';

  if (!hasCoords) {
    if (requireGps) {
      fail(400, 'Vui lòng cung cấp vị trí GPS (latitude, longitude) để xác nhận khi đứng gần trạm.');
    }
    return null;
  }

  const userLat = Number(rawLat);
  const userLng = Number(rawLng);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    fail(400, 'Tọa độ GPS (latitude, longitude) không hợp lệ.');
  }

  const station = await Station.findById(stationId?._id || stationId);
  if (!station) {
    fail(404, 'Không tìm thấy trạm để kiểm tra vị trí.');
  }

  const stationLat = Number(station.latitude);
  const stationLng = Number(station.longitude);
  if (!Number.isFinite(stationLat) || !Number.isFinite(stationLng)) {
    return null;
  }

  const maxRadiusKm = getAllowedRadiusKm();
  const distanceKm = getHaversineDistanceKm(userLat, userLng, stationLat, stationLng);
  if (distanceKm === null) {
    fail(400, 'Không thể tính khoảng cách GPS tới trạm.');
  }

  if (distanceKm > maxRadiusKm) {
    fail(
      403,
      `Bạn đang đứng cách trạm "${station.name}" ${distanceKm} km (bán kính cho phép tối đa ${maxRadiusKm} km). Chỉ được xác nhận khi đứng gần trạm.`
    );
  }

  return {
    verified: true,
    stationId: station._id,
    stationName: station.name,
    distanceKm,
    maxRadiusKm,
  };
}

/**
 * Verify QR code against expected station / resource context.
 * - Always validates if qrCode/qrToken is provided in body, or if requireQr=true / QR_CHECK_ENFORCE=true.
 */
function verifyQrContext(expected = {}, body = {}, requireQr = process.env.QR_CHECK_ENFORCE === 'true') {
  const rawQr = body?.qrCode ?? body?.qrToken;
  const hasQr = typeof rawQr === 'string' && rawQr.trim().length > 0;

  if (!hasQr) {
    if (requireQr) {
      fail(400, 'Vui lòng quét mã QR (qrCode) tại trạm để xác nhận.');
    }
    return null;
  }

  const decoded = parseAndVerifyQrCode(rawQr);

  if (expected.stationId && decoded.stationId && String(decoded.stationId) !== String(expected.stationId)) {
    fail(403, 'Mã QR không thuộc trạm này.');
  }
  if (expected.scheduleId && decoded.scheduleId && String(decoded.scheduleId) !== String(expected.scheduleId)) {
    fail(403, 'Mã QR không khớp với lịch trực này.');
  }
  if (expected.taskId && decoded.taskId && String(decoded.taskId) !== String(expected.taskId)) {
    fail(403, 'Mã QR không khớp với nhiệm vụ này.');
  }
  if (expected.assignmentId && decoded.assignmentId && String(decoded.assignmentId) !== String(expected.assignmentId)) {
    fail(403, 'Mã QR không khớp với phân công nhiệm vụ này.');
  }
  if (expected.transferId && decoded.transferId && String(decoded.transferId) !== String(expected.transferId)) {
    fail(403, 'Mã QR không khớp với phiếu chuyển hàng này.');
  }
  if (expected.shipmentId && decoded.shipmentId && String(decoded.shipmentId) !== String(expected.shipmentId)) {
    fail(403, 'Mã QR không khớp với chuyến hàng này.');
  }
  if (expected.stage && decoded.stage && String(decoded.stage).toUpperCase() !== String(expected.stage).toUpperCase()) {
    fail(403, `Mã QR này dùng cho bước ${decoded.stage}, không khớp với bước ${expected.stage}.`);
  }

  return { verified: true, qrData: decoded };
}

/**
 * Hook for Shift Schedule Check-in / Check-out
 */
async function verifyShiftQrAndProximity(schedule, body = {}, strict = false) {
  const qr = verifyQrContext(
    { stationId: schedule.stationId, scheduleId: schedule._id },
    body,
    strict || process.env.QR_CHECK_ENFORCE === 'true'
  );
  const proximity = await verifyStationProximity(
    schedule.stationId,
    body,
    strict || process.env.STATION_PROXIMITY_ENFORCE === 'true'
  );
  return { qr, proximity };
}

/**
 * Hook for Workforce Task Assignment Check-in / Check-out
 */
async function verifyTaskQrAndProximity(assignment, body = {}, strict = false) {
  const task = await Task.findById(assignment.taskId);
  if (!task) {
    fail(404, 'Không tìm thấy nhiệm vụ của phân công này.');
  }
  const qr = verifyQrContext(
    { stationId: task.stationId, taskId: task._id, assignmentId: assignment._id },
    body,
    strict || process.env.QR_CHECK_ENFORCE === 'true'
  );
  const proximity = await verifyStationProximity(
    task.stationId,
    body,
    strict || process.env.STATION_PROXIMITY_ENFORCE === 'true'
  );
  return { qr, proximity, task };
}

/**
 * Hook for Inter-Station Transfer Shipment Handover (DISPATCH / REPORT / RECEIVE)
 * - DISPATCH checks proximity to source station (fromStationId)
 * - REPORT and RECEIVE check proximity to destination station (toStationId)
 */
async function verifyTransferHandoverQrAndProximity(transfer, shipment, stage, body = {}, strict = false) {
  const targetStationId = stage === 'DISPATCH' ? transfer.fromStationId : transfer.toStationId;
  const qr = verifyQrContext(
    {
      stationId: targetStationId,
      transferId: transfer._id,
      shipmentId: shipment._id,
      stage,
    },
    body,
    strict || process.env.QR_CHECK_ENFORCE === 'true'
  );
  const proximity = await verifyStationProximity(
    targetStationId,
    body,
    strict || process.env.STATION_PROXIMITY_ENFORCE === 'true'
  );
  return { qr, proximity, targetStationId };
}

// ==========================================
// EXPRESS ROUTE HANDLERS (QR GENERATION & VERIFICATION)
// ==========================================

async function getStationQr(req, res, next) {
  try {
    const stationId = req.params.stationId || req.params.id;
    if (!mongoose.isValidObjectId(stationId)) return res.status(400).json({ error: 'ID trạm không hợp lệ.' });
    const station = await Station.findById(stationId);
    if (!station) return res.status(404).json({ error: 'Không tìm thấy trạm.' });

    const qrCode = createQrToken({
      type: 'STATION',
      stationId: String(station._id),
    });

    return res.status(200).json({
      message: 'Tạo mã QR trạm thành công.',
      data: {
        stationId: station._id,
        stationName: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        allowedRadiusKm: getAllowedRadiusKm(),
        qrCode,
        staticQrCode: `STATION:${station._id}`,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function checkStationProximityEndpoint(req, res, next) {
  try {
    const stationId = req.params.stationId || req.params.id;
    if (!mongoose.isValidObjectId(stationId)) return res.status(400).json({ error: 'ID trạm không hợp lệ.' });
    const proximity = await verifyStationProximity(stationId, req.body || {}, true);
    const qr = verifyQrContext({ stationId }, req.body || {}, false);
    return res.status(200).json({
      message: 'Xác nhận vị trí đứng gần trạm hợp lệ.',
      data: { proximity, qr },
    });
  } catch (error) {
    return next(error);
  }
}

async function getShiftScheduleQr(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID lịch không hợp lệ.' });
    const schedule = await ShiftSchedule.findById(id).populate('stationId', 'name address latitude longitude');
    if (!schedule) return res.status(404).json({ error: 'Không tìm thấy ca trực.' });

    const stationId = schedule.stationId?._id || schedule.stationId;
    const qrCode = createQrToken({
      type: 'SHIFT',
      scheduleId: String(schedule._id),
      stationId: String(stationId),
      date: schedule.date,
    });

    return res.status(200).json({
      message: 'Lấy mã QR ca trực thành công.',
      data: {
        scheduleId: schedule._id,
        stationId,
        date: schedule.date,
        allowedRadiusKm: getAllowedRadiusKm(),
        qrCode,
        staticQrCode: `SHIFT:${schedule._id}:${stationId}`,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getTaskQr(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID nhiệm vụ không hợp lệ.' });
    const task = await Task.findById(id).populate('stationId', 'name address latitude longitude');
    if (!task) return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });

    const stationId = task.stationId?._id || task.stationId;
    const qrCode = createQrToken({
      type: 'TASK',
      taskId: String(task._id),
      stationId: String(stationId),
    });

    return res.status(200).json({
      message: 'Lấy mã QR nhiệm vụ thành công.',
      data: {
        taskId: task._id,
        title: task.title,
        stationId,
        allowedRadiusKm: getAllowedRadiusKm(),
        qrCode,
        staticQrCode: `TASK:${task._id}:${stationId}`,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getShipmentQr(req, res, next) {
  try {
    const { id, shipmentId } = req.params;
    const stage = String(req.query.stage || 'REPORT').toUpperCase();
    if (!['DISPATCH', 'REPORT', 'RECEIVE'].includes(stage)) {
      return res.status(400).json({ error: 'stage phải là DISPATCH, REPORT hoặc RECEIVE.' });
    }
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(shipmentId)) {
      return res.status(400).json({ error: 'ID phiếu chuyển hoặc chuyến hàng không hợp lệ.' });
    }
    const transfer = await Transfer.findById(id);
    if (!transfer) return res.status(404).json({ error: 'Không tìm thấy phiếu chuyển hàng.' });
    const shipment = await Shipment.findOne({ _id: shipmentId, transferId: transfer._id });
    if (!shipment) return res.status(404).json({ error: 'Không tìm thấy chuyến hàng trong phiếu này.' });

    const targetStationId = stage === 'DISPATCH' ? transfer.fromStationId : transfer.toStationId;
    const station = await Station.findById(targetStationId).select('name address latitude longitude');

    const qrCode = createQrToken({
      type: 'SHIPMENT',
      transferId: String(transfer._id),
      shipmentId: String(shipment._id),
      stage,
      stationId: String(targetStationId),
    });

    return res.status(200).json({
      message: `Lấy mã QR bàn giao chuyến hàng (${stage}) thành công.`,
      data: {
        transferId: transfer._id,
        shipmentId: shipment._id,
        stage,
        station,
        allowedRadiusKm: getAllowedRadiusKm(),
        qrCode,
        staticQrCode: `SHIPMENT:${transfer._id}:${shipment._id}:${stage}:${targetStationId}`,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyShipmentQrAndProximityEndpoint(req, res, next) {
  try {
    const { id, shipmentId } = req.params;
    const stage = String(req.body?.stage || req.query?.stage || 'REPORT').toUpperCase();
    if (!['DISPATCH', 'REPORT', 'RECEIVE'].includes(stage)) {
      return res.status(400).json({ error: 'stage phải là DISPATCH, REPORT hoặc RECEIVE.' });
    }
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(shipmentId)) {
      return res.status(400).json({ error: 'ID phiếu chuyển hoặc chuyến hàng không hợp lệ.' });
    }
    const transfer = await Transfer.findById(id);
    if (!transfer) return res.status(404).json({ error: 'Không tìm thấy phiếu chuyển hàng.' });
    const shipment = await Shipment.findOne({ _id: shipmentId, transferId: transfer._id });
    if (!shipment) return res.status(404).json({ error: 'Không tìm thấy chuyến hàng trong phiếu này.' });

    const result = await verifyTransferHandoverQrAndProximity(transfer, shipment, stage, req.body || {}, true);
    return res.status(200).json({
      message: `Xác thực mã QR và vị trí đứng gần trạm cho bước ${stage} thành công.`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllowedRadiusKm,
  createQrToken,
  parseAndVerifyQrCode,
  verifyStationProximity,
  verifyQrContext,
  verifyShiftQrAndProximity,
  verifyTaskQrAndProximity,
  verifyTransferHandoverQrAndProximity,
  getStationQr,
  checkStationProximityEndpoint,
  getShiftScheduleQr,
  getTaskQr,
  getShipmentQr,
  verifyShipmentQrAndProximityEndpoint,
};

