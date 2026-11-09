const mongoose = require('mongoose');
const Transfer = require('../models/campaignTransfer');
const Item = require('../models/campaignTransferItem');
const Shipment = require('../models/transferShipment');
const Assignment = require('../models/taskAssignment');
const Task = require('../models/task');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const Upload = require('../models/transferEvidenceUpload');
const ShiftSchedule = require('../models/shiftSchedule');
const User = require('../models/user');
const Notification = require('../models/notification');

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const same = (a, b) => String(a?._id || a) === String(b?._id || b);
const round = n => Number(n.toFixed(8));

async function requireOnDuty(stationId, user, now = new Date()) {
  if (user.role?.name !== 'STAFF') return null;
  stationId = stationId?._id || stationId;
  await stationAccess(stationId, user);
  const localDate = time => new Date(time.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dates = [localDate(now), localDate(new Date(now.getTime() - 86400000))];
  const schedules = await ShiftSchedule.find({ stationId, staffId: user._id, date: { $in: dates }, status: { $in: ['SCHEDULED', 'IN_PROGRESS'] } })
    .populate('templateId', 'stationId startTime endTime isActive');
  for (const schedule of schedules) {
    const template = schedule.templateId;
    if (!template || !template.isActive || !same(template.stationId, stationId) || schedule.checkOutTime) continue;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(template.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(template.endTime)) continue;
    const start = new Date(`${schedule.date}T${template.startTime}:00+07:00`);
    let end = new Date(`${schedule.date}T${template.endTime}:00+07:00`);
    if (end <= start) end = new Date(end.getTime() + 86400000);
    if (start <= now && now < end) return schedule;
  }
  fail(403, 'STAFF must have an active assigned shift at this station covering the current time (UTC+07).');
}

async function validateResponsible(stationId, userId) {
  if (!mongoose.isValidObjectId(userId)) fail(400, 'A valid responsible user ID is required.');
  const person = await User.findById(userId).populate('role', 'name');
  if (!person || person.status !== 'active' || !['STAFF', 'STATION_MANAGER'].includes(person.role?.name)) fail(400, 'Responsible person must be an active STAFF or station manager.');
  await stationAccess(stationId, person);
  await requireOnDuty(stationId, person);
  return person;
}

async function getDestinationManager(transfer) {
  const station = await Station.findById(transfer.toStationId);
  if (!station?.managerId) fail(409, 'Assign an active station manager to the destination station before approving this transfer.');
  const manager = await User.findById(station.managerId).populate('role', 'name');
  if (!manager || manager.status !== 'active' || !['STATION_MANAGER', 'ADMIN'].includes(manager.role?.name)) {
    fail(409, 'The destination station must have an active station manager before approving this transfer.');
  }
  return manager;
}

async function notifyDestination(transfer, actor, manager) {
  await Notification.create({
    userId: manager._id, targetRole: manager.role.name, type: 'STATION',
    title: 'Có phiếu vận chuyển cần bố trí người nhận',
    content: `Phiếu ${transfer.code} đã được duyệt. Vui lòng phân công người phụ trách nhận hàng tại trạm.`,
    metadata: { transferId: transfer._id, stationId: transfer.toStationId, action: 'ASSIGN_TRANSFER_RECEIVER' },
    createdBy: actor._id,
  });
}

async function assignResponsibilities(transfer, body, actor) {
  requireManaged(transfer);
  if (transfer.status === 'COMPLETED' || transfer.status === 'RECEIVED') fail(409, 'Transfer is already received or complete.');
  const fields = ['responsibleUserId', 'receivedBy'].filter(field => body[field] !== undefined);
  if (!fields.length || Object.keys(body).some(field => !['responsibleUserId', 'receivedBy'].includes(field))) fail(400, 'Provide responsibleUserId (station A) or receivedBy (station B).');
  for (const field of fields) {
    const stationId = field === 'receivedBy' ? transfer.toStationId : transfer.fromStationId;
    await stationAccess(stationId, actor, true);
    if (same(transfer[field], body[field])) continue;
    const person = await validateResponsible(stationId, body[field]);
    const oldUserId = transfer[field];
    transfer[field] = person._id;
    transfer[field === 'receivedBy' ? 'destinationAssignedAt' : 'sourceAssignedAt'] = new Date();
    await Notification.create({
      userId: person._id, targetRole: person.role.name, type: 'STATION',
      title: 'Bạn được phân công phụ trách phiếu vận chuyển',
      content: `Bạn phụ trách ${field === 'receivedBy' ? 'nhận hàng tại trạm B' : 'xuất hàng tại trạm A'} cho phiếu ${transfer.code}.`,
      metadata: { transferId: transfer._id, stationId, action: 'TRANSFER_RESPONSIBILITY' }, createdBy: actor._id,
    });
    if (oldUserId) await Notification.create({
      userId: oldUserId, type: 'STATION', title: 'Phiếu vận chuyển đã được bàn giao',
      content: `Trách nhiệm của bạn trên phiếu ${transfer.code} đã được chuyển cho người khác.`,
      metadata: { transferId: transfer._id, stationId }, createdBy: actor._id,
    });
  }
  await transfer.save();
}

async function stationAccess(stationId, user, managerOnly = false) {
  stationId = stationId?._id || stationId;
  if (user.role?.name === 'ADMIN') return;
  const station = await Station.findById(stationId);
  if (!station) fail(404, 'Station not found.');
  if (user.role?.name === 'STATION_MANAGER' && same(station.managerId, user._id)) return;
  if (!managerOnly && user.role?.name === 'STAFF' && await StationStaff.exists({ stationId, userId: user._id })) return;
  fail(403, managerOnly ? 'Only the source station manager or ADMIN may approve.' : 'You do not belong to this station.');
}

async function load(id) {
  if (!mongoose.isValidObjectId(id)) fail(400, 'Invalid transfer ID.');
  const transfer = await Transfer.findById(id);
  if (!transfer) fail(404, 'Transfer not found.');
  return transfer;
}

async function loadShipment(transfer, shipmentId) {
  if (!mongoose.isValidObjectId(shipmentId)) fail(400, 'Invalid shipment ID.');
  const shipment = await Shipment.findOne({ _id: shipmentId, transferId: transfer._id });
  if (!shipment) fail(404, 'Shipment not found in this transfer.');
  return shipment;
}

async function requireRead(transfer, user) {
  if (user.role?.name === 'USER' || user.role?.name === 'VOLUNTEER') {
    if (await Shipment.exists({ transferId: transfer._id, carrierId: user._id })) return;
    fail(403, 'This transfer is not assigned to you.');
  }
  try { await stationAccess(transfer.fromStationId, user); }
  catch (error) { if (error.status !== 403) throw error; await stationAccess(transfer.toStationId, user); }
}

function requireManaged(transfer) {
  if (transfer.workflowVersion !== 2) fail(409, 'Historical transfer: use its existing status workflow.');
  if (transfer.status === 'CANCELLED' || transfer.approvalStatus === 'REJECTED') fail(409, 'Transfer is cancelled or rejected.');
}

async function requireStage(transfer, shipment, stage, user) {
  requireManaged(transfer);
  if (!['DISPATCH', 'REPORT', 'RECEIVE'].includes(stage)) fail(400, 'Invalid evidence stage.');
  if (transfer.approvalStatus !== 'APPROVED') fail(409, 'Transfer must be approved first.');
  if (stage === 'REPORT') {
    if (!same(shipment.carrierId, user._id)) fail(403, 'Only the assigned carrier may report delivery.');
    if (!['DISPATCHED', 'REPORTED', 'PARTIAL'].includes(shipment.status)) fail(409, 'Goods have not been dispatched or are already received.');
  } else {
    const stationId = stage === 'DISPATCH' ? transfer.fromStationId : transfer.toStationId;
    await stationAccess(stationId, user);
    const responsibleId = stage === 'DISPATCH' ? transfer.responsibleUserId : transfer.receivedBy;
    const assignedAt = stage === 'DISPATCH' ? transfer.sourceAssignedAt : transfer.destinationAssignedAt;
    if (user.role?.name === 'STAFF') {
      if (!same(responsibleId, user._id)) fail(403, 'Only the STAFF assigned to this side of the transfer may confirm.');
      // Duty was validated when responsibility was assigned. The assigned
      // person may finish this transfer after their shift ends.
      if (!assignedAt) await requireOnDuty(stationId, user);
    }
    if (stage === 'DISPATCH' && !transfer.receivedBy) fail(409, 'Station B must assign its receiving person before dispatch.');
    if (stage === 'DISPATCH' && shipment.status !== 'ASSIGNED') fail(409, 'Shipment was already dispatched.');
    if (stage === 'RECEIVE' && !['REPORTED', 'PARTIAL'].includes(shipment.status)) fail(409, 'Carrier must report delivery before receipt confirmation.');
  }
}

async function evidence(transfer, shipment, stage, body, user) {
  const urls = body.imageUrls;
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > 5 || new Set(urls).size !== urls.length || urls.some(url => typeof url !== 'string')) fail(400, 'Provide 1 to 5 uploaded evidence imageUrls.');
  const uploaded = await Upload.countDocuments({ transferId: transfer._id, shipmentId: shipment._id, actorId: user._id, stage, imageUrl: { $in: urls } });
  if (uploaded !== urls.length) fail(400, 'Upload evidence for this shipment, stage and account first.');
  return { stage, actorId: user._id, imageUrls: urls, note: typeof body.note === 'string' ? body.note.trim() : '' };
}

