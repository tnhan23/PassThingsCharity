module.exports = {
  '/gamification/achievements/{id}': {
    patch: {
      tags: ['Gamification'],
      summary: 'Lưu thông tin và ảnh huy hiệu từ form chỉnh sửa',
      description: 'ADMIN hoặc người tạo có role ORG_MANAGER/STATION_MANAGER được sửa. Không nhận createdBy từ FE.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', minProperties: 1,
        properties: {
          ...require('./schemas.doc').AchievementRequest.properties,
          badgeIconUrl: { type: 'string', format: 'uri', nullable: true },
          isActive: { type: 'boolean' },
        },
      } } } },
      responses: {
        200: { description: 'Đã lưu thông tin và ảnh' },
        400: { description: 'Dữ liệu không hợp lệ' },
        401: { description: 'Chưa đăng nhập', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        403: { description: 'Không có quyền sửa', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        404: { description: 'Không tìm thấy thành tích' },
        409: { description: 'Tên thành tích đã tồn tại' },
      },
    },
  },
  '/gamification/points/me': {
    get: {
      tags: ['Gamification'],
      summary: 'Xem tổng điểm & Lịch sử cộng điểm của tôi',
      description: 'Điểm được ghi nhận khi phiếu quyên góp được tiếp nhận hoặc User hoàn thành job; điểm job chỉ cấp một lần cho mỗi phân công.',
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
      description: 'Các mốc tích lũy 100, 500 và 1.000 điểm tự động tạo chứng nhận MILESTONE; phản hồi cung cấp pdfDownloadUrl để tải PDF.',
      responses: {
        200: { description: 'Danh sách giấy chứng nhận' },
      },
    },
  },
  '/gamification/certificates/{id}/pdf': {
    get: {
      tags: ['Gamification'],
      summary: 'Tải PDF chứng nhận mốc điểm',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Tệp PDF chứng nhận', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
        400: { description: 'Certificate ID không hợp lệ' },
        403: { description: 'Không có quyền tải chứng nhận của người khác' },
        404: { description: 'Không tìm thấy chứng nhận PDF mốc điểm' },
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
