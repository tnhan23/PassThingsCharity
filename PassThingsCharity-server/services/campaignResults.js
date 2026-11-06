const idOf = value => String(value?._id || value);
const round = value => Number(value.toFixed(8));
function summarize(items, handovers = []) {
  const totals = new Map();
  for (const handover of handovers) {
    for (const item of handover.items || []) {
      const key = `${idOf(item.itemTypeId)}:${item.unit}`;
      totals.set(key, round((totals.get(key) || 0) + item.quantity));
    }
  }
  return items.map(item => {
    const handedOverQuantity = totals.get(`${idOf(item.itemTypeId)}:${item.unit}`) || 0;
    return {
      itemTypeId: idOf(item.itemTypeId), itemName: item.itemTypeId?.name || '', unit: item.unit,
      collectedQuantity: item.collectedQuantity, handedOverQuantity,
      remainingToHandOverQuantity: round(item.collectedQuantity - handedOverQuantity),
    };
  });
}
module.exports = { summarize };
