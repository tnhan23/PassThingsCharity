const mongoose = require('mongoose');
const Contribution = require('../models/contribution');
const ContributionItem = require('../models/contributionItem');
const ContributionImage = require('../models/contributionImage');
const Campaign = require('../models/campaign');
const CampaignItem = require('../models/campaignItem');
const Station = require('../models/station');
const User = require('../models/user');
const ItemType = require('../models/itemType');
const PointTransaction = require('../models/pointTransaction');
const { checkAndUnlockAchievements } = require('./gamification');

/**
 * Generate unique Contribution Code (e.g. CTB-261015-8492)
 */
function generateContributionCode() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CTB-${dateStr}-${randomSuffix}`;
}

/**
 * Staff look up donor by keyword (phone, email, username or full name)
 */
async function lookupDonor(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ error: 'Từ khóa tìm kiếm (q) là bắt buộc.' });
    }

    const keyword = q.trim();
    const regex = new RegExp(keyword, 'i');

    const users = await User.find({
      $or: [
        { phone: regex },
        { email: regex },
        { username: regex },
        { fullName: regex },
      ],
    })
      .select('_id fullName email phone username status')
      .limit(10);

    return res.status(200).json({ data: users });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create a new Contribution (Inbound Donation)
 * - Auto-generates unique contribution code
 * - Validates Campaign, Station, Donor and Items
 * - Creates Contribution, ContributionItems and ContributionImages
 * - Automatically updates Campaign progress (CampaignItem.currentQuantity)
 * - Automatically awards points and checks for achievement unlocks
 */
async function createContribution(req, res, next) {
  try {
    const { userId, stationId, campaignId, notes, items, imageUrls } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'ID người quyên góp (userId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(stationId)) {
      return res.status(400).json({ error: 'ID trạm tiếp nhận (stationId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'ID chiến dịch (campaignId) không hợp lệ.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Danh sách vật phẩm quyên góp (items) không được để trống.' });
    }

    // Verify User exists
    const donor = await User.findById(userId);
    if (!donor) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người quyên góp.' });
    }

    // Verify Station exists
    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ error: 'Không tìm thấy trạm tiếp nhận.' });
    }

    // Verify Campaign exists and is open
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }
    if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
      return res.status(400).json({
        error: `Không thể tiếp nhận đồ cho chiến dịch đã ở trạng thái ${campaign.status}.`,
      });
    }

    // Validate each item
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
          error: `Vật phẩm thứ ${i + 1}: Đơn vị phải thuộc một trong các loại [${validUnits.join(', ')}].`,
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
        note: typeof it.note === 'string' ? it.note.trim() : '',
      });
    }

    // Generate unique code
    let code = generateContributionCode();
    while (await Contribution.findOne({ code })) {
      code = generateContributionCode();
    }

    // Create Contribution
    const contribution = await Contribution.create({
      code,
      userId,
      stationId,
      campaignId,
      staffId: req.user._id,
      status: 'ACCEPTED',
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    // Save items & update Campaign progress (CampaignItem.currentQuantity)
    const savedItems = [];
    let totalPoints = 20; // Base donation reward points

    for (const it of validatedItems) {
      // Find matching campaign target item
      const campaignItem = await CampaignItem.findOne({
        campaignId,
        itemTypeId: it.itemTypeId,
      });

      if (campaignItem) {
        // Auto update progress
        campaignItem.currentQuantity = (campaignItem.currentQuantity || 0) + it.quantity;
        await campaignItem.save();
      }

      const createdItem = await ContributionItem.create({
        contributionId: contribution._id,
        campaignItemId: campaignItem ? campaignItem._id : null,
        itemTypeId: it.itemTypeId,
        quantity: it.quantity,
        unit: it.unit,
        note: it.note,
      });

      savedItems.push(createdItem);
      totalPoints += Math.min(Math.round(it.quantity * 2), 50); // Additional points proportional to quantity
    }

    // Save images if provided
    const savedImages = [];
    if (Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        if (typeof url === 'string' && url.trim()) {
          const img = await ContributionImage.create({
            contributionId: contribution._id,
            imageUrl: url.trim(),
          });
          savedImages.push(img);
        }
      }
    }

    // Gamification: Award Points to Donor
    const pointTx = await PointTransaction.create({
      userId,
      points: totalPoints,
      type: 'DONATION',
      sourceId: contribution._id,
      description: `Cộng ${totalPoints} điểm cho lượt quyên góp ${contribution.code}`,
    });

    // Gamification: Auto Check & Unlock Achievements
    const newBadges = await checkAndUnlockAchievements(userId);

    return res.status(201).json({
      message: 'Tiếp nhận quyên góp thành công và đã cập nhật tiến độ chiến dịch.',
      contribution,
      items: savedItems,
      images: savedImages,
      gamification: {
        pointsAwarded: totalPoints,
        transaction: pointTx,
        newlyUnlockedAchievements: newBadges,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all Contributions with filters and pagination
 */
async function getAllContributions(req, res, next) {
  try {
    const { campaignId, stationId, userId, status, search, page = 1, limit = 20 } = req.query;
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

    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ error: 'userId không hợp lệ.' });
      }
      filter.userId = userId;
    }

    if (status) {
      const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'];
      const st = String(status).toUpperCase();
      if (!validStatuses.includes(st)) {
        return res.status(400).json({ error: `Trạng thái phải là một trong [${validStatuses.join(', ')}].` });
      }
      filter.status = st;
    }

    if (search) {
      filter.code = new RegExp(String(search).trim(), 'i');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, contributions] = await Promise.all([
      Contribution.countDocuments(filter),
      Contribution.find(filter)
        .populate('userId', 'fullName email phone username')
        .populate('stationId', 'name address')
        .populate('campaignId', 'title status')
        .populate('staffId', 'fullName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: contributions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Contribution Details by ID (includes items & images)
 */
async function getContributionById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID phiếu quyên góp không hợp lệ.' });
    }

    const contribution = await Contribution.findById(id)
      .populate('userId', 'fullName email phone username')
      .populate('stationId', 'name address')
      .populate('campaignId', 'title startDate endDate status')
      .populate('staffId', 'fullName username');

    if (!contribution) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu quyên góp.' });
    }

    const [items, images] = await Promise.all([
      ContributionItem.find({ contributionId: id }).populate('itemTypeId', 'name unit categoryId'),
      ContributionImage.find({ contributionId: id }),
    ]);

    return res.status(200).json({
      contribution,
      items,
      images,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update Contribution Status (e.g. REJECTED, COMPLETED)
 * Safely rolls back campaign quantity if rejected.
 */
async function updateContributionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID phiếu quyên góp không hợp lệ.' });
    }

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'];
    const newStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Trạng thái mới phải là một trong [${validStatuses.join(', ')}].` });
    }

    const contribution = await Contribution.findById(id);
    if (!contribution) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu quyên góp.' });
    }

    const previousStatus = contribution.status;

    // Rollback quantities if newly REJECTED from ACCEPTED/COMPLETED
    if (newStatus === 'REJECTED' && ['ACCEPTED', 'COMPLETED'].includes(previousStatus)) {
      const items = await ContributionItem.find({ contributionId: id });
      for (const item of items) {
        if (item.campaignItemId) {
          const cItem = await CampaignItem.findById(item.campaignItemId);
          if (cItem) {
            cItem.currentQuantity = Math.max(0, (cItem.currentQuantity || 0) - item.quantity);
            await cItem.save();
          }
        }
      }
    }

    contribution.status = newStatus;
    if (typeof notes === 'string') {
      contribution.notes = notes.trim();
    }
    await contribution.save();

    return res.status(200).json({
      message: `Đã cập nhật trạng thái phiếu quyên góp sang ${newStatus}.`,
      contribution,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Add photo evidence to an existing contribution
 */
async function addContributionImages(req, res, next) {
  try {
    const { id } = req.params;
    const { imageUrls } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID phiếu quyên góp không hợp lệ.' });
    }

    const contribution = await Contribution.findById(id);
    if (!contribution) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu quyên góp.' });
    }

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'imageUrls phải là một mảng chuỗi đường dẫn ảnh hợp lệ.' });
    }

    const added = [];
    for (const url of imageUrls) {
      if (typeof url === 'string' && url.trim()) {
        const img = await ContributionImage.create({
          contributionId: id,
          imageUrl: url.trim(),
        });
        added.push(img);
      }
    }

    return res.status(201).json({
      message: `Đã thêm ${added.length} hình ảnh minh chứng.`,
      images: added,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  lookupDonor,
  createContribution,
  getAllContributions,
  getContributionById,
  updateContributionStatus,
  addContributionImages,
};
