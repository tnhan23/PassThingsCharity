const ShiftTemplate = require('../models/shiftTemplate');
async function getSharedShiftTemplates(req, res, next) {
  try {
    const data = await ShiftTemplate.find({ stationId: null, isActive: true })
      .select('name startTime endTime description').sort({ startTime: 1 });
    return res.json({ data });
  } catch (error) { return next(error); }
}
module.exports = { getSharedShiftTemplates };
