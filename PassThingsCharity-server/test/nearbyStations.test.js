process.env.JWT_SECRET = 'access-error-tests-only';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const passport = require('passport');
const Station = require('../models/station');
const Organization = require('../models/organization');
const User = require('../models/user');
const Admin = require('../models/admin');
const checkBearerToken = require('../middleware/checkBearerToken');
const optionalBearerToken = require('../middleware/optionalBearerToken');
const stationsRouter = require('../routes/station');

test('GET /stations/nearby handles Guest vs Authenticated location recommendations', async (t) => {
  // Mock Mongoose models
  const mockOrgId = '6523456789abcdef00000001';
  const mockStations = [
    {
      _id: '671000000000000000000012',
      name: 'Trạm Thủ Đức (Gần thứ 2)',
      address: '456 Võ Văn Ngân, TP. Thủ Đức',
      latitude: '10.8500',
      longitude: '106.7700',
      isActive: true,
      organizationId: { _id: mockOrgId, name: 'Tổ Chức A' },
    },
    {
      _id: '671000000000000000000011',
      name: 'Trạm Quận 1 (Gần nhất)',
      address: '123 Nguyễn Huệ, Quận 1',
      latitude: '10.776889',
      longitude: '106.700806',
      isActive: true,
      organizationId: { _id: mockOrgId, name: 'Tổ Chức A' },
    },
  ];

  const origOrgFind = Organization.find;
  const origStationFind = Station.find;
  const origUserFind = User.findById;
  const origAdminFind = Admin.findById;

  Organization.find = () => Promise.resolve([{ _id: mockOrgId, name: 'Tổ Chức A', code: 'ORG_A' }]);

  Station.find = () => ({
    populate: () => ({
      populate: () => ({
        lean: async () => JSON.parse(JSON.stringify(mockStations)),
      }),
    }),
  });

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'test_user',
    status: 'active',
    role: { name: 'USER' },
  };

  User.findById = () => ({
    populate: async () => mockUser,
  });
  Admin.findById = () => ({
    populate: async () => null,
  });

  const app = express();
  app.use(express.json());
  app.use(passport.initialize());
  app.use('/stations', stationsRouter);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  t.after(async () => {
    Organization.find = origOrgFind;
    Station.find = origStationFind;
    User.findById = origUserFind;
    Admin.findById = origAdminFind;
    await new Promise((resolve) => server.close(resolve));
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}/stations/nearby`;

  // 1. TEST CHƯA ĐĂNG NHẬP (Guest mode)
  const guestRes = await fetch(baseUrl);
  assert.equal(guestRes.status, 200);
  const guestBody = await guestRes.json();
  assert.equal(guestBody.isLoggedIn, false);
  assert.equal(guestBody.total, 2);
  assert.ok(guestBody.message.includes('chưa đăng nhập'));
  // Đảm bảo KHÔNG có chi tiết khoảng cách khi chưa đăng nhập
  for (const item of guestBody.data) {
    assert.equal(item.distanceKm, undefined);
    assert.equal(item.distanceMeters, undefined);
    assert.equal(item.formattedDistance, undefined);
    assert.ok(item.address);
    assert.ok(item.name);
  }

  // 2. TEST ĐÃ ĐĂNG NHẬP (Authenticated mode) với tọa độ GPS Quận 1
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: mockUser._id }, process.env.JWT_SECRET || 'access-error-tests-only');

  const authRes = await fetch(`${baseUrl}?latitude=10.776889&longitude=106.700806`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(authRes.status, 200);
  const authBody = await authRes.json();
  assert.equal(authBody.isLoggedIn, true);
  assert.equal(authBody.total, 2);
  assert.ok(authBody.message.includes('sắp xếp theo khoảng cách gần nhất'));

  // Kiểm tra trạm gần nhất (Quận 1 - 0km) được đẩy lên đầu danh sách (#1), trạm Thủ Đức (#2)
  assert.equal(authBody.data[0]._id, '671000000000000000000011');
  assert.equal(authBody.data[0].distanceKm, 0);
  assert.equal(authBody.data[0].formattedDistance, '0 m');

  assert.equal(authBody.data[1]._id, '671000000000000000000012');
  assert.ok(authBody.data[1].distanceKm > 5);
  assert.ok(authBody.data[1].formattedDistance.includes('km'));

  // 3. TEST TOKEN KHÔNG HỢP LỆ
  const invalidRes = await fetch(baseUrl, {
    headers: { Authorization: 'Bearer invalid_token_xyz' },
  });
  assert.equal(invalidRes.status, 401);
  const invalidBody = await invalidRes.json();
  assert.equal(invalidBody.code, 'AUTH_TOKEN_INVALID');
});
