const mongoose = require('mongoose');
const Inventory = require('../models/inventory');
const InventoryTransaction = require('../models/inventoryTransaction');
const Station = require('../models/station');
const ItemType = require('../models/itemType');
const { mutateInventory } = require('../services/inventory');

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function handler(action) {
  return async (req, res, next) => {
    try {
      const batch = action === 'CREATE' && Array.isArray(req.body);
      const bodies = batch ? req.body : [req.body || {}];
      if (!bodies.length || bodies.length > 100) fail(400, 'Mỗi lần gửi phải có từ 1 đến 100 món.');
      const keys = new Set();
      for (const body of bodies) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Mỗi món phải là một object.');
        if (typeof body.description !== 'string' || !body.description.trim()) fail(400, 'Cần nhập lý do điều chỉnh kho (description).');
        const allowed = action === 'CREATE' ? ['stationId', 'itemTypeId', 'unit', 'quantity', 'description'] : action === 'UPDATE' ? ['quantity', 'description'] : ['description'];
        if (Object.keys(body).some(key => !allowed.includes(key))) fail(400, 'Body chứa trường không được hỗ trợ. Chỉ sửa số lượng, không đổi trạm hoặc loại hàng.');
        if (action !== 'DELETE' && (typeof body.quantity !== 'number' || !Number.isFinite(body.quantity) || body.quantity < 0 || Number(body.quantity.toFixed(8)) !== body.quantity)) {
          fail(400, 'quantity phải là số không âm, tối đa 8 chữ số thập phân.');
        }
        if (action !== 'CREATE' && !mongoose.isValidObjectId(req.params.id)) fail(400, 'ID kho không hợp lệ.');
        if (action === 'CREATE' && (!mongoose.isValidObjectId(body.stationId) || !mongoose.isValidObjectId(body.itemTypeId))) fail(400, 'stationId hoặc itemTypeId không hợp lệ.');
        if (action === 'CREATE') {
          const key = `${String(body.stationId).toLowerCase()}:${String(body.itemTypeId).toLowerCase()}:${body.unit}`;
          if (keys.has(key)) fail(409, 'Danh sách có dòng kho trùng nhau.');
          keys.add(key);
        }
      }

      const data = await mutateInventory(async () => {
        const rows = [];
        for (const body of bodies) {
          let row;
          if (action === 'CREATE') {
            // Scope comes from the router's station authorization, never from the body alone.
            const scope = req.inventoryFilter.stationId;
            const allowedStations = scope ? (scope.$in || [scope]).map(String) : null;
            if (allowedStations && !allowedStations.includes(String(body.stationId))) fail(403, 'Không có quyền thao tác kho trạm này.');
            if (!await Station.exists({ _id: body.stationId })) fail(404, 'Không tìm thấy trạm.');
            const item = await ItemType.findById(body.itemTypeId);
            if (!item) fail(404, 'Không tìm thấy loại vật phẩm.');
            if (body.unit !== item.unit) fail(400, `Đơn vị phải là ${item.unit}.`);
            if (await Inventory.exists({ stationId: body.stationId, itemTypeId: body.itemTypeId, unit: body.unit })) fail(409, 'Dòng kho đã tồn tại, hãy dùng API sửa số lượng.');
            row = new Inventory({ stationId: body.stationId, itemTypeId: body.itemTypeId, unit: body.unit, quantity: 0 });
          } else {
            row = await Inventory.findOne({ ...req.inventoryFilter, _id: req.params.id });
            if (!row) fail(404, 'Không tìm thấy dòng kho trong phạm vi được phép.');
          }
          const before = row.quantity;
          const after = action === 'DELETE' ? 0 : body.quantity;
          row.quantity = after;
          await row.save();
          await InventoryTransaction.create([{
            inventoryId: row._id, stationId: row.stationId, itemTypeId: row.itemTypeId,
            unit: row.unit, type: `MANUAL_${action}`, sourceType: 'MANUAL', sourceId: row._id,
            quantityDelta: Number((after - before).toFixed(8)), balanceBefore: before, balanceAfter: after,
            performedBy: req.user._id, description: body.description.trim(),
          }]);
          if (action === 'DELETE') await Inventory.deleteOne({ _id: row._id });
          rows.push(row);
        }
        return batch ? rows : rows[0];
      });
      return res.status(action === 'CREATE' ? 201 : 200).json({ message: 'Đã cập nhật kho và lưu lịch sử điều chỉnh.', data });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'Dòng kho đã tồn tại.' });
      return next(error);
    }
  };
}

module.exports = { createInventory: handler('CREATE'), updateInventory: handler('UPDATE'), deleteInventory: handler('DELETE') };
