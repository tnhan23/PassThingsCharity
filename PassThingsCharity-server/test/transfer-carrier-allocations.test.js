const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Assignment = require('../models/taskAssignment');
const CampaignTransfer = require('../models/campaignTransfer');
const CampaignTransferItem = require('../models/campaignTransferItem');
const Shipment = require('../models/transferShipment');
const Station = require('../models/station');
const Task = require('../models/task');
const workflow = require('../services/transferWorkflow');
const { getTransferById } = require('../controller/campaignTransfer');

function stub(t, object, key, value) {
  const original = object[key];
  object[key] = value;
  t.after(() => { object[key] = original; });
}

test('transfer assigns distinct KG quantities to each carrier and exposes them in its detail summary', async t => {
  const sourceStationId = new mongoose.Types.ObjectId();
  const destinationStationId = new mongoose.Types.ObjectId();
  const campaignId = new mongoose.Types.ObjectId();
  const transferId = new mongoose.Types.ObjectId();
  const transferItemId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const carrierAId = new mongoose.Types.ObjectId();
  const carrierBId = new mongoose.Types.ObjectId();
  const assignmentAId = new mongoose.Types.ObjectId();
  const assignmentBId = new mongoose.Types.ObjectId();
  const assignmentCId = new mongoose.Types.ObjectId();
  const itemTypeId = new mongoose.Types.ObjectId();
  const transfer = {
    _id: transferId,
    workflowVersion: 2,
    status: 'PREPARING',
    approvalStatus: 'APPROVED',
    fromStationId: sourceStationId,
    toStationId: destinationStationId,
    campaignId,
  };
  const manager = { _id: managerId, role: { name: 'STATION_MANAGER' } };
  const assignments = new Map([
    [String(assignmentAId), {
      _id: assignmentAId,
      assigneeId: { _id: carrierAId, status: 'active' },
      taskId: new mongoose.Types.ObjectId(),
      status: 'ASSIGNED',
    }],
    [String(assignmentBId), {
      _id: assignmentBId,
      assigneeId: { _id: carrierBId, status: 'active' },
      taskId: new mongoose.Types.ObjectId(),
      status: 'IN_PROGRESS',
    }],
    [String(assignmentCId), {
      _id: assignmentCId,
      assigneeId: { _id: new mongoose.Types.ObjectId(), status: 'active' },
      taskId: new mongoose.Types.ObjectId(),
      status: 'ASSIGNED',
    }],
  ]);
  const task = {
    transferId,
    stationId: sourceStationId,
    campaignId,
    status: 'ASSIGNED',
  };
  const transferItem = {
    _id: transferItemId,
    itemTypeId,
    quantity: 20,
    unit: 'KG',
    dispatchedQuantity: 0,
    receivedQuantity: 0,
    toObject() {
      return {
        _id: this._id,
        itemTypeId: { _id: itemTypeId, name: 'Gạo', unit: 'KG' },
        quantity: this.quantity,
        unit: this.unit,
      };
    },
  };
  const shipments = [];
  shipments.populate = function (path) {
    if (path === 'carrierId') {
      for (const shipment of this) {
        shipment.carrierId = {
          _id: shipment.carrierId,
          fullName: String(shipment.carrierId) === String(carrierAId) ? 'Tài xế A' : 'Tài xế B',
          username: String(shipment.carrierId),
          phone: '0900000000',
        };
      }
    }
    return this;
  };
  const transferItems = [transferItem];
  transferItems.populate = async function () { return this; };

  stub(t, Station, 'findById', async () => ({ managerId }));
  stub(t, Assignment, 'findById', id => ({
    populate: async () => assignments.get(String(id)),
  }));
  stub(t, Task, 'findById', async () => task);
  stub(t, Shipment, 'exists', async () => false);
  stub(t, Shipment, 'find', () => shipments);
  stub(t, Shipment, 'create', async document => {
    const shipment = {
      _id: new mongoose.Types.ObjectId(),
      ...document,
      status: 'ASSIGNED',
      evidence: [],
    };
    shipments.push(shipment);
    return shipment;
  });
  stub(t, CampaignTransferItem, 'find', () => transferItems);
  stub(t, CampaignTransfer, 'findById', () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(transfer).then(resolve, reject); },
  }));
  stub(t, workflow, 'requireRead', async () => {});

  const shipmentA = await workflow.allocate(transfer, {
    assignmentId: assignmentAId,
    items: [{ transferItemId, quantity: 12.5 }],
  }, manager);
  const shipmentB = await workflow.allocate(transfer, {
    assignmentId: assignmentBId,
    items: [{ transferItemId, quantity: 7.5 }],
  }, manager);

  assert.equal(String(shipmentA.carrierId), String(carrierAId));
  assert.equal(String(shipmentB.carrierId), String(carrierBId));
  assert.equal(shipmentA.items[0].quantity, 12.5);
  assert.equal(shipmentB.items[0].quantity, 7.5);

  await assert.rejects(
    workflow.allocate(transfer, {
      assignmentId: assignmentCId,
      items: [{ transferItemId, quantity: 0.1 }],
    }, manager),
    { status: 409 }
  );

  let detail;
  await getTransferById({
    params: { id: String(transferId) },
    user: manager,
  }, {
    status() { return this; },
    json(body) { detail = body; },
  }, error => { throw error; });

  assert.equal(String(detail.transfer._id), String(transferId));
  assert.equal(detail.items[0].unit, 'KG');
  assert.equal(detail.items[0].allocatedQuantity, 20);
  assert.equal(detail.items[0].unallocatedQuantity, 0);
  assert.equal(detail.shipments.length, 2);
  assert.deepEqual(detail.shipments.map(shipment => ({
    carrierId: String(shipment.carrierId._id),
    carrierName: shipment.carrierId.fullName,
    transferItemId: String(shipment.items[0].transferItemId),
    quantity: shipment.items[0].quantity,
  })), [
    { carrierId: String(carrierAId), carrierName: 'Tài xế A', transferItemId: String(transferItemId), quantity: 12.5 },
    { carrierId: String(carrierBId), carrierName: 'Tài xế B', transferItemId: String(transferItemId), quantity: 7.5 },
  ]);
});
