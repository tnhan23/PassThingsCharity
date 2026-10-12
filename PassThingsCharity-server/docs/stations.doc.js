module.exports = {
  '/stations': {
    get: {
      tags: ['Stations'],
      summary: 'Lấy danh sách các trạm tiếp nhận',
      responses: {
        200: { description: 'Danh sách các trạm' },
      },
    },
    post: {
      tags: ['Stations'],
      summary: 'Tạo trạm tiếp nhận mới',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StationRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo trạm thành công' },
      },
    },
  },
  '/stations/{id}': {
    get: {
      tags: ['Stations'],
      summary: 'Xem chi tiết một trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết trạm' },
      },
    },
    patch: {
      tags: ['Stations'],
      summary: 'Cập nhật thông tin trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                address: { type: 'string' },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật trạm thành công' },
      },
    },
    delete: {
      tags: ['Stations'],
      summary: 'Xóa trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa trạm' },
      },
    },
  },
  '/stations/{id}/staff/{userId}': {
    post: {
      tags: ['Stations'],
      summary: 'Gán nhân viên (role STAFF) vào trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', example: '6acbbb6a7faf5d01bb5261e4' } },
      ],
      responses: {
        200: { description: 'Gán nhân viên thành công' },
      },
    },
    delete: {
      tags: ['Stations'],
      summary: 'Xóa nhân viên khỏi trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa nhân viên khỏi trạm' },
      },
    },
  },
};
