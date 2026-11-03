const mongoose = require('mongoose');
const VolunteerRegistration = require('../models/volunteerRegistration');
const Task = require('../models/task');
const TaskAssignment = require('../models/taskAssignment');
const TaskApplication = require('../models/taskApplication');
const Campaign = require('../models/campaign');
const Station = require('../models/station');
const CampaignTransfer = require('../models/campaignTransfer');
const User = require('../models/user');
const PointTransaction = require('../models/pointTransaction');
const Certificate = require('../models/certificate');
const { checkAndUnlockAchievements } = require('./gamification');

// ==========================================
// 1. VOLUNTEER REGISTRATION & APPROVAL (CAMPAIGN LEVEL)
// ==========================================

/**
 * User registers as a Volunteer for a Campaign
 */
async function registerVolunteer(req, res, next) {
  try {
    const { campaignId, note } = req.body || {};
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'ID chiến dịch (campaignId) không hợp lệ.' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }

    if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
      return res.status(400).json({
        error: `Chiến dịch đã kết thúc hoặc bị hủy, không thể đăng ký tình nguyện.`,
      });
    }

    // Check existing registration
    const existing = await VolunteerRegistration.findOne({ campaignId, userId });
    if (existing) {
      return res.status(409).json({
        error: `Bạn đã gửi đơn đăng ký cho chiến dịch này với trạng thái: ${existing.status}.`,
        registration: existing,
      });
    }

    const registration = await VolunteerRegistration.create({
      campaignId,
      userId,
      status: 'PENDING',
      note: typeof note === 'string' ? note.trim() : '',
    });

    return res.status(201).json({
      message: 'Gửi đơn đăng ký tình nguyện viên thành công. Vui lòng chờ ban quản trị duyệt.',
      registration,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get current user's volunteer registrations
 */
async function getMyVolunteerRegistrations(req, res, next) {
  try {
    const userId = req.user._id;
    const registrations = await VolunteerRegistration.find({ userId })
      .populate('campaignId', 'title startDate endDate status bannerUrl')
      .sort({ registeredAt: -1 });

    return res.status(200).json({ data: registrations });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all volunteer registrations for a Campaign (Admin / Station Manager / Staff)
 */
async function getCampaignVolunteers(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { status } = req.query;

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'ID chiến dịch không hợp lệ.' });
    }

    const filter = { campaignId };
    if (status) {
      filter.status = String(status).toUpperCase();
    }

    const registrations = await VolunteerRegistration.find(filter)
      .populate('userId', 'fullName email phone username')
      .populate('approvedBy', 'fullName username')
      .sort({ registeredAt: -1 });

    return res.status(200).json({ data: registrations });
  } catch (error) {
    return next(error);
  }
}

/**
 * Approve or Reject Volunteer Registration (Admin / Station Manager)
 */
