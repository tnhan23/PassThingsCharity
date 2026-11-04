const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Inventory = require('../models/inventory');
const Ledger = require('../models/inventoryTransaction');
const Station = require('../models/station');
const ItemType = require('../models/itemType');
const service = require('../services/inventory');

test('manual inventory validates scope, records changes and preserves history', async t => {
  const originals = [];
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  stub(service, 'mutateInventory', async fn => fn());
  const controller = require('../controller/inventory');
  const stationId = new mongoose.Types.ObjectId();
  const itemTypeId = new mongoose.Types.ObjectId();
  const id = new mongoose.Types.ObjectId();
  const history = [];
  let deleted = false;
  let saved = false;
  stub(Station, 'exists', async () => true);
  stub(ItemType, 'findById', async () => ({ unit: 'KG' }));
  stub(Inventory, 'exists', async () => false);
  stub(Inventory.prototype, 'save', async function () { saved = true; return this; });
  stub(Inventory, 'findOne', async filter => filter.stationId?.$in?.length === 0 ? null : new Inventory({ _id: id, stationId, itemTypeId, unit: 'KG', quantity: 10 }));
  stub(Inventory, 'deleteOne', async () => { deleted = true; });
  stub(Ledger, 'create', async rows => { history.push(...rows); return rows; });
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });
  async function call(action, body, scope = { stationId: { $in: [stationId] } }) {
    let status = 200, result, error;
    await controller[action]({ body, params: { id: String(id) }, inventoryFilter: scope, user: { _id: id } }, {
      status(code) { status = code; return this; }, json(value) { result = value; },
    }, err => { error = err; });
    return { status: error?.status || status, result, error };
  }
  const body = { stationId: String(stationId), itemTypeId: String(itemTypeId), unit: 'KG', quantity: 20, reason: 'Kiểm kê' };
  assert.equal((await call('createInventory', body, { stationId: { $in: [] } })).status, 403);
  assert.equal(saved, false);
  assert.equal((await call('createInventory', { ...body, unit: 'BOX' })).status, 400);
  assert.equal((await call('createInventory', body)).status, 201);
  assert.equal(history[0].type, 'MANUAL_CREATE');
  assert.equal(history[0].balanceBefore, 0);
  assert.equal(history[0].balanceAfter, 20);
  assert.equal((await call('updateInventory', { quantity: -1, reason: 'Sai' })).status, 400);
  assert.equal((await call('updateInventory', { quantity: 4, reason: ' ' })).status, 400);
  assert.equal((await call('updateInventory', { quantity: 4, reason: 'Sửa', stationId })).status, 400);
  assert.equal((await call('updateInventory', { quantity: 4, reason: 'Sửa' }, { stationId: { $in: [] } })).status, 404);
  assert.equal((await call('updateInventory', { quantity: 4, reason: 'Sửa' })).status, 200);
  assert.equal(history.at(-1).quantityDelta, -6);
  assert.equal(history.at(-1).type, 'MANUAL_UPDATE');
  assert.equal((await call('deleteInventory', { reason: 'Xóa sau kiểm kê' })).status, 200);
  assert.equal(deleted, true);
  assert.equal(history.at(-1).type, 'MANUAL_DELETE');
  assert.equal(history.at(-1).balanceAfter, 0);
  assert.equal(history.length, 3);
});

test('manual stock operations take shared lock and reject insufficient reserved stock', async t => {
  const Lock = mongoose.model('InventoryLock');
  const Transfer = require('../models/campaignTransfer');
  const TransferItem = require('../models/campaignTransferItem');
  const originals = [];
  const stub = (obj, key, value) => { originals.push([obj, key, obj[key]]); obj[key] = value; };
  let initialized = false;
  let invoked = false;
  stub(mongoose.connection, 'transaction', async fn => fn());
  stub(Lock, 'findOneAndUpdate', async filter => {
    assert.equal(filter.stockVersion, 2);
    return initialized ? {} : null;
  });
  stub(Transfer, 'find', () => ({ lean: async () => [{ _id: 'transfer', fromStationId: 'station' }] }));
  stub(TransferItem, 'find', () => ({ lean: async () => [{ transferId: 'transfer', itemTypeId: 'item', unit: 'KG', quantity: 8, dispatchedQuantity: 0 }] }));
  stub(Inventory, 'find', () => ({ lean: async () => [{ stationId: 'station', itemTypeId: 'item', unit: 'KG', quantity: 4 }] }));
  t.after(() => { for (const [obj, key, value] of originals.reverse()) obj[key] = value; });
  await assert.rejects(service.mutateInventory(async () => { invoked = true; }), { status: 503 });
  assert.equal(invoked, false);
  initialized = true;
  await assert.rejects(service.mutateInventory(async () => {}), { status: 409 });
});
