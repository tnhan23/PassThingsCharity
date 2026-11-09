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
        200: {
          description: 'Login returns a token and user.stations. STATION_MANAGER: assigned stations by managerId. STAFF: stations linked through StationStaff. Empty array if unassigned or another role. Includes inactive stations.',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              token: { type: 'string' }, tokenType: { type: 'string', example: 'Bearer' },
              expiresIn: { type: 'integer', example: 3600 },
              user: { type: 'object', properties: {
                id: { type: 'string' }, username: { type: 'string' },
                avatarUrl: { type: 'string', nullable: true }, phone: { type: 'string', nullable: true },
                role: { type: 'string', description: 'Existing role ID, or ADMIN for an admin account.' },
                stations: { type: 'array', items: { type: 'object', properties: {
                  _id: { type: 'string' }, name: { type: 'string' }, address: { type: 'string' },
                  organizationId: { type: 'string' }, managerId: { type: 'string', nullable: true },
                  imageUrl: { type: 'string', nullable: true }, isActive: { type: 'boolean' },
                  latitude: { type: 'string' }, longitude: { type: 'string' },
                  openingTime: { type: 'string' }, closingTime: { type: 'string' },
                } } },
              } },
            },
          } } },
        },
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
  '/auth/google': {
    post: {
      tags: ['Authentication'],
      summary: 'Đăng nhập / Đăng ký bằng Google OAuth hoặc Gmail',
      description: 'Hỗ trợ 3 cách:\n1. Gửi `idToken` hoặc `accessToken` của Google OAuth: tự động tạo tài khoản Gmail bắn thẳng vào DB nếu chưa có (hoặc trả 404 nếu `autoRegister: false`).\n2. Đăng ký nhanh bằng Gmail (`mode: "register"`, `email`, `password`, tùy chọn `fullname`, `phone`, `username`): tạo tài khoản Gmail bắn thẳng vào DB, gửi email chào mừng qua Gmail SMTP và trả về JWT token.\n3. Đăng nhập bằng Gmail (`email`, `password`): nếu Gmail chưa có trong DB sẽ trả về 404 "Tài khoản Gmail này không tồn tại trong hệ thống".',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'your_real_email@gmail.com', description: 'Địa chỉ Gmail' },
                password: { type: 'string', format: 'password', example: '123456', description: 'Mật khẩu (khi đăng nhập hoặc đăng ký bằng Gmail)' },
                mode: { type: 'string', enum: ['login', 'register', 'login_only'], default: 'login', description: 'Chọn register để tạo mới tài khoản Gmail bắn thẳng vào DB; chọn login để kiểm tra tồn tại và đăng nhập' },
                fullname: { type: 'string', example: 'Nguyễn Văn A' },
                phone: { type: 'string', example: '0901234567' },
                username: { type: 'string', example: 'nguyenvana' },
                idToken: { type: 'string', description: 'Google OAuth ID Token (tùy chọn)' },
                accessToken: { type: 'string', description: 'Google OAuth Access Token (tùy chọn)' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đăng nhập bằng Gmail / Google thành công, trả về JWT token' },
        201: { description: 'Đăng ký tài khoản Gmail mới bắn thẳng vào DB thành công và trả về JWT token' },
        400: { description: 'Địa chỉ Gmail hoặc dữ liệu không hợp lệ' },
        401: { description: 'Sai mật khẩu, token Google không hợp lệ hoặc tài khoản đã bị khóa' },
        404: { description: 'Tài khoản Gmail này không tồn tại trong hệ thống' },
        409: { description: 'Tài khoản Gmail đã tồn tại khi gọi ở chế độ register' },
      },
    },
  },
  '/auth/google/send-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Gửi mã OTP 6 số về Gmail thật để Đăng nhập hoặc Đăng ký (kế thừa Gmail SMTP)',
      description: 'Sử dụng cấu hình MAIL_USER / MAIL_PASS gửi mã OTP 6 chữ số về Gmail:\n- Khi `mode: "login"` (mặc định): kiểm tra Gmail trong DB trước; nếu không tồn tại sẽ báo lỗi 404 "Tài khoản Gmail này không tồn tại trong hệ thống".\n- Khi `mode: "register"`: gửi mã OTP xác thực về Gmail thật để bước sau tạo tài khoản bắn thẳng vào DB.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email', example: 'your_real_email@gmail.com' },
                mode: { type: 'string', enum: ['login', 'register'], default: 'login' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã gửi mã OTP 6 chữ số tới Gmail' },
        400: { description: 'Địa chỉ Gmail không hợp lệ hoặc không thể gửi thư' },
        404: { description: 'Tài khoản Gmail không tồn tại trong hệ thống (khi mode = login)' },
      },
    },
  },
  '/auth/google/verify-otp': {
    post: {
      tags: ['Authentication'],
      summary: 'Xác thực mã OTP từ Gmail để Đăng nhập hoặc tạo tài khoản mới bắn thẳng vào DB',
      description: 'Nhập Gmail và mã OTP 6 chữ số:\n- Nếu Gmail đã có trong DB: cho đăng nhập ngay và trả về JWT token.\n- Nếu Gmail chưa có trong DB (đăng ký mới): tự động tạo tài khoản User mới bắn thẳng vào Database và trả về JWT token.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp'],
              properties: {
                email: { type: 'string', format: 'email', example: 'your_real_email@gmail.com' },
                otp: { type: 'string', example: '123456' },
                fullname: { type: 'string', example: 'Nguyễn Văn A' },
                phone: { type: 'string', example: '0901234567' },
                password: { type: 'string', format: 'password', example: '123456' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Xác thực OTP và đăng nhập thành công' },
        201: { description: 'Xác thực OTP và tạo mới tài khoản Gmail vào DB thành công' },
        400: { description: 'Mã OTP không đúng hoặc đã hết hạn' },
      },
    },
  },
};
