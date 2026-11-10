const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Station = require('../models/station');
const Task = require('../models/task');
const qrAndProximity = require('../services/qrAndProximity');

test('GPS station proximity verification enforces 50m check-in radius', async t => {
  const originals = [];
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });

  const stationId = new mongoose.Types.ObjectId();
  const mockStation = {
    _id: stationId,
    name: 'Trạm Tiếp Nhận Quận 1',
    latitude: '10.776889',
    longitude: '106.700806',
    isActive: true,
  };

  stub(Station, 'findById', async () => mockStation);

  // 1. Missing GPS coordinates on check-in -> 400 error
  await assert.rejects(
    async () => qrAndProximity.verifyStationProximity(stationId, {}, true),
    err => {
      assert.equal(err.status, 400);
      assert.match(err.message, /bán kính 50m/i);
      return true;
    }
  );

  // 2. Standing directly at station (0m) -> Success
  const exactLoc = await qrAndProximity.verifyStationProximity(stationId, {
    latitude: 10.776889,
    longitude: 106.700806,
  }, true);
  assert.equal(exactLoc.verified, true);
  assert.equal(exactLoc.distanceMeters, 0);
  assert.equal(exactLoc.maxRadiusMeters, 50);

  // 3. Standing ~25m away (within 50m limit) -> Success
  const nearLoc = await qrAndProximity.verifyStationProximity(stationId, {
    latitude: 10.776889 + 0.000225,
    longitude: 106.700806,
  }, true);
  assert.equal(nearLoc.verified, true);
  assert.ok(nearLoc.distanceMeters <= 50, `Distance ${nearLoc.distanceMeters}m should be <= 50m`);

  // 4. Standing ~100m away (exceeds 50m limit) -> 403 Forbidden
  await assert.rejects(
    async () => qrAndProximity.verifyStationProximity(stationId, {
      latitude: 10.776889 + 0.0009,
      longitude: 106.700806,
    }, true),
    err => {
      assert.equal(err.status, 403);
      assert.match(err.message, /khoảng cách|bán kính cho phép tối đa 50m/i);
      return true;
    }
  );
});

test('Task check-in drops QR requirement and validates proximity for both Volunteer and Staff', async t => {
  const originals = [];
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });

  const stationId = new mongoose.Types.ObjectId();
  const taskId = new mongoose.Types.ObjectId();
  const volunteerAssignId = new mongoose.Types.ObjectId();
  const staffAssignId = new mongoose.Types.ObjectId();

  const mockStation = {
    _id: stationId,
    name: 'Trạm Tiếp Nhận Tân Bình',
    latitude: '10.800000',
    longitude: '106.650000',
    isActive: true,
  };
  const mockTask = {
    _id: taskId,
    title: 'Phân loại đồ cứu trợ',
    stationId,
    status: 'ASSIGNED',
  };

  stub(Station, 'findById', async () => mockStation);
  stub(Task, 'findById', async () => mockTask);

  // Volunteer check-in WITHOUT QR code, within 50m (~25m away) -> Success
  const volResult = await qrAndProximity.verifyTaskQrAndProximity(
    { _id: volunteerAssignId, taskId, assigneeType: 'VOLUNTEER' },
    { latitude: 10.800000 + 0.0002, longitude: 106.650000 },
    { isCheckIn: true }
  );
  assert.equal(volResult.proximity.verified, true);
  assert.ok(volResult.proximity.distanceMeters <= 50);

  // Staff doing task check-in WITHOUT QR code, within 50m -> 100% inherited logic, Success
  const staffResult = await qrAndProximity.verifyTaskQrAndProximity(
    { _id: staffAssignId, taskId, assigneeType: 'STAFF' },
    { latitude: 10.800000 + 0.0002, longitude: 106.650000 },
    { isCheckIn: true }
  );
  assert.equal(staffResult.proximity.verified, true);
  assert.ok(staffResult.proximity.distanceMeters <= 50);

  // Outside 50m -> Both rejected with 403
  await assert.rejects(
    async () => qrAndProximity.verifyTaskQrAndProximity(
      { _id: volunteerAssignId, taskId, assigneeType: 'VOLUNTEER' },
      { latitude: 10.800000 + 0.001, longitude: 106.650000 },
      { isCheckIn: true }
    ),
    err => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('Shift check-in drops QR requirement and validates proximity for Staff', async t => {
  const originals = [];
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });

  const stationId = new mongoose.Types.ObjectId();
  const scheduleId = new mongoose.Types.ObjectId();

  const mockStation = {
    _id: stationId,
    name: 'Trạm Tiếp Nhận Bình Thạnh',
    latitude: '10.801000',
    longitude: '106.711000',
    isActive: true,
  };

  stub(Station, 'findById', async () => mockStation);

  // Shift check-in WITHOUT QR code, within 50m -> Success
  const shiftResult = await qrAndProximity.verifyShiftQrAndProximity(
    { _id: scheduleId, stationId },
    { latitude: 10.801000, longitude: 106.711000 },
    { isCheckIn: true }
  );
  assert.equal(shiftResult.proximity.verified, true);
  assert.equal(shiftResult.proximity.distanceMeters, 0);

  // Shift check-in outside 50m -> 403 Forbidden
  await assert.rejects(
    async () => qrAndProximity.verifyShiftQrAndProximity(
      { _id: scheduleId, stationId },
      { latitude: 10.801000 + 0.002, longitude: 106.711000 },
      { isCheckIn: true }
    ),
    err => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

