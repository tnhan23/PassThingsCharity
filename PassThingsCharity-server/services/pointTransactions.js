const PointTransaction = require('../models/pointTransaction');

async function createOrGetPointTransaction(idempotencyKey, transaction) {
  try {
    return await PointTransaction.findOneAndUpdate(
      { idempotencyKey },
      { $setOnInsert: { ...transaction, idempotencyKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;

    const existing = await PointTransaction.findOne({ idempotencyKey });
    if (!existing) throw error;
    return existing;
  }
}

module.exports = { createOrGetPointTransaction };
