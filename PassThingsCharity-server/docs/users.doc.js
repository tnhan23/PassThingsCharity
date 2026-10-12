module.exports = {
  '/users': {
    get: {
      tags: ['Users'],
      summary: 'Lấy danh sách người dùng (Chỉ ADMIN)',
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string' }, description: 'Lọc theo role name (ADMIN, USER, STAFF...)' },
        { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Lọc theo status (active, inactive, banned)' },
      ],
      responses: {
        200: { description: 'Danh sách người dùng' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
      },
    },
    post: {
      tags: ['Users'],
      summary: 'Tạo người dùng mới',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo thành công' },
      },
    },
  },
  '/users/{id}': {
    patch: {
      tags: ['Users'],
      summary: 'Cập nhật thông tin người dùng',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                fullName: { type: 'string' },
                phone: { type: 'string' },
                status: { type: 'string', enum: ['active', 'inactive', 'banned'] },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Xóa người dùng',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa người dùng' },
      },
    },
  },
  '/users/{id}/station-manager': {
    patch: {
      tags: ['Users'],
      summary: 'Gán quyền STATION_MANAGER cho user (Chỉ ADMIN)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã cập nhật role thành STATION_MANAGER' },
      },
    },
  },
};
