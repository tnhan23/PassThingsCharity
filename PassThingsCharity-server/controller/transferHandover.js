const workflow = require('../services/transferWorkflow');
const Shipment = require('../models/transferShipment');
const Upload = require('../models/transferEvidenceUpload');
const { inventoryTransaction } = require('../services/inventory');
const { createUploadHandler } = require('../utils/contributionUpload');

const action = handler => inventoryTransaction(async (req, res, next) => {
  try {
    const transfer = await workflow.load(req.params.id);
    const shipment = await handler(transfer, req);
    return res.status(200).json({ transfer, ...(shipment ? { shipment } : {}), ...await workflow.summary(transfer) });
  } catch (error) { return next(error); }
}, 'TRANSFER');

const approveTransfer = action((transfer, req) => workflow.approve(transfer, req.body || {}, req.user).then(() => null));
const assignResponsibilities = action((transfer, req) => workflow.assignResponsibilities(transfer, req.body || {}, req.user));
const allocateShipment = action((transfer, req) => workflow.allocate(transfer, req.body || {}, req.user));
const removeShipment = action(async (transfer, req) => {
  workflow.requireManaged(transfer);
  await workflow.stationAccess(transfer.fromStationId, req.user);
  const shipment = await workflow.loadShipment(transfer, req.params.shipmentId);
  if (!['PENDING', 'PREPARING'].includes(transfer.status) || shipment.status !== 'ASSIGNED') {
    throw Object.assign(new Error('Only un-dispatched allocations can be removed before dispatch begins.'), { status: 409 });
  }
  await shipment.deleteOne();
});
const handover = stage => action(async (transfer, req) => {
  const shipment = await workflow.loadShipment(transfer, req.params.shipmentId);
  return workflow.handover(transfer, shipment, stage, req.body || {}, req.user);
});

async function uploadEvidence(req, res, next) {
  try {
    const transfer = await workflow.load(req.params.id);
    const shipment = await workflow.loadShipment(transfer, req.params.shipmentId);
    const stage = String(req.params.stage).toUpperCase();
    await workflow.requireStage(transfer, shipment, stage, req.user);
    const reply = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      async json(body) {
        try {
          // Retain successful uploads even if another file failed, matching the uploader's response.
          for (const image of body.images || []) await Upload.create({
            transferId: transfer._id, shipmentId: shipment._id, actorId: req.user._id, stage,
            imageUrl: image.imageUrl, publicId: image.publicId,
          });
          return res.status(this.statusCode).json(body);
        } catch (error) { return next(error); }
      },
    };
    return createUploadHandler('transfer-evidence')(req, reply, next);
  } catch (error) { return next(error); }
}

async function myShipments(req, res, next) {
  try {
    const shipments = await Shipment.find({ carrierId: req.user._id })
      .populate({ path: 'transferId', populate: [
        { path: 'fromStationId', select: 'name address latitude longitude' },
        { path: 'toStationId', select: 'name address latitude longitude' },
      ] }).populate({ path: 'items.transferItemId', populate: { path: 'itemTypeId', select: 'name unit' } })
      .sort({ createdAt: -1 });
    return res.json({ data: shipments });
  } catch (error) { return next(error); }
}

module.exports = { assignResponsibilities, approveTransfer, allocateShipment, removeShipment, uploadEvidence, myShipments, dispatchShipment: handover('DISPATCH'), reportShipment: handover('REPORT'), receiveShipment: handover('RECEIVE') };
