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
  '/auth/forgot-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Yêu cầu gửi OTP đặt lại mật khẩu qua email (Lưu ý: Sử dụng Gmail thật)',
      description: 'Nhập email để nhận mã OTP gồm 6 chữ số qua Gmail. ⚠️ LƯU Ý: Phải sử dụng Gmail thật đã tồn tại trong database để có thể mở hộp thư nhận mã OTP. Mã có hiệu lực trong 10 phút.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Địa chỉ Gmail thật đã đăng ký tài khoản trong hệ thống',
                  example: 'your_real_email@gmail.com',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Thông báo đã gửi mã OTP nếu email tồn tại trong hệ thống (kiểm tra hộp thư đến hoặc mục Spam của Gmail thật)',
        },
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Authentication'],
      summary: 'Đặt lại mật khẩu mới bằng mã OTP (Sử dụng Gmail thật nhận mã)',
      description: 'Nhập Gmail thật đã nhận mã OTP, nhập mã OTP 6 số và mật khẩu mới.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp', 'newPassword'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Gmail thật đã dùng để nhận mã OTP ở bước trên',
                  example: 'your_real_email@gmail.com',
                },
                otp: {
                  type: 'string',
                  description: 'Mã OTP gồm 6 chữ số nhận từ Gmail',
                  example: '123456',
                },
                newPassword: {
                  type: 'string',
                  format: 'password',
                  minLength: 6,
                  description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
                  example: 'newpassword123',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đặt lại mật khẩu thành công' },
        400: { description: 'Mã OTP không đúng, hết hạn hoặc dữ liệu không hợp lệ' },
      },
    },
  },
};
