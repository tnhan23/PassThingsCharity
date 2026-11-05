const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'access-error-tests-only';
const jwt = require('jsonwebtoken');
const express = require('express');
const passport = require('passport');
const User = require('../models/user');
const Admin = require('../models/admin');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');

test('JWT and role failures return JSON that FE can handle', async (t) => {
  const originalUserFind = User.findById;
  const originalAdminFind = Admin.findById;
  let account = { _id: 'test-user', status: 'active', role: { name: 'STAFF' } };
  let dbError;
  User.findById = () => ({ populate: async () => {
    if (dbError) throw dbError;
    return account;
  } });
  Admin.findById = () => ({ populate: async () => null });
  const app = express();
  app.use(passport.initialize());
  const be3Routers = [
    ['/contributions', require('../routes/contribution')],
    ['/transfers', require('../routes/campaignTransfer')],
    ['/relief', require('../routes/reliefDistribution')],
    ['/workforce', require('../routes/workforce')],
  ];
  for (const [prefix, router] of be3Routers) app.use(prefix, router);
  app.get('/protected', checkBearerToken, checkRole(['STAFF']), (req, res) => res.json({ id: req.user._id }));
  app.use((err, req, res, next) => res.status(500).json({ error: 'Server error' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    User.findById = originalUserFind;
    Admin.findById = originalAdminFind;
    await new Promise(resolve => server.close(resolve));
  });
  const token = (options = {}, secret = process.env.JWT_SECRET) => jwt.sign({ userId: 'test-user' }, secret, options);
  const request = async (authorization) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/protected`, {
      headers: authorization ? { Authorization: authorization } : {},
    });
    assert.match(response.headers.get('content-type'), /application\/json/);
    return { status: response.status, body: await response.json() };
  };
  for (const [header, code] of [
    [undefined, 'AUTH_TOKEN_MISSING'],
    ['Basic abc', 'AUTH_HEADER_INVALID'],
    ['Bearer', 'AUTH_HEADER_INVALID'],
    ['Bearer abc extra', 'AUTH_HEADER_INVALID'],
    ['Bearer broken', 'AUTH_TOKEN_INVALID'],
    [`Bearer ${token({}, 'wrong-secret')}`, 'AUTH_TOKEN_INVALID'],
    [`Bearer ${token({ expiresIn: -1 })}`, 'AUTH_TOKEN_EXPIRED'],
    [`Bearer ${token({ notBefore: '1h' })}`, 'AUTH_TOKEN_INVALID'],
  ]) {
    const result = await request(header);
    assert.equal(result.status, 401);
    assert.equal(result.body.code, code);
    assert.ok(result.body.message);
    assert.equal(result.body.error, result.body.message);
    if (['AUTH_TOKEN_MISSING', 'AUTH_HEADER_INVALID'].includes(code)) {
      assert.doesNotMatch(result.body.message, /chưa đăng nhập/);
      assert.doesNotMatch(result.body.message, /Bearer|<token>/);
    }
    if (code === 'AUTH_TOKEN_MISSING') {
      assert.equal(result.body.message, 'Không có token xác thực.');
    }
  }
  const validHeader = `Bearer ${token()}`;
  // Exercise the actual BE3 route middleware; no controller/database calls expected.
  for (const [prefix, router] of be3Routers) {
    for (const layer of router.stack.filter(layer => layer.route)) {
      const route = layer.route;
      const url = prefix + route.path.replace(/:[^/]+/g, '507f1f77bcf86cd799439011');
      for (const method of Object.keys(route.methods)) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method: method.toUpperCase() });
        assert.equal(response.status, 401, `${method} ${url}`);
        assert.equal((await response.json()).code, 'AUTH_TOKEN_MISSING');
      }
    }
  }
  assert.deepEqual(await request(validHeader), { status: 200, body: { id: 'test-user' } });
  for (const role of [{ name: 'DONOR' }, null]) {
    account.role = role;
    const result = await request(validHeader);
    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'FORBIDDEN');
    assert.match(result.body.message, /không có quyền truy cập/);
  }
  account = null;
  assert.equal((await request(validHeader)).body.code, 'AUTH_USER_UNAVAILABLE');
  account = { status: 'banned' };
  assert.equal((await request(validHeader)).body.code, 'AUTH_USER_UNAVAILABLE');
  dbError = new Error('database unavailable');
  assert.equal((await request(validHeader)).status, 500);
});

test('every BE3 Swagger operation documents JSON access errors', () => {
  const paths = require('../docs/operations.doc');
  for (const path of Object.values(paths)) {
    for (const operation of Object.values(path)) {
      for (const status of [401, 403]) {
        const schema = operation.responses[status].content['application/json'].schema;
        assert.deepEqual(schema.required, ['code', 'message', 'error']);
      }
    }
  }
});

test('Swagger role permissions match every BE3 route guard', () => {
  const paths = require('../docs/operations.doc');
  const routers = [
    ['/contributions', require('../routes/contribution')],
    ['/transfers', require('../routes/campaignTransfer')],
    ['/relief', require('../routes/reliefDistribution')],
    ['/workforce', require('../routes/workforce')],
  ];
  let count = 0;
  for (const [prefix, router] of routers) {
    for (const { route } of router.stack.filter(layer => layer.route)) {
      const url = (prefix + (route.path === '/' ? '' : route.path)).replace(/:([^/]+)/g, '{$1}');
      for (const method of Object.keys(route.methods)) {
        const operation = paths[url]?.[method];
        assert.ok(operation, `${method} ${url} must be documented`);
        assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
        assert.match(operation.summary, /^\[/);
        assert.match(operation.description, /Quyền truy cập/);
        const allowed = operation['x-allowed-roles'];
        // Skip JWT middleware and final controller; exercise actual role guards.
        const guards = route.stack.slice(1, -1);
        for (const name of ['ADMIN', 'STATION_MANAGER', 'STAFF', 'ORG_MANAGER', 'USER', 'VOLUNTEER']) {
          let denied = false;
          const res = { status(status) { denied = status === 403; return this; }, json() {} };
          for (const guard of guards) guard.handle({ user: { role: { name } } }, res, () => {});
          assert.equal(!denied, allowed.includes('*') || allowed.includes(name), `${method} ${url}: ${name}`);
        }
        count++;
      }
    }
  }
  assert.equal(count, Object.values(paths).reduce((total, path) => total + Object.keys(path).length, 0));
  for (const action of ['check-in', 'check-out']) {
    assert.match(paths[`/workforce/tasks/${action}`].post.description, /Người được phân công/);
    assert.match(paths[`/workforce/tasks/${action}`].post.description, /403/);
  }
});
