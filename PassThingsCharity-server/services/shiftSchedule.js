const mongoose = require('mongoose');
const Schedule = require('../models/shiftSchedule');
const Template = require('../models/shiftTemplate');
const StationStaff = require('../models/stationstaff');
const Station = require('../models/station');
const { canEdit } = require('../utils/resourceImageAccess');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

function validateDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, 'Ngày phải có định dạng YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(400, 'Ngày không tồn tại.');
  return value;
}

function interval(date, template) {
  validateDate(date);
  const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!pattern.test(template.startTime) || !pattern.test(template.endTime) || template.startTime >= template.endTime) fail(400, 'Giờ ca mẫu không hợp lệ; ca phải kết thúc trong cùng ngày.');
  return {
    start: new Date(`${date}T${template.startTime}:00+07:00`),
    end: new Date(`${date}T${template.endTime}:00+07:00`),
  };
}

function validateFuture(date, template, now = new Date()) {
  const times = interval(date, template);
  if (times.start <= now) fail(400, 'Không được tạo lịch có thời gian bắt đầu trong quá khứ hoặc đã đến giờ bắt đầu.');
  return times;
}

function overlaps(a, b) { return a.start < b.end && b.start < a.end; }

function validateCheckIn(date, template, now = new Date(), enforce = process.env.SHIFT_ENFORCE_CHECKIN_TIME === 'true') {
  if (!enforce) return;
  const { start, end } = interval(date, template);
  const earliest = new Date(start.getTime() - 15 * 60000);
  if (now < earliest || now >= end) fail(409, 'Chỉ được check-in từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc ca (UTC+7).');
}

async function requireStation(stationId, user, write = false) {
  if (!mongoose.isValidObjectId(stationId)) fail(400, 'stationId không hợp lệ.');
  const station = await Station.findById(stationId);
  if (!station) fail(404, 'Không tìm thấy trạm.');
  if (await canEdit('stations', station, user)) return;
  if (!write && user.role?.name === 'STAFF' && await StationStaff.exists({ stationId, userId: user._id })) return;
  fail(403, 'Bạn không có quyền truy cập lịch của trạm này.');
}

// All schedule writers share this lock, including different stations assigning
// the same staff member, so concurrent requests cannot create overlapping shifts.
const Lock = mongoose.model('ShiftScheduleLock', new mongoose.Schema({ _id: String, revision: Number }));
async function createSchedules(stationId, rows, user) {
  await requireStation(stationId, user, true);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) fail(400, 'schedules phải chứa từ 1 đến 100 lịch.');
  rows = rows.flatMap(row => {
    if (!row || typeof row !== 'object') fail(400, 'Lịch không hợp lệ.');
    if (row.staffIds !== undefined) {
      if (row.staffId !== undefined || !Array.isArray(row.staffIds) || !row.staffIds.length || new Set(row.staffIds.map(String)).size !== row.staffIds.length) fail(400, 'staffIds phải là danh sách không rỗng, không trùng và không gửi cùng staffId.');
      return row.staffIds.map(staffId => ({ ...row, staffId }));
    }
    return [row];
  });
  if (rows.length > 100) fail(400, 'Tối đa 100 phân công sau khi tách staffIds.');
  for (const row of rows) {
    if (row.shiftCode !== undefined) {
      if (![1, 2].includes(row.shiftCode) || row.templateId !== undefined) fail(400, 'shiftCode phải là số 1 hoặc 2; không gửi cùng templateId.');
    } else if (!mongoose.isValidObjectId(row.templateId)) fail(400, 'Cần shiftCode hoặc templateId hợp lệ.');
    if (row.requiredStaff !== undefined && (!Number.isInteger(row.requiredStaff) || row.requiredStaff < 1)) fail(400, 'requiredStaff phải là số nguyên dương.');
    if (row.description !== undefined && typeof row.description !== 'string') fail(400, 'description phải là chuỗi.');
    if (row.staffIds && row.staffIds.length > (row.requiredStaff || row.staffIds.length)) fail(400, 'Số nhân viên vượt requiredStaff.');
    validateDate(row.date);
    if (row.staffId != null && !mongoose.isValidObjectId(row.staffId)) fail(400, 'staffId không hợp lệ.');
    if (row.note != null && typeof row.note !== 'string') fail(400, 'note phải là chuỗi.');
  }
  try {
    await Lock.updateOne({ _id: 'schedules' }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  return mongoose.connection.transaction(async session => {
    await Lock.findOneAndUpdate({ _id: 'schedules' }, { $inc: { revision: 1 } }, { session });
    const created = [];
    const now = new Date();
    for (const row of rows) {
      const templateFilter = row.shiftCode !== undefined
        ? { code: row.shiftCode, stationId: null, isActive: true }
        : { _id: row.templateId, isActive: true, $or: [{ stationId }, { stationId: null, code: { $in: [1, 2] } }] };
      const template = await Template.findOne(templateFilter).session(session);
      if (!template) fail(404, 'Ca mẫu không tồn tại hoặc không thuộc trạm này.');
      const times = validateFuture(row.date, template, now);
      if (row.staffId) {
        if (!await StationStaff.findOne({ stationId, userId: row.staffId }).session(session)) fail(400, 'Nhân viên không thuộc trạm.');
        const existing = await Schedule.find({ staffId: row.staffId, date: row.date, status: { $ne: 'CANCELLED' } })
          .populate('templateId').session(session);
        for (const entry of existing) {
          if (!entry.templateId) fail(409, 'Lịch cũ thiếu ca mẫu; cần đối soát trước khi phân lịch.');
          if (overlaps(times, interval(entry.date, entry.templateId))) fail(409, 'Nhân viên đã có lịch trùng giờ trong ngày này.');
        }
      }
      const [schedule] = await Schedule.create([{
        stationId, templateId: template._id, date: row.date,
        requiredStaff: row.requiredStaff || row.staffIds?.length || 1,
        staffId: row.staffId || null, note: row.description ?? row.note ?? '', assignedBy: user._id,
      }], { session });
      created.push(schedule);
    }
    return created;
  });
}

module.exports = { validateDate, interval, validateFuture, validateCheckIn, overlaps, requireStation, createSchedules };