async function approve(transfer, body, user) {
  requireManaged(transfer);
  await stationAccess(transfer.fromStationId, user, true);
  if (transfer.approvalStatus !== 'PENDING' || transfer.status !== 'PENDING') fail(409, 'Transfer has already been reviewed.');
  if (!['APPROVED', 'REJECTED'].includes(body.decision)) fail(400, 'decision must be APPROVED or REJECTED.');
  const destinationManager = body.decision === 'APPROVED' ? await getDestinationManager(transfer) : null;
  transfer.approvalStatus = body.decision;
  transfer.approvedBy = user._id;
  transfer.approvedAt = new Date();
  transfer.approvalNote = typeof body.note === 'string' ? body.note.trim() : '';
  transfer.status = body.decision === 'APPROVED' ? 'PREPARING' : 'CANCELLED';
  await transfer.save();
  if (destinationManager) await notifyDestination(transfer, user, destinationManager);
  return transfer;
}

async function allocate(transfer, body, user) {
  requireManaged(transfer);
  await stationAccess(transfer.fromStationId, user);
  if (user.role?.name === 'STAFF') {
    if (!same(transfer.responsibleUserId, user._id)) fail(403, 'Only the source responsible STAFF may allocate this transfer.');
    if (!transfer.sourceAssignedAt) await requireOnDuty(transfer.fromStationId, user);
  }
  if (!['PENDING', 'PREPARING'].includes(transfer.status)) fail(409, 'Allocate all carriers before dispatch begins.');
  if (!mongoose.isValidObjectId(body.assignmentId)) fail(400, 'Valid assignmentId is required.');
  const assignment = await Assignment.findById(body.assignmentId).populate('assigneeId', 'status');
  if (!assignment || !assignment.assigneeId || assignment.assigneeId.status !== 'active' || !['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) fail(409, 'An active approved task assignment is required.');
  const task = await Task.findById(assignment.taskId);
  if (!task || !same(task.transferId, transfer._id) || !same(task.stationId, transfer.fromStationId) || !same(task.campaignId, transfer.campaignId) || ['CANCELLED', 'COMPLETED'].includes(task.status)) fail(409, 'Assignment must belong to an active task for this transfer, source station and campaign.');
  if (await Shipment.exists({ transferId: transfer._id, assignmentId: assignment._id })) fail(409, 'This assignment already has a shipment.');
  if (!Array.isArray(body.items) || !body.items.length) fail(400, 'items are required.');
  const transferItems = await Item.find({ transferId: transfer._id });
  const previous = await Shipment.find({ transferId: transfer._id });
  const seen = new Set();
  const items = body.items.map(row => {
    const key = String(row.transferItemId);
    const item = transferItems.find(it => same(it._id, key));
    if (!item || seen.has(key)) fail(400, 'Unknown or duplicate transferItemId.');
    seen.add(key);
    const quantity = Number(row.quantity);
    if (row.quantity == null || typeof row.quantity === 'boolean' || !Number.isFinite(quantity) || quantity < 0.01) fail(400, 'Quantity must be at least 0.01.');
    const allocated = previous.reduce((sum, shipment) => sum + shipment.items.filter(it => same(it.transferItemId, key)).reduce((n, it) => n + it.quantity, 0), 0);
    if (round(allocated + quantity) > item.quantity) fail(409, 'Allocated quantity exceeds the approved transfer item.');
    return { transferItemId: item._id, quantity };
  });
  return Shipment.create({ transferId: transfer._id, assignmentId: assignment._id, carrierId: assignment.assigneeId._id, items });
}

async function handover(transfer, shipment, stage, body, user) {
  await requireStage(transfer, shipment, stage, user);
  const event = await evidence(transfer, shipment, stage, body, user);
  if (stage === 'DISPATCH') {
    const planned = await Item.find({ transferId: transfer._id });
    const shipments = await Shipment.find({ transferId: transfer._id });
    for (const item of planned) {
      const allocated = shipments.reduce((sum, sh) => sum + sh.items.filter(row => same(row.transferItemId, item._id)).reduce((n, row) => n + row.quantity, 0), 0);
      if (Math.abs(allocated - item.quantity) > 1e-8) fail(409, 'Allocate the full transfer quantity before dispatch.');
    }
    const assignment = await Assignment.findById(shipment.assignmentId);
    if (!assignment || !['ASSIGNED', 'IN_PROGRESS'].includes(assignment.status)) fail(409, 'Carrier assignment is no longer active.');
    const task = await Task.findById(assignment.taskId);
    if (!task || ['CANCELLED', 'COMPLETED'].includes(task.status) || !same(task.transferId, transfer._id)) fail(409, 'Delivery task is no longer active for this transfer.');
    for (const row of shipment.items) {
      await Item.updateOne({ _id: row.transferItemId, transferId: transfer._id }, { $inc: { dispatchedQuantity: row.quantity } }, { runValidators: true });
    }
    shipment.status = 'DISPATCHED';
    transfer.status = 'IN_TRANSIT';
    event.quantities = shipment.items.map(row => ({ transferItemId: row.transferItemId, quantity: row.quantity }));
  } else {
    if (!Array.isArray(body.items) || body.items.length !== shipment.items.length) fail(400, 'Report a quantity for each shipment item.');
    const quantities = new Map();
    for (const row of body.items) {
      const key = String(row.transferItemId);
      if (quantities.has(key) || !shipment.items.some(item => same(item.transferItemId, key))) fail(400, 'Unknown or duplicate shipment item.');
      const quantity = Number(row.quantity);
      if (row.quantity == null || typeof row.quantity === 'boolean' || !Number.isFinite(quantity) || quantity < 0) fail(400, 'Quantity must be non-negative.');
      quantities.set(key, quantity);
    }
    for (const row of shipment.items) {
      const quantity = quantities.get(String(row.transferItemId));
      if (quantity > row.quantity) fail(409, 'Reported or received quantity exceeds dispatched quantity.');
      if (stage === 'REPORT') {
        if (quantity < row.receivedQuantity) fail(409, 'Cannot report less than already received.');
        row.reportedQuantity = quantity;
      } else {
        if (quantity < row.receivedQuantity || quantity > row.reportedQuantity) fail(409, 'Receipt must be cumulative, cannot decrease, and cannot exceed the carrier report.');
        const delta = round(quantity - row.receivedQuantity);
        if (delta > 0) await Item.updateOne({ _id: row.transferItemId, transferId: transfer._id }, { $inc: { receivedQuantity: delta } }, { runValidators: true });
        row.receivedQuantity = quantity;
      }
    }
    event.quantities = body.items;
    shipment.status = stage === 'REPORT' ? 'REPORTED' : shipment.items.every(row => Math.abs(row.receivedQuantity - row.quantity) < 1e-8) ? 'RECEIVED' : 'PARTIAL';
  }
  shipment.evidence.push(event);
  await shipment.save();
  if (stage === 'RECEIVE') {
    const items = await Item.find({ transferId: transfer._id });
    if (items.every(item => Math.abs(item.dispatchedQuantity - item.quantity) < 1e-8 && Math.abs(item.receivedQuantity - item.quantity) < 1e-8)) transfer.status = 'RECEIVED';
  }
  await transfer.save();
  return shipment;
}

async function summary(transfer) {
  const items = await Item.find({ transferId: transfer._id }).populate('itemTypeId', 'name unit');
  const shipments = await Shipment.find({ transferId: transfer._id }).populate('carrierId', 'fullName username phone').populate('evidence.actorId', 'fullName username');
  return { items: items.map(item => {
    const allocatedQuantity = round(shipments.reduce((sum, sh) => sum + sh.items.filter(row => same(row.transferItemId, item._id)).reduce((n, row) => n + row.quantity, 0), 0));
    const dispatchedQuantity = transfer.workflowVersion === 2 ? item.dispatchedQuantity : ['IN_TRANSIT', 'RECEIVED', 'COMPLETED'].includes(transfer.status) ? item.quantity : 0;
    const receivedQuantity = transfer.workflowVersion === 2 ? item.receivedQuantity : ['RECEIVED', 'COMPLETED'].includes(transfer.status) ? item.quantity : 0;
    return { ...item.toObject(), dispatchedQuantity, receivedQuantity, allocatedQuantity, unallocatedQuantity: round(item.quantity - allocatedQuantity), inTransitQuantity: round(dispatchedQuantity - receivedQuantity) };
  }), shipments };
}

async function requireDeliveryConfirmed(assignment) {
  const task = await Task.findById(assignment.taskId);
  if (!task?.transferId) return;
  const transfer = await Transfer.findById(task.transferId);
  if (transfer?.workflowVersion !== 2) return;
  const shipments = await Shipment.find({ transferId: transfer._id, assignmentId: assignment._id });
  if (!shipments.length || shipments.some(sh => sh.status !== 'RECEIVED')) fail(409, 'Destination station must confirm all your shipment quantities before task completion and points.');
}

module.exports = { validateResponsible, assignResponsibilities, requireOnDuty, stationAccess, load, loadShipment, requireRead, requireManaged, requireStage, approve, allocate, handover, summary, requireDeliveryConfirmed };
