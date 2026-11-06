const mongoose = require('mongoose');
const ShiftSchedule = require('../models/shiftSchedule');
const ShiftTemplate = require('../models/shiftTemplate');
const StationStaff = require('../models/stationstaff');
const Station = require('../models/station');
async function createSchedule(req, res, next) {
    try {
        const { stationId } = req.params;
        const { templateId, date, staffId, note } = req.body || {};
        if (!mongoose.isValidObjectId(stationId) || !mongoose.isValidObjectId(templateId)) {
            return res.status(400).json({ error: 'stationId hoặc templateId không hợp lệ.' });
        }
        // Kiểm tra ca mẫu có thuộc trạm không
        const template = await ShiftTemplate.findOne({ _id: templateId, stationId, isActive: true });
        if (!template) {
            return res.status(404).json({ error: 'Ca mẫu không tồn tại hoặc không thuộc trạm này.' });
        }
        // Nếu có gán staffId: kiểm tra staff này có thuộc trạm không
        if (staffId) {
            if (!mongoose.isValidObjectId(staffId)) {
                return res.status(400).json({ error: 'staffId không hợp lệ.' });
            }
            const isStaffInStation = await StationStaff.findOne({ stationId, userId: staffId });
            if (!isStaffInStation) {
                return res.status(400).json({ error: 'Nhân viên này không thuộc danh sách nhân sự của trạm.' });
            }
            // Kiểm tra chống trùng ca: Staff đã có ca nào trong ngày này chưa
            const existing = await ShiftSchedule.findOne({
                staffId,
                date,
                templateId,
                status: { $ne: 'CANCELLED' },
            });
            if (existing) {
                return res.status(409).json({ error: 'Nhân viên này đã được phân công ca làm này trong ngày rồi.' });
            }
        }
        const schedule = await ShiftSchedule.create({
            stationId,
            templateId,
            date,
            staffId: staffId || null,
            note: note || '',
            assignedBy: req.user._id,
        });
        return res.status(201).json({
            message: 'Phân ca làm việc thành công.',
            data: schedule,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Nhân viên này đã có lịch trực trong ca này.' });
        }
        return next(error);
    }
}
async function getStationSchedules(req, res, next) {
    try {
        const { stationId } = req.params;
        const { date, staffId } = req.query;
        const filter = { stationId, status: { $ne: 'CANCELLED' } };
        if (date) filter.date = date;
        if (staffId && mongoose.isValidObjectId(staffId)) filter.staffId = staffId;
        const schedules = await ShiftSchedule.find(filter)
            .populate('templateId', 'name startTime endTime requiredStaff')
            .populate('staffId', 'fullName email phone username')
            .populate('assignedBy', 'fullName username')
            .sort({ date: 1 });
        return res.status(200).json({ data: schedules });
    } catch (error) {
        return next(error);
    }
}
async function checkInShift(req, res, next) {
    try {
        const { id } = req.params; // ID của ShiftSchedule
        const schedule = await ShiftSchedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ error: 'Không tìm thấy ca trực.' });
        }
        if (String(schedule.staffId) !== String(req.user._id)) {
            return res.status(403).json({ error: 'Bạn không được phân công ca trực này.' });
        }
        if (schedule.status !== 'SCHEDULED') {
            return res.status(400).json({ error: `Ca trực đang ở trạng thái ${schedule.status}, không thể check-in.` });
        }
        schedule.checkInTime = new Date();
        schedule.status = 'IN_PROGRESS';
        await schedule.save();
        return res.status(200).json({
            message: 'Điểm danh vào ca thành công!',
            data: schedule,
        });
    } catch (error) {
        return next(error);
    }
}
async function checkOutShift(req, res, next) {
    try {
        const { id } = req.params;
        const schedule = await ShiftSchedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ error: 'Không tìm thấy ca trực.' });
        }
        if (String(schedule.staffId) !== String(req.user._id)) {
            return res.status(403).json({ error: 'Bạn không được phân công ca trực này.' });
        }
        if (schedule.status !== 'IN_PROGRESS') {
            return res.status(400).json({ error: 'Bạn chưa check-in vào ca này.' });
        }
        schedule.checkOutTime = new Date();
        schedule.status = 'COMPLETED';
        await schedule.save();
        return res.status(200).json({
            message: 'Điểm danh kết thúc ca thành công!',
            data: schedule,
        });
    } catch (error) {
        return next(error);
    }
}
module.exports = {
    createSchedule,
    getStationSchedules,
    checkInShift,
    checkOutShift,
};
