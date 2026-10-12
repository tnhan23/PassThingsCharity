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
};
