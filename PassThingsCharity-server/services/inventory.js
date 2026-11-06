const mongoose = require('mongoose');
const Contribution = require('../models/contribution');
const ContributionItem = require('../models/contributionItem');
const Transfer = require('../models/campaignTransfer');
const TransferItem = require('../models/campaignTransferItem');
const Distribution = require('../models/reliefDistribution');
const DistributionItem = require('../models/reliefDistributionItem');
const Inventory = require('../models/inventory');
const InventoryTransaction = require('../models/inventoryTransaction');

// Rebuild balances from the original documents, including historical records.
function calculateInventory(contributions, transfers, distributions) {
  const balances = new Map();
  function add(doc, stationId, item, direction, field) {
    const key = [doc.campaignId, stationId, item.itemTypeId, item.unit].join(':');
    if (!balances.has(key)) balances.set(key, {
      campaignId: String(doc.campaignId), stationId: String(stationId),
      itemTypeId: String(item.itemTypeId), unit: item.unit,
      receivedQuantity: 0, transferredOutQuantity: 0,
      transferredInQuantity: 0, distributedQuantity: 0, quantity: 0,
    });
    const row = balances.get(key);
    row[field] += item.quantity;
    row.quantity += direction * item.quantity;
  }
  for (const doc of contributions) {
    if (!['ACCEPTED', 'COMPLETED'].includes(doc.status)) continue;
    for (const item of doc.items) add(doc, doc.stationId, item, 1, 'receivedQuantity');
  }
  for (const doc of transfers) {
    if (doc.workflowVersion === 2) {
      for (const item of doc.items) {
        if (item.dispatchedQuantity > 0) add(doc, doc.fromStationId, { ...item, quantity: item.dispatchedQuantity }, -1, 'transferredOutQuantity');
        if (item.receivedQuantity > 0) add(doc, doc.toStationId, { ...item, quantity: item.receivedQuantity }, 1, 'transferredInQuantity');
      }
      continue;
    }
    if (!['IN_TRANSIT', 'RECEIVED', 'COMPLETED'].includes(doc.status)) continue;
    for (const item of doc.items) {
      add(doc, doc.fromStationId, item, -1, 'transferredOutQuantity');
      if (['RECEIVED', 'COMPLETED'].includes(doc.status)) {
        add(doc, doc.toStationId, item, 1, 'transferredInQuantity');
      }
    }
  }
  for (const doc of distributions) {
    if (doc.status !== 'COMPLETED') continue;
    for (const item of doc.items) add(doc, doc.stationId, item, -1, 'distributedQuantity');
  }
  return [...balances.values()].map(row => ({ ...row, quantity: Number(row.quantity.toFixed(8)) }));
}

async function loadDocuments(Model, ItemModel, foreignKey, filter) {
  const docs = await Model.find(filter).lean();
  const items = await ItemModel.find({ [foreignKey]: { $in: docs.map(doc => doc._id) } }).lean();
  const byDocument = new Map();
  for (const item of items) {
    const key = String(item[foreignKey]);
    if (!byDocument.has(key)) byDocument.set(key, []);
    byDocument.get(key).push(item);
  }
  return docs.map(doc => ({ ...doc, items: byDocument.get(String(doc._id)) || [] }));
}

async function calculateHistoricalInventory(filter = {}) {
  // Sequential queries also work within a MongoDB transaction.
  const contributions = await loadDocuments(Contribution, ContributionItem, 'contributionId', filter);
  const transfers = await loadDocuments(Transfer, TransferItem, 'transferId', filter);
  const distributions = await loadDocuments(Distribution, DistributionItem, 'distributionId', filter);
  return calculateInventory(contributions, transfers, distributions);
}

async function getInventory(filter = {}) {
  const rows = await Inventory.find(filter).lean();
  const decorated = await withReservations(rows);
  return decorated.map(row => ({ ...row, stationId: String(row.stationId), itemTypeId: String(row.itemTypeId) }));
}

async function withReservations(rows) {
  const reservations = await reservedStock();
  return rows.map(row => {
    const key = [row.stationId?._id || row.stationId, row.itemTypeId?._id || row.itemTypeId, row.unit].join(':');
    const reservedQuantity = reservations.get(key) || 0;
    return { ...row, reservedQuantity, availableQuantity: round(row.quantity - reservedQuantity) };
  });
}

