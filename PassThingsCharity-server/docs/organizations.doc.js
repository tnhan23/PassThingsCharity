module.exports = {
  '/organizations': {
    get: {
      tags: ['Organizations'],
      summary: 'Lấy danh sách tổ chức từ thiện',
      responses: {
        200: { description: 'Danh sách tổ chức' },
      },
    },
    post: {
      tags: ['Organizations'],
      summary: 'Tạo tổ chức từ thiện mới (ADMIN, STATION_MANAGER)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrganizationRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo tổ chức thành công' },
      },
    },
  },
  '/organizations/{id}': {
    get: {
      tags: ['Organizations'],
      summary: 'Xem chi tiết một tổ chức',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết tổ chức' },
      },
    },
    patch: {
      tags: ['Organizations'],
      summary: 'Cập nhật thông tin tổ chức',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/OrganizationRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
    delete: {
      tags: ['Organizations'],
      summary: 'Xóa tổ chức',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa tổ chức' },
      },
    },
  },
  '/organizations/{organizationId}/stations': {
    post: {
      tags: ['Organizations'],
      summary: 'Tạo trạm mới thuộc tổ chức',
      parameters: [
        { name: 'organizationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'address', 'latitude', 'longitude'],
              properties: {
                name: { type: 'string', example: 'Trạm Tiếp Nhận Cơ Sở 1' },
                address: { type: 'string', example: '456 Lê Lợi, Q1, TP.HCM' },
                latitude: { type: 'string', example: '10.776889', description: 'Vĩ độ (Latitude)' },
                longitude: { type: 'string', example: '106.700806', description: 'Kinh độ (Longitude)' },
                openingTime: { type: 'string', example: '08:00', description: 'Giờ mở cửa' },
                closingTime: { type: 'string', example: '17:00', description: 'Giờ đóng cửa' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Tạo trạm thành công' },
        400: { description: 'Thiếu name, address hoặc tọa độ không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền tạo trạm cho tổ chức này' },
        409: { description: 'Tổ chức cần được Admin duyệt trước khi tạo trạm' },
      },
    },
  },
};
