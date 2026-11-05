const PointTransaction = require('../models/pointTransaction');
const Achievement = require('../models/achievement');
const UserAchievement = require('../models/userAchievement');
const Certificate = require('../models/certificate');
const User = require('../models/user');
const Campaign = require('../models/campaign');
const Contribution = require('../models/contribution');
const ContributionItem = require('../models/contributionItem');
const TaskAssignment = require('../models/taskAssignment');
const ItemType = require('../models/itemType');
const {
  POINT_MILESTONES,
  DONATION_BASE_POINTS,
  DEFAULT_TASK_POINTS_PER_HOUR,
  NO_SHOW_FIRST_WARNING_COUNT,
  NO_SHOW_PENALTY_POINTS,
  getReachedPointMilestones,
} = require('../services/gamificationPolicy');
const { createCertificatePdf } = require('../utils/certificatePdf');
const mongoose = require('mongoose');

async function createReachedMilestoneCertificates(userId, totalPoints) {
  const user = await User.findById(userId).select('fullName');
  if (!user) return [];

  const certificates = [];
  for (const milestonePoints of getReachedPointMilestones(totalPoints)) {
    const title = `Giấy chứng nhận ghi nhận đóng góp - ${milestonePoints} điểm`;
    let certificate;
    try {
      certificate = await Certificate.findOneAndUpdate(
        { userId, milestonePoints },
        {
          $setOnInsert: {
            userId,
            certificateType: 'MILESTONE',
            milestonePoints,
            title,
            content: `Ghi nhận tổng điểm đóng góp đã đạt mốc ${milestonePoints} điểm.`,
            issueDate: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      certificate = await Certificate.findOne({ userId, milestonePoints });
      if (!certificate) throw error;
    }
    certificates.push(certificate);
  }

  return certificates;
}

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
  const completedContributions = await Contribution.find({ userId, status: { $in: ['ACCEPTED', 'COMPLETED'] } }).select('_id');
  const donationWeight = completedContributions.length
    ? await ContributionItem.aggregate([
      { $match: { contributionId: { $in: completedContributions.map((item) => item._id) }, unit: 'KG' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ])
    : [];
  const completedTaskHours = await TaskAssignment.aggregate([
    { $match: { assigneeId: new mongoose.Types.ObjectId(userId), status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: '$hoursSpent' } } },
  ]);
  const totalDonationWeightKg = donationWeight[0]?.total || 0;
  const totalVolunteerHours = completedTaskHours[0]?.total || 0;

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
    } else if (ach.criteriaType === 'VOLUNTEER_HOURS' && totalVolunteerHours >= ach.criteriaValue) {
      qualifies = true;
    } else if (ach.criteriaType === 'DONATION_WEIGHT_KG' && totalDonationWeightKg >= ach.criteriaValue) {
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

  const updatedPointAgg = await PointTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } },
  ]);
  await createReachedMilestoneCertificates(userId, updatedPointAgg[0]?.totalPoints || totalPoints);

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

async function getPointPolicy(req, res, next) {
  try {
    const itemTypes = await ItemType.find({ isActive: true })
      .select('name unit pointsPerUnit categoryId')
      .populate('categoryId', 'name')
      .sort({ name: 1 });

    return res.status(200).json({
      policy: {
        donation: {
          basePoints: DONATION_BASE_POINTS,
          awardEvent: 'Awarded when the receiving station accepts the contribution.',
          formula: 'basePoints + sum(quantity * pointsPerUnit)',
          itemPointRounding: 'Round each item line to the nearest whole point.',
          itemTypes: itemTypes.map((itemType) => ({
            id: itemType._id,
            category: itemType.categoryId?.name || null,
            name: itemType.name,
            unit: itemType.unit,
            pointsPerUnit: itemType.pointsPerUnit || 0,
          })),
        },
        task: {
          configuredRewardPoints: 'Use the rewardPoints configured on each task when greater than zero.',
          fallbackPointsPerHour: DEFAULT_TASK_POINTS_PER_HOUR,
          minimumFallbackPoints: DEFAULT_TASK_POINTS_PER_HOUR,
          rewardFrequency: 'Once per completed task assignment.',
        },
        noShow: {
          appliesTo: 'Users approved for and assigned to a job.',
          firstConfirmedAbsence: { action: 'WARNING', penaltyPoints: 0 },
          repeatConfirmedAbsence: {
            startsAtAbsenceNumber: NO_SHOW_FIRST_WARNING_COUNT + 1,
            action: 'PENALTY',
            requestedPenaltyPoints: NO_SHOW_PENALTY_POINTS,
            maximumDeduction: 'The lesser of the requested penalty and the current point balance.',
            balanceCanFallBelowZero: false,
          },
        },
        certificateMilestones: POINT_MILESTONES,
      },
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

    return res.status(200).json({
      certificates: certificates.map((certificate) => ({
        ...certificate.toObject(),
        ...(certificate.certificateType === 'MILESTONE'
          ? { pdfDownloadUrl: `/gamification/certificates/${certificate._id}/pdf` }
          : {}),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function downloadCertificatePdf(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Certificate ID không hợp lệ.' });
    }

    const certificate = await Certificate.findById(req.params.id).populate('userId', 'fullName');
    if (!certificate) {
      return res.status(404).json({ error: 'Không tìm thấy giấy chứng nhận.' });
    }
    if (!certificate.userId) {
      return res.status(404).json({ error: 'Không tìm thấy người nhận giấy chứng nhận.' });
    }

    const isOwner = String(certificate.userId._id) === String(req.user._id);
    const role = req.user.role?.name;
    if (!isOwner && !['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF'].includes(role)) {
      return res.status(403).json({ error: 'Bạn không có quyền tải giấy chứng nhận này.' });
    }
    if (certificate.certificateType !== 'MILESTONE') {
      return res.status(404).json({ error: 'PDF tự động chỉ có cho giấy chứng nhận mốc điểm.' });
    }

    const pdf = createCertificatePdf({
      recipientName: certificate.userId.fullName,
      title: certificate.title,
      content: certificate.content,
      issueDate: certificate.issueDate,
      milestonePoints: certificate.milestonePoints,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${certificate.milestonePoints}-points.pdf"`,
      'Content-Length': pdf.length,
    });
    return res.status(200).send(pdf);
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
  getPointPolicy,
  createAchievement,
  getAllAchievements,
  getUserAchievements,
  issueCertificate,
  getUserCertificates,
  createReachedMilestoneCertificates,
  downloadCertificatePdf,
};
