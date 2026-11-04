const Template = require('../models/shiftTemplate');
const DEFAULT_SHIFTS = [
  { code: 1, name: 'Ca sáng', startTime: '08:00', endTime: '14:00' },
  { code: 2, name: 'Ca chiều', startTime: '14:00', endTime: '20:00' },
];

async function initializeShiftTemplates() {
  await Template.init();
  for (const shift of DEFAULT_SHIFTS) {
    try {
      await Template.updateOne({ code: shift.code }, { $setOnInsert: {
        ...shift, stationId: null, createdBy: null, isActive: true,
        description: 'Ca dùng chung cho tất cả trạm. Giờ Việt Nam (UTC+7).',
      } }, { upsert: true });
    } catch (error) { if (error.code !== 11000) throw error; }
  }
}

module.exports = { initializeShiftTemplates, DEFAULT_SHIFTS };