async function updateVolunteerStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID đơn đăng ký không hợp lệ.' });
    }

    const validStatuses = ['APPROVED', 'REJECTED', 'CANCELLED'];
    const newStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Trạng thái duyệt phải thuộc [${validStatuses.join(', ')}].` });
    }

    const registration = await VolunteerRegistration.findById(id);
    if (!registration) {
      return res.status(404).json({ error: 'Không tìm thấy đơn đăng ký tình nguyện.' });
    }

    registration.status = newStatus;
    registration.approvedBy = req.user._id;
    if (typeof note === 'string') {
      registration.note = note.trim();
    }
    await registration.save();

    return res.status(200).json({
      message: `Đã cập nhật trạng thái đơn tình nguyện viên sang ${newStatus}.`,
      registration,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 2. TASK CREATION, LISTING & RECRUITMENT
// ==========================================

/**
 * Create a new operational task
 */
async function createTask(req, res, next) {
  try {
    const {
      campaignId,
      stationId,
      transferId,
      title,
      description,
      startTime,
      endTime,
      recruitmentStatus,
      requiredVolunteers,
      volunteerDeadline,
      rewardPoints,
    } = req.body || {};

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'ID chiến dịch (campaignId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(stationId)) {
      return res.status(400).json({ error: 'ID trạm tiếp nhận (stationId) không hợp lệ.' });
    }

    if (transferId && !mongoose.isValidObjectId(transferId)) {
      return res.status(400).json({ error: 'ID lệnh điều phối (transferId) không hợp lệ.' });
    }

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Tiêu đề nhiệm vụ (title) là bắt buộc.' });
    }

    let start = null;
    let end = null;
    if (startTime) {
      start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: 'startTime không hợp lệ.' });
      }
    }
    if (endTime) {
      end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: 'endTime không hợp lệ.' });
      }
    }
    if (start && end && start >= end) {
      return res.status(400).json({ error: 'Thời gian bắt đầu phải trước thời gian kết thúc.' });
    }

    const [campaign, station] = await Promise.all([
      Campaign.findById(campaignId),
      Station.findById(stationId),
    ]);

    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch.' });
    }
    if (!station) {
      return res.status(404).json({ error: 'Không tìm thấy trạm tiếp nhận.' });
    }

    if (transferId) {
      const transferExists = await CampaignTransfer.findById(transferId);
      if (!transferExists) {
        return res.status(404).json({ error: 'Không tìm thấy lệnh điều phối tương ứng.' });
      }
    }

    const validRecruitmentStatuses = ['NOT_OPEN', 'OPEN', 'FILLED', 'CLOSED'];
    const finalRecruitmentStatus = recruitmentStatus && validRecruitmentStatuses.includes(String(recruitmentStatus).toUpperCase())
      ? String(recruitmentStatus).toUpperCase()
      : 'NOT_OPEN';

    const task = await Task.create({
      campaignId,
      stationId,
      transferId: transferId || null,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      startTime: start,
      endTime: end,
      status: 'PENDING',
      recruitmentStatus: finalRecruitmentStatus,
      requiredVolunteers: Number(requiredVolunteers) > 0 ? Number(requiredVolunteers) : 0,
      volunteerDeadline: volunteerDeadline ? new Date(volunteerDeadline) : null,
      rewardPoints: Number(rewardPoints) > 0 ? Number(rewardPoints) : 0,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: 'Tạo nhiệm vụ thành công.',
      task,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all tasks with filters
 */
async function getAllTasks(req, res, next) {
  try {
    const {
      campaignId,
      stationId,
      transferId,
      status,
      recruitmentStatus,
      page = 1,
      limit = 20,
    } = req.query;
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
    if (transferId) {
      if (!mongoose.isValidObjectId(transferId)) {
        return res.status(400).json({ error: 'transferId không hợp lệ.' });
      }
      filter.transferId = transferId;
    }
    if (status) {
      filter.status = String(status).toUpperCase();
    }
    if (recruitmentStatus) {
      filter.recruitmentStatus = String(recruitmentStatus).toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .populate('campaignId', 'title status')
        .populate('stationId', 'name address')
        .populate('transferId', 'code status transportMethod')
        .populate('createdBy', 'fullName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: tasks,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get Task Details by ID including assignments and applications
 */
async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID nhiệm vụ không hợp lệ.' });
    }

    const task = await Task.findById(id)
      .populate('campaignId', 'title status startDate endDate')
      .populate('stationId', 'name address')
      .populate('transferId', 'code status fromStationId toStationId')
      .populate('createdBy', 'fullName username');

    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    const [assignments, applications] = await Promise.all([
      TaskAssignment.find({ taskId: id })
        .populate('assigneeId', 'fullName email phone username')
        .populate('assignedBy', 'fullName username'),
      TaskApplication.find({ taskId: id })
        .populate('userId', 'fullName email phone username')
        .populate('reviewedBy', 'fullName username'),
    ]);

    return res.status(200).json({
      task,
      assignments,
      applications,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update task information or recruitment status
 */
async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      status,
      recruitmentStatus,
      requiredVolunteers,
      volunteerDeadline,
      rewardPoints,
      transferId,
    } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID nhiệm vụ không hợp lệ.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    if (typeof title === 'string' && title.trim()) task.title = title.trim();
    if (typeof description === 'string') task.description = description.trim();
    if (startTime) task.startTime = new Date(startTime);
    if (endTime) task.endTime = new Date(endTime);
    if (transferId !== undefined) {
      if (transferId === null || transferId === '') {
        task.transferId = null;
      } else if (mongoose.isValidObjectId(transferId)) {
        task.transferId = transferId;
      }
    }

    if (status) {
      const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      const st = String(status).toUpperCase();
      if (!validStatuses.includes(st)) {
        return res.status(400).json({ error: `Trạng thái nhiệm vụ phải thuộc [${validStatuses.join(', ')}].` });
      }
      task.status = st;
    }

    if (recruitmentStatus) {
      const validRecruitmentStatuses = ['NOT_OPEN', 'OPEN', 'FILLED', 'CLOSED'];
      const rSt = String(recruitmentStatus).toUpperCase();
      if (!validRecruitmentStatuses.includes(rSt)) {
        return res.status(400).json({ error: `recruitmentStatus phải thuộc [${validRecruitmentStatuses.join(', ')}].` });
      }
      task.recruitmentStatus = rSt;
    }

    if (requiredVolunteers !== undefined && Number(requiredVolunteers) >= 0) {
      task.requiredVolunteers = Number(requiredVolunteers);
    }
    if (volunteerDeadline !== undefined) {
      task.volunteerDeadline = volunteerDeadline ? new Date(volunteerDeadline) : null;
    }
    if (rewardPoints !== undefined && Number(rewardPoints) >= 0) {
      task.rewardPoints = Number(rewardPoints);
    }

    await task.save();

    return res.status(200).json({
      message: 'Cập nhật nhiệm vụ thành công.',
      task,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 3. TASK APPLICATIONS (VOLUNTEER SIGN-UP FOR SPECIFIC TASK)
// ==========================================

/**
 * Volunteer applies to participate in an open operational task
 */
async function applyForTask(req, res, next) {
  try {
    const taskId = req.params.taskId || req.body.taskId;
    const { note } = req.body || {};
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ error: 'ID nhiệm vụ (taskId) không hợp lệ.' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    if (task.recruitmentStatus !== 'OPEN') {
      return res.status(400).json({
        error: `Nhiệm vụ này hiện không mở tuyển tình nguyện viên (Trạng thái: ${task.recruitmentStatus}).`,
      });
    }

    if (task.volunteerDeadline && new Date() > new Date(task.volunteerDeadline)) {
      return res.status(400).json({ error: 'Đã quá hạn chót đăng ký cho nhiệm vụ này.' });
    }

    // Check if already applied
    const existingApp = await TaskApplication.findOne({ taskId, userId });
    if (existingApp) {
      return res.status(409).json({
        error: `Bạn đã ứng tuyển nhiệm vụ này trước đó với trạng thái: ${existingApp.status}.`,
        application: existingApp,
      });
    }

    // Check if already assigned
    const existingAssign = await TaskAssignment.findOne({ taskId, assigneeId: userId });
    if (existingAssign) {
      return res.status(409).json({ error: 'Bạn đã được phân công nhiệm vụ này rồi.' });
    }

    const application = await TaskApplication.create({
      taskId,
      userId,
      status: 'PENDING',
      appliedAt: new Date(),
      note: typeof note === 'string' ? note.trim() : '',
    });

    return res.status(201).json({
      message: 'Ứng tuyển nhiệm vụ thành công. Vui lòng chờ quản trị viên trạm xét duyệt.',
      application,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get task applications submitted by current user
 */
async function getMyTaskApplications(req, res, next) {
  try {
    const userId = req.user._id;
    const applications = await TaskApplication.find({ userId })
      .populate({
        path: 'taskId',
        populate: [
          { path: 'campaignId', select: 'title status' },
          { path: 'stationId', select: 'name address' },
        ],
      })
      .populate('reviewedBy', 'fullName username')
      .sort({ appliedAt: -1 });

    return res.status(200).json({ data: applications });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get list of applications for a specific task (Admin / Station Manager / Staff)
 */
async function getTaskApplications(req, res, next) {
  try {
    const { taskId } = req.params;
    const { status } = req.query;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ error: 'ID nhiệm vụ không hợp lệ.' });
    }

    const filter = { taskId };
    if (status) {
      filter.status = String(status).toUpperCase();
    }

    const applications = await TaskApplication.find(filter)
      .populate('userId', 'fullName email phone username')
      .populate('reviewedBy', 'fullName username')
      .sort({ appliedAt: -1 });

    return res.status(200).json({ data: applications });
  } catch (error) {
    return next(error);
  }
}

/**
 * Review (Approve or Reject) a Task Application (Admin / Station Manager / Staff)
 * When approved:
 * - Automatically creates a TaskAssignment for the volunteer
 * - Checks if recruitment is filled (requiredVolunteers reached)
 */
async function reviewTaskApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID đơn ứng tuyển không hợp lệ.' });
    }

    const validStatuses = ['APPROVED', 'REJECTED', 'CANCELLED'];
    const newStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: `Trạng thái duyệt phải thuộc [${validStatuses.join(', ')}].` });
    }

    const application = await TaskApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Không tìm thấy đơn ứng tuyển nhiệm vụ.' });
    }

    application.status = newStatus;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    if (typeof note === 'string') {
      application.note = note.trim();
    }
    await application.save();

    let createdAssignment = null;

    if (newStatus === 'APPROVED') {
      // Auto create or update TaskAssignment
      const existing = await TaskAssignment.findOne({
        taskId: application.taskId,
        assigneeId: application.userId,
      });

      if (!existing) {
        createdAssignment = await TaskAssignment.create({
          taskId: application.taskId,
          assigneeId: application.userId,
          assigneeType: 'VOLUNTEER',
          assignedBy: req.user._id,
          assignedAt: new Date(),
          status: 'ASSIGNED',
        });
      }

      // Check task status & recruitment capacity
      const task = await Task.findById(application.taskId);
      if (task) {
        if (task.status === 'PENDING') {
          task.status = 'ASSIGNED';
        }

        // Count approved volunteers
        const volunteerCount = await TaskAssignment.countDocuments({
          taskId: task._id,
          assigneeType: 'VOLUNTEER',
          status: { $ne: 'CANCELLED' },
        });

        if (task.requiredVolunteers > 0 && volunteerCount >= task.requiredVolunteers) {
          task.recruitmentStatus = 'FILLED';
        }
        await task.save();
      }
    }

    return res.status(200).json({
      message: `Đã xét duyệt đơn ứng tuyển sang ${newStatus}.`,
      application,
      assignment: createdAssignment,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 4. MANUAL TASK ASSIGNMENT
// ==========================================

/**
 * Assign a Task to a Volunteer or Staff member manually
 */
async function assignTask(req, res, next) {
  try {
    const { taskId, assigneeId, assigneeType } = req.body || {};

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ error: 'ID nhiệm vụ (taskId) không hợp lệ.' });
    }
    if (!mongoose.isValidObjectId(assigneeId)) {
      return res.status(400).json({ error: 'ID người nhận nhiệm vụ (assigneeId) không hợp lệ.' });
    }

    const type = typeof assigneeType === 'string' ? assigneeType.trim().toUpperCase() : '';
    if (!['STAFF', 'VOLUNTEER'].includes(type)) {
      return res.status(400).json({ error: 'assigneeType phải là STAFF hoặc VOLUNTEER.' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    const user = await User.findById(assigneeId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng nhận nhiệm vụ.' });
    }

    // Check if already assigned
    const existing = await TaskAssignment.findOne({ taskId, assigneeId });
    if (existing) {
      return res.status(409).json({ error: 'Người này đã được phân công nhiệm vụ này rồi.' });
    }

    const assignment = await TaskAssignment.create({
      taskId,
      assigneeId,
      assigneeType: type,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      status: 'ASSIGNED',
    });

    if (task.status === 'PENDING') {
      task.status = 'ASSIGNED';
    }

    if (type === 'VOLUNTEER' && task.requiredVolunteers > 0) {
      const volunteerCount = await TaskAssignment.countDocuments({
        taskId: task._id,
        assigneeType: 'VOLUNTEER',
        status: { $ne: 'CANCELLED' },
      });
      if (volunteerCount >= task.requiredVolunteers) {
        task.recruitmentStatus = 'FILLED';
      }
    }
    await task.save();

    return res.status(201).json({
      message: 'Phân công nhiệm vụ thành công.',
      assignment,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// 5. ATTENDANCE & HOURS TRACKING (CHECK-IN / CHECK-OUT)
// ==========================================

/**
 * Check-in when starting task execution
 */
async function checkInTask(req, res, next) {
  try {
    const { assignmentId } = req.body || {};
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(assignmentId)) {
      return res.status(400).json({ error: 'ID phân công nhiệm vụ (assignmentId) không hợp lệ.' });
    }

    const assignment = await TaskAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin phân công nhiệm vụ.' });
    }

    // Verify ownership or staff/admin
    const userRole = req.user.role ? req.user.role.name : '';
    if (String(assignment.assigneeId) !== String(userId) && !['ADMIN', 'STATION_MANAGER', 'STAFF'].includes(userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền điểm danh cho người này.' });
    }

    assignment.checkInTime = new Date();
    assignment.status = 'IN_PROGRESS';
    await assignment.save();

    await Task.findByIdAndUpdate(assignment.taskId, { status: 'IN_PROGRESS' });

    return res.status(200).json({
      message: 'Điểm danh vào ca thành công!',
      assignment,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Check-out when completing task execution
 * - Records hours spent & completedAt
 * - Awards volunteer points & updates achievements
 */
async function checkOutTask(req, res, next) {
  try {
    const { assignmentId, hoursSpent, completionNote } = req.body || {};
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(assignmentId)) {
      return res.status(400).json({ error: 'ID phân công nhiệm vụ (assignmentId) không hợp lệ.' });
    }

    const assignment = await TaskAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin phân công nhiệm vụ.' });
    }

    const userRole = req.user.role ? req.user.role.name : '';
    if (String(assignment.assigneeId) !== String(userId) && !['ADMIN', 'STATION_MANAGER', 'STAFF'].includes(userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền điểm danh kết thúc ca cho người này.' });
    }

    const checkOut = new Date();
    let calculatedHours = 0;

    if (hoursSpent !== undefined && Number(hoursSpent) > 0) {
      calculatedHours = parseFloat(Number(hoursSpent).toFixed(2));
    } else if (assignment.checkInTime) {
      const diffMs = checkOut.getTime() - new Date(assignment.checkInTime).getTime();
      calculatedHours = parseFloat(Math.max(0.5, diffMs / (1000 * 60 * 60)).toFixed(2));
    } else {
      calculatedHours = 1; // Default minimum 1 hour
    }

    assignment.checkOutTime = checkOut;
    assignment.completedAt = checkOut;
    assignment.hoursSpent = calculatedHours;
    assignment.completionNote = typeof completionNote === 'string' ? completionNote.trim() : '';
    assignment.status = 'COMPLETED';
    await assignment.save();

    // Check if all assignees of the task have completed
    const pendingAssignments = await TaskAssignment.countDocuments({
      taskId: assignment.taskId,
      status: { $ne: 'COMPLETED' },
    });
    if (pendingAssignments === 0) {
      await Task.findByIdAndUpdate(assignment.taskId, { status: 'COMPLETED' });
    }

    // Task & points reward calculation
    const task = await Task.findById(assignment.taskId);
    let pointsAwarded = 0;
    if (task && task.rewardPoints > 0) {
      pointsAwarded = task.rewardPoints;
    } else {
      pointsAwarded = Math.max(25, Math.round(calculatedHours * 25));
    }

    const targetUserId = assignment.assigneeId;

    const pointTx = await PointTransaction.create({
      userId: targetUserId,
      points: pointsAwarded,
      type: 'VOLUNTEER_TASK',
      sourceId: assignment._id,
      description: `Cộng ${pointsAwarded} điểm thưởng hoàn thành nhiệm vụ "${task ? task.title : 'Tình nguyện'}" (${calculatedHours} giờ làm việc).`,
    });

    // Check & unlock achievements
    const newBadges = await checkAndUnlockAchievements(targetUserId);

    return res.status(200).json({
      message: 'Điểm danh kết thúc ca thành công và đã ghi nhận điểm thưởng.',
      assignment,
      hoursSpent: calculatedHours,
      gamification: {
        pointsAwarded,
        transaction: pointTx,
        newlyUnlockedAchievements: newBadges,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all tasks assigned to the current user
 */
async function getMyAssignedTasks(req, res, next) {
  try {
    const userId = req.user._id;
    const assignments = await TaskAssignment.find({ assigneeId: userId })
      .populate({
        path: 'taskId',
        populate: [
          { path: 'campaignId', select: 'title status' },
          { path: 'stationId', select: 'name address' },
          { path: 'transferId', select: 'code status' },
        ],
      })
      .populate('assignedBy', 'fullName username')
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: assignments });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerVolunteer,
  getMyVolunteerRegistrations,
  getCampaignVolunteers,
  updateVolunteerStatus,
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  applyForTask,
  getMyTaskApplications,
  getTaskApplications,
  reviewTaskApplication,
  assignTask,
  checkInTask,
  checkOutTask,
  getMyAssignedTasks,
};
