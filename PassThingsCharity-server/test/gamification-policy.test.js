const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DONATION_BASE_POINTS,
  NO_SHOW_PENALTY_POINTS,
  calculateDonationPoints,
  calculateTaskPoints,
  getNoShowConsequence,
  getReachedPointMilestones,
} = require('../services/gamificationPolicy');
const { createCertificatePdf } = require('../utils/certificatePdf');
const createSwaggerDocument = require('../config/swagger');
const TaskAssignment = require('../models/taskAssignment');
const Task = require('../models/task');
const PointTransaction = require('../models/pointTransaction');
const ItemType = require('../models/itemType');
const { markAssignmentAbsent } = require('../controller/workforce');
const { getPointPolicy } = require('../controller/gamification');

test('donation points use the base reward and configured points per standard unit', () => {
  assert.equal(DONATION_BASE_POINTS, 20);
  assert.equal(calculateDonationPoints([
    { quantity: 3, pointsPerUnit: 5 },
    { quantity: 2.5, pointsPerUnit: 2 },
    { quantity: 100, pointsPerUnit: 0 },
  ]), 40);
});

test('job points use configured task reward or the hourly fallback with a 25-point minimum', () => {
  assert.equal(calculateTaskPoints(80, 4), 80);
  assert.equal(calculateTaskPoints(0, 4), 100);
  assert.equal(calculateTaskPoints(0, 0.1), 25);
});

test('point milestones are reached once cumulative points meet each threshold', () => {
  assert.deepEqual(getReachedPointMilestones(99), []);
  assert.deepEqual(getReachedPointMilestones(500), [100, 500]);
  assert.deepEqual(getReachedPointMilestones(1200), [100, 500, 1000]);
});

test('no-show policy warns once, then deducts up to 10 points without a negative balance', () => {
  assert.equal(NO_SHOW_PENALTY_POINTS, 10);
  assert.deepEqual(getNoShowConsequence(0, 100), {
    absenceNumber: 1,
    action: 'WARNING',
    penaltyPoints: 0,
  });
  assert.deepEqual(getNoShowConsequence(1, 100), {
    absenceNumber: 2,
    action: 'PENALTY',
    penaltyPoints: 10,
  });
  assert.deepEqual(getNoShowConsequence(2, 10), {
    absenceNumber: 3,
    action: 'PENALTY',
    penaltyPoints: 10,
  });
});

test('milestone certificate PDF has a valid PDF header and readable ASCII text', () => {
  const pdf = createCertificatePdf({
    recipientName: 'Nguyễn Thị Dương',
    title: 'Giấy chứng nhận 100 điểm',
    content: 'Cảm ơn bạn đã đóng góp',
    issueDate: new Date('2026-11-02T00:00:00Z'),
    milestonePoints: 100,
  });
  const text = pdf.toString('ascii');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.includes('Nguyen Thi Duong'));
  assert.ok(text.includes('Milestone reached: 100 points'));
  const xrefOffset = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xrefOffset, xrefOffset + 4), 'xref');
});

test('Swagger exposes the points policy, profile rewards, absence handling, and certificate PDF workflows', () => {
  const document = createSwaggerDocument();
  const profileSchema = document.paths['/users/me/profile'].get.responses[200]
    .content['application/json'].schema;

  assert.ok(profileSchema.properties.gamification.properties.totalPoints);
  assert.deepEqual(document.paths['/gamification/points/policy'].get.security, []);
  assert.ok(document.paths['/workforce/tasks/assignments/{assignmentId}/absent'].patch);
  assert.deepEqual(
    document.paths['/workforce/tasks/assignments/{assignmentId}/absent'].patch['x-allowed-roles'],
    ['ADMIN', 'STATION_MANAGER', 'STAFF']
  );
  assert.equal(
    document.paths['/gamification/certificates/{id}/pdf'].get.responses[200]
      .content['application/pdf'].schema.format,
    'binary'
  );
});

