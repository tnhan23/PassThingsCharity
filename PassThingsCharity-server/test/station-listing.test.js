const { test } = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../controller/station');
const Organization = require('../models/organization');
const Station = require('../models/station');

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

test('station manager receives assigned stations and stations in their submitted organizations', async t => {
  const managerId = 'manager-id';
  const organizationId = 'owned-organization';
  const stations = [
    { _id: 'assigned-station', managerId },
    { _id: 'organization-station', organizationId },
  ];
  let filter;

  replace(Organization, 'find', (query, projection) => {
    assert.deepEqual(query, { submittedBy: managerId });
    assert.deepEqual(projection, { _id: 1 });
    return [{ _id: organizationId }];
  }, t);
  replace(Station, 'find', query => {
    filter = query;
    return {
      sort: async sortOrder => {
        assert.deepEqual(sortOrder, { createdAt: -1 });
        return stations;
      },
    };
  }, t);

  const res = response();
  await controller.listStations({
    user: { _id: managerId, role: { name: 'STATION_MANAGER' } },
    query: {},
  }, res, error => { throw error; });

  assert.deepEqual(filter, {
    $or: [
      { managerId },
      { organizationId: { $in: [organizationId] } },
    ],
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { total: 2, data: stations });
});
