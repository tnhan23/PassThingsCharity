const mongoose = require('mongoose');
const Campaign = require('../models/campaign');
const progress = require('../services/campaignProgress');
const completionDate = require('../utils/distributionCompletion');
const { canEdit } = require('../utils/resourceImageAccess');
const { createUploadHandler } = require('../utils/contributionUpload');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

async function authorize(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) fail(400, 'Invalid campaign ID.');
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) fail(404, 'Campaign not found.');
    if (!await canEdit('campaigns', campaign, req.user)) fail(403, 'Cannot edit this campaign.');
    if (campaign.status !== 'COMPLETED') fail(409, 'Results are available for completed campaigns only.');
    req.resultsCampaign = campaign;
    next();
  } catch (error) { next(error); }
}

function validateImages(value, required = false) {
  if (!Array.isArray(value) || value.length > 50 || (required && !value.length)
    || new Set(value).size !== value.length
    || value.some(url => {
      if (typeof url !== 'string') return true;
      try { const parsed = new URL(url); return parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com'; }
      catch { return true; }
    })) fail(400, 'Provide up to 50 unique Cloudinary HTTPS image URLs. Handover evidence cannot be empty.');
}

async function update(req, res, next) {
  try {
    const body = req.body || {};
    if (Object.keys(body).some(key => !['summary', 'images', 'handovers'].includes(key))) fail(400, 'Unsupported result field.');
    if (typeof body.summary !== 'string' || !body.summary.trim() || body.summary.length > 10000) fail(400, 'Provide a summary of at most 10000 characters.');
    const images = body.images ?? [];
    const handovers = body.handovers ?? [];
    validateImages(images);
    if (!Array.isArray(handovers) || handovers.length > 100) fail(400, 'Provide at most 100 handovers.');
    const campaignItems = await progress.getCampaignProgress([req.params.id]);
    const available = new Map(campaignItems.map(item => [String(item.itemTypeId?._id || item.itemTypeId), item]));
    const totals = new Map();
    const validated = [];
    for (const entry of handovers) {
      if (!entry || typeof entry !== 'object' || Object.keys(entry).some(key => !['recipientName', 'recipientRole', 'recipientAddress', 'completedAt', 'items', 'imageUrls'].includes(key))) fail(400, 'Invalid handover fields; enter recipient and items directly.');
      for (const field of ['recipientName', 'recipientAddress']) {
        if (typeof entry[field] !== 'string' || !entry[field].trim() || entry[field].length > 1000) fail(400, `${field} is required (maximum 1000 characters).`);
      }
      if (entry.recipientRole !== undefined && (typeof entry.recipientRole !== 'string' || entry.recipientRole.length > 1000)) fail(400, 'Invalid recipientRole.');
      if (entry.completedAt === undefined) fail(400, 'Actual completedAt is required.');
      const completedAt = completionDate('COMPLETED', entry.completedAt);
      validateImages(entry.imageUrls, true);
      if (!Array.isArray(entry.items) || !entry.items.length || entry.items.length > 100) fail(400, 'Provide 1–100 delivered items per handover.');
      const seen = new Set();
      const items = entry.items.map(item => {
        if (!item || !mongoose.isValidObjectId(item.itemTypeId)) fail(400, 'Invalid itemTypeId.');
        const id = String(item.itemTypeId).toLowerCase();
        const source = available.get(id);
        if (!source || item.unit !== source.unit) fail(400, 'Item must belong to this campaign and use its standard unit.');
        if (seen.has(id)) fail(400, 'Duplicate item in a handover.');
        seen.add(id);
        if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0 || Number(item.quantity.toFixed(8)) !== item.quantity) fail(400, 'Quantity must be positive with at most 8 decimal places.');
        const total = Number(((totals.get(id) || 0) + item.quantity).toFixed(8));
        if (total > source.collectedQuantity) fail(400, 'Total handed over cannot exceed confirmed collected quantity.');
        totals.set(id, total);
        return { itemTypeId: item.itemTypeId, unit: item.unit, quantity: item.quantity };
      });
      validated.push({ recipientName: entry.recipientName.trim(), recipientRole: entry.recipientRole?.trim() || '', recipientAddress: entry.recipientAddress.trim(), completedAt, items, imageUrls: entry.imageUrls });
    }
    const now = new Date();
    const results = {
      summary: body.summary.trim(), images,
      handovers: validated,
      publishedAt: req.resultsCampaign.results?.publishedAt || now,
      updatedAt: now, updatedBy: req.user._id,
    };
    const campaign = await Campaign.findOneAndUpdate({ _id: req.params.id, status: 'COMPLETED' }, { $set: { results } }, { new: true, runValidators: true });
    if (!campaign) fail(409, 'Campaign is no longer completed.');
    res.json({ results: campaign.results });
  } catch (error) { next(error); }
}

module.exports = { authorize, update, upload: createUploadHandler('distribution-evidence') };
