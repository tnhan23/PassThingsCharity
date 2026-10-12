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
        200: { description: 'Đã cập nhật trạng thái duyệt tổ chức' },
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
