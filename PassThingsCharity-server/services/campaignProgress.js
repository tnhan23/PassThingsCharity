const mongoose = require('mongoose');
const CampaignItem = require('../models/campaignItem');
const { getInventory } = require('./inventory');

const round = value => Number(value.toFixed(8));
const idOf = value => String(value?._id || value);

function calculateCampaignProgress(items, inventory) {
  const totals = new Map();
  for (const row of inventory) {
    const key = [row.campaignId, row.itemTypeId, row.unit].join(':');
    if (!totals.has(key)) totals.set(key, { stockQuantity: 0, inTransitQuantity: 0, distributedQuantity: 0 });
    const total = totals.get(key);
    total.stockQuantity += row.quantity;
    total.inTransitQuantity += row.transferredOutQuantity - row.transferredInQuantity;
    total.distributedQuantity += row.distributedQuantity;
  }
  return items.map(item => {
    const plain = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    const unit = plain.itemTypeId?.unit;
    const total = totals.get([idOf(plain.campaignId), idOf(plain.itemTypeId), unit].join(':'))
      || { stockQuantity: 0, inTransitQuantity: 0, distributedQuantity: 0 };
    const stockQuantity = round(total.stockQuantity);
    const inTransitQuantity = round(total.inTransitQuantity);
    const distributedQuantity = round(total.distributedQuantity);
    // Transfers change location, and handovers fulfil the goal. Neither should
    // make the public donation progress drop or count the same goods twice.
    const collectedQuantity = round(stockQuantity + inTransitQuantity + distributedQuantity);
    const remainingQuantity = round(Math.max(0, plain.targetQuantity - collectedQuantity));
    return {
      ...plain, unit,
      currentQuantity: collectedQuantity,
      collectedQuantity, stockQuantity, inTransitQuantity, distributedQuantity,
      remainingQuantity,
      progressPercent: plain.targetQuantity > 0
        ? Math.min(100, round(Math.max(0, collectedQuantity) / plain.targetQuantity * 100)) : 0,
      isFulfilled: plain.targetQuantity > 0 && remainingQuantity === 0,
    };
  });
}

async function getCampaignProgress(campaignIds) {
  if (!campaignIds.length) return [];
  return mongoose.connection.transaction(async () => {
    const filter = { campaignId: { $in: campaignIds } };
    const items = await CampaignItem.find(filter).populate({
      path: 'itemTypeId', select: 'name unit categoryId',
      populate: { path: 'categoryId', select: 'name' },
    });
    const inventory = await getInventory(filter);
    return calculateCampaignProgress(items, inventory);
  });
}

function summarizeCampaignProgress(items) {
  return {
    totalItemTypes: items.length,
    fulfilledItemTypes: items.filter(item => item.isFulfilled).length,
    isFulfilled: items.length > 0 && items.every(item => item.isFulfilled),
  };
}

module.exports = { calculateCampaignProgress, getCampaignProgress, summarizeCampaignProgress };
