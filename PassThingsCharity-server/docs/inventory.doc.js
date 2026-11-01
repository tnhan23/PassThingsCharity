module.exports = {
  '/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'Tồn kho theo trạm, chiến dịch, loại hàng và đơn vị',
      description: 'Admin xem toàn bộ; quản lý/nhân viên chỉ xem các trạm được phân công. Hàng đang vận chuyển đã trừ trạm gửi, chưa cộng trạm nhận. Số âm thể hiện dữ liệu phiếu cũ cần đối soát.',
      parameters: [
        ...['stationId', 'campaignId', 'itemTypeId'].map(name => ({ name, in: 'query', schema: { type: 'string' } })),
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        200: { description: 'Danh sách có phân trang. quantity là tồn khả dụng; receivedQuantity, transferredInQuantity, transferredOutQuantity, distributedQuantity là tổng theo nghiệp vụ.' },
        400: { description: 'Bộ lọc không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền xem' },
      },
    },
  },
};
