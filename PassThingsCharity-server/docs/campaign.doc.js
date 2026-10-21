module.exports = {
  '/campaigns': {
    get: {
      tags: ['Campaigns'],
      summary: 'Lấy danh sách các Campaign cứu trợ (Public / Filter)',
      security: [],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }, description: 'Lọc trạng thái công khai của chiến dịch' },
        { name: 'organizationId', in: 'query', schema: { type: 'string' }, description: 'Lọc theo Tổ chức' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Tìm kiếm theo tên chiến dịch' },
      ],
      responses: {
        200: { description: 'Danh sách Campaign' },
        400: { description: 'Bộ lọc không hợp lệ' },
      },
    },
    post: {
      tags: ['Campaigns'],
      summary: 'Tạo Campaign quyên góp mới (Admin / Station Manager)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo Campaign thành công (DRAFT)' },
        400: { description: 'Dữ liệu không hợp lệ hoặc Campaign không kéo dài từ 120 đến 168 giờ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
      },
    },
  },
  '/campaigns/{id}': {
    get: {
      tags: ['Campaigns'],
      summary: 'Xem chi tiết 1 Campaign (Kèm nhu cầu vật phẩm & các Trạm tiếp nhận)',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết Campaign' },
        404: { description: 'Không tìm thấy chiến dịch công khai' },
      },
    },
    patch: {
      tags: ['Campaigns'],
      summary: 'Chỉnh sửa thông tin Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
        400: { description: 'Dữ liệu không hợp lệ hoặc Campaign không kéo dài từ 120 đến 168 giờ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch' },
      },
    },
  },
  '/campaigns/{id}/status': {
    patch: {
      tags: ['Campaigns'],
      summary: 'Chuyển trạng thái theo luồng DRAFT -> PUBLISHED -> ACTIVE -> COMPLETED hoặc CANCELLED',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'], example: 'PUBLISHED' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã cập nhật trạng thái Campaign' },
        400: { description: 'Trạng thái không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch' },
        409: { description: 'Chuyển trạng thái không hợp lệ' },
      },
    },
  },
  '/campaigns/{id}/items': {
    post: {
      tags: ['Campaigns'],
      summary: 'Cấu hình nhu cầu vật phẩm mục tiêu cho Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignItemRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Đã thêm/cập nhật nhu cầu vật phẩm' },
        400: { description: 'Dữ liệu không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch hoặc loại vật phẩm' },
        409: { description: 'Không thể thêm loại vật phẩm đang ngừng hoạt động' },
      },
    },
  },
  '/campaigns/{id}/items/{itemId}': {
    delete: {
      tags: ['Campaigns'],
      summary: 'Xóa nhu cầu vật phẩm khỏi Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa vật phẩm khỏi Campaign' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy nhu cầu vật phẩm' },
      },
    },
  },
  '/campaigns/{id}/stations': {
    get: {
      tags: ['Campaigns'],
      summary: 'Tra cứu các Trạm tiếp nhận đang hỗ trợ Campaign (Tính khoảng cách gần nhất nếu truyền userLat, userLng)',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userLat', in: 'query', schema: { type: 'number' }, description: 'Vĩ độ vị trí hiện tại của người dùng (VD: 10.7769)' },
        { name: 'userLng', in: 'query', schema: { type: 'number' }, description: 'Kinh độ vị trí hiện tại của người dùng (VD: 106.7009)' },
      ],
      responses: {
        200: { description: 'Danh sách trạm tiếp nhận kèm khoảng cách kilomet (distanceKm)' },
        404: { description: 'Không tìm thấy chiến dịch công khai' },
      },
    },
    post: {
      tags: ['Campaigns'],
      summary: 'Gán Trạm tiếp nhận tham gia Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['stationId'],
              properties: {
                stationId: { type: 'string', example: '671000000000000000000011' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã gán trạm thành công' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch hoặc trạm' },
        409: { description: 'Không thể gán trạm đang ngừng hoạt động' },
      },
    },
  },
  '/campaigns/{id}/stations/{stationId}': {
    delete: {
      tags: ['Campaigns'],
      summary: 'Xóa Trạm tiếp nhận khỏi Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã gỡ trạm khỏi Campaign' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy trạm đã gán' },
      },
    },
  },
};
