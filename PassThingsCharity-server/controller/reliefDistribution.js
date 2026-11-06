const mongoose = require('mongoose');
const ReliefDistribution = require('../models/reliefDistribution');
const ReliefDistributionItem = require('../models/reliefDistributionItem');
const Campaign = require('../models/campaign');
const CampaignItem = require('../models/campaignItem');
const Station = require('../models/station');
const ItemType = require('../models/itemType');

/**
 * Generate Distribution Code (e.g. DST-261015-3819)
 */
function generateDistributionCode() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DST-${dateStr}-${randomSuffix}`;
}

/**
 * Create a new Relief Distribution (Handover to Recipient Representative)
 * Optional: closeCampaign flag will automatically mark the Campaign as COMPLETED.
 */
async function createDistribution(req, res, next) {
  try {
    const {
      campaignId,
      stationId,
      recipientName,
      recipientRole,
      recipientPhone,
      recipientAddress,
      distributionDate,
      status,
      notes,
      items,
      closeCampaign,
    } = req.body || {};

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'ID chiến dịch (campaignId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(stationId)) {
      return res.status(400).json({ error: 'ID trạm xuất hàng cứu trợ (stationId) không hợp lệ.' });
    }

    if (typeof recipientName !== 'string' || !recipientName.trim()) {
      return res.status(400).json({ error: 'Tên đại diện tiếp nhận cứu trợ (recipientName) là bắt buộc.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Danh sách vật phẩm phân phối cứu trợ (items) không được để trống.' });
    }

    const [campaign, station] = await Promise.all([
      Campaign.findById(campaignId),
      Station.findById(stationId),
    ]);

    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }
    if (!station) {
      return res.status(404).json({ error: 'Không tìm thấy trạm xuất hàng cứu trợ.' });
    }

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
        return res.status(404).json({ error: `Không tìm thấy loại vật phẩm với ID: ${it.itemTypeId}` });
      }

      validatedItems.push({
        itemTypeId: it.itemTypeId,
        quantity: qty,
        unit,
      });
    }

    let code = generateDistributionCode();
    while (await ReliefDistribution.findOne({ code })) {
      code = generateDistributionCode();
    }

    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    let finalStatus = 'PLANNED';
    if (status && typeof status === 'string' && validStatuses.includes(status.trim().toUpperCase())) {
      finalStatus = status.trim().toUpperCase();
    } else if (closeCampaign === true) {
      finalStatus = 'COMPLETED';
    }

    const distribution = await ReliefDistribution.create({
      code,
      campaignId,
      stationId,
      handledBy: req.user._id,
      recipientName: recipientName.trim(),
      recipientRole: typeof recipientRole === 'string' ? recipientRole.trim() : '',
      recipientPhone: typeof recipientPhone === 'string' ? recipientPhone.trim() : '',
      recipientAddress: typeof recipientAddress === 'string' ? recipientAddress.trim() : '',
      distributionDate: distributionDate ? new Date(distributionDate) : new Date(),
      status: finalStatus,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    const savedItems = [];
    for (const it of validatedItems) {
      const doc = await ReliefDistributionItem.create({
        distributionId: distribution._id,
        itemTypeId: it.itemTypeId,
        quantity: it.quantity,
        unit: it.unit,
      });
      savedItems.push(doc);
    }

    // Auto close campaign if requested and status is COMPLETED
    let campaignUpdated = false;
    if (closeCampaign === true && campaign.status !== 'COMPLETED') {
      campaign.status = 'COMPLETED';
      await campaign.save();
      campaignUpdated = true;
    }

    return res.status(201).json({
      message: 'Ghi nhận phân phối bàn giao hàng cứu trợ thành công.',
      distribution,
      items: savedItems,
      campaignClosed: campaignUpdated,
      currentCampaignStatus: campaign.status,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all Relief Distributions
 */
async function getAllDistributions(req, res, next) {
  try {
    const { campaignId, stationId, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (campaignId) {
      if (!mongoose.isValidObjectId(campaignId)) {
        return res.status(400).json({ error: 'campaignId không hợp lệ.' });
      }
      filter.campaignId = campaignId;
    }

    if (stationId) {
      if (!mongoose.isValidObjectId(stationId)) {
        return res.status(400).json({ error: 'stationId không hợp lệ.' });
      }
      filter.stationId = stationId;
    }

    if (status) {
      const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      const st = String(status).toUpperCase();
      if (!validStatuses.includes(st)) {
        return res.status(400).json({ error: `Trạng thái phải thuộc [${validStatuses.join(', ')}].` });
      }
      filter.status = st;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, distributions] = await Promise.all([
      ReliefDistribution.countDocuments(filter),
      ReliefDistribution.find(filter)
        .populate('campaignId', 'title status')
        .populate('stationId', 'name address')
        .populate('handledBy', 'fullName username email phone')
        .sort({ distributionDate: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: distributions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Relief Distribution Details by ID
 */
async function getDistributionById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID đợt phân phối không hợp lệ.' });
    }

    const distribution = await ReliefDistribution.findById(id)
      .populate('campaignId', 'title status startDate endDate')
      .populate('stationId', 'name address phone')
      .populate('handledBy', 'fullName username email phone');

    if (!distribution) {
      return res.status(404).json({ error: 'Không tìm thấy đợt phân phối.' });
    }

    const items = await ReliefDistributionItem.find({ distributionId: id }).populate(
      'itemTypeId',
      'name unit categoryId'
    );

    return res.status(200).json({
      distribution,
      items,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update Relief Distribution Status
 */
async function updateDistributionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes, closeCampaign } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID đợt phân phối không hợp lệ.' });
    }

    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const newStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Trạng thái mới phải thuộc [${validStatuses.join(', ')}].` });
    }

    const distribution = await ReliefDistribution.findById(id);
    if (!distribution) {
      return res.status(404).json({ error: 'Không tìm thấy đợt phân phối.' });
    }

    distribution.status = newStatus;
    if (typeof notes === 'string') {
      distribution.notes = notes.trim();
    }
    await distribution.save();

    if (closeCampaign === true && newStatus === 'COMPLETED') {
      await Campaign.findByIdAndUpdate(distribution.campaignId, { status: 'COMPLETED' });
    }

    return res.status(200).json({
      message: `Đã cập nhật trạng thái đợt phân phối sang ${newStatus}.`,
      distribution,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Summary Report of Inbound Contributions vs Outbound Relief Distribution for a Campaign
 */
async function getCampaignReliefSummary(req, res, next) {
  try {
    const { campaignId } = req.params;
    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId không hợp lệ.' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }

    // 1. Target Items
    const targets = await CampaignItem.find({ campaignId }).populate('itemTypeId', 'name unit');

    // 2. Distributions
    const distributions = await ReliefDistribution.find({ campaignId });
    const distIds = distributions.map((d) => d._id);
    const distributedItems = await ReliefDistributionItem.find({
      distributionId: { $in: distIds },
    }).populate('itemTypeId', 'name unit');

    // Aggregate distributed quantities by itemTypeId
    const distributedTotals = {};
    for (const d of distributedItems) {
      const typeId = d.itemTypeId ? d.itemTypeId._id.toString() : 'unknown';
      if (!distributedTotals[typeId]) {
        distributedTotals[typeId] = {
          name: d.itemTypeId ? d.itemTypeId.name : '',
          unit: d.unit,
          totalDistributed: 0,
        };
      }
      distributedTotals[typeId].totalDistributed += d.quantity;
    }

    const summary = targets.map((t) => {
      const typeId = t.itemTypeId ? t.itemTypeId._id.toString() : '';
      const distInfo = distributedTotals[typeId] || { totalDistributed: 0 };
      return {
        itemTypeId: typeId,
        itemName: t.itemTypeId ? t.itemTypeId.name : '',
        unit: t.unit,
        targetQuantity: t.targetQuantity,
        collectedQuantity: t.currentQuantity || 0,
        distributedQuantity: distInfo.totalDistributed,
        remainingInStock: Math.max(0, (t.currentQuantity || 0) - distInfo.totalDistributed),
      };
    });

    return res.status(200).json({
      campaign: {
        id: campaign._id,
        title: campaign.title,
        status: campaign.status,
      },
      totalDistributionBatches: distributions.length,
      itemsSummary: summary,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createDistribution,
  getAllDistributions,
  getDistributionById,
  updateDistributionStatus,
  getCampaignReliefSummary,
};
