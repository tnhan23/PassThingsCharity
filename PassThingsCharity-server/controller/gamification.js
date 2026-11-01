const PointTransaction = require('../models/pointTransaction');
const Achievement = require('../models/achievement');
const UserAchievement = require('../models/userAchievement');
const Certificate = require('../models/certificate');
const User = require('../models/user');
const Campaign = require('../models/campaign');
const mongoose = require('mongoose');

/**
 * Helper function to check and auto-unlock eligible achievements for a user
 */
async function checkAndUnlockAchievements(userId) {
  // Calculate total points
  const pointAgg = await PointTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } },
  ]);
  const totalPoints = pointAgg.length > 0 ? pointAgg[0].totalPoints : 0;

  // Calculate total donation transactions count
  const donationCount = await PointTransaction.countDocuments({
    userId,
    type: 'DONATION',
  });

  // Calculate total volunteer task count
  const volunteerTaskCount = await PointTransaction.countDocuments({
    userId,
    type: 'VOLUNTEER_TASK',
  });

  // Get all active achievements
  const achievements = await Achievement.find({ isActive: true });

  // Get user's already unlocked achievement IDs
  const unlocked = await UserAchievement.find({ userId });
  const unlockedSet = new Set(unlocked.map((u) => u.achievementId.toString()));

  const newlyUnlocked = [];

  for (const ach of achievements) {
    if (unlockedSet.has(ach._id.toString())) continue;

    let qualifies = false;
    if (ach.criteriaType === 'POINTS_ACCUMULATED' && totalPoints >= ach.criteriaValue) {
      qualifies = true;
    } else if (ach.criteriaType === 'DONATION_COUNT' && donationCount >= ach.criteriaValue) {
      qualifies = true;
    } else if (ach.criteriaType === 'VOLUNTEER_HOURS' && volunteerTaskCount >= ach.criteriaValue) {
      qualifies = true;
    } else if (ach.criteriaType === 'CAMPAIGN_COUNT' && (donationCount + volunteerTaskCount) >= ach.criteriaValue) {
      qualifies = true;
    }

    if (qualifies) {
      await UserAchievement.create({
        userId,
        achievementId: ach._id,
      });

      // Award bonus reward points if specified
      if (ach.pointsReward > 0) {
        await PointTransaction.create({
          userId,
          points: ach.pointsReward,
          type: 'BONUS',
          description: `Bonus points for unlocking achievement: ${ach.title}`,
        });
      }

      newlyUnlocked.push(ach);
    }
  }

  return newlyUnlocked;
}

/**
 * API / Internal Service: Award points to a user
 */
