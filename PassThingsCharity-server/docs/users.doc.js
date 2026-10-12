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
  '/users/me/profile': {
    patch: {
      tags: ['Users'],
      summary: 'User cập nhật hồ sơ của chính mình',
      description: 'ID tài khoản được lấy từ Bearer token. Không thể thay đổi role hoặc status bằng endpoint này.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              properties: {
                email: { type: 'string', format: 'email' },
                username: { type: 'string' },
                fullName: { type: 'string' },
                phone: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
        400: { description: 'Dữ liệu hồ sơ không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        409: { description: 'Email hoặc username đã được sử dụng' },
      },
    },
  },
  '/users/{id}': {
    delete: {
      tags: ['Users'],
      summary: 'Xóa vĩnh viễn tài khoản của chính mình',
      description: 'Chỉ cho phép xóa tài khoản có ID trùng với tài khoản trong Bearer token. Yêu cầu mật khẩu hiện tại để xác nhận.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của chính tài khoản đang đăng nhập',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password'],
              properties: {
                password: {
                  type: 'string',
                  format: 'password',
                  description: 'Mật khẩu hiện tại để xác nhận xóa tài khoản',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Tài khoản đã được xóa vĩnh viễn' },
        400: { description: 'ID hoặc mật khẩu không hợp lệ' },
        401: { description: 'Token hoặc mật khẩu không hợp lệ' },
        403: { description: 'Chỉ được xóa tài khoản của chính mình' },
        404: { description: 'Không tìm thấy tài khoản' },
      },
    },
  },
  '/users/{id}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Thay đổi trạng thái tài khoản (Chỉ ADMIN)',
      description: 'Gửi active để bật lại, inactive để vô hiệu hóa hoặc banned để khóa tài khoản. Nếu không gửi body, mặc định chuyển sang inactive.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'banned'],
                  example: 'inactive',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Trạng thái tài khoản đã được cập nhật' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Chỉ ADMIN được phép thực hiện' },
        404: { description: 'Không tìm thấy tài khoản' },
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
