const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { getStationTaskApplications } = require('../controller/workforce');
const Station = require('../models/station');
const Staff = require('../models/stationstaff');
const Organization = require('../models/organization');
const Task = require('../models/task');
const Application = require('../models/taskApplication');

test('station applications enforce staff membership and restrict every status to station jobs', async t => {
  const stationId = String(new mongoose.Types.ObjectId());
  const otherStationId = String(new mongoose.Types.ObjectId());
  const user = { _id: new mongoose.Types.ObjectId(), role: { name: 'STAFF' } };
  const taskId = new mongoose.Types.ObjectId();
  t.mock.method(Station, 'findById', async id => ({ _id: id, organizationId: new mongoose.Types.ObjectId() }));
  t.mock.method(Organization, 'findById', async () => null);
  t.mock.method(Staff, 'exists', async filter => String(filter.stationId) === stationId && String(filter.userId) === String(user._id));
  let taskReads = 0;
  t.mock.method(Task, 'distinct', async (field, filter) => {
    taskReads++;
    assert.equal(field, '_id');
    assert.deepEqual(filter, { stationId });
    return [taskId];
  });
  let expectedStatus;
  const checkFilter = filter => {
    assert.deepEqual(filter.taskId, { $in: [taskId] });
    assert.equal(filter.status, expectedStatus);
  };
  t.mock.method(Application, 'countDocuments', async filter => { checkFilter(filter); return 1; });
  t.mock.method(Application, 'find', filter => {
    checkFilter(filter);
    const query = { populate: () => query, sort: () => query, skip: () => query, limit: async () => [{ status: expectedStatus || 'PENDING' }] };
    return query;
  });
  async function call(id, query = {}) {
    const result = {};
    const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; return this; } };
    await getStationTaskApplications({ params: { stationId: id }, query, user }, res, error => { result.error = error; });
    return result;
  }
  const denied = await call(otherStationId);
  assert.equal(denied.error.status, 403);
  assert.equal(taskReads, 0);
  for (const status of [undefined, 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']) {
    expectedStatus = status;
    const result = await call(stationId, status ? { status } : {});
    assert.equal(result.status, 200);
    assert.equal(result.body.total, 1);
    assert.equal(result.body.data.length, 1);
  }
  assert.equal((await call(stationId, { status: 'ALL' })).status, 400);
  assert.equal((await call('invalid')).status, 400);
});