async function reservedStock() {
  const transfers = await Transfer.find({ workflowVersion: 2, approvalStatus: 'APPROVED', status: { $ne: 'CANCELLED' } }).lean();
  const byId = new Map(transfers.map(t => [String(t._id), t]));
  const items = await TransferItem.find({ transferId: { $in: transfers.map(t => t._id) } }).lean();
  const reserved = new Map();
  for (const item of items) {
    const transfer = byId.get(String(item.transferId));
    const key = [transfer.fromStationId, item.itemTypeId, item.unit].join(':');
    reserved.set(key, Number(((reserved.get(key) || 0) + Math.max(0, item.quantity - (item.dispatchedQuantity || 0))).toFixed(8)));
  }
  return reserved;
}

async function assertReservations() {
  const reservations = await reservedStock();
  if (!reservations.size) return;
  const balances = await Inventory.find({}).lean();
  const quantities = new Map(balances.map(row => [[row.stationId, row.itemTypeId, row.unit].join(':'), row.quantity]));
  for (const [key, quantity] of reservations) {
    if (quantity > 0 && quantity > (quantities.get(key) || 0) + 1e-8) {
      throw Object.assign(new Error('Insufficient available stock: goods are reserved for approved transfers.'), { status: 409 });
    }
  }
}

mongoose.set('transactionAsyncLocalStorage', true);
const lockSchema = new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 }, initialized: { type: Boolean, default: false }, stockVersion: Number });
const InventoryLock = mongoose.model('InventoryLock', lockSchema);

