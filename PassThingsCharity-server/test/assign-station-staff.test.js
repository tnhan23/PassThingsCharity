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

function setup(t, user, staffRole, createAssignment) {
  const stationId = new mongoose.Types.ObjectId();
  const station = { _id: stationId, organizationId: new mongoose.Types.ObjectId(), isActive: true };
  const organization = { isVerified: true };
  replace(Station, 'findById', async id => {
    assert.equal(String(id), String(stationId));
    return station;
  }, t);
  replace(Organization, 'findById', async () => organization, t);
  replace(User, 'findOne', filter => {
    assert.deepEqual(filter, {
      $or: [{ email: 'person@example.com' }, { phone: 'person@example.com' }],
    });
    return { populate: async () => user };
  }, t);
  replace(Role, 'findOne', async filter => {
    assert.deepEqual(filter, { name: 'STAFF' });
    return staffRole;
  }, t);
  replace(StationStaff, 'create', createAssignment, t);
  return stationId;
}

test('admin staff assignment promotes a USER and links the user to the station', async t => {
  const staffRole = { _id: new mongoose.Types.ObjectId(), name: 'STAFF' };
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: 'person',
    fullName: 'Test Person',
    role: { _id: new mongoose.Types.ObjectId(), name: 'USER' },
    async save() {
      this.saved = true;
    },
  };
  let createdAssignment;
  const stationId = setup(t, user, staffRole, async assignment => {
    createdAssignment = { ...assignment, _id: new mongoose.Types.ObjectId() };
    return createdAssignment;
  });

  const res = response();
  await controller.assignExistingUserAsStaff({
    params: { id: String(stationId) },
    body: { identifier: 'person@example.com' },
  }, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(String(user.role), String(staffRole._id));
  assert.equal(user.saved, true);
  assert.equal(String(createdAssignment.stationId), String(stationId));
  assert.equal(String(createdAssignment.userId), String(user._id));
  assert.equal(res.body.staff.role, 'STAFF');
});

test('duplicate station staff assignment returns conflict without promoting the user', async t => {
  const staffRole = { _id: new mongoose.Types.ObjectId(), name: 'STAFF' };
  const user = {
    _id: new mongoose.Types.ObjectId(),
    username: 'person',
    fullName: 'Test Person',
    role: { _id: new mongoose.Types.ObjectId(), name: 'USER' },
    async save() {
      this.saved = true;
    },
  };
  const stationId = setup(t, user, staffRole, async () => {
    throw Object.assign(new Error('duplicate assignment'), { code: 11000 });
  });

  const res = response();
  await controller.assignExistingUserAsStaff({
    params: { id: String(stationId) },
    body: { identifier: 'person@example.com' },
  }, res, error => { throw error; });

  assert.equal(res.statusCode, 409);
  assert.equal(user.role.name, 'USER');
  assert.equal(user.saved, undefined);
});
