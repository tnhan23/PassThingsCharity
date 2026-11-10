const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Station = require('../models/station');
const Staff = require('../models/stationstaff');
const Task = require('../models/task');
const Application = require('../models/taskApplication');
const service = require('../services/taskSchedule');
const controller = require('../controller/workforce');

test('only assigned manager/staff and admin can operate a station', async t => {
  const stationId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  t.mock.method(Station, 'findById', async () => ({ _id: stationId, managerId }));
  t.mock.method(Staff, 'exists', async filter => String(filter.userId) === String(staffId));
  for (const [role, id, allowed] of [
    ['ADMIN', new mongoose.Types.ObjectId(), true],
    ['STATION_MANAGER', managerId, true],
    ['STATION_MANAGER', new mongoose.Types.ObjectId(), false],
    ['STAFF', staffId, true],
    ['STAFF', new mongoose.Types.ObjectId(), false],
    ['USER', managerId, false],
  ]) {
    const action = service.requireStationOperator(stationId, { _id: id, role: { name: role } });
    if (allowed) await action;
    else await assert.rejects(action, { status: 403 });
  }
});

test('foreign job detail is rejected before applicant data is read', async t => {
  const stationId = new mongoose.Types.ObjectId();
  const taskId = new mongoose.Types.ObjectId();
  const query = { populate: () => query, then: resolve => resolve({ _id: taskId, stationId: { _id: stationId } }) };
  t.mock.method(Task, 'findById', () => query);
  t.mock.method(Station, 'findById', async () => ({ _id: stationId }));
  t.mock.method(Staff, 'exists', async () => false);
  const read = t.mock.method(Application, 'find', () => { throw new Error('Applicant data must not be read'); });
  for (const role of ['STAFF', 'STATION_MANAGER']) {
    let error;
    await controller.getTaskById({ params: { id: String(taskId) }, user: { _id: new mongoose.Types.ObjectId(), role: { name: role } } }, {}, e => { error = e; });
    assert.equal(error.status, 403);
  }
  assert.equal(read.mock.callCount(), 0);
});

test('job listing scopes staff and manager queries, admin remains unrestricted', async t => {
  const stationId = new mongoose.Types.ObjectId();
  t.mock.method(Staff, 'distinct', async () => [stationId]);
  t.mock.method(Station, 'distinct', async () => [stationId]);
  t.mock.method(service, 'withSlots', async rows => rows);
  let expected;
  t.mock.method(Task, 'countDocuments', async filter => { assert.deepEqual(filter.stationId, expected); return 0; });
  t.mock.method(Task, 'find', filter => {
    assert.deepEqual(filter.stationId, expected);
    const query = { populate: () => query, sort: () => query, skip: () => query, limit: async () => [] };
    return query;
  });
  for (const role of ['STAFF', 'STATION_MANAGER', 'ADMIN']) {
    expected = role === 'ADMIN' ? undefined : { $in: [stationId] };
    let result;
    await controller.getAllTasks({ query: {}, user: { _id: new mongoose.Types.ObjectId(), role: { name: role } } },
      { status: () => ({ json: body => { result = body; } }) }, error => { throw error; });
    assert.equal(result.total, 0);
  }
});
