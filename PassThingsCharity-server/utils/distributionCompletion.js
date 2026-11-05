module.exports = function completionDate(status, value, existing = null, now = new Date()) {
  const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (status !== 'COMPLETED') {
    if (value !== undefined) fail('completedAt chỉ được gửi khi bàn giao COMPLETED.');
    return null;
  }
  if (existing) {
    if (value !== undefined && new Date(value).getTime() !== new Date(existing).getTime()) fail('Không được đổi ngày của lần bàn giao đã hoàn tất.');
    return existing;
  }
  if (value === undefined) return now;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail('completedAt phải là ngày giờ ISO có múi giờ.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date > now) fail('Ngày hoàn tất bàn giao không hợp lệ hoặc ở tương lai.');
  return date;
};
