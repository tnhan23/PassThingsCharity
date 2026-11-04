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
      description: 'Mỗi dòng chỉ có ID, trạm, loại hàng, unit, quantity và thời gian tạo/cập nhật. Không chia theo chiến dịch, không có tổng nhập/xuất trong số dư. Xem lịch sử ở GET /inventory/history. Chỉ ADMIN, STATION_MANAGER, STAFF; ORG_MANAGER không có quyền. Quản lý/staff chỉ xem trạm được giao. Đọc trực tiếp số dư trong stationInventories. Khi khởi động server, số dư theo chiến dịch cũ được cộng gộp một lần, không tự sửa số âm và không xóa collection cũ. MongoDB cần replica set hoặc Atlas. Không sửa dữ liệu kho/phiếu trực tiếp bằng tay hoặc chạy seed sau khi khởi tạo vì sẽ làm sai đối soát.',
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
