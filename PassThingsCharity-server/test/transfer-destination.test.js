const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const CampaignTransfer = require('../models/campaignTransfer');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const User = require('../models/user');
const Notification = require('../models/notification');
const workflow = require('../services/transferWorkflow');
const { getAllTransfers } = require('../controller/campaignTransfer');
const { getMyNotifications } = require('../controller/notification');

function stub(t, object, key, value) {
  const original = object[key];
  object[key] = value;
  t.after(() => { object[key] = original; });
}

test('either destination station manager receives and can retrieve the approved transfer notification', async t => {
  const stationA = { _id: 'station-a', managerId: 'manager-a' };
  const stationB = { _id: 'station-b', managerId: 'manager-b' };
  const managers = new Map([
    ['manager-a', { _id: 'manager-a', status: 'active', role: { name: 'STATION_MANAGER' } }],
    ['manager-b', { _id: 'manager-b', status: 'active', role: { name: 'STATION_MANAGER' } }],
  ]);
  const stations = new Map([[stationA._id, stationA], [stationB._id, stationB]]);
  const notifications = [];

  stub(t, Station, 'findById', async id => stations.get(String(id)));
  stub(t, User, 'findById', id => ({ populate: async () => managers.get(String(id)) }));
  stub(t, Notification, 'create', async notification => {
    const saved = {
      ...notification,
      _id: `notification-${notifications.length + 1}`,
      createdAt: new Date(),
      isRead: false,
      readBy: [],
    };
    notifications.push(saved);
    return saved;
  });
  stub(t, Notification, 'find', query => ({
    sort() { return this; },
    limit() { return this; },
    populate: async () => notifications.filter(notification =>
      String(notification.userId) === String(query.$or[0].userId)
      || notification.targetRole === 'ALL'
      || notification.targetRole === 'STATION_MANAGER'
    ),
  }));

  for (const [fromStation, toStation] of [[stationA, stationB], [stationB, stationA]]) {
    const transfer = {
      _id: `transfer-${fromStation._id}-to-${toStation._id}`,
      workflowVersion: 2,
      approvalStatus: 'PENDING',
      status: 'PENDING',
      fromStationId: fromStation._id,
      toStationId: toStation._id,
      code: 'TRF-DESTINATION-TEST',
      async save() {},
    };
    const result = await workflow.approve(
      transfer,
      { decision: 'APPROVED' },
      managers.get(fromStation.managerId)
    );
    assert.equal(result.status, 'PREPARING');
    assert.equal(result.approvalStatus, 'APPROVED');

    let response;
    await getMyNotifications({
      user: managers.get(toStation.managerId),
    }, {
      status() { return this; },
      json(body) { response = body; },
    }, error => { throw error; });

    const notification = response.data.find(item => item.metadata.transferId === transfer._id);
    assert.ok(notification);
    assert.equal(String(notification.metadata.stationId), String(toStation._id));
    assert.equal(notification.metadata.action, 'ASSIGN_TRANSFER_RECEIVER');
    assert.equal(notification.isRead, false);
  }

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].userId, stationB.managerId);
  assert.equal(notifications[1].userId, stationA.managerId);
});

test('approved transfer can be listed by its destination station manager', async t => {
  const destinationStationId = new mongoose.Types.ObjectId();
  const transfer = { _id: 'transfer-id', toStationId: destinationStationId, status: 'PREPARING' };
  let foundFilter;
  const query = {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return Promise.resolve([transfer]); },
  };
  stub(t, Station, 'find', () => ({ select: async () => [{ _id: destinationStationId }] }));
  stub(t, StationStaff, 'distinct', async () => []);
  stub(t, CampaignTransfer, 'countDocuments', async filter => {
    foundFilter = filter;
    return 1;
  });
  stub(t, CampaignTransfer, 'find', filter => {
    foundFilter = filter;
    return query;
  });

  let response;
  await getAllTransfers({
    user: { _id: 'destination-manager', role: { name: 'STATION_MANAGER' } },
    query: { toStationId: String(destinationStationId), status: 'PREPARING' },
  }, {
    status() { return this; },
    json(body) { response = body; },
  }, error => { throw error; });

  assert.deepEqual(foundFilter.$or, [
    { fromStationId: { $in: [destinationStationId] } },
    { toStationId: { $in: [destinationStationId] } },
  ]);
  assert.equal(String(foundFilter.toStationId), String(destinationStationId));
  assert.equal(foundFilter.status, 'PREPARING');
  assert.deepEqual(response.data, [transfer]);
});

test('approval is rejected before changing the transfer when destination has no manager', async t => {
  let saved = false;
  const sourceStationId = 'source-with-manager';
  const transfer = {
    workflowVersion: 2,
    approvalStatus: 'PENDING',
    status: 'PENDING',
    fromStationId: sourceStationId,
    toStationId: 'destination-without-manager',
    async save() { saved = true; },
  };
  const sourceManager = { _id: 'source-manager', role: { name: 'STATION_MANAGER' } };

  stub(t, Station, 'findById', async id => (
    String(id) === sourceStationId ? { managerId: sourceManager._id } : { managerId: null }
  ));

  await assert.rejects(
    workflow.approve(transfer, { decision: 'APPROVED' }, sourceManager),
    { status: 409 }
  );
  assert.equal(saved, false);
  assert.equal(transfer.approvalStatus, 'PENDING');
  assert.equal(transfer.status, 'PENDING');
});
