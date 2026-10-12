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
              required: ['name', 'address'],
              properties: {
                name: { type: 'string', example: 'Trạm Tiếp Nhận Cơ Sở 1' },
                address: { type: 'string', example: '456 Lê Lợi, Q1, TP.HCM' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Tạo trạm thành công' },
      },
    },
  },
};
