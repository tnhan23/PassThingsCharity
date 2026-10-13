module.exports = {
  '/gamification/points/me': {
    get: {
      tags: ['Gamification'],
      summary: 'Xem tổng điểm & Lịch sử cộng điểm của tôi',
      responses: {
        200: { description: 'Tổng điểm và lịch sử giao dịch' },
      },
    },
  },
  '/gamification/points/user/{userId}': {
    get: {
      tags: ['Gamification'],
      summary: 'Xem điểm của một User bất kỳ (Admin / Staff)',
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Điểm của User' },
      },
    },
  },
  '/gamification/points/award': {
    post: {
      tags: ['Gamification'],
      summary: 'Cộng điểm thưởng cho User (Khi quyên góp thành công hoặc xong nhiệm vụ)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AwardPointsRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Đã cộng điểm & Tự động kiểm tra mở khóa Huy hiệu' },
      },
    },
  },
  '/gamification/achievements': {
    get: {
      tags: ['Gamification'],
      summary: 'Xem danh sách toàn bộ Huy hiệu / Thành tích của hệ thống',
      security: [],
      responses: {
        200: { description: 'Danh sách thành tích' },
      },
    },
    post: {
      tags: ['Gamification'],
      summary: 'Tạo định nghĩa Huy hiệu mới (Admin / Manager)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AchievementRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo huy hiệu thành công' },
      },
    },
  },
  '/gamification/achievements/me': {
    get: {
      tags: ['Gamification'],
      summary: 'Xem các Huy hiệu mà tôi đã mở khóa',
      responses: {
        200: { description: 'Danh sách huy hiệu cá nhân' },
      },
    },
  },
  '/gamification/achievements/user/{userId}': {
    get: {
      tags: ['Gamification'],
      summary: 'Tra cứu huy hiệu của một User (Admin / Manager / Staff)',
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Danh sách huy hiệu đã mở khóa' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        400: { description: 'User ID không hợp lệ' },
      },
    },
  },
  '/gamification/certificates/me': {
    get: {
      tags: ['Gamification'],
      summary: 'Xem danh sách Giấy chứng nhận của tôi',
      responses: {
        200: { description: 'Danh sách giấy chứng nhận' },
      },
    },
  },
  '/gamification/certificates/user/{userId}': {
    get: {
      tags: ['Gamification'],
      summary: 'Tra cứu giấy chứng nhận của một User (Admin / Manager / Staff)',
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Danh sách giấy chứng nhận' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        400: { description: 'User ID không hợp lệ' },
      },
    },
  },
  '/gamification/certificates': {
    post: {
      tags: ['Gamification'],
      summary: 'Cấp Giấy chứng nhận cho User/Volunteer (Admin / Manager)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CertificateRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Đã cấp giấy chứng nhận' },
      },
    },
  },
};
