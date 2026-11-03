module.exports = {
  '/admin/organizations/{id}/approve': {
    patch: {
      tags: ['Admin Approval'],
      summary: 'Admin duyệt hoặc từ chối tổ chức',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '6ac9ba1d4e5e0494abf11158' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isVerified'],
              properties: {
                isVerified: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã cập nhật trạng thái duyệt tổ chức và thăng cấp role cho người đại diện' },
      },
    },
  },
  '/admin/organizations/{id}/reject': {
    patch: {
      tags: ['Admin Approval'],
      summary: 'Admin từ chối tổ chức từ thiện',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '6ac9ba1d4e5e0494abf11158' } },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                rejectionReason: { type: 'string', example: 'Hồ sơ người đại diện và địa chỉ hoạt động chưa được xác minh.' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã từ chối tổ chức' },
        400: { description: 'ID không hợp lệ hoặc tổ chức đã duyệt trước đó' },
        404: { description: 'Không tìm thấy tổ chức' },
      },
    },
  },
  '/admin/stations/{id}/approve': {
    patch: {
      tags: ['Admin Approval'],
      summary: 'Admin duyệt kích hoạt hoặc tắt trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isActive'],
              properties: {
                isActive: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã cập nhật trạng thái kích hoạt trạm' },
      },
    },
  },
};
