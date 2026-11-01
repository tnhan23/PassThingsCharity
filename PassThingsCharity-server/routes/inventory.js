const express = require('express');
const mongoose = require('mongoose');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const ItemType = require('../models/itemType');
const Campaign = require('../models/campaign');
const { getInventory } = require('../services/inventory');

const router = express.Router();
router.get('/', checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']), async (req, res, next) => {
  try {
    const { campaignId, stationId, itemTypeId } = req.query;
    for (const [name, value] of Object.entries({ campaignId, stationId, itemTypeId })) {
      if (value !== undefined && (typeof value !== 'string' || !mongoose.isValidObjectId(value))) {
        return res.status(400).json({ error: `${name} không hợp lệ.` });
      }
    }
    let allowedStations;
    if (req.user.role.name !== 'ADMIN') {
      const managed = await Station.find({ managerId: req.user._id }).select('_id').lean();
      const assigned = await StationStaff.find({ userId: req.user._id }).select('stationId').lean();
      allowedStations = new Set([...managed.map(doc => String(doc._id)), ...assigned.map(doc => String(doc.stationId))]);
      if (stationId && !allowedStations.has(stationId)) {
        return res.status(403).json({ error: 'Bạn không được xem tồn kho của trạm này.' });
      }
    }
    // One snapshot prevents mixing receipts before a commit with transfers after it.
    let rows = await mongoose.connection.transaction(() => getInventory(campaignId ? { campaignId } : {}));
    rows = rows.filter(row => (!stationId || row.stationId === stationId)
      && (!itemTypeId || row.itemTypeId === itemTypeId)
      && (!allowedStations || allowedStations.has(row.stationId)));
    rows.sort((a, b) => `${a.stationId}:${a.campaignId}:${a.itemTypeId}:${a.unit}`.localeCompare(`${b.stationId}:${b.campaignId}:${b.itemTypeId}:${b.unit}`));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const data = rows.slice((page - 1) * limit, page * limit);
    await Station.populate(data, { path: 'stationId', model: Station, select: 'name address' });
    await Campaign.populate(data, { path: 'campaignId', model: Campaign, select: 'title status' });
    await ItemType.populate(data, { path: 'itemTypeId', model: ItemType, select: 'name' });
    return res.json({ total: rows.length, page, totalPages: Math.ceil(rows.length / limit), data });
  } catch (error) { return next(error); }
});
module.exports = router;