async function awardPoints(req, res, next) {
  try {
    const { userId, points, type, sourceId, description } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Valid User ID is required.' });
    }

    const numPoints = Number(points);
    if (!Number.isFinite(numPoints) || !Number.isInteger(numPoints) || numPoints <= 0) {
      return res.status(400).json({ error: 'Points must be a positive whole number.' });
    }

    const validTypes = ['DONATION', 'VOLUNTEER_TASK', 'BONUS', 'SYSTEM'];
    const formattedType = typeof type === 'string' ? type.trim().toUpperCase() : '';
    if (!validTypes.includes(formattedType)) {
      return res.status(400).json({ error: `Point type must be one of: ${validTypes.join(', ')}.` });
    }

    if (sourceId !== undefined && !mongoose.isValidObjectId(sourceId)) {
      return res.status(400).json({ error: 'Invalid source ID.' });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const transaction = await PointTransaction.create({
      userId,
      points: numPoints,
      type: formattedType,
      sourceId,
      description: typeof description === 'string' ? description.trim() : '',
    });

    // Check & unlock achievements automatically
    const newBadges = await checkAndUnlockAchievements(userId);

    return res.status(201).json({
      message: `${numPoints} points awarded successfully.`,
      transaction,
      newlyUnlockedAchievements: newBadges,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Point Balance and Transaction History for Current User (or specified user)
 */
async function getUserPoints(req, res, next) {
  try {
    const userId = req.params.userId || req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid User ID.' });
    }

    const transactions = await PointTransaction.find({ userId }).sort({ createdAt: -1 });

    const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);

    return res.status(200).json({
      userId,
      totalPoints,
      transactions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Create a new Achievement definition (Admin / Station Manager)
 */
async function createAchievement(req, res, next) {
  try {
    const { title, description, criteriaType, criteriaValue, pointsReward } = req.body || {};
    const imageFields = require('../utils/resourceImageFields')(req.body || {}, 'badgeIconUrl');

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Achievement title is required.' });
    }

    const validCriteria = ['DONATION_COUNT', 'DONATION_WEIGHT_KG', 'VOLUNTEER_HOURS', 'CAMPAIGN_COUNT', 'POINTS_ACCUMULATED'];
    const formattedCriteria = typeof criteriaType === 'string' ? criteriaType.trim().toUpperCase() : '';

    if (!validCriteria.includes(formattedCriteria)) {
      return res.status(400).json({ error: `Criteria type must be one of: ${validCriteria.join(', ')}.` });
    }

    const val = Number(criteriaValue);
    if (!Number.isFinite(val) || !Number.isInteger(val) || val < 1) {
      return res.status(400).json({ error: 'Criteria value must be a positive whole number.' });
    }

    const reward = pointsReward === undefined ? 0 : Number(pointsReward);
    if (!Number.isFinite(reward) || !Number.isInteger(reward) || reward < 0) {
      return res.status(400).json({ error: 'Points reward must be a non-negative whole number.' });
    }

    const achievement = await Achievement.create({
      createdBy: req.user._id,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      ...imageFields,
      criteriaType: formattedCriteria,
      criteriaValue: val,
      pointsReward: reward,
    });

    return res.status(201).json({
      message: 'Achievement definition created.',
      achievement,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get All Available Achievements
 */
async function getAllAchievements(req, res, next) {
  try {
    const achievements = await Achievement.find({ isActive: true }).sort({ criteriaValue: 1 });
    return res.status(200).json({ achievements });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get User Unlocked Achievements
 */
async function getUserAchievements(req, res, next) {
  try {
    const userId = req.params.userId || req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid User ID.' });
    }

    const unlocked = await UserAchievement.find({ userId })
      .populate('achievementId')
      .sort({ unlockedAt: -1 });

    return res.status(200).json({ unlockedAchievements: unlocked });
  } catch (error) {
    return next(error);
  }
}

/**
 * Issue Certificate to User (Admin / Station Manager)
 */
async function issueCertificate(req, res, next) {
  try {
    const { userId, campaignId, certificateType, title, content, pdfUrl } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Valid User ID is required.' });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (campaignId !== undefined && !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'Invalid Campaign ID.' });
    }

    if (campaignId) {
      const campaignExists = await Campaign.findById(campaignId);
      if (!campaignExists) {
        return res.status(404).json({ error: 'Campaign not found.' });
      }
    }

    const validTypes = ['VOLUNTEER', 'DONOR'];
    const formattedType = typeof certificateType === 'string' ? certificateType.trim().toUpperCase() : '';
    if (!validTypes.includes(formattedType)) {
      return res.status(400).json({ error: `Certificate type must be one of: ${validTypes.join(', ')}.` });
    }

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Certificate title is required.' });
    }

    const certificate = await Certificate.create({
      userId,
      campaignId,
      certificateType: formattedType,
      title: title.trim(),
      content: typeof content === 'string' ? content.trim() : '',
      pdfUrl: typeof pdfUrl === 'string' ? pdfUrl.trim() : '',
      issueDate: new Date(),
    });

    const populated = await Certificate.findById(certificate._id)
      .populate('userId', 'fullName username email')
      .populate('campaignId', 'title');

    return res.status(201).json({
      message: 'Certificate issued successfully.',
      certificate: populated,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get User Certificates
 */
async function getUserCertificates(req, res, next) {
  try {
    const userId = req.params.userId || req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid User ID.' });
    }

    const certificates = await Certificate.find({ userId })
      .populate('campaignId', 'title startDate endDate')
      .sort({ issueDate: -1 });

    return res.status(200).json({ certificates });
  } catch (error) {
    return next(error);
  }
}

async function updateAchievement(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID thành tích không hợp lệ.' });
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) return res.status(404).json({ error: 'Không tìm thấy thành tích.' });
    const { canEdit, applyImageFromForm } = require('../utils/resourceImageAccess');
    if (!await canEdit('achievements', achievement, req.user)) return res.status(403).json({ error: 'Bạn không có quyền sửa thành tích này.' });
    const body = req.body || {};
    const fields = ['title', 'description', 'badgeIconUrl', 'criteriaType', 'criteriaValue', 'pointsReward', 'isActive'];
    if (!fields.some(field => body[field] !== undefined)) return res.status(400).json({ error: 'Cần gửi ít nhất một trường cập nhật.' });
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) return res.status(400).json({ error: 'Tiêu đề không được để trống.' });
      achievement.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string') return res.status(400).json({ error: 'Mô tả phải là chuỗi.' });
      achievement.description = body.description.trim();
    }
    if (body.criteriaType !== undefined) {
      const value = typeof body.criteriaType === 'string' ? body.criteriaType.trim().toUpperCase() : '';
      if (!['DONATION_COUNT', 'DONATION_WEIGHT_KG', 'VOLUNTEER_HOURS', 'CAMPAIGN_COUNT', 'POINTS_ACCUMULATED'].includes(value)) return res.status(400).json({ error: 'Loại tiêu chí không hợp lệ.' });
      achievement.criteriaType = value;
    }
    for (const [field, minimum] of [['criteriaValue', 1], ['pointsReward', 0]]) {
      if (body[field] !== undefined) {
        const value = Number(body[field]);
        if (body[field] === null || typeof body[field] === 'boolean' || body[field] === '' || !Number.isInteger(value) || value < minimum) return res.status(400).json({ error: `${field} phải là số nguyên từ ${minimum}.` });
        achievement[field] = value;
      }
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') return res.status(400).json({ error: 'isActive phải là boolean.' });
      achievement.isActive = body.isActive;
    }
    await applyImageFromForm(achievement, body, 'achievements', req.user);
    await achievement.save();
    return res.status(200).json({ message: 'Đã cập nhật thành tích.', achievement });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Tên thành tích đã tồn tại.' });
    return next(error);
  }
}

module.exports = {
  updateAchievement,
  checkAndUnlockAchievements,
  awardPoints,
  getUserPoints,
  createAchievement,
  getAllAchievements,
  getUserAchievements,
  issueCertificate,
  getUserCertificates,
};
