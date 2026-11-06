const mongoose = require('mongoose');
const CampaignTransfer = require('../models/campaignTransfer');
const CampaignTransferItem = require('../models/campaignTransferItem');
const Campaign = require('../models/campaign');
const Station = require('../models/station');
const ItemType = require('../models/itemType');

/**
 * Generate Transfer Code (e.g. TRF-261015-7123)
 */
function generateTransferCode() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${dateStr}-${randomSuffix}`;
}

/**
 * Create a new Inter-Station Transfer
 */
async function createTransfer(req, res, next) {
  try {
    const {
      campaignId,
      fromStationId,
      toStationId,
      transportMethod,
      transportNote,
      responsibleUserId,
      items,
    } = req.body || {};

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'ID chiến dịch (campaignId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(fromStationId)) {
      return res.status(400).json({ error: 'ID trạm gửi (fromStationId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(toStationId)) {
      return res.status(400).json({ error: 'ID trạm nhận (toStationId) không hợp lệ.' });
    }

    if (String(fromStationId) === String(toStationId)) {
      return res.status(400).json({ error: 'Trạm nhận phải khác trạm gửi.' });
    }

    if (responsibleUserId && !mongoose.isValidObjectId(responsibleUserId)) {
      return res.status(400).json({ error: 'ID người phụ trách vận chuyển (responsibleUserId) không hợp lệ.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Danh sách vật phẩm điều phối (items) không được để trống.' });
    }

    // Verify campaign & stations exist
    const [campaign, fromStation, toStation] = await Promise.all([
      Campaign.findById(campaignId),
      Station.findById(fromStationId),
      Station.findById(toStationId),
    ]);

    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }
    if (!fromStation) {
      return res.status(404).json({ error: 'Không tìm thấy trạm xuất hàng (fromStationId).' });
    }
    if (!toStation) {
      return res.status(404).json({ error: 'Không tìm thấy trạm nhận hàng (toStationId).' });
    }

    // Validate items
    const validUnits = ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'];
    const validatedItems = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!mongoose.isValidObjectId(it.itemTypeId)) {
        return res.status(400).json({ error: `Vật phẩm thứ ${i + 1}: itemTypeId không hợp lệ.` });
      }
      const qty = Number(it.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: `Vật phẩm thứ ${i + 1}: Số lượng phải lớn hơn 0.` });
      }
      const unit = typeof it.unit === 'string' ? it.unit.trim().toUpperCase() : '';
      if (!validUnits.includes(unit)) {
        return res.status(400).json({
          error: `Vật phẩm thứ ${i + 1}: Đơn vị phải thuộc một trong [${validUnits.join(', ')}].`,
        });
      }

      const itemType = await ItemType.findById(it.itemTypeId);
      if (!itemType) {
        return res.status(404).json({ error: `Không tìm thấy loại vật phẩm ID: ${it.itemTypeId}` });
      }

      validatedItems.push({
        itemTypeId: it.itemTypeId,
        quantity: qty,
        unit,
      });
    }

    let code = generateTransferCode();
    while (await CampaignTransfer.findOne({ code })) {
      code = generateTransferCode();
    }

    const transfer = await CampaignTransfer.create({
      code,
      campaignId,
      fromStationId,
      toStationId,
      status: 'PENDING',
      createdBy: req.user._id,
      responsibleUserId: responsibleUserId || null,
      transportMethod: typeof transportMethod === 'string' ? transportMethod.trim() : '',
      transportNote: typeof transportNote === 'string' ? transportNote.trim() : '',
    });

    const savedItems = [];
    for (const it of validatedItems) {
      const itemDoc = await CampaignTransferItem.create({
        transferId: transfer._id,
        itemTypeId: it.itemTypeId,
        quantity: it.quantity,
        unit: it.unit,
      });
      savedItems.push(itemDoc);
    }

    return res.status(201).json({
      message: 'Tạo lệnh điều phối hàng giữa các trạm thành công.',
      transfer,
      items: savedItems,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get list of Inter-Station Transfers
 */
async function getAllTransfers(req, res, next) {
  try {
    const { campaignId, fromStationId, toStationId, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (campaignId) {
      if (!mongoose.isValidObjectId(campaignId)) {
        return res.status(400).json({ error: 'campaignId không hợp lệ.' });
      }
      filter.campaignId = campaignId;
    }
    if (fromStationId) {
      if (!mongoose.isValidObjectId(fromStationId)) {
        return res.status(400).json({ error: 'fromStationId không hợp lệ.' });
      }
      filter.fromStationId = fromStationId;
    }
    if (toStationId) {
      if (!mongoose.isValidObjectId(toStationId)) {
        return res.status(400).json({ error: 'toStationId không hợp lệ.' });
      }
      filter.toStationId = toStationId;
    }
    if (status) {
      const validStatuses = ['PENDING', 'PREPARING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
      const st = String(status).toUpperCase();
      if (!validStatuses.includes(st)) {
        return res.status(400).json({ error: `Status phải thuộc [${validStatuses.join(', ')}].` });
      }
      filter.status = st;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, transfers] = await Promise.all([
      CampaignTransfer.countDocuments(filter),
      CampaignTransfer.find(filter)
        .populate('campaignId', 'title status')
        .populate('fromStationId', 'name address')
        .populate('toStationId', 'name address')
        .populate('createdBy', 'fullName username')
        .populate('responsibleUserId', 'fullName username phone')
        .populate('receivedBy', 'fullName username phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: transfers,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Transfer Details by ID
 */
async function getTransferById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID lệnh điều phối không hợp lệ.' });
    }

    const transfer = await CampaignTransfer.findById(id)
      .populate('campaignId', 'title status startDate endDate')
      .populate('fromStationId', 'name address phone')
      .populate('toStationId', 'name address phone')
      .populate('createdBy', 'fullName username email phone')
      .populate('responsibleUserId', 'fullName username email phone')
      .populate('receivedBy', 'fullName username email phone');

    if (!transfer) {
      return res.status(404).json({ error: 'Không tìm thấy lệnh điều phối.' });
    }

    const items = await CampaignTransferItem.find({ transferId: id }).populate('itemTypeId', 'name unit categoryId');

    return res.status(200).json({
      transfer,
      items,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update Transfer Status
 */
async function updateTransferStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, transportNote, transportMethod, responsibleUserId, receivedBy } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID lệnh điều phối không hợp lệ.' });
    }

    const validStatuses = ['PENDING', 'PREPARING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
    const newStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Trạng thái mới phải thuộc [${validStatuses.join(', ')}].` });
    }

    const transfer = await CampaignTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ error: 'Không tìm thấy lệnh điều phối.' });
    }

    transfer.status = newStatus;
    if (typeof transportNote === 'string') {
      transfer.transportNote = transportNote.trim();
    }
    if (typeof transportMethod === 'string') {
      transfer.transportMethod = transportMethod.trim();
    }
    if (responsibleUserId && mongoose.isValidObjectId(responsibleUserId)) {
      transfer.responsibleUserId = responsibleUserId;
    }
    if (receivedBy && mongoose.isValidObjectId(receivedBy)) {
      transfer.receivedBy = receivedBy;
    } else if (['RECEIVED', 'COMPLETED'].includes(newStatus) && !transfer.receivedBy) {
      // Auto-set receiver to current user if not already set
      transfer.receivedBy = req.user._id;
    }

    await transfer.save();

    return res.status(200).json({
      message: `Đã cập nhật trạng thái lệnh điều phối sang ${newStatus}.`,
      transfer,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTransfer,
  getAllTransfers,
  getTransferById,
  updateTransferStatus,
};
