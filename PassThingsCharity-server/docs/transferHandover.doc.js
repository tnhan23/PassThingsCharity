const tag = ['BE3 - Inter-Station Transfers'];
const id = name => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const quantityItems = { type: 'array', minItems: 1, items: {
  type: 'object', required: ['transferItemId', 'quantity'], properties: {
    transferItemId: { type: 'string', description: 'ID dòng hàng trong phiếu, không phải itemTypeId.' },
    quantity: { type: 'number', minimum: 0, example: 10 },
  },
} };
const evidenceBody = { type: 'object', required: ['imageUrls'], properties: {
  imageUrls: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', format: 'uri' }, description: 'URL trả từ API upload đúng phiếu, chuyến, bước và tài khoản này.' },
  note: { type: 'string' },
} };
const operation = (summary, description, parameters, schema) => ({
  tags: tag, summary, description, parameters,
  ...(schema ? { requestBody: { required: true, content: { 'application/json': { schema } } } } : {}),
  responses: {
    200: { description: 'Thành công; trả phiếu, dòng hàng và danh sách phân chở kèm minh chứng.' },
    400: { description: 'Dữ liệu không hợp lệ hoặc ảnh chưa upload đúng bước.' },
    404: { description: 'Không tìm thấy phiếu hoặc phân chở.' },
    409: { description: 'Sai trạng thái, vượt số lượng hoặc không đủ hàng khả dụng.' },
  },
});
const paths = {
  '/transfers/{id}/responsibilities': { patch: operation('Phân công người phụ trách đầu A hoặc đầu B', 'responsibleUserId là người phụ trách xuất tại A, mặc định người tạo phiếu. receivedBy là người được phân công nhận tại B, ban đầu null. Trưởng trạm A chỉ sửa đầu A; trưởng trạm B chỉ sửa đầu B; ADMIN được sửa cả hai. STAFF được chọn phải đang có ca hợp lệ tại đúng trạm khi phân công. Sau đó được hoàn tất phiếu này kể cả hết ca. Khi bàn giao, người cũ không còn quyền xác nhận. Không nhập ID ca làm.', [id('id')], {
    type: 'object', minProperties: 1, additionalProperties: false,
    properties: { responsibleUserId: { type: 'string', description: 'ID người phụ trách trạm A.' }, receivedBy: { type: 'string', description: 'ID người nhận tại trạm B, do trưởng trạm B chọn.' } },
  }) },
  '/transfers/shipments/me': { get: operation('Xem phần hàng tôi được giao vận chuyển', 'Chỉ trả phân chở của tài khoản trong token, kèm trạm lấy/giao, hàng và ảnh minh chứng.', []) },
  '/transfers/{id}/approval': { patch: operation('Trưởng trạm nguồn hoặc ADMIN duyệt phiếu', 'Phiếu mới chờ duyệt. APPROVED giữ số hàng trong kho A và chuyển sang PREPARING; chưa trừ tồn thực tế. REJECTED hủy phiếu. STAFF không được duyệt.', [id('id')], {
    type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] }, note: { type: 'string' } },
  }) },
  '/transfers/{id}/shipments': { post: operation('Phân hàng cho người đã được duyệt nhận việc', 'assignmentId lấy từ /workforce/tasks/me hoặc chi tiết nhiệm vụ. Nhiệm vụ phải gắn đúng transferId, campaignId và trạm nguồn. Tổng phân chở không vượt phiếu; phải phân đủ toàn bộ trước lần xuất đầu. Không sửa phân chở sau khi bắt đầu xuất.', [id('id')], {
    type: 'object', required: ['assignmentId', 'items'], properties: { assignmentId: { type: 'string' }, items: quantityItems },
  }) },
  '/transfers/{id}/shipments/{shipmentId}': { delete: operation('Gỡ phân chở chưa xuất để giao lại cho người khác', 'Chỉ nhân sự trạm A hoặc ADMIN; chỉ trước lần xuất đầu của toàn phiếu. Không xóa phân công nhiệm vụ hoặc ảnh đã upload, không thay đổi tồn kho.', [id('id'), id('shipmentId')]) },
  '/transfers/{id}/shipments/{shipmentId}/evidence/{stage}': { post: {
    ...operation('Upload ảnh minh chứng xuất / báo giao / nhận hàng', 'Gửi 1–5 ảnh JPEG/PNG/WebP, tối đa 5 MB mỗi ảnh. Ảnh vào PassThingsCharity/transfer-evidence (hoặc CLOUDINARY_TRANSFER_EVIDENCE_FOLDER). DISPATCH: nhân sự trạm A; REPORT: chính người chở; RECEIVE: nhân sự trạm B. Upload chỉ trả URL; gửi URL vào bước xác nhận tương ứng mới ghi nhận bàn giao. Không đổi tồn kho khi upload.', [id('id'), id('shipmentId'), { name: 'stage', in: 'path', required: true, schema: { type: 'string', enum: ['DISPATCH', 'REPORT', 'RECEIVE'] } }]),
    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['images'], properties: { images: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', format: 'binary' } } } } } } },
    responses: { 201: { description: 'Upload thành công, trả images (URL/publicId) và imageUrls; chưa ghi nhận bàn giao.' }, 400: { description: 'Ảnh không hợp lệ' }, 409: { description: 'Sai bước bàn giao' }, 413: { description: 'Ảnh vượt giới hạn' }, 503: { description: 'Thiếu cấu hình Cloudinary' } },
  } },
};
for (const [action, title, description] of [
  ['dispatch', 'Trạm A xác nhận giao hàng cho người chở', 'Phiếu phải được duyệt, phân hàng đủ và người chở còn phân công hiệu lực. Trừ kho A theo phần hàng này, giảm hàng giữ chỗ và ghi hàng đang chuyển. Mỗi phân chở chỉ xuất một lần.'],
  ['report', 'Người chở gửi ảnh và báo cáo giao hàng', 'Chỉ người được giao chở báo cáo. items phải đủ dòng, quantity là số lượng báo giao lũy kế, không vượt lượng đã nhận. Không tự cộng kho B hoặc thưởng điểm.'],
  ['receive', 'Trạm B kiểm đếm và xác nhận thực nhận', 'Phải có báo cáo của người chở. items phải đủ dòng, quantity là số lượng B đã nhận lũy kế; không được giảm hoặc vượt số người chở báo giao. Chỉ phần tăng thêm mới cộng kho B. Thiếu hàng giữ PARTIAL, không tự xóa chênh lệch. Khi tất cả hàng đã nhận đủ, phiếu chuyển RECEIVED. Sau đó người chở hoàn thành nhiệm vụ qua /workforce/tasks/check-out để nhận điểm một lần.'],
]) {
  paths[`/transfers/{id}/shipments/{shipmentId}/${action}`] = { post: operation(title, description, [id('id'), id('shipmentId')], {
    ...evidenceBody,
    required: action === 'dispatch' ? ['imageUrls'] : ['imageUrls', 'items'],
    properties: { ...evidenceBody.properties, ...(action === 'dispatch' ? {} : { items: quantityItems }) },
  }) };
}
for (const [path, methods] of Object.entries(paths)) {
  if (path.includes('/evidence/') || path.endsWith('/dispatch') || path.endsWith('/receive') || path === '/transfers/{id}/shipments') {
    for (const operation of Object.values(methods)) operation.description += ' STAFF must belong to this station and be the assigned responsible person for this transfer. Shift validity is checked when responsibility is assigned; finishing the assigned transfer after shift end is allowed. A receiver at station B must be assigned before dispatch.';
  }
}
module.exports = paths;
