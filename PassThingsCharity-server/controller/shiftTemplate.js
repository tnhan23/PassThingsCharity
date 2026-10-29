const { models } = require('mongoose');
const ShiftTemplate = require('../models/shiftTemplate')
const Station = require('../models/station')
async function createShiftTemplate(req, res, next) {
  try {
    const { stationId } = req.params;
    const { name, startTime, endTime, requiredStaff, description } = req.body || {};
    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ error: 'Không tìm thấy trạm tiếp nhận.' });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'Giờ bắt đầu phải trước giờ kết thúc ca.' });
    }
    const template = await ShiftTemplate.create({
      stationId,
      name: name.trim(),
      startTime,
      endTime,
      requiredStaff: requiredStaff || 1,
      description: description || '',
      createdBy: req.user._id,
    });
    return res.status(201).json({
      message: 'Tạo ca làm việc mẫu thành công.',
      data: template,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Tên ca làm này đã tồn tại ở trạm.' });
    }
    return next(error);
  }
}
async function getShiftTemplatesByStation(req, res, next) {
  try {
    const { stationId } = req.params;

    const templates = await ShiftTemplate.find({
      stationId,
      isActive: true,
    }).sort({ startTime: 1 }); // Sắp xếp theo giờ bắt đầu sớm nhất trước

    return res.status(200).json({
      data: templates,
    });
  } catch (error) {
    return next(error);
  }
}
module.exports = { createShiftTemplate, getShiftTemplatesByStation }