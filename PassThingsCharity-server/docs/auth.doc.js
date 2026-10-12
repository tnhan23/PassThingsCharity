module.exports = {
  '/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Đăng ký tài khoản mới (Mặc định role USER)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Đăng ký thành công' },
        400: { description: 'Dữ liệu không hợp lệ' },
        409: { description: 'Email hoặc username đã tồn tại' },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Đăng nhập lấy JWT Bearer Token',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Đăng nhập thành công, trả về token' },
        401: { description: 'Sai tài khoản hoặc mật khẩu' },
      },
    },
  },
  '/auth/change-password': {
    patch: {
      tags: ['Authentication'],
      summary: 'Đổi mật khẩu cho tài khoản đang đăng nhập',
      description: 'Dành cho mọi role đã xác thực. Chỉ đổi mật khẩu của tài khoản trong Bearer token và yêu cầu mật khẩu hiện tại.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: {
                  type: 'string',
                  format: 'password',
                },
                newPassword: {
                  type: 'string',
                  format: 'password',
                  minLength: 8,
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã đổi mật khẩu' },
        400: { description: 'Mật khẩu mới không hợp lệ hoặc giống mật khẩu hiện tại' },
        401: { description: 'Token hoặc mật khẩu hiện tại không hợp lệ' },
        404: { description: 'Không tìm thấy tài khoản' },
      },
    },
  },
  '/auth/reset-password/{id}': {
    patch: {
      tags: ['Authentication'],
      summary: 'Admin reset mật khẩu khi user quên mật khẩu',
      description: 'Chỉ ADMIN được gọi sau khi đã xác minh danh tính người dùng. Mật khẩu mới được hash trước khi lưu.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['newPassword'],
              properties: {
                newPassword: {
                  type: 'string',
                  format: 'password',
                  minLength: 8,
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã đặt lại mật khẩu' },
        400: { description: 'ID hoặc mật khẩu mới không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Chỉ ADMIN được phép thực hiện' },
        404: { description: 'Không tìm thấy user' },
      },
    },
  },
};
