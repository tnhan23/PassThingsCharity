module.exports = {
  '/authadmin/login': {
    post: {
      tags: ['Admin Authentication'],
      summary: 'Đăng nhập tài khoản Admin',
      description: 'Xác thực thông tin đăng nhập của Admin (username, password) và trả về JWT Bearer Token có thời hạn 1 giờ.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminLoginRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Đăng nhập thành công, trả về JWT Bearer Token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                  tokenType: { type: 'string', example: 'Bearer' },
                  expiresIn: { type: 'integer', example: 3600 },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '671000000000000000000001' },
                      username: { type: 'string', example: 'admin_master' },
                      phone: { type: 'string', example: '0987654321' },
                      role: { type: 'string', example: '671000000000000000000002' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Vui lòng nhập username và password',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        401: {
          description: 'Username không tồn tại hoặc mật khẩu không chính xác',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/authadmin/register': {
    post: {
      tags: ['Admin Authentication'],
      summary: 'Đăng ký tài khoản Admin mới',
      description: 'Tạo tài khoản quản trị viên mới với role ADMIN. Yêu cầu nhập đầy đủ email, username, password, fullname và số điện thoại đúng 10 chữ số.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminRegisterRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Đăng ký tài khoản Admin thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Đăng ký thành công.' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '671000000000000000000001' },
                      email: { type: 'string', example: 'admin@passthings.org' },
                      username: { type: 'string', example: 'admin_master' },
                      fullname: { type: 'string', example: 'Nguyễn Quản Trị' },
                      phone: { type: 'string', example: '0987654321' },
                      role: { type: 'string', example: 'ADMIN' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Dữ liệu không hợp lệ (thiếu trường bắt buộc hoặc số điện thoại không hợp lệ)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        409: {
          description: 'Email hoặc username đã được sử dụng',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        500: {
          description: 'Chưa cấu hình role ADMIN trong hệ thống',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/authadmin/change-password': {
    patch: {
      tags: ['Admin Authentication'],
      summary: 'Đổi mật khẩu tài khoản Admin',
      description: 'Đổi mật khẩu cho tài khoản Admin đang đăng nhập. Yêu cầu Bearer Token hợp lệ, mật khẩu hiện tại chính xác và mật khẩu mới tối thiểu 8 ký tự, khác mật khẩu cũ.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Đã đổi mật khẩu thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Đã đổi mật khẩu.' },
                },
              },
            },
          },
        },
        400: {
          description: 'Mật khẩu mới không hợp lệ, ít hơn 8 ký tự hoặc trùng mật khẩu hiện tại',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        401: {
          description: 'Chưa đăng nhập, token không hợp lệ hoặc mật khẩu hiện tại không chính xác',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        404: {
          description: 'Không tìm thấy tài khoản admin',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
};
