// Current stock responses also include reservedQuantity and availableQuantity.
module.exports = {
  '/inventory/history': {
    get: {
      tags: ['Inventory'],
      summary: 'Lịch sử cộng/trừ kho và số dư trước/sau',
      description: 'Sao kê nhập/xuất kho, lưu tại InventoryTransaction. Chỉ ADMIN, STATION_MANAGER, STAFF; ORG_MANAGER không có quyền. Quản lý/staff chỉ xem trạm được phân công. type và description cho biết nhập quyên góp, hoàn tác quyên góp, xuất chuyển trạm, nhận chuyển trạm, xuất cứu trợ hoặc số dư đầu kỳ. quantityDelta dương là nhập, âm là xuất; balanceBefore/balanceAfter là số dư tại thời điểm giao dịch, không phải số tồn mới nhất. counterpartyStationId là trạm đối ứng; campaignId/sourceId/sourceCode liên kết chiến dịch và phiếu nguồn. RECEIVED sang COMPLETED không cộng lặp. Lịch sử cũ được chuyển sang kho chung và tính lại số dư liên tục; collection cũ giữ nguyên để đối soát.',
      parameters: [
        ...['stationId', 'campaignId', 'itemTypeId', 'counterpartyStationId'].map(name => ({ name, in: 'query', schema: { type: 'string' } })),
        { name: 'type', in: 'query', schema: { type: 'string', enum: ['OPENING', 'DONATION_IN', 'DONATION_REVERSAL', 'TRANSFER_OUT', 'TRANSFER_IN', 'RELIEF_OUT'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Lịch sử kho có phân trang' },
        400: { description: 'Bộ lọc không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền xem' },
      },
    },
  },
  '/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'Số tồn kho chung của trạm theo loại hàng và đơn vị',
      description: 'Mỗi dòng chỉ có ID, trạm, loại hàng, unit, quantity và thời gian tạo/cập nhật. Không chia theo chiến dịch, không có tổng nhập/xuất trong số dư. Xem lịch sử ở GET /inventory/history. Chỉ ADMIN, STATION_MANAGER, STAFF; ORG_MANAGER không có quyền. Quản lý/staff chỉ xem trạm được giao. Đọc trực tiếp số dư trong stationInventories. Khi khởi động server, số dư theo chiến dịch cũ được cộng gộp một lần, không tự sửa số âm và không xóa collection cũ. MongoDB cần replica set hoặc Atlas. Không sửa dữ liệu kho/phiếu trực tiếp bằng tay hoặc chạy seed sau khi khởi tạo vì sẽ làm sai đối soát. H?ng gi? cho phi?u v?n chuy?n ?? duy?t n?m ? reservedQuantity; availableQuantity = quantity - reservedQuantity. Duy?t ch?a tr? quantity; xu?t/nh?n t?ng ng??i m?i thay ??i t?n th?c t?.',
      parameters: [
        ...['stationId', 'itemTypeId'].map(name => ({ name, in: 'query', schema: { type: 'string' } })),
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        200: { description: 'Danh sách số dư có phân trang; quantity là số còn trong kho chung của trạm.' },
        400: { description: 'Bộ lọc không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền xem' },
      },
    },
  },
};

const mutationResponses = {
  200: { description: 'Đã điều chỉnh/xóa dòng kho và lưu lịch sử.' },
  400: { description: 'Body không hợp lệ hoặc thiếu reason.' },
  401: { description: 'Chưa đăng nhập.' },
  403: { description: 'Không thuộc trạm được phép.' },
  404: { description: 'Không tìm thấy dòng kho/trạm/loại hàng trong phạm vi được phép.' },
  409: { description: 'Dòng kho trùng hoặc không đủ hàng để đáp ứng lượng giữ chỗ.' },
  503: { description: 'Kho chưa được khởi tạo.' },
};
const reason = { type: 'string', minLength: 1, description: 'Lý do điều chỉnh, bắt buộc cho cả xóa.' };
function mutation(summary, properties, required) {
  return {
    tags: ['Inventory'], summary,
    description: 'ADMIN, STATION_MANAGER, STAFF; quản lý/staff chỉ thao tác trạm được giao. Cùng transaction và khóa với nghiệp vụ kho. Ghi lịch sử MANUAL_CREATE/MANUAL_UPDATE/MANUAL_DELETE, sourceType MANUAL. Không cộng điểm hoặc tiến độ chiến dịch. PATCH đặt số lượng tuyệt đối, không cộng thêm; không đổi trạm, loại hàng hoặc đơn vị. DELETE xóa dòng số dư và ghi nhận giảm về 0, giữ nguyên lịch sử. Chặn giảm/xóa nếu còn lượng hàng giữ chỗ vượt số dư mới. Tặng đồ của user vẫn dùng POST /contributions.',
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, required, properties } } } },
    responses: mutationResponses,
  };
}
module.exports['/inventory'].post = mutation('Thêm dòng kho thủ công (không được trùng)', {
  stationId: { type: 'string' }, itemTypeId: { type: 'string' }, unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'] },
  quantity: { type: 'number', minimum: 0 }, reason,
}, ['stationId', 'itemTypeId', 'unit', 'quantity', 'reason']);
module.exports['/inventory'].post.responses = { ...mutationResponses, 201: { description: 'Đã tạo dòng kho và lưu lịch sử.' } };
module.exports['/inventory/{id}'] = {
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  patch: mutation('Sửa số lượng tồn kho tuyệt đối', { quantity: { type: 'number', minimum: 0 }, reason }, ['quantity', 'reason']),
  delete: mutation('Xóa dòng tồn kho, giữ lịch sử điều chỉnh', { reason }, ['reason']),
};
module.exports['/inventory/history'].get.parameters.find(p => p.name === 'type').schema.enum.push('MANUAL_CREATE', 'MANUAL_UPDATE', 'MANUAL_DELETE');
