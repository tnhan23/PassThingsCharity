const mongoose = require('mongoose');
const ShiftSchedule = require('../models/shiftSchedule');
const ShiftTemplate = require('../models/shiftTemplate');
const shifts = require('../services/shiftSchedule');
async function createSchedule(req, res, next) {
    try {
        const data = await shifts.createSchedules(req.params.stationId, [req.body || {}], req.user);
        return res.status(201).json({ message: 'Phân ca làm việc thành công.', data: req.body?.staffIds ? data : data[0] });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'Nhân viên đã có lịch trong ca này.' });
        return next(error);
    }
}
async function createScheduleBatch(req, res, next) {
    try {
        const data = await shifts.createSchedules(req.params.stationId, req.body?.schedules, req.user);
        return res.status(201).json({ message: 'Đã tạo toàn bộ lịch.', data });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'Lịch bị trùng; chưa lưu lịch nào trong lần tạo này.' });
        return next(error);
    }
}
async function getStationSchedules(req, res, next) {
    try {
        const { stationId } = req.params;
        await shifts.requireStation(stationId, req.user);
        const { date, staffId, fromDate, toDate } = req.query;
        if (date && (fromDate || toDate)) return res.status(400).json({ error: 'Chỉ dùng date hoặc khoảng fromDate/toDate.' });
        for (const value of [date, fromDate, toDate]) if (value !== undefined) shifts.validateDate(value);
        if ((fromDate && !toDate) || (!fromDate && toDate) || (fromDate && fromDate > toDate)) return res.status(400).json({ error: 'Cần khoảng fromDate/toDate hợp lệ.' });
        if (staffId !== undefined && !mongoose.isValidObjectId(staffId)) return res.status(400).json({ error: 'staffId không hợp lệ.' });
        const filter = { stationId, status: { $ne: 'CANCELLED' } };
        if (date) filter.date = date;
        if (fromDate) filter.date = { $gte: fromDate, $lte: toDate };
        if (staffId && mongoose.isValidObjectId(staffId)) filter.staffId = staffId;
        const schedules = await ShiftSchedule.find(filter)
            .populate('templateId', 'name startTime endTime')
            .populate('staffId', 'fullName email phone username')
            .populate('assignedBy', 'fullName username')
            .sort({ date: 1, templateId: 1, staffId: 1, _id: 1 });
        const data = schedules.map(document => {
            const row = document.toObject ? document.toObject() : document;
            return {
                _id: row._id,
                date: row.date,
                stationId: row.stationId,
                templateId: row.templateId,
                staffId: row.staffId,
                status: row.status,
                checkInTime: row.checkInTime,
                checkOutTime: row.checkOutTime,
                requiredStaff: row.requiredStaff,
                note: row.note,
                assignedBy: row.assignedBy,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
        });
        return res.status(200).json({ data });
    } catch (error) {
        return next(error);
    }
}
async function checkInShift(req, res, next) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID lịch không hợp lệ.' });
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
        await shifts.requireStation(schedule.stationId, req.user);
        const template = await ShiftTemplate.findById(schedule.templateId);
        if (!template) return res.status(409).json({ error: 'Không tìm thấy ca mẫu của lịch.' });
        const now = new Date();
        shifts.validateCheckIn(schedule.date, template, now);
        schedule.checkInTime = now;
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
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID lịch không hợp lệ.' });
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
        await shifts.requireStation(schedule.stationId, req.user);
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
    createScheduleBatch,
    getStationSchedules,
    checkInShift,
    checkOutShift,
};
