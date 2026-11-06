module.exports = {
  '/users/me/profile': {
    get: {
      tags: ['Users'],
      summary: 'Lấy hồ sơ tài khoản, điểm thưởng và chứng nhận của người đang đăng nhập',
      description: 'Yêu cầu Bearer token. Không cần ID hoặc body; backend xác định tài khoản qua token. Chỉ trả thông tin hồ sơ, không trả password, resetPasswordToken hoặc resetPasswordExpires. FE dùng user để điền form PATCH cùng đường dẫn. Áp dụng cho mọi role đã đăng nhập; tài khoản Admin riêng có thể không có avatar/status (trả null).',
      responses: {
        200: {
          description: 'Thông tin tài khoản hiện tại',
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' },
                fullName: { type: 'string' },
                phone: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', nullable: true },
                role: { type: 'string' },
                status: { type: 'string', nullable: true },
              },
            },
            gamification: {
              type: 'object',
              description: 'Thông tin điểm, giao dịch, thành tích đã mở khóa và chứng nhận của chính tài khoản.',
              properties: {
                totalPoints: { type: 'integer', example: 520 },
                pointTransactions: { type: 'array', items: { type: 'object' } },
                unlockedAchievements: { type: 'array', items: { type: 'object' } },
                certificates: { type: 'array', items: { type: 'object' } },
              },
            },
            },
          } } },
        },
        401: { description: 'Thiếu token, token không hợp lệ/hết hạn hoặc tài khoản không hoạt động/không tồn tại' },
        500: { description: 'Lỗi server' },
      },
    },
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
                avatarUrl: { type: 'string', format: 'uri', nullable: true, example: 'https://res.cloudinary.com/your-cloud/image/upload/avatar.jpg' },
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
  '/users/{id}/station-manager': {
    patch: {
      tags: ['Users'],
      summary: 'Gán quyền STATION_MANAGER cho user (Chỉ ADMIN)',
      description: 'Admin cấp role STATION_MANAGER cho tài khoản người dùng. Chỉ áp dụng cho tài khoản đang có role USER.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000001' }, description: 'ID của user cần gán quyền' },
      ],
      responses: {
        200: {
          description: 'Đã cấp role STATION_MANAGER và gán trạm thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Đã cấp role STATION_MANAGER và gán trạm' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '671000000000000000000001' },
                      username: { type: 'string', example: 'user_01' },
                      role: { type: 'string', example: 'STATION_MANAGER' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'User ID không hợp lệ',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        401: {
          description: 'Chưa đăng nhập hoặc token không hợp lệ',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        403: {
          description: 'Chỉ ADMIN mới có quyền thực hiện hành động này',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        404: {
          description: 'Không tìm thấy user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        409: {
          description: 'Chỉ có thể nâng tài khoản đang có role USER hoặc user đã được gán vào trạm này',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        500: {
          description: 'Lỗi server (ví dụ chưa có role STATION_MANAGER trong hệ thống)',
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
