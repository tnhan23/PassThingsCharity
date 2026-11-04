const mongoose = require('mongoose');
const Task = require('../models/task');
const Assignment = require('../models/taskAssignment');
const Application = require('../models/taskApplication');
const User = require('../models/user');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const { canEdit } = require('../utils/resourceImageAccess');

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

async function withSlots(tasks, session = null) {
  if (!tasks.length) return [];
  const ids = tasks.map(task => task._id);
  const approved = await Assignment.aggregate([
    { $match: { taskId: { $in: ids }, assigneeType: 'VOLUNTEER', status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] } } },
    { $group: { _id: '$taskId', count: { $sum: 1 } } },
  ]).session(session);
  const pending = await Application.aggregate([
    { $match: { taskId: { $in: ids }, status: 'PENDING' } },
    { $group: { _id: '$taskId', count: { $sum: 1 } } },
  ]).session(session);
  const approvedMap = new Map(approved.map(row => [String(row._id), row.count]));
  const pendingMap = new Map(pending.map(row => [String(row._id), row.count]));
  return tasks.map(task => {
    const plain = task.toObject ? task.toObject() : task;
    const total = Number(task.requiredVolunteers) || 0;
    const filled = approvedMap.get(String(task._id)) || 0;
    return { ...plain, slots: {
      total, approved: filled, pending: pendingMap.get(String(task._id)) || 0,
      remaining: Math.max(0, total - filled), isFull: total > 0 && filled >= total,
    } };
  });
}

async function requireStationOperator(stationId, user) {
  const station = await Station.findById(stationId);
  if (!station) fail(404, 'Station not found.');
  if (await canEdit('stations', station, user)) return station;
  if (user.role?.name === 'STAFF' && await StationStaff.exists({ stationId, userId: user._id })) return station;
  fail(403, 'You cannot manage schedules for this station.');
}

function validateSchedule(values, now = new Date()) {
  const start = new Date(values.startTime);
  const end = new Date(values.endTime);
  if (!values.startTime || !values.endTime || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
    fail(400, 'Provide startTime and endTime, with endTime after startTime.');
  }
  if (start <= now) fail(400, 'Schedule must start in the future.');
  const capacity = Number(values.requiredVolunteers);
  if (values.requiredVolunteers === null || typeof values.requiredVolunteers === 'boolean' || !Number.isInteger(capacity) || capacity < 1) {
    fail(400, 'requiredVolunteers must be a positive integer (number of available places).');
  }
  if (values.volunteerDeadline != null) {
    const deadline = new Date(values.volunteerDeadline);
    if (!Number.isFinite(deadline.getTime()) || deadline > start || deadline <= now) {
      fail(400, 'Registration deadline must be in the future and no later than startTime.');
    }
  }
  return { startTime: start, endTime: end, requiredVolunteers: capacity };
}

function requireOpenSchedule(task) {
  if (!['PENDING', 'ASSIGNED'].includes(task.status) || task.recruitmentStatus !== 'OPEN') fail(409, 'Schedule is not open for registration.');
  if (!task.startTime || !task.endTime || new Date(task.startTime) <= new Date()) fail(409, 'Schedule has started or has no valid time window.');
  if (task.volunteerDeadline && new Date(task.volunteerDeadline) <= new Date()) fail(409, 'Registration deadline has passed.');
}

async function requireNoOverlap(userId, task, session) {
  const assignments = await Assignment.find({ assigneeId: userId, taskId: { $ne: task._id }, status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } })
    .session(session || null).populate({ path: 'taskId', options: { session: session || null } });
  if (assignments.some(({ taskId: other }) => other && other.status !== 'CANCELLED' && other.startTime < task.endTime && other.endTime > task.startTime)) {
    fail(409, 'This user already has an assignment overlapping the selected time.');
  }
}

async function reviewApplication(applicationId, status, note, reviewer) {
  let result;
  await mongoose.connection.transaction(async session => {
    const application = await Application.findById(applicationId).session(session);
    if (!application) fail(404, 'Application not found.');
    const task = await Task.findById(application.taskId).session(session);
    if (!task) fail(404, 'Schedule not found.');
    await requireStationOperator(task.stationId, reviewer);
    if (application.status === status) {
      result = { application, assignment: await Assignment.findOne({ taskId: task._id, assigneeId: application.userId }).session(session), task: (await withSlots([task], session))[0] };
      return;
    }
    if (application.status !== 'PENDING') fail(409, 'Only pending applications can be reviewed.');
    let assignment = null;
    if (status === 'APPROVED') {
      requireOpenSchedule(task);
      // Serialize approvals for a schedule and for a person, including approvals
      // for different schedules, so capacity and overlap checks cannot race.
      await Task.updateOne({ _id: task._id }, { $inc: { __v: 1 } }, { session });
      const user = await User.findOneAndUpdate({ _id: application.userId, status: 'active' }, { $inc: { __v: 1 } }, { session });
      if (!user) fail(409, 'Applicant account is unavailable.');
      await requireNoOverlap(application.userId, task, session);
      const used = await Assignment.countDocuments({ taskId: task._id, assigneeType: 'VOLUNTEER', status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] } }).session(session);
      if (used >= task.requiredVolunteers) fail(409, 'Schedule is full.');
      assignment = await Assignment.findOne({ taskId: task._id, assigneeId: application.userId }).session(session);
      if (assignment) fail(409, 'User already has an assignment for this schedule.');
      [assignment] = await Assignment.create([{
        taskId: task._id, assigneeId: application.userId, assigneeType: 'VOLUNTEER',
        assignedBy: reviewer._id, status: 'ASSIGNED',
      }], { session });
      if (task.status === 'PENDING') task.status = 'ASSIGNED';
      if (used + 1 >= task.requiredVolunteers) task.recruitmentStatus = 'FILLED';
      await task.save({ session });
    }
    application.status = status;
    application.reviewedBy = reviewer._id;
    application.reviewedAt = new Date();
    if (typeof note === 'string') application.note = note.trim();
    await application.save({ session });
    result = { application, assignment, task: (await withSlots([task], session))[0] };
  });
  return result;
}

module.exports = { withSlots, requireStationOperator, validateSchedule, requireOpenSchedule, requireNoOverlap, reviewApplication };