// Run before accepting HTTP requests. Existing vouchers are imported once only.
async function initializeInventory() {
  await Inventory.init();
  await InventoryTransaction.init();
  await InventoryLock.init();
  try {
    await InventoryLock.updateOne({ _id: 'inventory' }, { $setOnInsert: { revision: 0, initialized: false } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  await mongoose.connection.transaction(async session => {
    const lock = await InventoryLock.findOneAndUpdate({ _id: 'inventory' }, { $inc: { revision: 1 } }, { new: true });
    if (lock.stockVersion === 2) return;
    if (await Inventory.exists({})) throw new Error('Kho đã có dữ liệu nhưng chưa có dấu khởi tạo. Cần đối soát, không tự ghi đè.');
    const legacyRows = lock.initialized
      ? await mongoose.connection.collection('inventories').find({}, { session }).toArray()
      : await calculateHistoricalInventory();
    const rows = mergeStockBalances(legacyRows);
    const legacyHistory = lock.initialized
      ? await mongoose.connection.collection('inventorymovements').find({}, { session }).sort({ createdAt: 1, _id: 1 }).toArray()
      : [];
    const migratedBalances = new Map();
    for (const row of rows) {
      const [balance] = await Inventory.create([row]);
      migratedBalances.set(stockKey(row), balance);
    }
    const running = new Map();
    for (const entry of legacyHistory) {
      const key = stockKey(entry);
      const balance = migratedBalances.get(key);
      if (!balance) throw new Error('Lịch sử kho cũ không có dòng số dư tương ứng. Cần đối soát trước khi chuyển kho.');
      const before = running.get(key) || 0;
      const after = round(before + entry.quantityDelta);
      const source = { sourceType: entry.sourceType, sourceId: entry.sourceId, sourceCode: entry.sourceCode,
        previousStatus: entry.previousStatus, status: entry.status, performedBy: entry.performedBy, campaignId: entry.campaignId };
      if (source.sourceType === 'TRANSFER' && source.sourceId) {
        const transfer = await Transfer.findById(source.sourceId).lean();
        source.counterpartyStationId = entry.quantityDelta < 0 ? transfer?.toStationId : transfer?.fromStationId;
      }
      await InventoryTransaction.create([{
        inventoryId: balance._id, stationId: balance.stationId, itemTypeId: balance.itemTypeId, unit: balance.unit,
        ...source, ...transactionDetails(entry.quantityDelta, source),
        quantityDelta: entry.quantityDelta, balanceBefore: before, balanceAfter: after,
        createdAt: entry.createdAt, updatedAt: entry.updatedAt,
      }]);
      running.set(key, after);
    }
    for (const row of rows) {
      const balance = migratedBalances.get(stockKey(row));
      const before = running.get(stockKey(row)) || 0;
      if (legacyHistory.length && before !== row.quantity) throw new Error('Số dư và lịch sử kho cũ không khớp. Không tự điều chỉnh số lượng.');
      if (!legacyHistory.length) await InventoryTransaction.create([{
        inventoryId: balance._id, stationId: row.stationId, itemTypeId: row.itemTypeId, unit: row.unit,
        quantityDelta: row.quantity, balanceBefore: 0, balanceAfter: row.quantity,
        sourceType: 'OPENING', sourceCode: 'IMPORT_EXISTING_BALANCES',
        type: 'OPENING', description: 'Số dư ban đầu khi khởi tạo kho chung của trạm',
      }]);
    }
    await InventoryLock.updateOne({ _id: 'inventory' }, { $set: { initialized: true, stockVersion: 2 } });
  });
}

const sources = {
  CONTRIBUTION: [Contribution, ContributionItem, 'contributionId'],
  TRANSFER: [Transfer, TransferItem, 'transferId'],
  DISTRIBUTION: [Distribution, DistributionItem, 'distributionId'],
};
const totals = ['quantity', 'receivedQuantity', 'transferredOutQuantity', 'transferredInQuantity', 'distributedQuantity'];
const keyOf = row => [row.campaignId, row.stationId, row.itemTypeId, row.unit].join(':');
const round = value => Number(value.toFixed(8));
const stockKey = row => [row.stationId, row.itemTypeId, row.unit].join(':');

function mergeStockBalances(rows) {
  const balances = new Map();
  for (const row of rows) {
    const key = stockKey(row);
    if (!balances.has(key)) balances.set(key, { stationId: row.stationId, itemTypeId: row.itemTypeId, unit: row.unit, quantity: 0 });
    balances.get(key).quantity = round(balances.get(key).quantity + row.quantity);
  }
  return [...balances.values()];
}

function transactionDetails(delta, source) {
  const type = source.sourceType === 'TRANSFER' ? (delta < 0 ? 'TRANSFER_OUT' : 'TRANSFER_IN')
    : source.sourceType === 'CONTRIBUTION' ? (delta < 0 ? 'DONATION_REVERSAL' : 'DONATION_IN')
    : source.sourceType === 'DISTRIBUTION' ? 'RELIEF_OUT' : 'OPENING';
  const descriptions = {
    TRANSFER_OUT: 'Xuất chuyển hàng sang trạm khác', TRANSFER_IN: 'Nhận hàng chuyển từ trạm khác',
    DONATION_IN: 'Nhập kho từ quyên góp', DONATION_REVERSAL: 'Hoàn tác hàng quyên góp đã ghi nhận',
    RELIEF_OUT: 'Xuất kho bàn giao cứu trợ', OPENING: 'Số dư ban đầu',
  };
  return { type, description: descriptions[type] };
}

function sourceBalances(type, documents) {
  return calculateInventory(type === 'CONTRIBUTION' ? documents : [], type === 'TRANSFER' ? documents : [], type === 'DISTRIBUTION' ? documents : []);
}

function inventoryDeltas(before, after) {
  const rows = new Map();
  for (const [entries, direction] of [[before, -1], [after, 1]]) {
    for (const entry of entries) {
      const key = keyOf(entry);
      if (!rows.has(key)) rows.set(key, {
        stationId: entry.stationId, campaignId: entry.campaignId, itemTypeId: entry.itemTypeId, unit: entry.unit,
        ...Object.fromEntries(totals.map(field => [field, 0])),
      });
      const row = rows.get(key);
      for (const field of totals) row[field] = round(row[field] + direction * entry[field]);
    }
  }
  return [...rows.values()].filter(row => totals.some(field => row[field] !== 0));
}

async function applyInventoryDeltas(deltas, source) {
  for (const delta of mergeStockBalances(deltas).filter(row => row.quantity !== 0)) {
    const filter = { stationId: delta.stationId, itemTypeId: delta.itemTypeId, unit: delta.unit };
    const current = await Inventory.findOne(filter);
    const before = current?.quantity || 0;
    const after = round(before + delta.quantity);
    if (after < Math.min(0, before)) {
      throw Object.assign(new Error(`Không đủ hàng tại trạm ${delta.stationId}, loại ${delta.itemTypeId} (${delta.unit}). Hiện có ${before}, cần xuất ${-delta.quantity}.`), { status: 409 });
    }
    const values = { quantity: after };
    // All stock writers hold the same transaction lock; the condition also
    // protects against an unexpected change to this balance before the write.
    let balance;
    if (current) {
      balance = await Inventory.findOneAndUpdate({ _id: current._id, quantity: before }, { $set: values }, { new: true, runValidators: true });
      if (!balance) throw Object.assign(new Error('Số dư kho đã thay đổi, vui lòng thử lại.'), { status: 409 });
    } else {
      [balance] = await Inventory.create([{ ...filter, ...values }]);
    }
    const counterpartyStationId = source.sourceType === 'TRANSFER'
      ? (String(delta.stationId) === String(source.fromStationId) ? source.toStationId : source.fromStationId) : null;
    const { fromStationId, toStationId, ...transactionSource } = source;
    await InventoryTransaction.create([{
      ...filter, inventoryId: balance._id, quantityDelta: delta.quantity,
      balanceBefore: before, balanceAfter: after, ...transactionSource,
      counterpartyStationId, ...transactionDetails(delta.quantity, source),
    }]);
  }
}

// Delay HTTP success until commit. A shared write lock makes concurrent stock
// checks conflict and retry rather than allowing two requests to overspend.
function inventoryTransaction(handler, sourceType) {
  return async (req, res, next) => {
    try {
      let response;
      await mongoose.connection.transaction(async () => {
        response = undefined;
        const lock = await InventoryLock.findOneAndUpdate({ _id: 'inventory', initialized: true, stockVersion: 2 }, { $inc: { revision: 1 } }, { new: true });
        if (!lock) throw Object.assign(new Error('Kho chưa được khởi tạo. Khởi động lại server để nhập số dư từ phiếu cũ.'), { status: 503 });
        const [Model, ItemModel, foreignKey] = sources[sourceType];
        const previous = req.params.id && mongoose.isValidObjectId(req.params.id)
          ? await loadDocuments(Model, ItemModel, foreignKey, { _id: req.params.id }) : [];
        const reply = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(body) { response = { code: this.statusCode, body }; return this; },
        };
        await handler(req, reply, error => { throw error; });
        if (!response) throw new Error('Missing inventory operation response');
        if (response.code >= 400) throw Object.assign(new Error(response.body.error), { status: response.code });
        const document = response.body.contribution || response.body.transfer || response.body.distribution;
        const updated = await loadDocuments(Model, ItemModel, foreignKey, { _id: document._id });
        await applyInventoryDeltas(inventoryDeltas(sourceBalances(sourceType, previous), sourceBalances(sourceType, updated)), {
          sourceType, sourceId: document._id, sourceCode: document.code,
          previousStatus: previous[0]?.status, status: document.status, performedBy: req.user._id,
          campaignId: document.campaignId, fromStationId: document.fromStationId, toStationId: document.toStationId,
          shipmentId: response.body.shipment?._id,
          carrierId: response.body.shipment?.carrierId,
        });
        await assertReservations();
      });
      return res.status(response.code).json(response.body);
    } catch (error) {
      if (error.code === 20 && /Transaction numbers/.test(error.message)) {
        error.status = 503;
        error.message = 'Quản lý tồn kho cần MongoDB replica set hoặc Atlas để lưu giao dịch an toàn.';
      }
      return next(error);
    }
  };
}

// Use the same lock as voucher operations so manual edits cannot bypass reservations.
async function mutateInventory(operation) {
  return mongoose.connection.transaction(async () => {
    const lock = await InventoryLock.findOneAndUpdate(
      { _id: 'inventory', initialized: true, stockVersion: 2 },
      { $inc: { revision: 1 } }, { new: true }
    );
    if (!lock) throw Object.assign(new Error('Kho chưa được khởi tạo.'), { status: 503 });
    const result = await operation();
    await assertReservations();
    return result;
  });
}

module.exports = { mutateInventory, withReservations, calculateInventory, getInventory, inventoryTransaction, initializeInventory, inventoryDeltas, mergeStockBalances, transactionDetails, calculateHistoricalInventory };
