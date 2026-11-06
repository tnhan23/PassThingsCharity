const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const shifts = require('../services/shiftSchedule');
const Schedule = require('../models/shiftSchedule');
const Template = require('../models/shiftTemplate');
const Station = require('../models/station');
const Staff = require('../models/stationstaff');

test('calendar validation, future dates and UTC+7 shift boundaries', () => {
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '', null]) {
    assert.throws(() => shifts.validateDate(date), { status: 400 });
  }
  assert.equal(shifts.validateDate('2028-02-29'), '2028-02-29');
  const morning = { startTime: '08:00', endTime: '14:00' };
  const afternoon = { startTime: '14:00', endTime: '20:00' };
  const now = new Date('2026-11-05T03:00:00Z');
  assert.throws(() => shifts.validateFuture('2026-11-04', morning, now), { status: 400 });
  assert.throws(() => shifts.validateFuture('2026-11-05', morning, now), { status: 400 });
  assert.equal(shifts.validateFuture('2026-11-06', morning, now).start.toISOString(), '2026-11-06T01:00:00.000Z');
  const a = shifts.interval('2026-11-06', morning);
  assert.equal(shifts.overlaps(a, shifts.interval('2026-11-06', afternoon)), false);
  assert.equal(shifts.overlaps(a, shifts.interval('2026-11-06', { startTime: '13:00', endTime: '16:00' })), true);
  assert.throws(() => shifts.validateCheckIn('2026-11-06', morning, new Date('2026-11-06T00:44:59Z'), true), { status: 409 });
  assert.doesNotThrow(() => shifts.validateCheckIn('2026-11-06', morning, new Date('2026-11-06T00:45:00Z'), true));
  assert.doesNotThrow(() => shifts.validateCheckIn('2026-11-06', morning, a.start, true));
  assert.throws(() => shifts.validateCheckIn('2026-11-06', morning, a.end, true), { status: 409 });
  assert.doesNotThrow(() => shifts.validateCheckIn('2099-11-06', morning, now, false));
});

test('batch scheduling checks cross-template conflicts and rolls back the entire batch', async t => {
  const originals = [];
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  const stationId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const templateId = new mongoose.Types.ObjectId();
  const user = { _id: new mongoose.Types.ObjectId(), role: { name: 'STATION_MANAGER' } };
  const template = { _id: templateId, startTime: '08:00', endTime: '14:00' };
  let stored = [];
  const query = value => ({ session: async () => value });
  stub(Station, 'findById', async () => ({ managerId: user._id }));
  stub(require('../models/organization'), 'findById', async () => null);
  let lastTemplateFilter;
  stub(Template, 'findOne', filter => { lastTemplateFilter = filter; return query(template); });
  stub(Staff, 'findOne', () => query({}));
  stub(Schedule, 'find', filter => ({ populate: () => query(stored.filter(row => row.date === filter.date && String(row.staffId) === String(filter.staffId))) }));
  stub(Schedule, 'create', async rows => { const result = rows.map(row => ({ ...row, templateId: template })); stored.push(...result); return result; });
  const lock = mongoose.model('ShiftScheduleLock');
  stub(lock, 'updateOne', async () => ({}));
  stub(lock, 'findOneAndUpdate', async () => ({}));
  stub(mongoose.connection, 'transaction', async fn => {
    const before = [...stored];
    try { return await fn({}); } catch (error) { stored = before; throw error; }
  });
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });
  const row = { templateId, staffId, date: '2099-11-06' };
  const created = await shifts.createSchedules(stationId, [row, { ...row, date: '2099-11-07' }], user);
  assert.equal(created.length, 2);
  assert.equal(String(created[0].assignedBy), String(user._id));
  const multi = await shifts.createSchedules(stationId, [{ shiftCode: 1, date: '2099-11-09', requiredStaff: 2,
    staffIds: [String(staffId), String(user._id)], description: 'Nhận đồ' }], user);
  assert.equal(multi.length, 2);
  assert.equal(multi[0].requiredStaff, 2);
  assert.equal(multi[0].note, 'Nhận đồ');
  assert.equal(String(multi[0].templateId._id), String(templateId));
  assert.deepEqual(lastTemplateFilter, { code: 1, stationId: null, isActive: true });
  await assert.rejects(shifts.createSchedules(stationId, [{ ...row, date: '2099-11-08' }, row], user), { status: 409 });
  assert.equal(stored.length, 4);
  await assert.rejects(shifts.createSchedules(stationId, [{ shiftCode: 3, date: '2099-11-10' }], user), { status: 400 });
  await assert.rejects(shifts.createSchedules(stationId, [{ shiftCode: 1, templateId, date: '2099-11-10' }], user), { status: 400 });
  await assert.rejects(shifts.createSchedules(stationId, [{ shiftCode: 1, date: '2099-11-10', requiredStaff: 1, staffIds: [String(staffId), String(user._id)] }], user), { status: 400 });
  await assert.rejects(shifts.createSchedules(stationId, [{ ...row, date: '2020-01-01' }], user), { status: 400 });
  await assert.rejects(shifts.createSchedules(stationId, [], user), { status: 400 });
  await assert.rejects(shifts.createSchedules(stationId, [row], { _id: staffId, role: { name: 'USER' } }), { status: 403 });
});