test('public points policy includes current active item rates and reward rules', async (t) => {
  const originalFind = ItemType.find;
  const activeItem = {
    _id: '507f1f77bcf86cd799439031',
    categoryId: { name: 'Đồ ăn' },
    name: 'Mì gói',
    unit: 'BOX',
    pointsPerUnit: 5,
  };
  const query = {
    select() { return this; },
    populate() { return this; },
    sort() { return Promise.resolve([activeItem]); },
  };
  ItemType.find = (filter) => {
    assert.deepEqual(filter, { isActive: true });
    return query;
  };
  t.after(() => {
    ItemType.find = originalFind;
  });

  const response = {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await getPointPolicy({}, response, (error) => {
    if (error) throw error;
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.policy.donation.basePoints, 20);
  assert.equal(response.body.policy.donation.itemTypes[0].pointsPerUnit, 5);
  assert.equal(response.body.policy.task.fallbackPointsPerHour, 25);
  assert.equal(response.body.policy.noShow.repeatConfirmedAbsence.requestedPenaltyPoints, 10);
});

test('first manager-confirmed no-show warns and reopens the job slot', async (t) => {
  const originalFindAssignment = TaskAssignment.findById;
  const originalCountAssignments = TaskAssignment.countDocuments;
  const originalFindTask = Task.findById;
  const originalPointAggregate = PointTransaction.aggregate;
  const originalPointFindOneAndUpdate = PointTransaction.findOneAndUpdate;
  const assignment = {
    _id: '507f1f77bcf86cd799439011',
    taskId: '507f1f77bcf86cd799439012',
    assigneeId: '507f1f77bcf86cd799439014',
    assigneeType: 'VOLUNTEER',
    status: 'ASSIGNED',
    async save() {},
  };
  const task = {
    _id: assignment.taskId,
    status: 'ASSIGNED',
    requiredVolunteers: 1,
    recruitmentStatus: 'FILLED',
    endTime: new Date(Date.now() - 60_000),
    async save() {},
  };

  TaskAssignment.findById = async () => assignment;
  TaskAssignment.countDocuments = async () => 0;
  Task.findById = async () => task;
  PointTransaction.aggregate = async () => [{ totalPoints: 100 }];
  PointTransaction.findOneAndUpdate = async () => {
    throw new Error('First no-show must not create a deduction.');
  };
  t.after(() => {
    TaskAssignment.findById = originalFindAssignment;
    TaskAssignment.countDocuments = originalCountAssignments;
    Task.findById = originalFindTask;
    PointTransaction.aggregate = originalPointAggregate;
    PointTransaction.findOneAndUpdate = originalPointFindOneAndUpdate;
  });

  const response = {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await markAssignmentAbsent({
    params: { assignmentId: assignment._id },
    body: { reason: 'No show' },
    user: { _id: '507f1f77bcf86cd799439013', role: { name: 'STAFF' } },
  }, response, (error) => {
    if (error) throw error;
  });

  assert.equal(response.statusCode, 200);
  assert.equal(assignment.status, 'ABSENT');
  assert.equal(task.recruitmentStatus, 'OPEN');
  assert.equal(task.status, 'PENDING');
  assert.match(assignment.completionNote, /No show/);
  assert.equal(response.body.consequence.action, 'WARNING');
  assert.equal(response.body.consequence.penaltyPoints, 0);
  assert.equal(assignment.absenceNumber, 1);
});

test('repeat manager-confirmed no-show deducts points once and reopens the job slot', async (t) => {
  const originalFindAssignment = TaskAssignment.findById;
  const originalCountAssignments = TaskAssignment.countDocuments;
  const originalFindTask = Task.findById;
  const originalPointAggregate = PointTransaction.aggregate;
  const originalPointFindOneAndUpdate = PointTransaction.findOneAndUpdate;
  const assignment = {
    _id: '507f1f77bcf86cd799439021',
    taskId: '507f1f77bcf86cd799439022',
    assigneeId: '507f1f77bcf86cd799439023',
    assigneeType: 'VOLUNTEER',
    status: 'ASSIGNED',
    async save() {},
  };
  const task = {
    _id: assignment.taskId,
    title: 'Test task',
    status: 'ASSIGNED',
    requiredVolunteers: 1,
    recruitmentStatus: 'FILLED',
    endTime: new Date(Date.now() - 60_000),
    async save() {},
  };
  let createdTransaction;

  TaskAssignment.findById = async () => assignment;
  let assignmentCountCalls = 0;
  TaskAssignment.countDocuments = async () => {
    assignmentCountCalls += 1;
    return assignmentCountCalls === 1 ? 1 : 0;
  };
  Task.findById = async () => task;
  PointTransaction.aggregate = async () => [{ totalPoints: 40 }];
  PointTransaction.findOneAndUpdate = async (filter, update) => {
    createdTransaction = {
      ...update.$setOnInsert,
      idempotencyKey: filter.idempotencyKey,
    };
    return createdTransaction;
  };
  t.after(() => {
    TaskAssignment.findById = originalFindAssignment;
    TaskAssignment.countDocuments = originalCountAssignments;
    Task.findById = originalFindTask;
    PointTransaction.aggregate = originalPointAggregate;
    PointTransaction.findOneAndUpdate = originalPointFindOneAndUpdate;
  });

  const response = {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await markAssignmentAbsent({
    params: { assignmentId: assignment._id },
    body: { reason: 'Second no-show' },
    user: { _id: '507f1f77bcf86cd799439024', role: { name: 'STAFF' } },
  }, response, (error) => {
    if (error) throw error;
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.consequence.action, 'PENALTY');
  assert.equal(response.body.consequence.absenceNumber, 2);
  assert.equal(response.body.consequence.penaltyPoints, 10);
  assert.equal(assignment.absencePenaltyPoints, 10);
  assert.equal(createdTransaction.points, -10);
  assert.equal(createdTransaction.type, 'NO_SHOW_PENALTY');
  assert.equal(createdTransaction.idempotencyKey, `no-show-assignment:${assignment._id}`);
  assert.equal(task.recruitmentStatus, 'OPEN');
});
