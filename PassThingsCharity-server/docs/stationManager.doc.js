module.exports = {
  '/stationmanager/{stationId}/staff': {
    get: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm xem danh sách nhân viên trong trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Danh sách nhân viên' },
      },
    },
    post: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm thêm nhân viên mới vào trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId'],
              properties: {
                userId: { type: 'string', example: '6acbbb6a7faf5d01bb5261e4' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Thêm nhân viên thành công' },
      },
    },
  },
  '/stationmanager/{stationId}/staff/{staffId}': {
    delete: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm xóa nhân viên khỏi trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'staffId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa nhân viên khỏi trạm' },
      },
    },
  },
};
