const express = require('express');
const mongoose = require('mongoose');
const checkBearerToken = require('../middleware/checkBearerToken');
const checkRole = require('../middleware/checkRole');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const Inventory = require('../models/inventory');
const InventoryTransaction = require('../models/inventoryTransaction');

const router = express.Router();
router.use(checkBearerToken, checkRole(['ADMIN', 'STATION_MANAGER', 'STAFF']));
router.use(async (req, res, next) => {
  try {
    const filter = {};
    if (req.path !== '/history' && req.query.campaignId !== undefined) {
      return res.status(400).json({ error: 'Kho là số dư chung theo trạm, không lọc theo chiến dịch. Dùng /inventory/history?campaignId=... để xem giao dịch liên quan.' });
    }
    for (const name of ['stationId', 'itemTypeId', ...(req.path === '/history' ? ['campaignId', 'counterpartyStationId'] : [])]) {
      const value = req.query[name];
      if (value !== undefined) {
        if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) return res.status(400).json({ error: `${name} không hợp lệ.` });
        filter[name] = new mongoose.Types.ObjectId(value);
      }
    }
    if (req.path === '/history' && req.query.type !== undefined) {
      if (!InventoryTransaction.schema.path('type').enumValues.includes(req.query.type)) {
        return res.status(400).json({ error: 'Loại giao dịch kho không hợp lệ.' });
      }
      filter.type = req.query.type;
    }
    if (req.user.role.name !== 'ADMIN') {
      let allowed;
      if (req.user.role.name === 'STATION_MANAGER') {
        const managed = await Station.find({ managerId: req.user._id }).select('_id').lean();
        allowed = managed.map(doc => String(doc._id));
      } else {
        const assigned = await StationStaff.find({ userId: req.user._id }).select('stationId').lean();
        allowed = assigned.map(doc => String(doc.stationId));
      }
      if (filter.stationId && !allowed.includes(String(filter.stationId))) return res.status(403).json({ error: 'Bạn không được xem kho của trạm này.' });
      if (!filter.stationId) filter.stationId = { $in: allowed };
    }
    req.inventoryFilter = filter;
    next();
  } catch (error) { next(error); }
});

function listInventory(Model, history = false) {
  return async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const total = await Model.countDocuments(req.inventoryFilter);
      let query = Model.find(req.inventoryFilter)
        .populate('stationId', 'name address')
        .populate('itemTypeId', 'name')
        .sort(history ? { createdAt: -1, _id: -1 } : { stationId: 1, itemTypeId: 1, unit: 1 })
        .skip((page - 1) * limit).limit(limit);
      if (history) query = query.populate('performedBy', 'fullName username')
        .populate('campaignId', 'title status').populate('counterpartyStationId', 'name address');
      const rows = await query.lean();
      const data = history ? rows : await require('../services/inventory').withReservations(rows);
      return res.json({ total, page, totalPages: Math.ceil(total / limit), data });
    } catch (error) { return next(error); }
  };
}

router.get('/history', listInventory(InventoryTransaction, true));
router.get('/', listInventory(Inventory));
router.post('/', require('../controller/inventory').createInventory);
router.patch('/:id', require('../controller/inventory').updateInventory);
router.delete('/:id', require('../controller/inventory').deleteInventory);
module.exports = router;
