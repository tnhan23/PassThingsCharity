const Template = require('../models/shiftTemplate');
const DEFAULT_SHIFTS = [
  { name: 'Ca sáng', startTime: '08:00', endTime: '14:00' },
  { name: 'Ca chiều', startTime: '14:00', endTime: '20:00' },
];

async function initializeShiftTemplates() {
  await Template.init();
  // Retire the field in place, preserving template IDs referenced by schedules.
  const indexes = await Template.collection.indexes();
  for (const index of indexes) {
    if (Object.hasOwn(index.key, 'code')) await Template.collection.dropIndex(index.name);
  }
  await Template.collection.updateMany({ code: { $exists: true } }, { $unset: { code: '' } });
  for (const shift of DEFAULT_SHIFTS) {
    try {
      await Template.updateOne({ stationId: null, name: shift.name }, { $setOnInsert: {
        ...shift, stationId: null, createdBy: null, isActive: true,
        description: 'Ca dùng chung cho tất cả trạm. Giờ Việt Nam (UTC+7).',
      } }, { upsert: true });
    } catch (error) { if (error.code !== 11000) throw error; }
  }
}

module.exports = { initializeShiftTemplates, DEFAULT_SHIFTS };
