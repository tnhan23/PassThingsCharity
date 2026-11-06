const mongoose = require('mongoose');

/**
 * ShiftSchedule Schema
 * Đại diện cho 1 suất làm việc của 1 Staff cụ thể vào một ngày nhất định
 */
const shiftScheduleSchema = new mongoose.Schema(
    {
        stationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Station',
            required: [true, 'Trạm tiếp nhận (stationId) là bắt buộc.'],
            index: true,
        },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShiftTemplate',
            required: [true, 'Ca mẫu (templateId) là bắt buộc.'],
        },
        // Lưu ngày dạng chuỗi YYYY-MM-DD (VD: "2026-10-29") để tránh bị lệch múi giờ UTC
        date: {
            type: String,
            required: [true, 'Ngày làm việc (định dạng YYYY-MM-DD) là bắt buộc.'],
            match: [/^\d{4}-\d{2}-\d{2}$/, 'Ngày làm việc phải có định dạng YYYY-MM-DD.'],
            index: true,
        },
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null, // Có thể để null nếu là ca trống mở cho Staff tự đăng ký
        },
        status: {
            type: String,
            enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ABSENT', 'CANCELLED'],
            default: 'SCHEDULED',
        },
        checkInTime: {
            type: Date,
            default: null,
        },
        checkOutTime: {
            type: Date,
            default: null,
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        note: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Index chống trùng: 1 Staff không thể bị gán trùng 1 ca trong cùng 1 ngày (trừ khi ca đó đã bị CANCELLED)
shiftScheduleSchema.index(
    { staffId: 1, date: 1, templateId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            staffId: { $type: 'objectId' },
            status: { $ne: 'CANCELLED' },
        },
    }
);

module.exports = mongoose.model('ShiftSchedule', shiftScheduleSchema, 'shiftSchedules');