test('shared shift catalog initializes once per code without overwriting existing records', async t => {
  const { initializeShiftTemplates } = require('../services/shiftTemplates');
  const originalInit = Template.init;
  const originalUpdate = Template.updateOne;
  const records = new Map();
  Template.init = async () => {};
  Template.updateOne = async (filter, update, options) => {
    assert.equal(options.upsert, true);
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    if (!records.has(filter.code)) records.set(filter.code, update.$setOnInsert);
  };
  t.after(() => { Template.init = originalInit; Template.updateOne = originalUpdate; });
  await initializeShiftTemplates();
  await initializeShiftTemplates();
  assert.equal(records.size, 2);
  assert.equal(records.get(1).startTime, '08:00');
  assert.equal(records.get(1).endTime, '14:00');
  assert.equal(records.get(2).startTime, '14:00');
  assert.equal(records.get(2).endTime, '20:00');
  assert.equal(records.get(1).stationId, null);
  assert.equal(new Template(records.get(1)).validateSync(), undefined);
});

test('check-in endpoint allows future shifts in test mode and enforces time when enabled', async t => {
  const controller = require('../controller/shiftSchedules');
  const originals = [];
  const previousSetting = process.env.SHIFT_ENFORCE_CHECKIN_TIME;
  t.after(() => {
    if (previousSetting === undefined) delete process.env.SHIFT_ENFORCE_CHECKIN_TIME;
    else process.env.SHIFT_ENFORCE_CHECKIN_TIME = previousSetting;
  });
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  const id = new mongoose.Types.ObjectId();
  let saved = false;
  const schedule = { staffId: id, stationId: id, date: '2099-11-06', status: 'SCHEDULED', save: async () => { saved = true; } };
  stub(Schedule, 'findById', async () => schedule);
  stub(Template, 'findById', async () => ({ startTime: '08:00', endTime: '14:00' }));
  stub(shifts, 'requireStation', async () => {});
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });
  let status;
  const res = { status(value) { status = value; return this; }, json() {} };
  process.env.SHIFT_ENFORCE_CHECKIN_TIME = 'true';
  await controller.checkInShift({ params: { id: String(id) }, user: { _id: id } }, res, error => { status = error.status; });
  assert.equal(status, 409);
  assert.equal(saved, false);
  process.env.SHIFT_ENFORCE_CHECKIN_TIME = 'false';
  await controller.checkInShift({ params: { id: String(id) }, user: { _id: id } }, res, error => { throw error; });
  assert.equal(status, 200);
  assert.equal(saved, true);
  assert.equal(schedule.status, 'IN_PROGRESS');
});

test('weekly list uses inclusive date range and rejects invalid filters', async t => {
  const controller = require('../controller/shiftSchedules');
  const originalAccess = shifts.requireStation;
  const originalFind = Schedule.find;
  shifts.requireStation = async () => {};
  let filter;
  Schedule.find = value => {
    filter = value;
    const query = { populate() { return this; }, sort: async () => [] };
    return query;
  };
  t.after(() => { shifts.requireStation = originalAccess; Schedule.find = originalFind; });
  let status;
  const response = { status(code) { status = code; return this; }, json() {} };
  const request = query => ({ params: { stationId: 'station' }, user: {}, query });
  await controller.getStationSchedules(request({ fromDate: '2026-11-06', toDate: '2026-11-12' }), response, err => { throw err; });
  assert.equal(status, 200);
  assert.deepEqual(filter.date, { $gte: '2026-11-06', $lte: '2026-11-12' });
  await controller.getStationSchedules(request({ fromDate: '2026-11-12', toDate: '2026-11-06' }), response, err => { throw err; });
  assert.equal(status, 400);
});
