const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { calculateInventory, inventoryTransaction } = require('../services/inventory');

const item = (quantity, unit = 'KG') => ({ itemTypeId: 'rice', quantity, unit });
const receipt = (quantity, status = 'ACCEPTED', stationId = 'A') => ({
  campaignId: 'campaign', stationId, status, items: [item(quantity)],
});
const transfer = status => ({ campaignId: 'campaign', fromStationId: 'A', toStationId: 'B', status, items: [item(40)] });
const distribution = status => ({ campaignId: 'campaign', stationId: 'B', status, items: [item(15)] });
const balance = (rows, station) => rows.find(row => row.stationId === station)?.quantity || 0;

test('transfer lifecycle conserves goods and excludes goods in transit from destination', () => {
  for (const [status, source, destination] of [
    ['PENDING', 100, 0], ['PREPARING', 100, 0], ['CANCELLED', 100, 0],
    ['IN_TRANSIT', 60, 0], ['RECEIVED', 60, 40], ['COMPLETED', 60, 40],
  ]) {
    const rows = calculateInventory([receipt(100)], [transfer(status)], []);
    assert.equal(balance(rows, 'A'), source, status);
    assert.equal(balance(rows, 'B'), destination, status);
  }
});

test('only completed handovers consume inventory; receipt reversal is reflected', () => {
  for (const status of ['PLANNED', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED']) {
    const rows = calculateInventory([receipt(100)], [transfer('RECEIVED')], [distribution(status)]);
    assert.equal(balance(rows, 'B'), status === 'COMPLETED' ? 25 : 40);
  }
  assert.equal(calculateInventory([receipt(100, 'REJECTED')], [], []).length, 0);
  assert.equal(calculateInventory([receipt(100, 'PENDING')], [], []).length, 0);
  assert.equal(balance(calculateInventory([receipt(100, 'COMPLETED')], [], []), 'A'), 100);
});

test('units and campaigns stay separate; historical deficits are visible', () => {
  const a = receipt(100);
  const b = { ...receipt(2), items: [item(2, 'BOX')] };
  const c = { ...receipt(5), campaignId: 'another' };
  const rows = calculateInventory([a, b, c], [], []);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.quantity).sort((x, y) => x - y), [2, 5, 100]);
  assert.equal(balance(calculateInventory([], [transfer('IN_TRANSIT')], []), 'A'), -40);
});

test('decimal arithmetic does not leave false negative stock', () => {
  const outgoing = { ...transfer('IN_TRANSIT'), items: [item(0.3)] };
  assert.equal(balance(calculateInventory([receipt(0.1), receipt(0.2)], [outgoing], []), 'A'), 0);
});

test('transaction wrapper rejects overspending, waits for commit, and forwards failures', async t => {
  const models = ['contribution', 'contributionItem', 'campaignTransfer', 'campaignTransferItem', 'reliefDistribution', 'reliefDistributionItem'].map(name => require(`../models/${name}`));
  const originals = models.map(model => model.find);
  const lock = mongoose.model('InventoryLock');
  const oldUpdate = lock.updateOne;
  const oldTransaction = mongoose.connection.transaction;
  let records = [], transferRecords = [], sent, failure, committed;
  const fakeFind = data => () => ({ lean: async () => data() });
  models.forEach(model => { model.find = fakeFind(() => []); });
  models[0].find = fakeFind(() => records);
  models[1].find = fakeFind(() => [{ contributionId: 'receipt', ...item(10) }]);
  models[2].find = fakeFind(() => transferRecords);
  models[3].find = fakeFind(() => [{ transferId: 'transfer', ...item(11) }]);
  lock.updateOne = async () => ({});
  mongoose.connection.transaction = async callback => {
    const snapshot = [...transferRecords];
    try {
      await callback();
      assert.equal(sent, undefined, 'must not send before commit');
      committed = true;
    } catch (error) { transferRecords = snapshot; throw error; }
  };
  t.after(() => {
    models.forEach((model, index) => { model.find = originals[index]; });
    lock.updateOne = oldUpdate;
    mongoose.connection.transaction = oldTransaction;
  });
  records = [{ _id: 'receipt', campaignId: 'campaign', stationId: 'A', status: 'ACCEPTED' }];
  const res = { status(code) { this.code = code; return this; }, json(body) { sent = body; } };
  const handler = inventoryTransaction(async (req, reply) => {
    transferRecords.push({ _id: 'transfer', ...transfer('IN_TRANSIT') });
    reply.status(201).json({ transfer: transferRecords[0] });
  });
  await handler({}, res, error => { failure = error; });
  assert.equal(failure.status, 409);
  assert.equal(transferRecords.length, 0, 'failed operation rolls back');
  assert.equal(sent, undefined);
  assert.equal(committed, undefined);

  failure = undefined;
  const success = inventoryTransaction(async (req, reply) => reply.status(201).json({ contribution: records[0] }));
  await success({}, res, error => { failure = error; });
  assert.equal(failure, undefined);
  assert.equal(committed, true);
  assert.equal(res.code, 201);
  assert.ok(sent.contribution);

  // A commit failure must never leak a successful HTTP response.
  sent = undefined;
  failure = undefined;
  mongoose.connection.transaction = async callback => {
    await callback();
    throw new Error('commit failed');
  };
  await success({}, res, error => { failure = error; });
  assert.equal(failure.message, 'commit failed');
  assert.equal(sent, undefined);

  mongoose.connection.transaction = async callback => callback();
  const Transfer = models[2];
  const originalFindById = Transfer.findById;
  t.after(() => { Transfer.findById = originalFindById; });
  let saved = 0;
  const doc = { ...transfer('PENDING'), save: async () => { saved++; } };
  Transfer.findById = async () => doc;
  const { updateTransferStatus } = require('../controller/campaignTransfer');
  const request = status => ({ params: { id: '671000000000000000000011' }, body: { status }, user: { _id: 'user' } });
  failure = undefined;
  await updateTransferStatus(request('COMPLETED'), res, error => { failure = error; });
  assert.equal(failure.status, 409, 'cannot skip preparation and receipt');
  assert.equal(saved, 0);
  assert.equal(doc.status, 'PENDING');

  doc.status = 'COMPLETED';
  failure = undefined;
  await updateTransferStatus(request('IN_TRANSIT'), res, error => { failure = error; });
  assert.equal(failure.status, 409, 'cannot send completed transfer backwards');
  assert.equal(saved, 0);
});
