const mongoose = require('mongoose');
const Contribution = require('../models/contribution');
const ContributionItem = require('../models/contributionItem');
const Transfer = require('../models/campaignTransfer');
const TransferItem = require('../models/campaignTransferItem');
const Distribution = require('../models/reliefDistribution');
const DistributionItem = require('../models/reliefDistributionItem');

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

async function getInventory(filter = {}) {
  // Sequential queries also work within a MongoDB transaction.
  const contributions = await loadDocuments(Contribution, ContributionItem, 'contributionId', filter);
  const transfers = await loadDocuments(Transfer, TransferItem, 'transferId', filter);
  const distributions = await loadDocuments(Distribution, DistributionItem, 'distributionId', filter);
  return calculateInventory(contributions, transfers, distributions);
}

mongoose.set('transactionAsyncLocalStorage', true);
const lockSchema = new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 } });
const InventoryLock = mongoose.model('InventoryLock', lockSchema);

// Delay HTTP success until commit. A shared write lock makes concurrent stock
// checks conflict and retry rather than allowing two requests to overspend.
function inventoryTransaction(handler) {
  return async (req, res, next) => {
    try {
      try {
        await InventoryLock.updateOne({ _id: 'inventory' }, { $setOnInsert: { revision: 0 } }, { upsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error; // Another request initialized the same lock.
      }
      let response;
      await mongoose.connection.transaction(async () => {
        await InventoryLock.updateOne({ _id: 'inventory' }, { $inc: { revision: 1 } });
        const previous = await getInventory();
        const reply = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(body) { response = { code: this.statusCode, body }; return this; },
        };
        await handler(req, reply, error => { throw error; });
        if (!response) throw new Error('Missing inventory operation response');
        if (response.code >= 400) throw Object.assign(new Error(response.body.error), { status: response.code });
        const document = response.body.contribution || response.body.transfer || response.body.distribution;
        const rows = await getInventory({ campaignId: document.campaignId });
        const key = row => [row.campaignId, row.stationId, row.itemTypeId, row.unit].join(':');
        const previousQuantities = new Map(previous.map(row => [key(row), row.quantity]));
        // Historical deficits remain visible but do not block unrelated work or repairs.
        const negative = rows.find(row => row.quantity < Math.min(0, previousQuantities.get(key(row)) || 0));
        if (negative) throw Object.assign(new Error(
          `Không đủ hàng tại trạm ${negative.stationId}: loại ${negative.itemTypeId} (${negative.unit}), thiếu ${-negative.quantity}. Kiểm tra phiếu tiếp nhận, vận chuyển và bàn giao.`
        ), { status: 409 });
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

module.exports = { calculateInventory, getInventory, inventoryTransaction };
