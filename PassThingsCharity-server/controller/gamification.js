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
    const { title, description, badgeIconUrl, criteriaType, criteriaValue, pointsReward } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Achievement title is required.' });
    }

    const validCriteria = ['DONATION_COUNT', 'POINTS_ACCUMULATED'];
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
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      badgeIconUrl: typeof badgeIconUrl === 'string' ? badgeIconUrl.trim() : '',
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

module.exports = {
  checkAndUnlockAchievements,
  awardPoints,
  getUserPoints,
  createAchievement,
  getAllAchievements,
  getUserAchievements,
  issueCertificate,
  getUserCertificates,
};
