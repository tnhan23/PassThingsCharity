// Shared validation for optional image URLs submitted with JSON create forms.
function resourceImageFields(body = {}, field = 'imageUrl') {
  if (body[field] === undefined) return {};
  if (body[field] === null || body[field] === '') return { [field]: null };
  if (typeof body[field] !== 'string') {
    throw Object.assign(new Error(`${field} phải là URL HTTPS hợp lệ.`), { status: 400 });
  }
  const value = body[field].trim();
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error();
  } catch {
    throw Object.assign(new Error(`${field} phải là URL HTTPS hợp lệ.`), { status: 400 });
  }
  return { [field]: value };
}

module.exports = resourceImageFields;
