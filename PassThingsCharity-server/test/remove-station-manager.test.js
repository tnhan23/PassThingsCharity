const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const controller = require('../controller/station');
const Organization = require('../models/organization');
const Role = require('../models/role');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const User = require('../models/user');

function replace(target, key, value, t) {
  const original = target[key];
  target[key] = value;
  t.after(() => { target[key] = original; });
}

function response() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function setup(t, anotherAssignment) {
  const stationId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const station = {
    _id: stationId,
    organizationId: new mongoose.Types.ObjectId(),
    managerId,
    async save() {
      this.saved = true;
    },
  };
  const organization = { submittedBy: new mongoose.Types.ObjectId() };

  replace(Station, 'findById', async id => {
    assert.equal(String(id), String(stationId));
    return station;
  }, t);
  replace(Station, 'findOne', async filter => {
    assert.deepEqual(filter, { _id: { $ne: stationId }, managerId });
    return anotherAssignment;
  }, t);
  replace(Organization, 'findById', async id => {
    assert.equal(String(id), String(station.organizationId));
    return organization;
  }, t);

  return {
    managerId,
    station,
    stationId,
    req: {
      params: { id: String(stationId) },
      user: { _id: new mongoose.Types.ObjectId(), role: { name: 'ADMIN' } },
    },
  };
}

test('removing the final station assignment demotes its station manager to USER', async t => {
  const { managerId, req, station, stationId } = setup(t, null);
  const userRole = { _id: new mongoose.Types.ObjectId(), name: 'USER' };
  const manager = {
    _id: managerId,
    role: { name: 'STATION_MANAGER' },
    async save() {
      this.saved = true;
    },
  };

  replace(User, 'findById', id => {
    assert.equal(String(id), String(managerId));
    return { populate: async field => {
      assert.equal(field, 'role');
      return manager;
    } };
  }, t);
  replace(Role, 'findOne', async filter => {
    assert.deepEqual(filter, { name: 'USER' });
    return userRole;
  }, t);

  const res = response();
  await controller.removeStationManager(req, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(station.managerId, null);
  assert.equal(station.saved, true);
  assert.equal(manager.role, userRole._id);
  assert.equal(manager.saved, true);
  assert.equal(String(res.body.stationId), String(stationId));
});

test('removing one assignment preserves STATION_MANAGER role while another assignment remains', async t => {
  const { managerId, req, station } = setup(t, { _id: new mongoose.Types.ObjectId() });
  replace(User, 'findById', () => {
    assert.fail('User role should not change while another station assignment remains.');
  }, t);

  const res = response();
  await controller.removeStationManager(req, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(station.managerId, null);
  assert.equal(station.saved, true);
  assert.match(res.body.message, /nếu không còn trạm được gán/);
});

test('admin staff assignment listing returns the user IDs assigned to a station', async t => {
  const stationId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  replace(Station, 'findById', async id => {
    assert.equal(String(id), String(stationId));
    return { _id: stationId };
  }, t);
  replace(StationStaff, 'find', filter => {
    assert.deepEqual(filter, { stationId });
    return {
      select: field => {
        assert.equal(field, 'userId');
        return {
          lean: async () => [{ userId }],
        };
      },
    };
  }, t);

  const res = response();
  await controller.listStationStaffAssignments(
    { params: { id: String(stationId) } },
    res,
    error => { throw error; },
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { data: [{ userId: String(userId) }] });
});
