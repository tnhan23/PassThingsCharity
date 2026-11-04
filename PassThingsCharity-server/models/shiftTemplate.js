const mongoose = require('mongoose');
const shiftTemplateSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: [true, 'Trạm tiếp nhận (stationId) là bắt buộc.'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên ca làm việc là bắt buộc (ví dụ: Ca Sáng, Ca Chiều).'],
      trim: true,
    },
    startTime: {
      type: String,
      required: [true, 'Giờ bắt đầu là bắt buộc (định dạng HH:mm, ví dụ 08:00).'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Giờ bắt đầu phải có định dạng HH:mm (00:00 - 23:59).'],
    },
    endTime: {
      type: String,
      required: [true, 'Giờ kết thúc là bắt buộc (định dạng HH:mm, ví dụ 12:00).'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Giờ kết thúc phải có định dạng HH:mm (00:00 - 23:59).'],
    },
    requiredStaff: {
      type: Number,
      default: 1,
      min: [1, 'Số nhân viên tối thiểu cho ca phải từ 1 trở lên.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Tránh đặt trùng tên ca trong cùng 1 trạm (ví dụ: không thể tạo 2 "Ca Sáng" tại cùng 1 trạm)
shiftTemplateSchema.index({ stationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema, 'shiftTemplates');