const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateInventory } = require('../services/inventory');
const { calculateCampaignProgress, summarizeCampaignProgress } = require('../services/campaignProgress');

const rice = quantity => ({ itemTypeId: 'rice', quantity, unit: 'KG' });
const target = (targetQuantity = 150) => ({ campaignId: 'campaign', itemTypeId: { _id: 'rice', name: 'Gạo', unit: 'KG' }, targetQuantity, currentQuantity: 999 });
const receipt = { campaignId: 'campaign', stationId: 'A', status: 'ACCEPTED', items: [rice(100)] };
const transfer = status => ({ campaignId: 'campaign', fromStationId: 'A', toStationId: 'B', status, items: [rice(40)] });

test('destination receives stock once and public progress does not double-count transfers', () => {
  for (const status of ['PENDING', 'PREPARING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED']) {
    const inventory = calculateInventory([receipt], [transfer(status)], []);
    const [progress] = calculateCampaignProgress([target()], inventory);
    assert.equal(progress.currentQuantity, 100, status);
    assert.equal(progress.remainingQuantity, 50, status);
    assert.equal(progress.inTransitQuantity, status === 'IN_TRANSIT' ? 40 : 0);
    assert.equal(progress.stockQuantity, status === 'IN_TRANSIT' ? 60 : 100);
    const destination = inventory.find(row => row.stationId === 'B');
    assert.equal(destination?.quantity || 0, ['RECEIVED', 'COMPLETED'].includes(status) ? 40 : 0);
  }
});

test('handing out goods does not reopen a fulfilled donation goal', () => {
  const handedOut = { campaignId: 'campaign', stationId: 'B', status: 'COMPLETED', items: [rice(30)] };
  const inventory = calculateInventory([receipt], [transfer('RECEIVED')], [handedOut]);
  const [progress] = calculateCampaignProgress([target(100)], inventory);
  assert.equal(progress.stockQuantity, 70);
  assert.equal(progress.distributedQuantity, 30);
  assert.equal(progress.collectedQuantity, 100);
  assert.equal(progress.remainingQuantity, 0);
  assert.equal(progress.progressPercent, 100);
  assert.equal(progress.isFulfilled, true);
});

test('empty inventory, excess donations, campaigns and different units remain separate', () => {
  const [empty] = calculateCampaignProgress([target()], []);
  assert.equal(empty.currentQuantity, 0);
  assert.equal(empty.remainingQuantity, 150);
  assert.equal(empty.progressPercent, 0);
  const inventory = calculateInventory([
    receipt,
    { ...receipt, campaignId: 'other', items: [rice(500)] },
    { ...receipt, items: [{ ...rice(20), unit: 'BOX' }] },
  ], [], []);
  const [progress] = calculateCampaignProgress([target(80)], inventory);
  assert.equal(progress.collectedQuantity, 100);
  assert.equal(progress.remainingQuantity, 0);
  assert.equal(progress.progressPercent, 100);
  assert.deepEqual(summarizeCampaignProgress([progress, empty]), {
    totalItemTypes: 2, fulfilledItemTypes: 1, isFulfilled: false,
  });
  assert.equal(summarizeCampaignProgress([]).isFulfilled, false);
});
